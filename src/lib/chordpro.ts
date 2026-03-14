/**
 * ChordPro Parser — converte entre formato ChordPro e ChordsOverWords.
 *
 * ChordPro: "[Am]Texto da [G]letra"
 * ChordsOverWords:
 *   Am       G
 *   Texto da letra
 *
 * Referência: https://www.chordpro.org/chordpro/
 */

// ============================================================
// Regex patterns
// ============================================================

/** Detecta acordes inline no formato ChordPro: [Am], [G7], [F#m7/C#] */
const CHORDPRO_CHORD_RE = /\[([A-G][#b]?[^\]]*)\]/g

/** Detecta diretivas ChordPro: {title: ...}, {t: ...}, {comment: ...} */
const DIRECTIVE_RE = /^\{(\w+)(?:\s*:\s*(.+))?\}\s*$/

/** Regex para validar se um token é um acorde */
const CHORD_TOKEN_RE = /^[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9]|\/[A-G][#b]?)*$/

// ============================================================
// Tipos
// ============================================================

export interface ChordProMetadata {
  title?: string
  subtitle?: string
  artist?: string
  key?: string
  tempo?: string
  capo?: string
  [key: string]: string | undefined
}

// ============================================================
// Alias de diretivas ChordPro
// ============================================================

const DIRECTIVE_ALIASES: Record<string, string> = {
  t: 'title',
  st: 'subtitle',
  c: 'comment',
  ci: 'comment_italic',
  cb: 'comment_box',
  soc: 'start_of_chorus',
  eoc: 'end_of_chorus',
  sov: 'start_of_verse',
  eov: 'end_of_verse',
  sob: 'start_of_bridge',
  eob: 'end_of_bridge',
  sot: 'start_of_tab',
  eot: 'end_of_tab',
}

/** Mapa de seções ChordPro → label bonito */
const SECTION_MAP: Record<string, string> = {
  start_of_chorus: 'Refrão',
  start_of_verse: 'Verso',
  start_of_bridge: 'Ponte',
  start_of_tab: 'Tab',
}

// ============================================================
// parseChordPro — extrai metadados e converte para ChordsOverWords
// ============================================================

/**
 * Converte texto ChordPro para o formato ChordsOverWords usado pelo LA Journey.
 *
 * Entrada:
 *   {title: Like a Virgin}
 *   {artist: Madonna}
 *   {key: D}
 *   {soc}
 *   [D]Like a [Em]virgin
 *   {eoc}
 *
 * Saída (content):
 *   [Refrão]
 *   D        Em
 *   Like a virgin
 */
export function chordProToPlainText(chordProText: string): {
  content: string
  metadata: ChordProMetadata
} {
  const lines = chordProText.split('\n')
  const metadata: ChordProMetadata = {}
  const outputLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Linha vazia
    if (!trimmed) {
      outputLines.push('')
      continue
    }

    // Diretiva {key: value}
    const dirMatch = trimmed.match(DIRECTIVE_RE)
    if (dirMatch) {
      const rawName = dirMatch[1].toLowerCase()
      const value = dirMatch[2]?.trim() ?? ''
      const name = DIRECTIVE_ALIASES[rawName] ?? rawName

      // Metadados
      if (name === 'title') metadata.title = value
      else if (name === 'subtitle' || name === 'artist') metadata.artist = value
      else if (name === 'key') metadata.key = value
      else if (name === 'tempo') metadata.tempo = value
      else if (name === 'capo') metadata.capo = value

      // Seções
      if (SECTION_MAP[name]) {
        outputLines.push(`[${SECTION_MAP[name]}]`)
      }
      // Comentários → seções ou linhas especiais
      else if (name === 'comment' && value) {
        outputLines.push(`[${value}]`)
      }
      // Diretivas de fim de seção — ignorar (já temos \n)
      // title, artist, key, etc — já capturados acima, não emitir

      continue
    }

    // Linha com acordes inline: [Am]Texto da [G]letra
    if (CHORDPRO_CHORD_RE.test(trimmed)) {
      // Resetar regex
      CHORDPRO_CHORD_RE.lastIndex = 0

      const { chordLine, lyricLine } = extractChordsFromChordProLine(trimmed)

      // Se tem acordes e letra
      if (chordLine.trim() && lyricLine.trim()) {
        outputLines.push(chordLine)
        outputLines.push(lyricLine)
      }
      // Só acordes, sem letra
      else if (chordLine.trim()) {
        outputLines.push(chordLine)
      }
      // Só letra (não deveria acontecer mas por segurança)
      else {
        outputLines.push(lyricLine)
      }
      continue
    }

    // Linha normal (sem acordes, sem diretivas)
    outputLines.push(line)
  }

  return {
    content: outputLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    metadata,
  }
}

/**
 * Extrai acordes e letra de uma linha ChordPro.
 * "[Am]Texto da [G]letra" →
 *   chordLine: "Am       G"
 *   lyricLine: "Texto da letra"
 */
function extractChordsFromChordProLine(line: string): {
  chordLine: string
  lyricLine: string
} {
  let lyric = ''
  let chordPositions: Array<{ chord: string; pos: number }> = []
  let lastIndex = 0

  CHORDPRO_CHORD_RE.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = CHORDPRO_CHORD_RE.exec(line)) !== null) {
    // Texto entre o último acorde e este
    const textBefore = line.slice(lastIndex, match.index)
    // Remover brackets de acordes anteriores do texto
    const cleanText = textBefore.replace(CHORDPRO_CHORD_RE, '')

    lyric += cleanText
    chordPositions.push({ chord: match[1], pos: lyric.length })
    lastIndex = match.index + match[0].length
  }

  // Texto restante após o último acorde
  const remaining = line.slice(lastIndex)
  lyric += remaining

  // Construir a linha de acordes alinhada com a letra
  if (chordPositions.length === 0) {
    return { chordLine: '', lyricLine: lyric }
  }

  let chordLine = ''
  for (const { chord, pos } of chordPositions) {
    // Padding até a posição correta
    while (chordLine.length < pos) {
      chordLine += ' '
    }
    chordLine += chord
  }

  return { chordLine, lyricLine: lyric }
}

// ============================================================
// plainTextToChordPro — converte ChordsOverWords para ChordPro
// ============================================================

/**
 * Converte texto no formato ChordsOverWords para ChordPro.
 *
 * Entrada:
 *   [Refrão]
 *   D        Em
 *   Like a virgin
 *
 * Saída:
 *   {start_of_chorus}
 *   [D]Like a [Em]virgin
 *   {end_of_chorus}
 */
export function plainTextToChordPro(
  plainText: string,
  metadata?: ChordProMetadata
): string {
  const lines = plainText.split('\n')
  const outputLines: string[] = []

  // Emitir metadados
  if (metadata?.title) outputLines.push(`{title: ${metadata.title}}`)
  if (metadata?.artist) outputLines.push(`{artist: ${metadata.artist}}`)
  if (metadata?.key) outputLines.push(`{key: ${metadata.key}}`)
  if (metadata?.tempo) outputLines.push(`{tempo: ${metadata.tempo}}`)
  if (metadata?.capo) outputLines.push(`{capo: ${metadata.capo}}`)
  if (outputLines.length > 0) outputLines.push('')

  // Mapa reverso de seções
  const SECTION_TO_DIRECTIVE: Record<string, { start: string; end: string }> = {
    'Refrão': { start: '{start_of_chorus}', end: '{end_of_chorus}' },
    'Chorus': { start: '{start_of_chorus}', end: '{end_of_chorus}' },
    'Verso': { start: '{start_of_verse}', end: '{end_of_verse}' },
    'Verse': { start: '{start_of_verse}', end: '{end_of_verse}' },
    'Ponte': { start: '{start_of_bridge}', end: '{end_of_bridge}' },
    'Bridge': { start: '{start_of_bridge}', end: '{end_of_bridge}' },
    'Tab': { start: '{start_of_tab}', end: '{end_of_tab}' },
    'Tablatura': { start: '{start_of_tab}', end: '{end_of_tab}' },
  }

  let currentSectionEnd: string | null = null
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Linha vazia
    if (!trimmed) {
      // Se estamos numa seção e vem linha vazia, fechar seção
      if (currentSectionEnd) {
        outputLines.push(currentSectionEnd)
        currentSectionEnd = null
      }
      outputLines.push('')
      i++
      continue
    }

    // Seção [Intro], [Verso], etc
    const sectionMatch = trimmed.match(/^\[(.+)\]$/)
    if (sectionMatch) {
      // Fechar seção anterior se aberta
      if (currentSectionEnd) {
        outputLines.push(currentSectionEnd)
        currentSectionEnd = null
      }

      const sectionName = sectionMatch[1]
      // Extrair nome base (sem número): "Verso 2" → "Verso"
      const baseName = sectionName.replace(/\s*\d+$/, '')
      const directive = SECTION_TO_DIRECTIVE[baseName]

      if (directive) {
        outputLines.push(directive.start)
        currentSectionEnd = directive.end
      } else {
        // Seção genérica → comment
        outputLines.push(`{comment: ${sectionName}}`)
      }
      i++
      continue
    }

    // Detectar se é uma linha de acordes seguida por linha de letra
    if (isChordLine(trimmed) && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      const nextTrimmed = nextLine.trim()

      // Se a próxima linha NÃO é de acordes e NÃO é vazia e NÃO é seção
      if (nextTrimmed && !isChordLine(nextTrimmed) && !/^\[.+\]$/.test(nextTrimmed)) {
        // Mesclar acordes + letra
        const merged = mergeChordsAndLyrics(line, nextLine)
        outputLines.push(merged)
        i += 2
        continue
      }

      // Linha de acordes sozinha (sem letra abaixo)
      const chords = trimmed.split(/\s+/).filter(t => CHORD_TOKEN_RE.test(t))
      outputLines.push(chords.map(c => `[${c}]`).join(' '))
      i++
      continue
    }

    // Linha de tablatura — manter como está
    if (/^\s*[EBADGe]\|/.test(line)) {
      outputLines.push(line)
      i++
      continue
    }

    // Linha de letra normal (sem acordes acima)
    outputLines.push(trimmed)
    i++
  }

  // Fechar seção se ainda aberta
  if (currentSectionEnd) {
    outputLines.push(currentSectionEnd)
  }

  return outputLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Verifica se uma linha é predominantemente de acordes.
 */
function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/)
  if (tokens.length === 0) return false
  const chordCount = tokens.filter(t => CHORD_TOKEN_RE.test(t) || t === '|').length
  return chordCount / tokens.length > 0.5
}

