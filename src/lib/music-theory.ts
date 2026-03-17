/**
 * Teoria Musical — Nomenclatura enarmônica correta
 *
 * Cada tonalidade tem uma grafia específica baseada no ciclo das quintas.
 * Regra fundamental: cada grau da escala deve usar uma LETRA diferente
 * (C, D, E, F, G, A, B). Nunca repetir a mesma letra (ex: D e D# na mesma escala).
 *
 * Exceções:
 * - Menor Harmônica e Melódica podem ter duplo-sustenido (##) em tons com muitos #
 * - Blues e Pentatônicas seguem regras simplificadas
 */

// ── Índice cromático (apenas para mapeamento interno) ──────────────────

/** Array cromático padrão (sustenidos) — usado APENAS para lookup interno */
export const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/** Array cromático (bemóis) */
export const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

// ── Nomes em pt-BR ─────────────────────────────────────────────────────

export const NOTE_PT: Record<string, string> = {
  'C': 'Dó', 'C#': 'Dó#', 'Cb': 'Dób',
  'D': 'Ré', 'D#': 'Ré#', 'Db': 'Réb',
  'E': 'Mi', 'E#': 'Mi#', 'Eb': 'Mib',
  'F': 'Fá', 'F#': 'Fá#', 'Fb': 'Fáb',
  'G': 'Sol', 'G#': 'Sol#', 'Gb': 'Solb',
  'A': 'Lá', 'A#': 'Lá#', 'Ab': 'Láb',
  'B': 'Si', 'B#': 'Si#', 'Bb': 'Sib',
  // Duplo sustenido
  'F##': 'Fá##', 'C##': 'Dó##', 'G##': 'Sol##',
}

// ── Escalas por tonalidade (ciclo das quintas) ─────────────────────────
// Definição explícita das notas corretas para cada tipo de escala em cada tonalidade.
// Fonte: relação completa do ciclo das quintas fornecida pelo usuário.

export type ScaleType = 'major_scale' | 'minor_scale' | 'harmonic_minor_scale' | 'melodic_minor_scale'

/**
 * Tabela mestre de escalas.
 * Chave = nota raiz (como selecionável no editor: C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
 * Valor = objeto com os 4 tipos de escala, cada um com 7 notas (sem repetir a oitava).
 *
 * Para tons com bemol, a chave de lookup usa o equivalente enarmônico com sustenido
 * (ex: Bb → A#, Eb → D#, Ab → G#, Db → C#, Gb → F#).
 * A UI mostrará a grafia correta (com bemóis) conforme a tabela.
 */

interface ScaleSet {
  /** Nome de exibição da tonalidade (pode ser com bemol) */
  displayRoot: string
  major_scale: string[]
  minor_scale: string[]
  harmonic_minor_scale: string[]
  melodic_minor_scale: string[]
}

