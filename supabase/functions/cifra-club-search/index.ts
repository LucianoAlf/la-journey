import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface SearchResult {
  title: string
  artist: string
  url: string
  slug: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
}

// Slugs que nao sao musicas
const SKIP_SLUGS = new Set([
  'mais-acessadas', 'todas-as-cifras', 'popularidade', 'alfabetica',
  'videos', 'letras', 'fotos', 'biografia', 'discografia', 'album',
  'videoaulas', 'bass', 'guitarpro', 'sheet', 'lyrics', 'poprock',
  'rock', 'mpb', 'sertanejo', 'pagode', 'samba', 'reggae', 'gospel',
  'forro', 'bossa-nova', 'pop', 'metal', 'punk', 'blues', 'jazz',
  'country', 'axe', 'funk', 'soul', 'hip-hop', 'rap', 'eletronica',
])

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
}

// ========== API Solr (autocomplete, fuzzy, ~10 resultados) ==========

interface SolrDoc {
  id: string
  t: string      // "1" = artista, "2" = musica
  art: string
  dns: string    // slug do artista
  txt: string    // titulo
  url: string    // slug da musica
  h: number
  score: number
}

interface SolrResponse {
  response: {
    numFound: number
    docs: SolrDoc[]
  }
}

function parseJsonp(text: string): SolrResponse | null {
  try {
    const idx = text.indexOf('(')
    if (idx > 0 && idx < 30) {
      const lastParen = text.lastIndexOf(')')
      if (lastParen > idx) {
        return JSON.parse(text.substring(idx + 1, lastParen))
      }
    }
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function searchSolr(query: string): Promise<SolrResponse | null> {
  const url = `https://solr.sscdn.co/cc/A/?q=${encodeURIComponent(query)}&rows=200`
  try {
    const response = await fetch(url, { headers: FETCH_HEADERS })
    if (!response.ok) return null
    const text = await response.text()
    return parseJsonp(text)
  } catch {
    return null
  }
}

function isValidSongSlug(slug: string, artistSlug: string): boolean {
  if (SKIP_SLUGS.has(slug)) return false
  if (slug.length < 2) return false
  if (slug === artistSlug) return false
  // Excluir videoaulas (contem nome do artista como prefixo)
  if (slug.startsWith(artistSlug + '-')) return false
  // Excluir slugs que sao claramente nao-musicas
  if (slug.endsWith('-html')) return false
  return true
}

// ========== Scraping de paginas do artista ==========

async function scrapeArtistSongs(artistSlug: string): Promise<{ name: string; songs: SearchResult[] }> {
  const url = `https://www.cifraclub.com.br/${artistSlug}/`
  try {
    const response = await fetch(url, { headers: FETCH_HEADERS })
    if (!response.ok) return { name: '', songs: [] }
    const buffer = await response.arrayBuffer()
    const html = new TextDecoder('utf-8').decode(buffer)
    
    // Extrair nome do artista
    let artistName = slugToTitle(artistSlug)
    const titleMatch = html.match(/<title>([^<]+)<\/title>/)
    if (titleMatch) {
      const decoded = decodeHtmlEntities(titleMatch[1])
      const parts = decoded.split(/\s*[-\u2013|]\s*/)
      if (parts[0]?.trim()?.length > 1) artistName = parts[0].trim()
    }
    
    // Mapa de slug -> titulo correto
    const titleMap = new Map<string, string>()
    
    // Extrair titulos de elementos RSC (escaped JSON em scripts)
    const rscNameUrl = /\\"name\\":\\"([^\\]+)\\",\\"url\\":\\"([a-z0-9][a-z0-9-]*)\\"/g
    let m
    while ((m = rscNameUrl.exec(html)) !== null) {
      titleMap.set(m[2], m[1])
    }
    
    // Extrair de alt tags
    const altRegex = /alt="[^"]*?&quot;([^&]+)&quot;/g
    while ((m = altRegex.exec(html)) !== null) {
      const songTitle = decodeHtmlEntities(m[1].trim())
      const before = html.substring(Math.max(0, m.index - 500), m.index)
      const hrefMatches = [...before.matchAll(new RegExp(`href="/${artistSlug}/([a-z0-9][a-z0-9-]*)/"`, 'g'))]
      if (hrefMatches.length > 0) {
        const slug = hrefMatches[hrefMatches.length - 1][1]
        if (!titleMap.has(slug)) titleMap.set(slug, songTitle)
      }
    }
    
    // Coletar todos os slugs de musicas
    const slugSet = new Set<string>()
    
    // 1. Hrefs normais no HTML
    const hrefRegex = new RegExp(`href="/${artistSlug}/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)/"`, 'g')
    while ((m = hrefRegex.exec(html)) !== null) {
      const slug = m[1]
      if (isValidSongSlug(slug, artistSlug)) slugSet.add(slug)
    }
    
    // 2. URLs nos payloads RSC (escaped)
    const rscUrlRegex = /\\"url\\":\\"([a-z0-9][a-z0-9-]*)\\"/g
    while ((m = rscUrlRegex.exec(html)) !== null) {
      const slug = m[1]
      if (isValidSongSlug(slug, artistSlug)) slugSet.add(slug)
    }
    
    // Construir resultados
    const results: SearchResult[] = []
    for (const slug of slugSet) {
      results.push({
        title: titleMap.get(slug) || slugToTitle(slug),
        artist: artistName,
        url: `https://www.cifraclub.com.br/${artistSlug}/${slug}/`,
        slug: `${artistSlug}/${slug}`,
      })
    }
    
    return { name: artistName, songs: results }
  } catch {
    return { name: '', songs: [] }
  }
}

// ========== Combinar resultados ==========

function mergeResults(solrResults: SearchResult[], scrapedResults: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  const merged: SearchResult[] = []
  // Solr primeiro (titulos corretos, com acentos)
  for (const r of solrResults) {
    if (!seen.has(r.slug)) { seen.add(r.slug); merged.push(r) }
  }
  // Scraped complementa
  for (const r of scrapedResults) {
    if (!seen.has(r.slug)) { seen.add(r.slug); merged.push(r) }
  }
  return merged
}

// ========== Handler principal ==========

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const body = await req.json()
    const { query, artist, song } = body as { query?: string; artist?: string; song?: string }
    
    // Modo 1: artist + song explicitos
    if (artist && song) {
      const solr = await searchSolr(`${artist} ${song}`)
      if (solr && solr.response.docs.length > 0) {
        const seen = new Set<string>()
        const results = solr.response.docs
          .filter(d => d.t === '2')
          .map(d => {
            const slug = `${d.dns}/${d.url}`
            if (seen.has(slug)) return null
            seen.add(slug)
            return { title: d.txt, artist: d.art, url: `https://www.cifraclub.com.br/${d.dns}/${d.url}/`, slug }
          })
          .filter((r): r is SearchResult => r !== null)
        if (results.length > 0) {
          return new Response(
            JSON.stringify({ results, mode: 'search_results', total: results.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
      const artistSlug = slugify(artist)
      const { songs: allSongs } = await scrapeArtistSongs(artistSlug)
      const songLower = song.toLowerCase()
      const filtered = allSongs.filter(s => s.title.toLowerCase().includes(songLower))
      return new Response(
        JSON.stringify({
          results: filtered.length > 0 ? filtered : allSongs,
          mode: filtered.length > 0 ? 'filtered' : 'artist_songs',
          total: filtered.length > 0 ? filtered.length : allSongs.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Modo 2: query livre
    if (query) {
      // Passo 1: Busca Solr (fuzzy, inteligente)
      const solr = await searchSolr(query)
      
      let solrArtistSlug = ''
      let solrArtistName = ''
      let solrSongResults: SearchResult[] = []
      
      if (solr && solr.response.docs.length > 0) {
        const docs = solr.response.docs
        
        // Identificar artista principal
        const artistDoc = docs.find(d => d.t === '1')
        if (artistDoc) {
          solrArtistSlug = artistDoc.dns
          solrArtistName = artistDoc.txt
        } else {
          // Artista mais frequente entre musicas
          const slugCounts = new Map<string, { count: number; name: string }>()
          for (const d of docs.filter(x => x.t === '2')) {
            const entry = slugCounts.get(d.dns) || { count: 0, name: d.art }
            entry.count++
            slugCounts.set(d.dns, entry)
          }
          let maxCount = 0
          for (const [slug, { count, name }] of slugCounts) {
            if (count > maxCount) {
              maxCount = count
              solrArtistSlug = slug
              solrArtistName = name
            }
          }
        }
        
        // Converter musicas do Solr
        const seen = new Set<string>()
        solrSongResults = docs
          .filter(d => d.t === '2')
          .map(d => {
            const slug = `${d.dns}/${d.url}`
            if (seen.has(slug)) return null
            seen.add(slug)
            return { title: d.txt, artist: d.art, url: `https://www.cifraclub.com.br/${d.dns}/${d.url}/`, slug }
          })
          .filter((r): r is SearchResult => r !== null)
      }
      
      // Passo 2: Scraping para complementar
      // Usar slug do Solr se disponivel (mais preciso, especialmente com typos)
      const targetSlug = solrArtistSlug || slugify(query)
      const { name: scrapedName, songs: scrapedSongs } = await scrapeArtistSongs(targetSlug)
      
      const finalArtistName = solrArtistName || scrapedName || slugToTitle(targetSlug)
      
      // Passo 3: Combinar
      const allResults = mergeResults(solrSongResults, scrapedSongs)
      
      if (allResults.length > 0) {
        const artistSongs = allResults.filter(r => r.slug.startsWith(targetSlug + '/'))
        const otherSongs = allResults.filter(r => !r.slug.startsWith(targetSlug + '/'))
        
        if (artistSongs.length > 0) {
          const results = [...artistSongs, ...otherSongs]
          return new Response(
            JSON.stringify({
              results,
              mode: 'artist_songs',
              total: results.length,
              matched_artist: finalArtistName,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({
            results: allResults,
            mode: 'search_results',
            total: allResults.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ results: [], mode: 'not_found', total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Informe query, ou artist + song' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
