/**
 * Transposição de tonalidade para cifras.
 * Usa lógica própria (leve, sem dependência externa pesada).
 * O ChordSheetJS é reservado para parse de formatos ChordPro (Fase E2).
 */

// Escala cromática com sustenidos e bemóis
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

// Tonalidades que usam bemol por convenção
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'])

// Regex para detectar um acorde válido (nota raiz + qualidade + baixo opcional)
// Suporta: C, Am, G7, F#m7, Bb5, B4, Csus4, Dadd9, E7M, A/G#, F#m7(11), etc.
const CHORD_RE = /^([A-G][#b]?)(m|M|maj|min|dim|aug|sus[24]?|add[249]?|7M?|[0-9]+|º|°|ø)*(\([^)]*\))?(\/([A-G][#b]?))?$/

/**
 * Retorna o índice de uma nota na escala cromática (0-11).
 * Aceita tanto # quanto b.
 */
function noteToIndex(note: string): number {
  const idx = SHARP_NOTES.indexOf(note as any)
  if (idx >= 0) return idx
  const idxFlat = FLAT_NOTES.indexOf(note as any)
  if (idxFlat >= 0) return idxFlat
  return -1
}

/**
 * Converte índice (0-11) de volta para nome da nota.
 * Usa bemóis se a tonalidade pedir, senão sustenidos.
 */
function indexToNote(index: number, useFlats: boolean): string {
  const normalized = ((index % 12) + 12) % 12
  return useFlats ? FLAT_NOTES[normalized] : SHARP_NOTES[normalized]
}

/**
 * Transpõe uma nota individual por N semitons.
 */
function transposeNote(note: string, semitones: number, useFlats: boolean): string {
  const idx = noteToIndex(note)
  if (idx < 0) return note
  return indexToNote(idx + semitones, useFlats)
}

/**
 * Transpõe um acorde completo (ex: "Am7/G" → "Bm7/A" com +2 semitons).
 * Extrai raiz e baixo, preserva tudo que está entre eles (qualidade).
 */
export function transposeChord(chord: string, semitones: number, useFlats = false): string {
  if (semitones === 0) return chord

  const match = chord.match(CHORD_RE)
  if (!match) return chord

  const [fullMatch, root] = match
  const newRoot = transposeNote(root, semitones, useFlats)

  // Extrair a parte entre a raiz e o baixo (qualidade completa)
  const slashIdx = fullMatch.lastIndexOf('/')
  if (slashIdx > 0) {
    const quality = fullMatch.slice(root.length, slashIdx)
    const bass = fullMatch.slice(slashIdx + 1)
    const newBass = transposeNote(bass, semitones, useFlats)
    return newRoot + quality + '/' + newBass
  }

  // Sem baixo — tudo depois da raiz é qualidade
  const quality = fullMatch.slice(root.length)
  return newRoot + quality
}

/**
 * Transpõe todos os acordes dentro de um texto de cifra.
 * Preserva a posição dos acordes e a formatação original.
 */
export function transposeCifraContent(content: string, semitones: number, useFlats = false): string {
  if (semitones === 0) return content

  return content
    .split('\n')
    .map(line => transposeLine(line, semitones, useFlats))
    .join('\n')
}

/**
 * Transpõe acordes em uma única linha, preservando espaçamento.
 */
function transposeLine(line: string, semitones: number, useFlats: boolean): string {
  const trimmed = line.trim()

  // Pular seções [Intro], [Verso], etc.
  if (/^\[.*\]/.test(trimmed)) return line

  // Pular linhas de tablatura
  if (/^\s*[EBADGe]\|/.test(line)) return line

  // Pular linhas vazias
  if (!trimmed) return line

  // Detectar se é uma linha de acordes (>50% tokens são acordes)
  const tokens = trimmed.split(/(\s+)/)
  const chordCount = tokens.filter(t => t.trim() && CHORD_RE.test(t.trim())).length
  const wordCount = tokens.filter(t => t.trim()).length
  const isChordLine = wordCount > 0 && chordCount / wordCount > 0.5

  if (isChordLine) {
    // Transpor cada token que é acorde, manter espaços
    return tokens.map(token => {
      if (/^\s+$/.test(token)) return token
      if (CHORD_RE.test(token.trim())) {
        return transposeChord(token.trim(), semitones, useFlats)
      }
      return token
    }).join('')
  }

  // Linhas de letra: não alterar
  return line
}

/**
 * Transpõe um array de nomes de acordes.
 */
export function transposeChords(chords: string[], semitones: number, useFlats = false): string[] {
  if (semitones === 0) return chords
  return chords.map(c => transposeChord(c, semitones, useFlats))
}

/**
 * Detecta a tonalidade provável a partir de uma lista de acordes.
 * Heurística: o primeiro acorde geralmente define a tonalidade.
 */
export function detectKey(chords: string[]): string | null {
  if (chords.length === 0) return null
  const first = chords[0]
  const match = first.match(/^([A-G][#b]?)(m?)/)
  if (!match) return null
  return match[1] + match[2]
}

/**
 * Determina se deve usar bemóis com base na tonalidade.
 */
export function shouldUseFlats(key: string | null): boolean {
  if (!key) return false
  return FLAT_KEYS.has(key)
}

/**
 * Transpõe uma tonalidade por N semitons.
 */
export function transposeKey(key: string, semitones: number, useFlats?: boolean): string {
  if (semitones === 0) return key
  const match = key.match(/^([A-G][#b]?)(m?)$/)
  if (!match) return key
  const [, root, minor] = match
  const flats = useFlats ?? shouldUseFlats(key)
  const newRoot = transposeNote(root, semitones, flats)
  const newKey = newRoot + minor
  // Reavaliar se a nova tonalidade usa bemóis
  return newKey
}

/**
 * Nomes dos intervalos para exibição amigável.
 */
export function semitoneLabel(semitones: number): string {
  if (semitones === 0) return 'Tom original'
  const abs = Math.abs(semitones)
  const dir = semitones > 0 ? '+' : '-'
  const unit = abs === 1 ? 'semitom' : 'semitons'
  return `${dir}${abs} ${unit}`
}
