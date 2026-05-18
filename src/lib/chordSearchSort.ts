import type { ChordSearchIntent } from './chordSearchIntent'

export interface SearchableChord {
  name: string
  canonical_name?: string | null
}

function normalizeChordSearch(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function sortChordsForEditorSearch<TChord extends SearchableChord>(
  search: string,
  chords: TChord[],
): TChord[] {
  const query = normalizeChordSearch(search)
  if (!query) return chords

  const score = (chord: TChord) => {
    const name = normalizeChordSearch(chord.name)
    const canonicalName = normalizeChordSearch(chord.canonical_name)
    if (name === query || canonicalName === query) return 0
    if (name.startsWith(query) || canonicalName.startsWith(query)) return 1
    if (name.includes(`/${query}`) || canonicalName.includes(`/${query}`)) return 2
    if (name.includes(query) || canonicalName.includes(query)) return 3
    return 4
  }

  return [...chords].sort((a, b) => {
    const scoreDiff = score(a) - score(b)
    if (scoreDiff !== 0) return scoreDiff
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  })
}

export function mergeChordSearchResults<TChord extends SearchableChord & { id: string }>(
  search: string,
  ...groups: TChord[][]
): TChord[] {
  const byId = new Map<string, TChord>()

  for (const group of groups) {
    for (const chord of group) {
      if (!byId.has(chord.id)) byId.set(chord.id, chord)
    }
  }

  return sortChordsForEditorSearch(search, [...byId.values()])
}

export function filterChordsByIntent<TChord extends SearchableChord & {
  root_note?: string | null
  family?: string | null
  quality?: string | null
}>(
  chords: TChord[],
  intent: ChordSearchIntent,
): TChord[] {
  let results = chords

  if (intent.rootNote) {
    results = results.filter(chord => chord.root_note === intent.rootNote)
  }
  if (intent.exactQuality && intent.quality) {
    results = results.filter(chord => chord.quality === intent.quality)
  }
  if (intent.exactQuality && intent.family) {
    results = results.filter(chord => chord.family === intent.family)
  }
  if (intent.exactQuality && !intent.normalizedName.includes('/')) {
    results = results.filter(chord => !chord.name.includes('/') && !chord.canonical_name?.includes('/'))
  }

  return sortChordsForEditorSearch(intent.normalizedName, results)
}
