export interface KeyboardLikeBlock {
  id: string
  title?: string | null
  render_data?: Record<string, unknown> | null
}

export interface KeyboardEditorChord {
  id: string
  name: string
  instrument: 'piano'
  positions: {
    keys: string[]
    keys_lh?: string[]
    root: string
    octave: number
    fingering_rh: number[]
    fingering_lh: number[]
    type: string
    quality: string
    octave_start: number
    octave_count: number
    voicing_position?: string
  }
  difficulty: number
  tags: string[]
}

export interface KeyboardDisplayData {
  name: string
  keys: string[]
  keysLh: string[]
  root: string
  rootOctave: number
  fingeringRH: number[]
  fingeringLH: number[]
  hand: 'rh' | 'lh'
  range: [string, string]
  highlights: Array<{ from: string; to: string; label?: string }>
}

const DEFAULT_ROOT = 'C'
const DEFAULT_OCTAVE = 4

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : []
}

function asHighlights(value: unknown): Array<{ from: string; to: string; label?: string }> {
  if (!Array.isArray(value)) return []
  return value
    .map((item): { from: string; to: string; label?: string } | null => {
      if (!item || typeof item !== 'object') return null
      const highlight = item as Record<string, unknown>
      if (typeof highlight.from !== 'string' || typeof highlight.to !== 'string') return null
      return {
        from: highlight.from,
        to: highlight.to,
        label: typeof highlight.label === 'string' ? highlight.label : undefined,
      }
    })
    .filter((item): item is { from: string; to: string; label?: string } => item !== null)
}

function getRootFromChordName(name?: string | null): string | null {
  const match = (name ?? '').match(/^([A-G][b#]?)/)
  return match?.[1] ?? null
}

function getRootFromKeys(keys: string[], keysLh: string[] = []): { root: string; octave: number } {
  const firstKey = [...keys, ...keysLh][0]
  const match = firstKey?.match(/^([A-G][b#]?)(\d)$/)
  return {
    root: match?.[1] ?? DEFAULT_ROOT,
    octave: match?.[2] ? Number(match[2]) : DEFAULT_OCTAVE,
  }
}

function inferFingering(keys: string[], saved: number[]): number[] {
  return saved.length > 0 ? saved : keys.map((_, index) => index + 1)
}

function getDisplayRange(item: Record<string, unknown>, fallbackOctave: number): [string, string] {
  const octaveStart = typeof item.octave_start === 'number'
    ? item.octave_start
    : Math.max(1, fallbackOctave - 1)
  const octaveCount = typeof item.octave_count === 'number' ? item.octave_count : 2
  return [`C${octaveStart}`, `C${octaveStart + octaveCount}`]
}

function keyboardItemToEditorChord(
  id: string,
  fallbackName: string,
  item: Record<string, unknown>,
): KeyboardEditorChord | null {
  const keys = asStringArray(item.keys)
  const keysLh = asStringArray(item.keys_lh)
  if (keys.length === 0 && keysLh.length === 0) return null

  const name = String(item.chord_name ?? item.name ?? fallbackName ?? '')
  const fallbackRoot = getRootFromKeys(keys, keysLh)
  const rootFromName = getRootFromChordName(name)
  const fingeringRH = inferFingering(keys, asNumberArray(item.fingering_rh))
  const fingeringLH = inferFingering(keysLh, asNumberArray(item.fingering_lh))

  return {
    id,
    name,
    instrument: 'piano',
    positions: {
      keys,
      keys_lh: keysLh,
      root: String(item.root ?? rootFromName ?? fallbackRoot.root),
      octave: typeof item.octave === 'number' ? item.octave : fallbackRoot.octave,
      fingering_rh: fingeringRH,
      fingering_lh: fingeringLH,
      type: String(item.type ?? 'triad'),
      quality: String(item.quality ?? 'Maior'),
      octave_start: typeof item.octave_start === 'number' ? item.octave_start : Math.max(1, fallbackRoot.octave - 1),
      octave_count: typeof item.octave_count === 'number' ? item.octave_count : 2,
      voicing_position: typeof item.voicing_position === 'string' ? item.voicing_position : undefined,
    },
    difficulty: 1,
    tags: [],
  }
}

export function keyboardEntryToDisplayData(
  item: Record<string, unknown>,
  fallbackName = '',
): KeyboardDisplayData | null {
  const keys = asStringArray(item.keys)
  const keysLh = asStringArray(item.keys_lh)
  if (keys.length === 0 && keysLh.length === 0) return null

  const name = String(item.chord_name ?? item.name ?? fallbackName ?? '')
  const fallbackRoot = getRootFromKeys(keys, keysLh)
  const rootFromName = getRootFromChordName(name)
  const root = String(item.root ?? rootFromName ?? fallbackRoot.root)
  const rootOctave = typeof item.octave === 'number' ? item.octave : fallbackRoot.octave

  return {
    name,
    keys,
    keysLh,
    root,
    rootOctave,
    fingeringRH: inferFingering(keys, asNumberArray(item.fingering_rh)),
    fingeringLH: inferFingering(keysLh, asNumberArray(item.fingering_lh)),
    hand: item.hand === 'lh' ? 'lh' : 'rh',
    range: getDisplayRange(item, rootOctave),
    highlights: asHighlights(item.highlights),
  }
}

export function keyboardBlockToEditorChord(
  block: KeyboardLikeBlock | null | undefined,
  options: { chordIndex?: number; keyboardIndex?: number } = {},
): KeyboardEditorChord | null {
  if (!block?.render_data) return null

  const rd = block.render_data
  const fallbackName = String(rd.chord_name ?? rd.title ?? block.title ?? '')

  if (Array.isArray(rd.chords)) {
    const index = options.chordIndex ?? 0
    const chord = rd.chords[index]
    return chord && typeof chord === 'object'
      ? keyboardItemToEditorChord(`${block.id}-chord-${index}`, fallbackName, chord as Record<string, unknown>)
      : null
  }

  if (Array.isArray(rd.keyboards)) {
    const index = options.keyboardIndex ?? 0
    const keyboard = rd.keyboards[index]
    return keyboard && typeof keyboard === 'object'
      ? keyboardItemToEditorChord(`${block.id}-keyboard-${index}`, fallbackName, keyboard as Record<string, unknown>)
      : null
  }

  return keyboardItemToEditorChord(block.id, fallbackName, rd)
}

export function editorChordToKeyboardRenderData(data: KeyboardEditorChord | { name: string; positions: KeyboardEditorChord['positions'] }) {
  return {
    chord_name: data.name,
    keys: data.positions.keys,
    keys_lh: data.positions.keys_lh ?? [],
    root: data.positions.root,
    octave: data.positions.octave,
    fingering_rh: data.positions.fingering_rh,
    fingering_lh: data.positions.fingering_lh,
    type: data.positions.type,
    quality: data.positions.quality,
    octave_start: data.positions.octave_start,
    octave_count: data.positions.octave_count,
    voicing_position: data.positions.voicing_position,
    hand: 'rh' as const,
  }
}
