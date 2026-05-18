export interface ChordSearchIntent {
  raw: string
  rootNote?: string
  quality?: string
  family?: string
  exactQuality: boolean
  displayName: string
  normalizedName: string
}

const ROOT_ALIASES: Record<string, string> = {
  c: 'C',
  do: 'C',
  'dó': 'C',
  'c#': 'C#',
  db: 'C#',
  d: 'D',
  re: 'D',
  'ré': 'D',
  'd#': 'D#',
  eb: 'D#',
  e: 'E',
  mi: 'E',
  f: 'F',
  fa: 'F',
  'fá': 'F',
  'f#': 'F#',
  gb: 'F#',
  g: 'G',
  sol: 'G',
  'g#': 'G#',
  ab: 'G#',
  a: 'A',
  la: 'A',
  'lá': 'A',
  'a#': 'A#',
  bb: 'A#',
  b: 'B',
  si: 'B',
}

const QUALITY_ALIASES: Array<{
  match: RegExp
  quality: string
  family: string
  suffix: string
  label: string
}> = [
  { match: /^(maj7|maior7|maior 7|7m|7M)$/i, quality: 'maj7', family: 'tetrad', suffix: 'maj7', label: '7M' },
  { match: /^(m7|min7|menor7|menor 7)$/i, quality: 'm7', family: 'tetrad', suffix: 'm7', label: 'menor 7' },
  { match: /^(7|dom7|dominante)$/i, quality: '7', family: 'tetrad', suffix: '7', label: '7' },
  { match: /^(m|minor|min|menor)$/i, quality: 'minor', family: 'triad', suffix: 'm', label: 'menor' },
  { match: /^(aug|aumentado|aumentada)$/i, quality: 'aug', family: 'triad', suffix: 'aug', label: 'aumentado' },
  { match: /^(dim|diminuto|diminuta)$/i, quality: 'dim', family: 'triad', suffix: 'dim', label: 'diminuto' },
  { match: /^(sus2)$/i, quality: 'sus2', family: 'suspended', suffix: 'sus2', label: 'sus2' },
  { match: /^(sus4)$/i, quality: 'sus4', family: 'suspended', suffix: 'sus4', label: 'sus4' },
  { match: /^(add9)$/i, quality: 'add9', family: 'triad', suffix: 'add9', label: 'add9' },
  { match: /^(maj|major|maior)$/i, quality: 'major', family: 'triad', suffix: '', label: 'maior' },
]

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function findRootToken(compact: string) {
  const sortedRoots = Object.keys(ROOT_ALIASES).sort((a, b) => b.length - a.length)
  const lower = compact.toLowerCase()
  const rootToken = sortedRoots.find(root => lower.startsWith(root))
  if (!rootToken) return null

  return {
    rootToken,
    rootNote: ROOT_ALIASES[rootToken],
    suffix: compact.slice(rootToken.length),
  }
}

export function parseChordSearchIntent(search: string): ChordSearchIntent {
  const raw = search.trim()
  const normalized = normalizeText(raw).replace(/\s+/g, ' ')
  const compact = normalized.replace(/\s+/g, '')
  const root = findRootToken(compact)

  if (!root) {
    return { raw, exactQuality: false, displayName: raw, normalizedName: normalized }
  }

  if (!root.suffix) {
    return {
      raw,
      rootNote: root.rootNote,
      exactQuality: false,
      displayName: root.rootNote,
      normalizedName: root.rootNote,
    }
  }

  const quality = QUALITY_ALIASES.find(item => item.match.test(root.suffix))
  if (!quality) {
    return {
      raw,
      rootNote: root.rootNote,
      exactQuality: false,
      displayName: root.rootNote,
      normalizedName: `${root.rootNote}${root.suffix}`,
    }
  }

  return {
    raw,
    rootNote: root.rootNote,
    quality: quality.quality,
    family: quality.family,
    exactQuality: true,
    displayName: `${root.rootNote} ${quality.label}`,
    normalizedName: `${root.rootNote}${quality.suffix}`,
  }
}
