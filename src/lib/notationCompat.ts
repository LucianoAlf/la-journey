import { beatsToAlphaTex, type Beat as AlphaTexBeat, type PitchData } from '@/lib/beatsToAlphaTex'

type LegacyNoteLike = string | { key: string; duration?: string; label?: string }

export interface LegacyStaveData {
  clef?: 'treble' | 'bass' | 'alto' | 'percussion'
  key_signature?: string
  time_signature?: string
  notes?: LegacyNoteLike[]
  accidentals?: (string | null)[]
  label?: string
  width?: number
}

export interface LegacyNotationData {
  type?: string
  staves?: LegacyStaveData[]
  width?: number
  height?: number
}

export interface NotationPreviewItem {
  tex: string
  label?: string
  width?: number
}

const EMPTY_BEAT_FIELDS = {
  tie: false,
  cifra: null,
  annotation: null,
  lyric: null,
  dynamic: undefined,
} as const

function parseLegacyDuration(rawDuration: string | undefined) {
  const normalized = rawDuration || 'q'
  const doubleDotted = normalized.includes('dd')
  const dotted = !doubleDotted && normalized.includes('d')
  const isRest = normalized.includes('r')
  const duration = normalized.replace(/[dr]/g, '') || 'q'

  return {
    duration,
    dotted,
    doubleDotted,
    isRest,
  }
}

function parsePitch(noteToken: string, fallbackAccidental?: string | null): PitchData | null {
  const [rawPitch] = noteToken.split(':')
  const match = rawPitch.match(/^([a-gA-G])([#bn]?)(?:\/(\d))$/)
  if (!match) return null

  const noteName = match[1].toUpperCase()
  const inlineAccidental = match[2] || ''
  const octave = match[3]
  const accidental = fallbackAccidental ?? (inlineAccidental || null)

  return {
    pitch: `${noteName}/${octave}`,
    accidental,
  }
}

export function legacyNotesToBeats(
  notes: LegacyNoteLike[] | undefined,
  accidentals?: (string | null)[],
): AlphaTexBeat[] {
  if (!notes?.length) return []

  return notes.flatMap((note, index) => {
    const noteToken = typeof note === 'string' ? note : `${note.key}:${note.duration || 'q'}`
    const { duration, dotted, doubleDotted, isRest } = parseLegacyDuration(noteToken.split(':')[1])
    const parsedPitch = parsePitch(noteToken, accidentals?.[index] ?? null)

    return [{
      pitches: !isRest && parsedPitch ? [parsedPitch] : [],
      duration,
      isRest: isRest || !parsedPitch,
      dotted,
      doubleDotted,
      ...EMPTY_BEAT_FIELDS,
    }]
  })
}

export function notationDataToPreviewItem(
  notationData: any,
  fallback: {
    clef?: string
    keySignature?: string
    timeSignature?: string | null
    width?: number
  } = {},
): NotationPreviewItem | null {
  if (!notationData?.beats || !Array.isArray(notationData.beats) || notationData.beats.length === 0) {
    return null
  }

  const tex = beatsToAlphaTex(notationData.beats, {
    clef: notationData.clef || fallback.clef || 'treble',
    keySignature: notationData.keySignature || fallback.keySignature || 'C',
    timeSignature: notationData.timeSignature ?? fallback.timeSignature ?? null,
    grandStaff: Boolean(notationData.grandStaff),
    bpm: notationData.bpm,
    includeLyrics: false,
  })

  return {
    tex,
    width: fallback.width,
  }
}

export function legacyStaveToPreviewItem(
  stave: LegacyStaveData,
  fallback: {
    clef?: string
    keySignature?: string
    timeSignature?: string | null
    width?: number
  } = {},
): NotationPreviewItem | null {
  const beats = legacyNotesToBeats(stave.notes, stave.accidentals)
  if (!beats.length) return null

  const tex = beatsToAlphaTex(beats, {
    clef: stave.clef || fallback.clef || 'treble',
    keySignature: stave.key_signature || fallback.keySignature || 'C',
    timeSignature: stave.time_signature ?? fallback.timeSignature ?? null,
    includeLyrics: false,
  })

  return {
    tex,
    label: stave.label,
    width: stave.width ?? fallback.width,
  }
}

export function legacyNotationToPreviewItems(
  notation: LegacyNotationData | null | undefined,
  fallback: {
    clef?: string
    keySignature?: string
    timeSignature?: string | null
    width?: number
  } = {},
): NotationPreviewItem[] {
  const staves = notation?.staves ?? []
  if (!staves.length) return []

  return staves
    .map((stave) => legacyStaveToPreviewItem(stave, {
      ...fallback,
      width: notation?.width ?? fallback.width,
    }))
    .filter((item): item is NotationPreviewItem => item !== null)
}
