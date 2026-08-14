import type { Tables } from '@/lib/database.types'

export type ChordLibraryRow = Pick<
  Tables<'chord_library'>,
  'id' | 'name' | 'canonical_name' | 'instrument' | 'positions' | 'svg_config'
>

export interface ResolvedGridChord {
  chord_name: string
  name: string
  chord_library_id?: string
  source: 'chord_library' | 'fallback' | 'not-found'
  fingers: any[]
  barres: any[]
  muted: number[]
  position: number
  strings?: number
}

const TEMPLATE_LOOKUP_OVERRIDES: Record<string, string[]> = {
  'C7M(9)': ['C7M(9)', 'Cmaj9', 'Cmaj7(9)', 'CM9'],
  'Dm7(11)': ['Dm7(11)', 'Dm11', 'Dmin11'],
  'G7(13)': ['G7(13)', 'G13', 'G7(9/13)'],
  'Am7(9)': ['Am7(9)', 'Am9', 'Amin9'],
  'F7M(#11)': ['F7M(#11)', 'F7M(11+)', 'Fmaj7#11', 'Fmaj7(#11)', 'Fmaj#11'],
}

const SIMPLE_LOOKUP_OVERRIDES: Record<string, string[]> = {
  Bdim: ['Bdim', 'B°', 'Bm(b5)'],
}

