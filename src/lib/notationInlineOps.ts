import {
  beatsToAlphaTexWithMap,
  toTieDestinations,
  type Beat as AlphaTexBeat,
  type BeatsToAlphaTexResult,
} from './beatsToAlphaTex.ts'
import type { InlineBeat } from './notationInlineHydrate.ts'
import { clampBarsPerSystem, computeBarlineIndices } from './notationLayout.ts'
import { normalizeCifraSymbol } from './notationCifra.ts'

type Staff = 'treble' | 'bass'

export interface SessionOperationResult {
  beats: InlineBeat[]
  selectedBeatIdx: number
}

export interface InsertNoteInput {
  beats: InlineBeat[]
  selectedBeatIdx: number
  pitch: string
  afterIdx: number
  duration: InlineBeat['duration']
  accidental: string | null
  dotted: boolean
  doubleDotted: boolean
  grandStaff?: boolean
  staff?: Staff
  explicitTimeSlot?: number
  activeStaff?: Staff
}

export function insertNote(input: InsertNoteInput): SessionOperationResult {
  const {
    beats,
    selectedBeatIdx,
    pitch,
    afterIdx,
    duration,
    accidental,
    dotted,
    doubleDotted,
    grandStaff = false,
    staff,
    explicitTimeSlot,
    activeStaff = 'treble',
  } = input
  const effectiveStaff = staff ?? activeStaff
  let nextTimeSlot = 0

  if (grandStaff) {
    const staffBeats = beats.filter(beat => (beat.staff ?? 'treble') === effectiveStaff)
    const selectedStaffBeat = afterIdx >= 0 && afterIdx < beats.length
      ? beats[afterIdx]
      : null
    const maxStaffTimeSlot = staffBeats.length > 0
      ? staffBeats.reduce((max, beat) => Math.max(max, beat.timeSlot ?? 0), -1)
      : -1

    if (explicitTimeSlot !== undefined) {
      const hasThisStaffAtSlot = beats.some(beat =>
        (beat.staff ?? 'treble') === effectiveStaff && beat.timeSlot === explicitTimeSlot,
      )
      nextTimeSlot = hasThisStaffAtSlot ? maxStaffTimeSlot + 1 : explicitTimeSlot
    } else if (selectedStaffBeat && (selectedStaffBeat.staff ?? 'treble') === effectiveStaff) {
      nextTimeSlot = (selectedStaffBeat.timeSlot ?? 0) + 1
    } else {
      nextTimeSlot = maxStaffTimeSlot + 1
    }
  }

  const newBeat: InlineBeat = {
    pitches: [{ pitch, accidental: accidental || undefined }],
    duration,
    isRest: false,
    dotted,
    doubleDotted,
    staff: grandStaff ? effectiveStaff : undefined,
    timeSlot: grandStaff ? nextTimeSlot : undefined,
  }
  const nextBeats = [...beats]

  if (!grandStaff) {
    const insertIdx = afterIdx + 1
    nextBeats.splice(insertIdx, 0, newBeat)
    return { beats: nextBeats, selectedBeatIdx: insertIdx }
  }

  if (explicitTimeSlot === undefined) {
    for (let index = 0; index < nextBeats.length; index++) {
      const beat = nextBeats[index]
      if ((beat.staff ?? 'treble') === effectiveStaff && (beat.timeSlot ?? 0) >= nextTimeSlot) {
        nextBeats[index] = { ...beat, timeSlot: (beat.timeSlot ?? 0) + 1 }
      }
    }
  }

  let insertIdx = 0
  for (let index = 0; index < nextBeats.length; index++) {
    const beat = nextBeats[index]
    const beatSlot = beat.timeSlot ?? index
    const beatStaff = beat.staff ?? 'treble'

    if (beatSlot < nextTimeSlot) {
      insertIdx = index + 1
    } else if (beatSlot === nextTimeSlot && beatStaff === 'treble' && effectiveStaff === 'bass') {
      insertIdx = index + 1
    }
  }
  nextBeats.splice(insertIdx, 0, newBeat)
  return { beats: nextBeats, selectedBeatIdx: insertIdx }
}