const SCALE_TABLE: Record<string, ScaleSet> = {
  // ── Ciclo das Quintas (Sustenidos) ──

  'C': {
    displayRoot: 'C',
    major_scale:           ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    // Relativa menor: Am
    minor_scale:           ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
    harmonic_minor_scale:  ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'B'],
    melodic_minor_scale:   ['C', 'D', 'Eb', 'F', 'G', 'A', 'B'],
  },

  'G': {
    displayRoot: 'G',
    major_scale:           ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    minor_scale:           ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
    harmonic_minor_scale:  ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F#'],
    melodic_minor_scale:   ['G', 'A', 'Bb', 'C', 'D', 'E', 'F#'],
  },

  'D': {
    displayRoot: 'D',
    major_scale:           ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    minor_scale:           ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
    harmonic_minor_scale:  ['D', 'E', 'F', 'G', 'A', 'Bb', 'C#'],
    melodic_minor_scale:   ['D', 'E', 'F', 'G', 'A', 'B', 'C#'],
  },

  'A': {
    displayRoot: 'A',
    major_scale:           ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    minor_scale:           ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    harmonic_minor_scale:  ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
    melodic_minor_scale:   ['A', 'B', 'C', 'D', 'E', 'F#', 'G#'],
  },

  'E': {
    displayRoot: 'E',
    major_scale:           ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    minor_scale:           ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
    harmonic_minor_scale:  ['E', 'F#', 'G', 'A', 'B', 'C', 'D#'],
    melodic_minor_scale:   ['E', 'F#', 'G', 'A', 'B', 'C#', 'D#'],
  },

  'B': {
    displayRoot: 'B',
    major_scale:           ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
    minor_scale:           ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
    harmonic_minor_scale:  ['B', 'C#', 'D', 'E', 'F#', 'G', 'A#'],
    melodic_minor_scale:   ['B', 'C#', 'D', 'E', 'F#', 'G#', 'A#'],
  },

  'F#': {
    displayRoot: 'F#',
    major_scale:           ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
    minor_scale:           ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
    harmonic_minor_scale:  ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E#'],
    melodic_minor_scale:   ['F#', 'G#', 'A', 'B', 'C#', 'D#', 'E#'],
  },

  'C#': {
    displayRoot: 'C#',
    major_scale:           ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
    minor_scale:           ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
    harmonic_minor_scale:  ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B#'],
    melodic_minor_scale:   ['C#', 'D#', 'E', 'F#', 'G#', 'A#', 'B#'],
  },

  // ── Ciclo das Quartas (Bemóis) ──
  // Lookup: o editor usa A#=Bb, D#=Eb, G#=Ab
  // Para Bb, Eb, Ab, Db, Gb → mapeados pelos equivalentes enarmônicos

  'F': {
    displayRoot: 'F',
    major_scale:           ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
    minor_scale:           ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
    harmonic_minor_scale:  ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'E'],
    melodic_minor_scale:   ['F', 'G', 'Ab', 'Bb', 'C', 'D', 'E'],
  },

  // Bb (acessado via 'A#' no editor)
  'A#': {
    displayRoot: 'Bb',
    major_scale:           ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
    minor_scale:           ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
    harmonic_minor_scale:  ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'A'],
    melodic_minor_scale:   ['Bb', 'C', 'Db', 'Eb', 'F', 'G', 'A'],
  },

  // Eb (acessado via 'D#' no editor)
  'D#': {
    displayRoot: 'Eb',
    major_scale:           ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
    minor_scale:           ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db'],
    harmonic_minor_scale:  ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'D'],
    melodic_minor_scale:   ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'C', 'D'],
  },

  // Ab (acessado via 'G#' no editor)
  'G#': {
    displayRoot: 'Ab',
    major_scale:           ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
    minor_scale:           ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'Gb'],
    harmonic_minor_scale:  ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'G'],
    melodic_minor_scale:   ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F', 'G'],
  },
}

// ── Funções de conversão ───────────────────────────────────────────────

/** Converte nome de nota para índice cromático (0-11). Suporta #, b, ##. */
export function noteToChromatic(note: string): number {
  const base = note.charAt(0).toUpperCase()
  const baseMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  let idx = baseMap[base]
  if (idx === undefined) return -1

  const suffix = note.slice(1)
  if (suffix === '#') idx += 1
  else if (suffix === 'b') idx -= 1
  else if (suffix === '##') idx += 2
  else if (suffix === 'bb') idx -= 2

  return ((idx % 12) + 12) % 12
}

/**
 * Retorna as notas de uma escala com a grafia enarmônica correta.
 *
 * @param root - Nota raiz (como no seletor: C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
 * @param scaleType - Tipo de escala
 * @returns Array de 7 notas com grafia correta, ou null se não encontrado
 */
export function getScaleNotes(root: string, scaleType: ScaleType): string[] | null {
  const entry = SCALE_TABLE[root]
  if (!entry) return null
  return entry[scaleType] ?? null
}

/**
 * Retorna o nome de exibição da tonalidade (pode ser bemol).
 * Ex: 'A#' → 'Bb', 'D#' → 'Eb', 'G#' → 'Ab'
 */
export function getDisplayRoot(root: string): string {
  const entry = SCALE_TABLE[root]
  return entry?.displayRoot ?? root
}

/**
 * Dado um índice cromático (0-11) e um contexto de escala,
 * retorna o nome da nota com a grafia correta.
 *
 * Se a nota não está na escala, usa fallback inteligente:
 * - Se a tonalidade usa bemóis, prefere bemóis
 * - Se usa sustenidos, prefere sustenidos
 *
 * @param chromaticIdx - Índice cromático 0-11 (C=0, C#/Db=1, ...)
 * @param root - Nota raiz da tonalidade
 * @param scaleType - Tipo de escala (para contexto de grafia)
 * @returns Nome da nota com grafia correta
 */
