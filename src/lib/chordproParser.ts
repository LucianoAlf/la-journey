/**
 * Parser de arquivos ChordPro (.cho, .chopro, .pro, .crd)
 * Converte ChordPro → formato compatível com a tabela `repertoire`
 *
 * Formato ChordPro:
 *   {title: Nome da Música}
 *   {artist: Artista}
 *   {key: Am}
 *   {capo: 2}
 *   {tempo: 120}
 *   [Am]Letra com [C]acordes [G]inline
 *   {start_of_chorus} ... {end_of_chorus}
 *   {comment: Refrão}
 *
 * Saída:
 *   - title, artist, key, bpm, capo, time_signature
 *   - chords: lista única de acordes detectados
 *   - cifra_content: texto formatado com acordes em linha separada (estilo cifra)
 *   - lyrics: texto puro sem acordes
 *   - sections: array de seções {name, startLine}
 */

export interface ChordProParsed {
  title: string
  artist: string
  key: string | null
  bpm: number | null
  capo: number
  timeSignature: string
  chords: string[]
  cifraContent: string
  lyrics: string
  sections: Array<{ name: string; startLine: number }>
  genre: string | null
  sourceFormat: 'chordpro'
}

/** Diretivas ChordPro reconhecidas */
const DIRECTIVE_RE = /^\{(\w+)(?:\s*[:=]\s*(.+?))?\}$/

/** Acordes inline entre colchetes */
const CHORD_RE = /\[([^\]]+)\]/g

/** Seções reconhecidas */
const SECTION_STARTS: Record<string, string> = {
  'start_of_chorus': 'Refrão',
  'soc': 'Refrão',
  'start_of_verse': 'Verso',
  'sov': 'Verso',
  'start_of_bridge': 'Ponte',
  'sob': 'Ponte',
  'start_of_tab': 'Tab',
  'sot': 'Tab',
  'start_of_grid': 'Grid',
  'sog': 'Grid',
}

const SECTION_ENDS = new Set([
  'end_of_chorus', 'eoc',
  'end_of_verse', 'eov',
  'end_of_bridge', 'eob',
  'end_of_tab', 'eot',
  'end_of_grid', 'eog',
])

/**
 * Converte uma linha ChordPro com acordes inline em duas linhas:
 * - Linha de acordes (espaçados acima das sílabas)
 * - Linha de texto puro
 */
function chordLineToTwoLines(line: string): { chordLine: string; textLine: string } {
  let chordLine = ''
  let textLine = ''
  let lastIndex = 0

  const regex = /\[([^\]]+)\]/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    // Texto antes do acorde
    const textBefore = line.substring(lastIndex, match.index)
    textLine += textBefore

    // Posicionar acorde acima da sílaba
    const currentPos = textLine.length
    while (chordLine.length < currentPos) chordLine += ' '
    chordLine += match[1]

    lastIndex = match.index + match[0].length
  }

  // Texto restante após último acorde
  textLine += line.substring(lastIndex)

  return { chordLine: chordLine.trimEnd(), textLine }
}

/**
 * Extrai todos os acordes únicos de um texto ChordPro
 */
function extractChords(content: string): string[] {
  const chords = new Set<string>()
  let match: RegExpExecArray | null
  const regex = /\[([^\]]+)\]/g

  while ((match = regex.exec(content)) !== null) {
    const chord = match[1].trim()
    // Filtrar anotações (começam com *) e diretivas
    if (!chord.startsWith('*') && !chord.startsWith('{')) {
      chords.add(chord)
    }
  }

  return Array.from(chords)
}

/**
 * Parseia um arquivo ChordPro completo
 */
