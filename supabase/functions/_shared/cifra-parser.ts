export interface CifraData {
  title: string
  artist: string
  key: string | null
  chords: string[]
  chord_structure: Record<string, string>
  difficulty: number
  genre: string | null
  youtube_url: string | null
  source_url: string
  cifra_content: string
  lyrics: string
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

const CHORD_TOKEN =
  '[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9]+)*(?:\\/[A-G][#b]?)?(?:\\([^)]+\\))?'
const CHORD_TOKEN_RE = new RegExp(`^${CHORD_TOKEN}$`)

function chordsInLine(line: string): string[] {
  return line.match(new RegExp(CHORD_TOKEN, 'g')) ?? []
}

function isTabLine(line: string): boolean {
  return /^\s*[EBADGe]\|/.test(line) || /^\s*\|/.test(line.trim())
}

function isChordOnlyLine(line: string): boolean {
  if (!line.trim()) return false
  if (isTabLine(line)) return false
  const cleaned = line.replace(/\[.*?\]/g, '').trim()
  if (!cleaned) return false
  const tokens = cleaned.split(/\s+/)
  const chordTokens = tokens.filter((t) => CHORD_TOKEN_RE.test(t) || t === '|' || t === '(' || t === ')')
  return chordTokens.length / tokens.length > 0.5
}

function extractSection(line: string): string | null {
  const match = line.match(/^\s*\[([^\]]+)\]/)
  return match ? match[1].trim() : null
}

function normalizeSection(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\d+\s*$/, '')
    .replace('refrão', 'refrao')
    .replace('pré-refrão', 'pre_refrao')
    .replace('chorus', 'refrao')
    .replace('verse', 'verso')
    .replace('bridge', 'ponte')
    .replace('pre-chorus', 'pre_refrao')
    .replace(/\s+/g, '_')
}

function extractChordStructure(cifraText: string): Record<string, string> {
  const structure: Record<string, string> = {}
  const lines = cifraText.split('\n')
  let currentSection = 'intro'

  for (const line of lines) {
    const section = extractSection(line)
    if (section) {
      currentSection = normalizeSection(section)
      continue
    }
    if (isChordOnlyLine(line) && !isTabLine(line)) {
      const found = chordsInLine(line)
      if (found.length > 0) {
        const chordsStr = found.join(' ')
        structure[currentSection] = structure[currentSection]
          ? `${structure[currentSection]} | ${chordsStr}`
          : chordsStr
      }
    }
  }
  return structure
}

function extractLyrics(cifraText: string): string {
  const lines = cifraText.split('\n')
  const lyricsLines: string[] = []

  for (const line of lines) {
    if (isTabLine(line)) continue
    if (isChordOnlyLine(line)) continue
    if (extractSection(line)) {
      lyricsLines.push('')
      continue
    }
    const trimmed = line.trim()
    if (trimmed && trimmed.length > 1) lyricsLines.push(trimmed)
  }

  return lyricsLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function estimateDifficulty(chords: string[]): number {
  let score = 0
  const barreChords = ['F', 'Fm', 'Bm', 'Bb', 'Gm', 'Cm', 'C#m', 'F#m', 'Eb', 'Ab']
  const jazzRegex = /maj7|dim|aug|sus|add|9|11|13/

  for (const chord of chords) {
    if (barreChords.includes(chord)) score += 2
    if (jazzRegex.test(chord)) score += 3
  }
  score += Math.floor(chords.length / 3)

  if (score <= 2) return 1
  if (score <= 5) return 2
  if (score <= 10) return 3
  if (score <= 15) return 4
  return 5
}

function parseJsonLd(html: string): { title: string; artist: string; genre: string | null } {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
  let title = ''
  let artist = ''
  let genre: string | null = null

  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1])
      if (data['@type'] === 'MusicComposition' && data.name) title = title || String(data.name)
      if (Array.isArray(data['@type']) && data['@type'].includes('MusicRecording')) {
        title = title || String(data.name || '').replace(/^.*?\s-\s/, '')
        artist = artist || data.byArtist?.name || ''
      }
      if (data['@type'] === 'BreadcrumbList' && Array.isArray(data.itemListElement)) {
        const style = data.itemListElement.find((item: { position?: number }) => item.position === 2)
        if (style?.name && style.name !== 'Início') genre = style.name
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return { title, artist, genre }
}

function parseTitleArtist(html: string): { title: string; artist: string } {
  const ld = parseJsonLd(html)
  if (ld.title && ld.artist) return { title: ld.title, artist: ld.artist }

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title = stripTags(h1?.[1] || '').replace(/\s*verified.*$/i, '')

  const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
  const artist = stripTags(h2?.[1] || '')

  if (title && artist) return { title, artist }

  const pageTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1] || ''
  const parts = pageTitle.split(/\s+-\s+/)
  return {
    title: title || parts[0]?.trim() || '',
    artist: artist || parts[1]?.trim() || '',
  }
}

function parseKey(html: string): string | null {
  const button = html.match(/Tom(?:<!--[\s\S]*?-->)*\s*:?(?:<!--[\s\S]*?-->)*\s*<button[^>]*>([^<]+)<\/button>/i)
  if (button?.[1]) return stripTags(button[1])

  const legacy =
    html.match(/id="cifra_tom"[^>]*>[\s\S]*?<a[^>]*>([^<]+)</) ||
    html.match(/Tom:[\s]*<[^>]*>([A-G][#b]?m?)/) ||
    html.match(/class="[^"]*cipher--tom[^"]*"[^>]*>([^<]+)</)
  return legacy?.[1]?.trim() || null
}

function parseYoutubeUrl(html: string): string | null {
  const id =
    html.match(/youtube\.com\/watch\?v=([\w-]{11})/i)?.[1] ||
    html.match(/youtu\.be\/([\w-]{11})/i)?.[1] ||
    html.match(/youtube\.com\/embed\/([\w-]{11})/i)?.[1] ||
    html.match(/["']youtubeId["']\s*:\s*["']([\w-]{11})["']/i)?.[1]
  return id ? `https://www.youtube.com/watch?v=${id}` : null
}

function parseCifraText(html: string): string {
  const cifraMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
  const cifraRaw = cifraMatch?.[1] || ''
  return cifraRaw
    .replace(/<b[^>]*>([^<]*)<\/b>/g, '$1')
    .replace(/<\/?(span|a|i|u|strong|em|div)[^>]*>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

export function parseCifraPage(html: string, sourceUrl: string): CifraData {
  const { title, artist } = parseTitleArtist(html)
  const { genre: ldGenre } = parseJsonLd(html)
  const key = parseKey(html)
  const cifraText = parseCifraText(html)

  const allChords = [...new Set(
    cifraText
      .split('\n')
      .filter((line) => isChordOnlyLine(line))
      .flatMap((line) => chordsInLine(line)),
  )]

  const genreMatch =
    html.match(/<span[^>]*class="[^"]*genre[^"]*"[^>]*>([^<]+)</) ||
    html.match(/Gênero:[\s]*([^<,]+)/)

  const youtubeUrl = parseYoutubeUrl(html)

  return {
    title,
    artist,
    key,
    chords: allChords,
    chord_structure: extractChordStructure(cifraText),
    difficulty: estimateDifficulty(allChords),
    genre: ldGenre || genreMatch?.[1]?.trim() || null,
    youtube_url: youtubeUrl,
    source_url: sourceUrl,
    cifra_content: cifraText,
    lyrics: extractLyrics(cifraText),
  }
}