export function replaceNote(input: {
  beats: InlineBeat[]
  atIdx: number
  pitch: string
  accidental: string | null
}): Pick<SessionOperationResult, 'beats'> {
  if (input.atIdx < 0 || input.atIdx >= input.beats.length) return { beats: input.beats }

  const beats = [...input.beats]
  beats[input.atIdx] = {
    ...beats[input.atIdx],
    pitches: [{ pitch: input.pitch, accidental: input.accidental || undefined }],
    isRest: false,
  }
  return { beats }
}

export function resolveDeleteBeatIndex(selectedBeatIdx: number, beatCount: number): number {
  if (beatCount <= 0) return -1
  if (selectedBeatIdx >= 0 && selectedBeatIdx < beatCount) return selectedBeatIdx
  return beatCount - 1
}

export function deleteBeat(input: {
  beats: InlineBeat[]
  selectedBeatIdx: number
  idx: number
}): SessionOperationResult {
  if (input.idx < 0 || input.idx >= input.beats.length) {
    return { beats: input.beats, selectedBeatIdx: input.selectedBeatIdx }
  }

  const beats = input.beats.filter((_, index) => index !== input.idx)
  let selectedBeatIdx = input.selectedBeatIdx
  if (selectedBeatIdx >= beats.length) {
    selectedBeatIdx = beats.length - 1
  } else if (selectedBeatIdx === input.idx && input.idx > 0) {
    selectedBeatIdx = input.idx - 1
  }
  return { beats, selectedBeatIdx }
}

export function insertRest(input: {
  beats: InlineBeat[]
  selectedBeatIdx: number
  duration: InlineBeat['duration']
  dotted: boolean
  doubleDotted: boolean
}): SessionOperationResult {
  const insertIdx = input.selectedBeatIdx < 0 ? input.beats.length : input.selectedBeatIdx + 1
  const beats = [...input.beats]
  beats.splice(insertIdx, 0, {
    pitches: [],
    duration: input.duration,
    isRest: true,
    dotted: input.dotted,
    doubleDotted: input.doubleDotted,
  })
  return { beats, selectedBeatIdx: insertIdx }
}

function computeBarlines(beats: InlineBeat[], timeSignature: string, grandStaff: boolean): number[] {
  return computeBarlineIndices(beats, timeSignature, grandStaff)
}

export function sessionToAlphaTex(input: {
  beats: InlineBeat[]
  clef: string
  keySignature: string
  timeSignature: string
  bpm: number
  grandStaff: boolean
}): BeatsToAlphaTexResult {
  const computedBarlines = computeBarlines(input.beats, input.timeSignature, input.grandStaff)
  const barlineSlots = new Set(computedBarlines.map(index => input.beats[index]?.timeSlot ?? index))
  const tieDestinations = toTieDestinations(input.beats)
  const beats: AlphaTexBeat[] = input.beats.map((beat, index) => ({
    pitches: beat.pitches.map(pitch => ({ pitch: pitch.pitch, accidental: pitch.accidental ?? null })),
    duration: beat.duration,
    tie: tieDestinations[index],
    isRest: beat.isRest,
    dotted: beat.dotted ?? false,
    doubleDotted: beat.doubleDotted,
    articulations: beat.articulations,
    tuplet: beat.tuplet,
    cifra: normalizeCifraSymbol(beat.cifra),
    slash: beat.slash,
    annotation: null,
    lyric: null,
    staff: beat.staff,
    timeSlot: beat.timeSlot,
    barAfter: Boolean(beat.barAfter) || (input.grandStaff
      ? barlineSlots.has(beat.timeSlot ?? index)
      : computedBarlines.includes(index)),
  }))

  // Sem octaveOffset: o default de beatsToAlphaTex é -1 (C/4 do modelo → c3 no AlphaTex).
  // Forçar 0 oitava a pauta no clique — o preview idle usa o default.
  return beatsToAlphaTexWithMap(beats, {
    clef: input.clef,
    keySignature: input.keySignature,
    timeSignature: input.timeSignature === 'free' ? null : input.timeSignature,
    grandStaff: input.grandStaff,
    bpm: input.bpm,
    includeLyrics: false,
  })
}