export function parseChordPro(content: string): ChordProParsed {
  const lines = content.replace(/\r\n/g, '\n').split('\n')

  let title = ''
  let artist = ''
  let key: string | null = null
  let bpm: number | null = null
  let capo = 0
  let timeSignature = '4/4'
  let genre: string | null = null

  const cifraLines: string[] = []
  const lyricsLines: string[] = []
  const sections: Array<{ name: string; startLine: number }> = []

  let currentSection: string | null = null
  let lineCounter = 0

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Linha vazia
    if (!line) {
      cifraLines.push('')
      lyricsLines.push('')
      lineCounter++
      continue
    }

    // Comentários (ignorar)
    if (line.startsWith('#')) continue

    // Diretivas
    const directiveMatch = line.match(DIRECTIVE_RE)
    if (directiveMatch) {
      const directive = directiveMatch[1].toLowerCase()
      const value = directiveMatch[2]?.trim() ?? ''

      // Metadados
      switch (directive) {
        case 'title':
        case 't':
          title = value
          continue
        case 'subtitle':
        case 'st':
        case 'artist':
          artist = value
          continue
        case 'key':
          key = value
          continue
        case 'tempo':
          bpm = parseInt(value) || null
          continue
        case 'capo':
          capo = parseInt(value) || 0
          continue
        case 'time':
          timeSignature = value || '4/4'
          continue
        case 'genre':
          genre = value
          continue
      }

      // Seções
      if (SECTION_STARTS[directive]) {
        currentSection = value || SECTION_STARTS[directive]
        sections.push({ name: currentSection, startLine: lineCounter })
        cifraLines.push(`[${currentSection}]`)
        lyricsLines.push(`[${currentSection}]`)
        lineCounter++
        continue
      }

      if (SECTION_ENDS.has(directive)) {
        currentSection = null
        continue
      }

      // Comentários visuais (ex: {comment: Refrão})
      if (directive === 'comment' || directive === 'c' ||
          directive === 'comment_italic' || directive === 'ci') {
        cifraLines.push(`[${value}]`)
        lyricsLines.push(`[${value}]`)
        lineCounter++
        continue
      }

      // Diretivas não reconhecidas — ignorar silenciosamente
      continue
    }

    // Linha com acordes inline
    if (CHORD_RE.test(line)) {
      // Reset regex lastIndex
      CHORD_RE.lastIndex = 0

      const { chordLine, textLine } = chordLineToTwoLines(line)

      if (chordLine) {
        cifraLines.push(chordLine)
        lineCounter++
      }
      if (textLine.trim()) {
        cifraLines.push(textLine)
        lyricsLines.push(textLine)
        lineCounter++
      } else if (chordLine) {
        // Linha só com acordes (sem texto)
        lyricsLines.push('')
      }

      continue
    }

    // Linha de texto puro (sem acordes)
    cifraLines.push(line)
    lyricsLines.push(line)
    lineCounter++
  }

  // Extrair acordes únicos
  const chords = extractChords(content)

  // Limpar linhas vazias consecutivas no final
  while (cifraLines.length > 0 && cifraLines[cifraLines.length - 1] === '') {
    cifraLines.pop()
  }
  while (lyricsLines.length > 0 && lyricsLines[lyricsLines.length - 1] === '') {
    lyricsLines.pop()
  }

  return {
    title: title || 'Sem título',
    artist: artist || '',
    key,
    bpm,
    capo,
    timeSignature,
    chords,
    cifraContent: cifraLines.join('\n'),
    lyrics: lyricsLines.join('\n'),
    sections,
    genre,
    sourceFormat: 'chordpro',
  }
}

/**
 * Converte um ChordProParsed em um objeto compatível com a tabela repertoire
 */
export function chordProToRepertoire(parsed: ChordProParsed, schoolId: string) {
  return {
    school_id: schoolId,
    title: parsed.title,
    artist: parsed.artist || null,
    chords: parsed.chords,
    key: parsed.key || (parsed.chords.length > 0 ? parsed.chords[0] : null),
    genre: parsed.genre,
    difficulty: estimateChordProDifficulty(parsed.chords),
    instruments: ['guitar'] as string[],
    cifra_source: 'chordpro' as const,
    cifra_content: parsed.cifraContent,
    lyrics: parsed.lyrics || null,
    bpm: parsed.bpm,
    capo: parsed.capo,
    time_signature: parsed.timeSignature,
    curation_status: 'draft' as const,
    sections: parsed.sections,
  }
}

/**
 * Estima dificuldade baseada nos acordes (1-5)
 */
function estimateChordProDifficulty(chords: string[]): number {
  if (chords.length === 0) return 1

  let score = 0
  const hasBarreChords = chords.some(c => /^[A-G][#b]?m?$/.test(c) && ['F', 'F#', 'Bb', 'B', 'Bm'].includes(c))
  const hasExtended = chords.some(c => /\d{2}|maj|dim|aug|sus|add|alt/.test(c))
  const hasSlash = chords.some(c => c.includes('/'))
  const hasAltered = chords.some(c => /#\d|b\d/.test(c))

  score += Math.min(chords.length / 4, 2) // Mais acordes = mais difícil
  if (hasBarreChords) score += 1
  if (hasExtended) score += 1
  if (hasSlash) score += 0.5
  if (hasAltered) score += 0.5

  return Math.max(1, Math.min(5, Math.round(score)))
}

/**
 * Detecta se um texto é formato ChordPro
 */
export function isChordProFormat(content: string): boolean {
  const lines = content.split('\n').slice(0, 20)
  let score = 0

  for (const line of lines) {
    if (DIRECTIVE_RE.test(line.trim())) score += 2
    if (/\[[A-G][#b]?[^\]]*\]/.test(line)) score += 1
  }

  return score >= 2
}

/**
 * Parseia múltiplos arquivos ChordPro de um texto concatenado
 * (alguns arquivos têm várias músicas separadas por {new_song} ou {ns})
 */
export function parseMultipleChordPro(content: string): ChordProParsed[] {
  const songs = content.split(/\{(?:new_song|ns)\}/i)
  return songs
    .map(s => s.trim())
    .filter(s => s.length > 10)
    .map(s => parseChordPro(s))
}
