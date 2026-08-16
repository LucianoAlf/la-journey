export const CIFRA_MAX_LENGTH = 24

const ROOT_BODY = /^([A-G])([#b]?)(.*)$/

export const CIFRA_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

/** Sufixos da camada de acordes. A UI mostra o acorde inteiro (C, Cm, C7…), não o sufixo. */
const CIFRA_SUFFIXES = ['', 'm', '7', 'm7', 'maj7', '6', '9', 'sus4', 'dim', 'ø'] as const

export function normalizeCifraSymbol(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const cleaned = raw.replace(/"/g, '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  return cleaned.slice(0, CIFRA_MAX_LENGTH)
}

function splitCifra(current: string): { letter: string; accidental: string; quality: string } {
  const match = current.trim().match(ROOT_BODY)
  if (!match) return { letter: 'C', accidental: '', quality: '' }
  return { letter: match[1], accidental: match[2], quality: match[3] }
}

export function applyCifraRoot(current: string, root: string): string {
  const { quality } = splitCifra(current)
  return `${root}${quality}`
}

export function applyCifraQuality(current: string, quality: string): string {
  const { letter, accidental } = splitCifra(current)
  return `${letter}${accidental}${quality}`
}

export function applyCifraAccidental(current: string, accidental: '#' | 'b'): string {
  const parts = splitCifra(current)
  const next = parts.accidental === accidental ? '' : accidental
  return `${parts.letter}${next}${parts.quality}`
}

/** Camada de acordes: o acorde inteiro sobre a raiz atual (C, Cm, C7, Cmaj7…). */
export function cifraSuggestions(current: string): string[] {
  return CIFRA_SUFFIXES.map(suffix => applyCifraQuality(current, suffix))
}

export function cifraRootLabel(current: string): string {
  const { letter, accidental } = splitCifra(current)
  return `${letter}${accidental}`
}