function beatToLegacyNote(beat: InlineBeat): { note: string; accidental: string | null } {
  const durationToken = `${beat.duration ?? 'q'}${beat.doubleDotted ? 'dd' : beat.dotted ? 'd' : ''}${beat.isRest ? 'r' : ''}`

  if (beat.isRest || !Array.isArray(beat.pitches) || beat.pitches.length === 0) {
    return { note: `b/4:${durationToken}`, accidental: null }
  }

  const firstPitch = beat.pitches[0]
  const pitchText = String(firstPitch?.pitch ?? '')
  const [notePart = 'B', octave = '4'] = pitchText.split('/')
  // Só a primeira letra é o nome — strip de acidentes apagava o próprio B.
  const normalizedBase = (notePart.charAt(0) || 'b').toLowerCase()
  const accidental = firstPitch?.accidental ?? null
  const inlineAccidental = accidental && accidental !== 'n' ? accidental : ''

  return {
    note: `${normalizedBase}${inlineAccidental}/${octave}:${durationToken}`,
    accidental,
  }
}

export function applySessionToRenderData<T extends Record<string, any>>(
  renderData: T,
  session: {
    beats: InlineBeat[]
    clef: string
    keySignature: string
    timeSignature: string
    bpm: number
    grandStaff: boolean
    barsPerSystem: number
    title?: string
  },
): T & {
  notation: {
    type: 'staff'
    staves: Array<{
      clef: string
      key_signature: string | undefined
      time_signature: string | undefined
      notes: string[]
      accidentals: Array<string | null>
      label: string
    }>
    width: number
    height: number
  }
  notation_data: {
    beats: InlineBeat[]
    clef: string
    keySignature: string
    timeSignature: string | null
    bpm: number
    grandStaff: boolean
    barsPerSystem: number
  }
  alphaTex: string
  clef: string
  key_signature: string
  time_signature: string | null
  barsPerSystem: number
} {
  const originalStaves = Array.isArray(renderData.notation?.staves) ? renderData.notation.staves : []
  const staveGroups: InlineBeat[][] = []
  let currentGroup: InlineBeat[] = []

  for (const beat of session.beats) {
    currentGroup.push(beat)
    if (beat.barAfter) {
      staveGroups.push(currentGroup)
      currentGroup = []
    }
  }
  if (currentGroup.length > 0) staveGroups.push(currentGroup)

  const keySignature = session.clef === 'percussion' || session.keySignature === 'C'
    ? undefined
    : session.keySignature
  const timeSignature = session.timeSignature === 'free' ? undefined : session.timeSignature
  const staves = staveGroups.map((group, index) => {
    const legacyNotes = group.map(beatToLegacyNote)
    return {
      clef: session.clef,
      key_signature: keySignature,
      time_signature: timeSignature,
      notes: legacyNotes.map(({ note }) => note),
      accidentals: legacyNotes.map(({ accidental }) => accidental),
      label: originalStaves[index]?.label ?? '',
    }
  })
  const notation = {
    type: 'staff' as const,
    staves,
    width: renderData.notation?.width ?? 500,
    height: staves.length > 1 ? 140 * staves.length : 150,
  }
  const barsPerSystem = clampBarsPerSystem(session.barsPerSystem)
  const notationData = {
    beats: session.beats,
    clef: session.clef,
    keySignature: session.keySignature,
    timeSignature: session.timeSignature === 'free' ? null : session.timeSignature,
    bpm: session.bpm,
    grandStaff: session.grandStaff,
    barsPerSystem,
  }
  const { tex: alphaTex } = sessionToAlphaTex(session)

  return {
    ...renderData,
    notation,
    notation_data: notationData,
    alphaTex,
    clef: session.clef,
    key_signature: session.keySignature,
    time_signature: notationData.timeSignature,
    barsPerSystem,
  }
}
