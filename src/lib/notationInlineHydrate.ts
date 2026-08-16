import { editorDurationFromRaw, type EditorBeatDuration } from './notationBeatNormalize.ts'
import { legacyNotesToBeats } from './notationCompat.ts'
import { clampBarsPerSystem } from './notationLayout.ts'
import { getEditorTimeSignature } from './timeSignature.ts'

export interface InlinePitch {
  pitch: string
  accidental?: string | null
}

export interface InlineBeat {
  pitches: InlinePitch[]
  duration: EditorBeatDuration
  isRest: boolean
  dotted?: boolean
  doubleDotted?: boolean
  barAfter?: boolean
  staff?: 'treble' | 'bass'
  timeSlot?: number
  tuplet?: { numNotes: number; notesOccupied: number; groupId: string }
  tieToNext?: boolean
  articulations?: string[]
}

export interface HydratedNotationSession {
  beats: InlineBeat[]
  clef: string
  keySignature: string
  timeSignature: string
  bpm: number
  grandStaff: boolean
  barsPerSystem: number
}

function normalizeBeats(rawBeats: any[]): InlineBeat[] {
  return rawBeats.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const pitches = Array.isArray(raw.pitches)
      ? raw.pitches
          .map((p: any) => ({ pitch: String(p?.pitch ?? ''), accidental: p?.accidental ?? undefined }))
          .filter((p: InlinePitch) => p.pitch.includes('/'))
      : []
    const duration = editorDurationFromRaw(String(raw.duration ?? 'q'))
    return [{
      pitches,
      duration,
      isRest: Boolean(raw.isRest) || pitches.length === 0,
      dotted: Boolean(raw.dotted),
      doubleDotted: Boolean(raw.doubleDotted),
      barAfter: Boolean(raw.barAfter),
      staff: raw.staff === 'bass' ? 'bass' : raw.staff === 'treble' ? 'treble' : undefined,
      timeSlot: Number.isFinite(raw.timeSlot) ? raw.timeSlot : undefined,
      tuplet: raw.tuplet,
      tieToNext: Boolean(raw.tieToNext ?? raw.tie),
      articulations: Array.isArray(raw.articulations) ? raw.articulations : undefined,
    }]
  })
}

function beatsFromLegacyStaves(staves: any[], staveIndex: number | null): InlineBeat[] {
  const selected = staveIndex !== null && Array.isArray(staves)
    ? [staves[staveIndex]].filter(Boolean)
    : (staves ?? [])
  return selected.flatMap((stave, index) => {
    const beats = legacyNotesToBeats(stave?.notes, stave?.accidentals).map((beat) => ({
      pitches: beat.pitches.map((p) => ({ pitch: p.pitch, accidental: p.accidental })),
      duration: editorDurationFromRaw(String(beat.duration)),
      isRest: beat.isRest,
      dotted: beat.dotted,
      doubleDotted: beat.doubleDotted,
      barAfter: Boolean(beat.barAfter),
    }))
    if (!beats.length) return []
    if (index < selected.length - 1) {
      beats[beats.length - 1] = { ...beats[beats.length - 1], barAfter: true }
    }
    return beats
  })
}

export function hydrateNotationFromBlock(input: {
  render_data?: any
  content?: any
  staveIndex?: number | null
}): HydratedNotationSession {
  const rd = input.render_data ?? {}
  const content = input.content ?? {}
  const staves = Array.isArray(rd.notation?.staves) ? rd.notation.staves : []
  const staveIndex = input.staveIndex ?? null
  const pointed = staveIndex !== null ? staves[staveIndex] : staves[0]
  const useLegacySlice = staveIndex !== null && staves.length > 1
  const rawData = useLegacySlice
    ? null
    : (rd.notation_data ?? content.notation_data ?? null)
  const beats = rawData?.beats && Array.isArray(rawData.beats)
    ? normalizeBeats(rawData.beats)
    : beatsFromLegacyStaves(staves, staveIndex)

  return {
    beats,
    clef: String(rawData?.clef || pointed?.clef || rd.clef || 'treble'),
    keySignature: String(rawData?.keySignature || pointed?.key_signature || rd.key_signature || 'C'),
    timeSignature: getEditorTimeSignature(rawData?.timeSignature, pointed?.time_signature, rd.time_signature),
    bpm: Number(rawData?.bpm || 120),
    grandStaff: Boolean(rawData?.grandStaff),
    barsPerSystem: clampBarsPerSystem(rawData?.barsPerSystem ?? rd.barsPerSystem),
  }
}