export function getNoteNameInKey(
  chromaticIdx: number,
  root: string,
  scaleType?: ScaleType,
): string {
  const idx = ((chromaticIdx % 12) + 12) % 12

  // Se temos escala definida, buscar a nota exata
  if (scaleType) {
    const scaleNotes = getScaleNotes(root, scaleType)
    if (scaleNotes) {
      // Buscar se essa nota cromática está na escala
      for (const note of scaleNotes) {
        if (noteToChromatic(note) === idx) return note
      }
    }
  }

  // Fallback: usar preferência de bemóis/sustenidos da tonalidade
  // Contexto menor prefere bemóis (ex: Gb em vez de F# na blues de C)
  const minorContext = scaleType === 'minor_scale' || scaleType === 'harmonic_minor_scale' || scaleType === 'melodic_minor_scale'
  if (useFlats(root) || minorContext) {
    return CHROMATIC_FLAT[idx]
  }
  return CHROMATIC_SHARP[idx]
}

/**
 * Determina se uma tonalidade prefere bemóis (b) ou sustenidos (#).
 * Baseado no ciclo das quintas.
 */
export function useFlats(root: string): boolean {
  // Tonalidades que usam bemóis: F, Bb(A#), Eb(D#), Ab(G#), Db(C#?→não), Gb(F#?→não)
  // Na prática do nosso sistema (onde o seletor usa #):
  // F, A#(=Bb), D#(=Eb), G#(=Ab) usam bemóis
  const flatRoots = new Set(['F', 'A#', 'D#', 'G#'])
  return flatRoots.has(root)
}

/**
 * Gera o array completo de 12 nomes cromáticos para uma tonalidade,
 * preferindo a grafia correta (bemóis ou sustenidos).
 *
 * Usado para substituir o NOTE_NAMES fixo em contextos onde
 * a nota pode não pertencer a uma escala específica (ex: acordes).
 */
export function getChromaticNamesForKey(root: string): string[] {
  if (useFlats(root)) {
    return [...CHROMATIC_FLAT]
  }
  return [...CHROMATIC_SHARP]
}

/**
 * Gera mapa MIDI→nome para todas as notas de uma escala.
 * Útil para lookup rápido em generateFretboardNotes.
 *
 * @returns Map<chromaticIdx, noteName> com 7 entradas
 */
export function getScaleNoteMap(root: string, scaleType: ScaleType): Map<number, string> | null {
  const notes = getScaleNotes(root, scaleType)
  if (!notes) return null

  const map = new Map<number, string>()
  for (const note of notes) {
    map.set(noteToChromatic(note), note)
  }
  return map
}

/**
 * Retorna o nome em pt-BR de uma nota.
 * Suporta todas as grafias: natural, #, b, ##
 */
export function getNotePt(note: string): string {
  // Lookup direto
  if (NOTE_PT[note]) return NOTE_PT[note]

  // Construir: base + acidente
  const base = note.charAt(0).toUpperCase()
  const suffix = note.slice(1)
  const basePt: Record<string, string> = {
    C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si',
  }
  return (basePt[base] ?? base) + suffix
}

// ── Constantes de apoio para UI ────────────────────────────────────────

/** Tonalidades selecionáveis no editor (com grafia amigável) */
export const ROOT_OPTIONS = [
  { value: 'C', label: 'C' },
  { value: 'C#', label: 'C#/Db' },
  { value: 'D', label: 'D' },
  { value: 'D#', label: 'Eb' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'F#', label: 'F#/Gb' },
  { value: 'G', label: 'G' },
  { value: 'G#', label: 'Ab' },
  { value: 'A', label: 'A' },
  { value: 'A#', label: 'Bb' },
  { value: 'B', label: 'B' },
] as const

/**
 * Verifica se um preset é do tipo escala (para determinar se tem tabela de grafia).
 */
export function isScalePreset(preset: string | null): preset is string {
  if (!preset) return false
  return preset.includes('scale')
}

/**
 * Mapeia um preset key para o ScaleType correspondente, se aplicável.
 */
export function presetToScaleType(preset: string | null): ScaleType | null {
  if (!preset) return null
  const map: Record<string, ScaleType> = {
    major_scale: 'major_scale',
    minor_scale: 'minor_scale',
    harmonic_minor_scale: 'harmonic_minor_scale',
    melodic_minor_scale: 'melodic_minor_scale',
    penta_major: 'major_scale',
    penta_minor: 'minor_scale',
    blues: 'minor_scale',
    dim: 'minor_scale',
    minor: 'minor_scale',
    '7': 'minor_scale',
    m7: 'minor_scale',
    dim7: 'minor_scale',
    m7b5: 'minor_scale',
    m6: 'minor_scale',
    mmaj7: 'minor_scale',
  }
  return map[preset] ?? null
}