/**
 * Mescla uma linha de acordes com uma linha de letra no formato ChordPro.
 *
 * Entrada:
 *   chordLine: "Am       G       F"
 *   lyricLine: "Texto da letra aqui"
 *
 * Saída: "[Am]Texto da [G]letra a[F]qui"
 */
function mergeChordsAndLyrics(chordLine: string, lyricLine: string): string {
  // Extrair posições dos acordes
  const chordPositions: Array<{ chord: string; pos: number }> = []
  const re = /[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9]|\/[A-G][#b]?)*/g
  let match: RegExpExecArray | null

  while ((match = re.exec(chordLine)) !== null) {
    if (CHORD_TOKEN_RE.test(match[0])) {
      chordPositions.push({ chord: match[0], pos: match.index })
    }
  }

  if (chordPositions.length === 0) return lyricLine

  // Inserir acordes na posição correta da letra (de trás pra frente para não deslocar índices)
  let result = lyricLine
  for (let j = chordPositions.length - 1; j >= 0; j--) {
    const { chord, pos } = chordPositions[j]
    const insertPos = Math.min(pos, result.length)
    result = result.slice(0, insertPos) + `[${chord}]` + result.slice(insertPos)
  }

  return result
}

// ============================================================
// extractChordProMetadata — extrai apenas metadados sem converter
// ============================================================

/**
 * Extrai metadados de um texto ChordPro sem converter o conteúdo.
 */
export function extractChordProMetadata(chordProText: string): ChordProMetadata {
  const metadata: ChordProMetadata = {}

  for (const line of chordProText.split('\n')) {
    const match = line.trim().match(DIRECTIVE_RE)
    if (!match) continue

    const rawName = match[1].toLowerCase()
    const value = match[2]?.trim() ?? ''
    const name = DIRECTIVE_ALIASES[rawName] ?? rawName

    if (name === 'title') metadata.title = value
    else if (name === 'subtitle' || name === 'artist') metadata.artist = value
    else if (name === 'key') metadata.key = value
    else if (name === 'tempo') metadata.tempo = value
    else if (name === 'capo') metadata.capo = value
  }

  return metadata
}

// ============================================================
// extractChordsFromChordPro — extrai lista de acordes únicos
// ============================================================

/**
 * Extrai todos os acordes únicos de um texto ChordPro.
 */
export function extractChordsFromChordPro(chordProText: string): string[] {
  const found = new Set<string>()
  CHORDPRO_CHORD_RE.lastIndex = 0
  let match: RegExpExecArray | null

  // Reset e buscar todos os acordes
  const re = /\[([A-G][#b]?[^\]]*)\]/g
  while ((match = re.exec(chordProText)) !== null) {
    found.add(match[1])
  }

  return Array.from(found)
}

// ============================================================
// isChordProFormat — detecta se um texto está em formato ChordPro
// ============================================================

/**
 * Detecta se um texto está no formato ChordPro.
 * Heurísticas: presença de diretivas {}, acordes inline [Am], etc.
 */
export function isChordProFormat(text: string): boolean {
  const lines = text.split('\n').slice(0, 30) // Analisar apenas primeiras 30 linhas
  let chordProIndicators = 0
  let totalLines = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    totalLines++

    // Diretivas ChordPro
    if (DIRECTIVE_RE.test(trimmed)) {
      chordProIndicators += 2
      continue
    }

    // Acordes inline [Am]texto
    if (/\[[A-G][#b]?[^\]]*\]/.test(trimmed)) {
      chordProIndicators++
    }
  }

  // Se mais de 20% das linhas têm indicadores ChordPro
  return totalLines > 0 && chordProIndicators / totalLines > 0.2
}