function unique(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const normalized = value?.trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

function splitRoot(chordName: string): { root: string; suffix: string } | null {
  const match = chordName.trim().match(/^([A-G](?:#|b)?)(.*)$/)
  if (!match) return null
  return { root: match[1], suffix: match[2] ?? '' }
}

function normalizeQualitySuffix(root: string, suffix: string): string[] {
  if (suffix === '') return [root]
  if (suffix === '7M') return [`${root}7M`, `${root}maj7`, `${root}M7`]
  if (suffix === 'm7') return [`${root}m7`, `${root}min7`]
  if (suffix === 'dim' || suffix === '°') return [`${root}dim`, `${root}°`, `${root}m(b5)`]
  if (suffix === '7dim') return [`${root}7dim`, `${root}dim7`, `${root}°7`]
  if (suffix === 'm7(b5)' || suffix === 'm7b5') return [`${root}m7(b5)`, `${root}m7b5`, `${root}ø`]
  if (suffix === '+' || suffix === '(#5)' || suffix === '(5+)') return [`${root}+`, `${root}aug`, `${root}#5`]
  if (suffix === '2') return [`${root}2`, `${root}sus2`]
  if (suffix === '4' || suffix === 'sus') return [`${root}${suffix}`, `${root}sus4`]
  return [`${root}${suffix}`]
}

function normalizeGenericTensionChord(chordName: string): string[] {
  const parsed = splitRoot(chordName)
  if (!parsed) return [chordName]
  const { root } = parsed
  const withoutSpaces = chordName.replace(/\s+/g, '')

  const c7mTension = withoutSpaces.match(/^([A-G](?:#|b)?)7M\(([^)]+)\)$/)
  if (c7mTension) {
    const tension = c7mTension[2]
    if (tension === '9') return [withoutSpaces, `${root}maj9`, `${root}maj7(9)`, `${root}M9`]
    if (tension === '#11' || tension === '11+' || tension === '11#') {
      return [withoutSpaces, `${root}7M(11+)`, `${root}maj7#11`, `${root}maj7(#11)`, `${root}maj#11`]
    }
  }

  const minorTension = withoutSpaces.match(/^([A-G](?:#|b)?)m7\(([^)]+)\)$/)
  if (minorTension) {
    const tension = minorTension[2]
    if (tension === '9') return [withoutSpaces, `${root}m9`, `${root}min9`]
    if (tension === '11') return [withoutSpaces, `${root}m11`, `${root}min11`]
  }

  const dominantTension = withoutSpaces.match(/^([A-G](?:#|b)?)7\(([^)]+)\)$/)
  if (dominantTension) {
    const tension = dominantTension[2]
    if (tension === '9') return [withoutSpaces, `${root}9`, `${root}7(9)`]
    if (tension === '11') return [withoutSpaces, `${root}11`, `${root}7(9/11)`]
    if (tension === '13') return [withoutSpaces, `${root}13`, `${root}7(9/13)`]
    if (tension === '9-' || tension === 'b9') return [withoutSpaces, `${root}7(b9)`]
    if (tension === '9+' || tension === '#9') return [withoutSpaces, `${root}7(#9)`]
    if (tension === '13-' || tension === 'b13') return [withoutSpaces, `${root}7(b13)`]
  }

  return []
}

export function buildChordLibraryLookupNames(chordName: string): string[] {
  const trimmed = chordName.trim()
  if (!trimmed) return []
  const compact = trimmed.replace(/\s+/g, '')
  const override = TEMPLATE_LOOKUP_OVERRIDES[compact] ?? SIMPLE_LOOKUP_OVERRIDES[compact]
  if (override) return override

  const genericTension = normalizeGenericTensionChord(compact)
  if (genericTension.length) return unique(genericTension)

  const parsed = splitRoot(compact)
  if (!parsed) return [compact]

  return unique(normalizeQualitySuffix(parsed.root, parsed.suffix))
}

export function shouldAllowLocalChordFallback(chordName: string): boolean {
  const compact = chordName.trim().replace(/\s+/g, '')
  if (!compact) return false
  if (/\([^)]*(?:9|11|13|5\+|5-|#|b|-|\+)[^)]*\)/.test(compact)) return false
  if (/(?:maj9|m9|min9|m11|min11|13|#11|b13|#9|b9)/i.test(compact)) return false
  return true
}

export function chordLibraryRowToGridChord(row: ChordLibraryRow, displayName?: string): ResolvedGridChord | null {
  const positions = row.positions as any
  if (!positions || !Array.isArray(positions.fingers)) return null

  const svgConfig = row.svg_config as any
  return {
    chord_name: displayName ?? row.canonical_name ?? row.name,
    name: row.name,
    chord_library_id: row.id,
    source: 'chord_library',
    fingers: positions.fingers ?? [],
    barres: positions.barres ?? [],
    muted: positions.muted ?? [],
    position: positions.position ?? 1,
    strings: svgConfig?.strings,
  }
}

export function notFoundGridChord(chordName: string): ResolvedGridChord {
  return {
    chord_name: chordName,
    name: chordName,
    source: 'not-found',
    fingers: [],
    barres: [],
    muted: [],
    position: 1,
  }
}

export async function resolveGuitarChordFromLibrary(chordName: string): Promise<ResolvedGridChord | null> {
  const candidates = buildChordLibraryLookupNames(chordName)
  if (!candidates.length) return null

  const { supabase } = await import('@/lib/supabase')
  const [byName, byCanonicalName] = await Promise.all([
    supabase
      .from('chord_library')
      .select('id,name,canonical_name,instrument,positions,svg_config')
      .eq('instrument', 'guitar')
      .in('name', candidates)
      .order('difficulty', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('chord_library')
      .select('id,name,canonical_name,instrument,positions,svg_config')
      .eq('instrument', 'guitar')
      .in('canonical_name', candidates)
      .order('difficulty', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true, nullsFirst: false }),
  ])

  if (byName.error) throw byName.error
  if (byCanonicalName.error) throw byCanonicalName.error

  const data = uniqueRowsById([...(byName.data ?? []), ...(byCanonicalName.data ?? [])])
  if (!data.length) return null

  for (const candidate of candidates) {
    const row = data.find(chord => chord.name === candidate || chord.canonical_name === candidate)
    if (!row) continue
    const resolved = chordLibraryRowToGridChord(row, chordName.trim())
    if (resolved) return resolved
  }

  return null
}

export interface ResolvedPianoChord {
  chord_name: string
  name: string
  keys: string[]
  fingering_rh: number[]
  source: 'chord_library' | 'not-found'
}

export async function resolvePianoChordFromLibrary(chordName: string): Promise<ResolvedPianoChord | null> {
  const candidates = buildChordLibraryLookupNames(chordName)
  if (!candidates.length) return null

  const { supabase } = await import('@/lib/supabase')
  const [byName, byCanonicalName] = await Promise.all([
    supabase
      .from('chord_library')
      .select('id,name,canonical_name,instrument,positions,svg_config,voicing_position')
      .eq('instrument', 'piano')
      .in('name', candidates),
    supabase
      .from('chord_library')
      .select('id,name,canonical_name,instrument,positions,svg_config,voicing_position')
      .eq('instrument', 'piano')
      .in('canonical_name', candidates),
  ])

  if (byName.error) throw byName.error
  if (byCanonicalName.error) throw byCanonicalName.error

  const data = uniqueRowsById([...(byName.data ?? []), ...(byCanonicalName.data ?? [])])
  if (!data.length) return null

  for (const candidate of candidates) {
    const matchingRows = data.filter(chord => chord.name === candidate || chord.canonical_name === candidate)
    if (!matchingRows.length) continue

    // Priorizar posição fundamental (root_position)
    const row = matchingRows.find(
      r => r.voicing_position === 'root_position' || (r.positions as any)?.voicing_position === 'root_position'
    ) || matchingRows[0]

    const positions = row?.positions && typeof row.positions === 'object'
      ? row.positions as { keys?: string[]; fingering_rh?: number[] }
      : null
    const keys = Array.isArray(positions?.keys) ? positions.keys.filter(Boolean) : []
    if (!row || keys.length === 0) continue
    return {
      chord_name: chordName.trim(),
      name: chordName.trim(),
      keys,
      fingering_rh: Array.isArray(positions?.fingering_rh) ? positions.fingering_rh : [],
      source: 'chord_library',
    }
  }

  return null
}

function uniqueRowsById(rows: ChordLibraryRow[]): ChordLibraryRow[] {
  const seen = new Set<string>()
  const out: ChordLibraryRow[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  return out
}
