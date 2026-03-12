---
name: cifra-club
description: "Guide for integrating Cifra Club into the LA Journey platform. Use this skill whenever importing cifras/chord charts, scraping songs from cifraclub.com.br, parsing chord data from Cifra Club pages, populating the repertoire table, extracting chord progressions, or when the user mentions 'Cifra Club', 'importar cifra', 'buscar música', 'importar acorde', 'cifra do Cifra Club', or 'integração Cifra Club'. This is a scraping integration (no official API) that runs server-side via Supabase Edge Functions. Includes URL patterns, data extraction, parsing, and mapping to the database schema."
---

# Cifra Club Integration — Import & Parsing

## Overview

Cifra Club (cifraclub.com.br) is Brazil's largest chord/tab platform with 400k+ songs. LA Journey integrates with Cifra Club to import chord charts for the repertoire module.

**IMPORTANT LEGAL NOTES:**
- There is NO official Cifra Club API — this is web scraping for internal use only
- We import **chord progressions only** (not lyrics — copyright issue)
- Curated content: every import goes through curation (draft → review → approved)
- Field `cifra_source: 'cifra_club'` marks origin for audit purposes
- Songs with `is_public_domain: false` cannot have lyrics in generated materials

## Architecture

```
Frontend (Repertório page)
  → User pastes Cifra Club URL or searches artist/song
  → Calls Supabase Edge Function
  → Edge Function scrapes cifraclub.com.br
  → Parses and extracts chord data (NO lyrics)
  → Returns structured JSON
  → Frontend displays preview for curator
  → Curator approves → saves to repertoire table
```

## URL Patterns

```
Base: https://www.cifraclub.com.br

Song page:    /artista/musica/
              /legiao-urbana/tempo-perdido/
              /beatles/love-me-do/

Artist page:  /artista/
              /legiao-urbana/

Simplified:   /artista/musica/?cipherType=simplified
Full version: /artista/musica/ (default)
```

## Edge Function: cifra-club-import

### Supabase Edge Function Setup

