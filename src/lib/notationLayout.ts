import type { InlineBeat } from './notationInlineHydrate.ts'

export const DEFAULT_BARS_PER_SYSTEM = 4
export const MIN_BARS_PER_SYSTEM = 1
export const MAX_BARS_PER_SYSTEM = 8

const DURATION_BEATS: Record<InlineBeat['duration'], number> = {
  w: 4,
  h: 2,
  q: 1,
  '8': 0.5,
  '16': 0.25,
  '32': 0.125,
  '64': 0.0625,
}

export function clampBarsPerSystem(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_BARS_PER_SYSTEM
  return Math.min(MAX_BARS_PER_SYSTEM, Math.max(MIN_BARS_PER_SYSTEM, Math.round(numeric)))
}

export function beatDuration(beat: Pick<InlineBeat, 'duration' | 'dotted' | 'doubleDotted' | 'tuplet'>): number {
  let duration = DURATION_BEATS[beat.duration] || 1
  if (beat.dotted) duration *= 1.5
  if (beat.doubleDotted) duration *= 1.75
  if (beat.tuplet) duration *= beat.tuplet.notesOccupied / beat.tuplet.numNotes
  return duration
}

/** Índices de beats que fecham um compasso (não inclui o último beat da partitura). */
export function computeBarlineIndices(
  beats: InlineBeat[],
  timeSignature: string,
  grandStaff = false,
): number[] {
  if (timeSignature === 'free' || !timeSignature) return []
  const [numerator, denominator] = timeSignature.split('/').map(Number)
  if (!numerator || !denominator) return []
  const beatsPerBar = numerator * (4 / denominator)

  if (grandStaff) {
    const slots = new Map<number, { duration: number; indices: number[] }>()
    for (let index = 0; index < beats.length; index += 1) {
      const beat = beats[index]
      const slot = beat.timeSlot ?? index
      const entry = slots.get(slot) ?? { duration: 0, indices: [] }
      entry.duration = Math.max(entry.duration, beatDuration(beat))
      entry.indices.push(index)
      slots.set(slot, entry)
    }

    const sortedSlots = [...slots.keys()].sort((a, b) => a - b)
    const barlines: number[] = []
    let accumulated = 0
    for (const slot of sortedSlots) {
      const entry = slots.get(slot)
      if (!entry) continue
      accumulated += entry.duration
      if (accumulated >= beatsPerBar - 0.001) {
        if (slot !== sortedSlots[sortedSlots.length - 1]) barlines.push(Math.max(...entry.indices))
        accumulated -= beatsPerBar
      }
    }
    return barlines
  }

  const barlines: number[] = []
  let accumulated = 0
  for (let index = 0; index < beats.length; index += 1) {
    accumulated += beatDuration(beats[index])
    if (accumulated >= beatsPerBar - 0.001) {
      if (index < beats.length - 1) barlines.push(index)
      accumulated -= beatsPerBar
    }
  }
  return barlines
}

export function barStartIndices(
  beats: InlineBeat[],
  timeSignature: string,
  grandStaff = false,
): number[] {
  if (beats.length === 0) return []
  const computed = new Set(computeBarlineIndices(beats, timeSignature, grandStaff))
  const starts = [0]
  for (let index = 0; index < beats.length - 1; index += 1) {
    if (beats[index].barAfter || computed.has(index)) starts.push(index + 1)
  }
  return [...new Set(starts)].sort((a, b) => a - b)
}

export function barStartIndexForBeat(
  beats: InlineBeat[],
  index: number,
  timeSignature = 'free',
  grandStaff = false,
): number {
  if (beats.length === 0 || index < 0) return 0
  const starts = barStartIndices(beats, timeSignature, grandStaff)
  let start = starts[0] ?? 0
  for (const candidate of starts) {
    if (candidate <= index) start = candidate
    else break
  }
  return start
}

export function barNumberForBeat(
  beats: InlineBeat[],
  index: number,
  timeSignature = 'free',
  grandStaff = false,
): number {
  if (beats.length === 0 || index < 0) return 0
  const starts = barStartIndices(beats, timeSignature, grandStaff)
  const start = barStartIndexForBeat(beats, index, timeSignature, grandStaff)
  const found = starts.indexOf(start)
  return found < 0 ? 1 : found + 1
}

export function navigateBarIndex(
  starts: number[],
  selectedBeatIdx: number,
  delta: -1 | 1,
  beatCount: number,
): number {
  if (beatCount === 0 || starts.length === 0) return selectedBeatIdx
  if (selectedBeatIdx < 0) return delta > 0 ? starts[0] : starts[starts.length - 1]
  if (delta > 0) {
    const next = starts.find(start => start > selectedBeatIdx)
    return next ?? starts[starts.length - 1]
  }
  const previous = [...starts].reverse().find(start => start < selectedBeatIdx)
  return previous ?? starts[0]
}