```typescript
// supabase/functions/cifra-club-import/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts'

interface CifraData {
  title: string
  artist: string
  key: string | null
  chords: string[]
  chord_structure: Record<string, string>
  difficulty: number
  genre: string | null
  youtube_url: string | null
  source_url: string
}

serve(async (req) => {
  const { url } = await req.json()
  
  // Validate URL
  if (!url.includes('cifraclub.com.br')) {
    return new Response(JSON.stringify({ error: 'URL inválida' }), { status: 400 })
  }

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LAJourney/1.0; internal-use)',
      }
    })
    const html = await response.text()
    
    // Parse
    const cifra = parseCifraPage(html, url)
    
    return new Response(JSON.stringify(cifra), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

### HTML Parsing Logic

The Cifra Club page has a consistent structure. Key selectors:

```typescript
function parseCifraPage(html: string, sourceUrl: string): CifraData {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc) throw new Error('Failed to parse HTML')

  // Title and artist
  const title = doc.querySelector('h1.t1')?.textContent?.trim() || ''
  const artist = doc.querySelector('h2.t3 a')?.textContent?.trim() || ''

  // Key (tom)
  const keyEl = doc.querySelector('#cifra_tom span')
  const key = keyEl?.textContent?.trim() || null

  // Chords — extract from the pre.cifra element
  const cifraEl = doc.querySelector('pre.cifra') || doc.querySelector('.cifra_cnt pre')
  const cifraText = cifraEl?.textContent || ''

  // Extract unique chords using regex
  // Chord pattern: A-G optionally followed by #/b, m, 7, maj7, dim, aug, sus, add, etc.
  const chordRegex = /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus[24]?|add[249]?|[0-9]*)?(?:\/[A-G][#b]?)?)\b/g
  const allChords = [...new Set(cifraText.match(chordRegex) || [])]

  // Build chord structure from sections
  const structure = extractChordStructure(cifraText)

  // Genre (from breadcrumb or tags)
  const genreEl = doc.querySelector('.genre-tag') || doc.querySelector('.breadcrumb-item:nth-child(2)')
  const genre = genreEl?.textContent?.trim() || null

  // YouTube link
  const ytEl = doc.querySelector('a[href*="youtube.com"]') || doc.querySelector('a[href*="youtu.be"]')
  const youtube_url = ytEl?.getAttribute('href') || null

  // Estimate difficulty based on chord count and types
  const difficulty = estimateDifficulty(allChords)

  return {
    title,
    artist,
    key,
    chords: allChords,
    chord_structure: structure,
    difficulty,
    genre,
    youtube_url,
    source_url: sourceUrl,
  }
}
```

### Chord Structure Extraction

Extract the progression without lyrics:

```typescript
function extractChordStructure(cifraText: string): Record<string, string> {
  const structure: Record<string, string> = {}
  const lines = cifraText.split('\n')
  
  let currentSection = 'intro'
  const sectionRegex = /\[(Intro|Verso|Refrão|Ponte|Solo|Chorus|Verse|Bridge|Pre-Chorus|Outro|Final)\]/i

  for (const line of lines) {
    const sectionMatch = line.match(sectionRegex)
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase()
        .replace('verso', 'verso')
        .replace('refrão', 'refrao')
        .replace('chorus', 'refrao')
        .replace('verse', 'verso')
        .replace('bridge', 'ponte')
      continue
    }

    // Only keep lines that have chords (uppercase letters at specific positions)
    const hasChords = /^[A-G][#b]?/.test(line.trim()) || /\s[A-G][#b]?/.test(line)
    if (hasChords && line.trim().length > 0) {
      // Extract only the chords from this line, skip lyrics
      const chordsOnly = line.replace(/[^A-Ga-g#bm0-9\/\s\-|()]/g, '').trim()
      if (chordsOnly) {
        if (structure[currentSection]) {
          structure[currentSection] += ' | ' + chordsOnly
        } else {
          structure[currentSection] = chordsOnly
        }
      }
    }
  }

  return structure
}
```

### Difficulty Estimation

```typescript
function estimateDifficulty(chords: string[]): number {
  let score = 0
  const barreChords = ['F', 'Fm', 'Bm', 'Bb', 'Gm', 'Cm', 'C#m', 'F#m', 'Eb']
  const jazzChords = /maj7|dim|aug|sus|add|9|11|13/

  for (const chord of chords) {
    if (barreChords.includes(chord)) score += 2
    if (jazzChords.test(chord)) score += 3
  }

  // Factor in total chord count
  score += Math.floor(chords.length / 3)

  // Map to 1-5
  if (score <= 2) return 1   // Beginner
  if (score <= 5) return 2   // Easy
  if (score <= 10) return 3  // Intermediate
  if (score <= 15) return 4  // Advanced
  return 5                    // Expert
}
```

## Frontend Integration

### Search & Import Component

```typescript
// In the Repertório page
async function importFromCifraClub(url: string) {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cifra-club-import`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ url }),
    }
  )

  const cifra = await response.json()
  
  // Preview to curator before saving
  return cifra
}

// After curator approves, save to repertoire
async function saveToRepertoire(cifra: CifraData, instruments: string[]) {
  const { data, error } = await supabase
    .from('repertoire')
    .insert({
      title: cifra.title,
      artist: cifra.artist,
      chords: cifra.chords,
      key: cifra.key,
      genre: cifra.genre,
      difficulty: cifra.difficulty,
      instruments,
      chord_structure: cifra.chord_structure,
      cifra_source: 'cifra_club',
      is_public_domain: false,
      youtube_url: cifra.youtube_url,
      curation_status: 'draft',  // Always starts as draft
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

## Mapping to Database

| Cifra Club Field | Supabase Column | Notes |
|-----------------|-----------------|-------|
| Song title | `repertoire.title` | Direct |
| Artist name | `repertoire.artist` | Direct |
| Tom (key) | `repertoire.key` | e.g., "G", "Am" |
| Chords found | `repertoire.chords` | text[] unique chords |
| Sections | `repertoire.chord_structure` | jsonb {"intro":"G C", "verso":"G C Am F"} |
| Difficulty | `repertoire.difficulty` | 1-5, auto-estimated |
| Genre | `repertoire.genre` | From page metadata |
| YouTube | `repertoire.youtube_url` | If available on page |
| Source URL | `repertoire.cifra_source` | Always 'cifra_club' |
| — | `repertoire.is_public_domain` | Always false for Cifra Club imports |
| — | `repertoire.curation_status` | Always 'draft' on import |

## Chord-to-ChordLibrary Linking

After importing a song, check which chords exist in `chord_library`:

```typescript
async function linkChordsToLibrary(chords: string[]) {
  const { data: existing } = await supabase
    .from('chord_library')
    .select('name')
    .in('name', chords)

  const existingNames = existing?.map(c => c.name) || []
  const missing = chords.filter(c => !existingNames.includes(c))

  return { existing: existingNames, missing }
  // missing chords can be flagged for manual creation in chord_library
}
```

## Rate Limiting & Best Practices

1. **Rate limit scraping** — max 1 request per 2 seconds to cifraclub.com.br
2. **Cache responses** — store raw HTML in Supabase Storage for 24h to avoid re-fetching
3. **User-Agent** — always identify as LAJourney internal tool
4. **No lyrics** — NEVER store or display song lyrics (copyright violation)
5. **Curated only** — all imports go through curation workflow (draft → review → approved)
6. **Fallback** — if Cifra Club changes structure, have manual entry as fallback
7. **Batch import** — for initial seeding, import artist's top songs one at a time with delays

## Edge Function Deployment

```bash
# Deploy via Supabase CLI
supabase functions deploy cifra-club-import --project-ref rkfszavfqplhorvfpkcq

# Or via Claude (MCP) — create as Edge Function in the Supabase dashboard
```

## Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| URL inválida | Not a cifraclub.com.br URL | 400 |
| Música não encontrada | 404 from Cifra Club | 404 |
| Parsing failed | Page structure changed | 500 + log for fix |
| Rate limited | Too many requests | 429 + retry after 5s |
