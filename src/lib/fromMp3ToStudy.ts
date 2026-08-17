import type { PlayalongConfig, PlayalongSyncPoint } from './playalong'

export type Mp3Chord = {
  start: number
  end: number
  chord: string
}

export type FromMp3ToStudyInput = {
  audioUrl: string
  chords: Mp3Chord[]
  bpm?: number | null
  key?: string | null
  audioDurationSec?: number | null
  beatTimesSec?: number[] | null
}

export type StudySlashBeat = {
  pitches: { pitch: string }[]
  duration: 'q'
  slash: true
  isRest: false
  barAfter: boolean
  cifra?: string
}

export type FromMp3ToStudyResult = {
  beats: StudySlashBeat[]
  keySignature: string
  timeSignature: '4/4'
  bpm: number
  barsPerSystem: 4
  playalong: PlayalongConfig
}

const MAX_BARS = 200

export function titleFromAudioFilename(name: string): string {
  const trimmed = name.trim()
  const withoutExt = trimmed.replace(/\.[^.]+$/, '')
  return withoutExt.trim() || 'Playalong'
}

export function keySignatureFromRecognized(key: string | null | undefined): string {
  if (!key || !key.trim()) return 'C'
  const token = key.trim().split(/\s+/)[0] ?? 'C'
  return token.replace(/major|minor/i, '') || 'C'
}

function finitePositive(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function fromMp3ToStudy(input: FromMp3ToStudyInput): FromMp3ToStudyResult {
  const chords = input.chords.filter((item) => (
    item && typeof item.chord === 'string' && item.chord.trim() !== ''
    && Number.isFinite(item.start) && Number.isFinite(item.end)
  ))
  if (chords.length === 0) throw new Error('Reconhecimento sem cifra')

  const bpm = finitePositive(input.bpm, 120)
  const barMs = (4 * 60_000) / bpm
  const beatMs = barMs / 4

  const beatTimes = (input.beatTimesSec ?? []).filter((t) => Number.isFinite(t))
  const anchorSec = Math.min(
    ...chords.map((c) => c.start),
    ...(beatTimes.length > 0 ? beatTimes : []),
  )
  let countInMs = Math.round(anchorSec * 1000)
  if (countInMs < 50) countInMs = 0

  const lastChordEndMs = Math.max(...chords.map((c) => c.end * 1000))
  const audioEndMs = input.audioDurationSec && input.audioDurationSec > 0
    ? input.audioDurationSec * 1000
    : lastChordEndMs
  const endMs = Math.max(lastChordEndMs, audioEndMs)
  const barCount = Math.min(MAX_BARS, Math.max(1, Math.ceil((endMs - countInMs) / barMs)))
  const beatCount = barCount * 4

  const beats: StudySlashBeat[] = Array.from({ length: beatCount }, (_, index) => ({
    pitches: [{ pitch: 'B/4' }],
    duration: 'q',
    slash: true,
    isRest: false,
    barAfter: (index + 1) % 4 === 0,
  }))

  const placed = [...chords].sort((a, b) => a.start - b.start)
  for (const chord of placed) {
    const t = chord.start * 1000 - countInMs
    const beatIndex = Math.min(beatCount - 1, Math.max(0, Math.round(t / beatMs)))
    beats[beatIndex].cifra = chord.chord.trim()
  }

  for (let bar = 0; bar < barCount; bar++) {
    const downbeat = beats[bar * 4]
    if (downbeat.cifra) continue
    const barStartMs = countInMs + bar * barMs
    const covering = [...placed].reverse().find((chord) => (
      chord.start * 1000 <= barStartMs && chord.end * 1000 > barStartMs
    ))
    if (covering) downbeat.cifra = covering.chord.trim()
  }

  const syncPoints: PlayalongSyncPoint[] = Array.from({ length: barCount }, (_, bar) => {
    const fromBeats = beatTimes.length > bar * 4
      ? Math.round(beatTimes[bar * 4] * 1000)
      : null
    return {
      masterBarIndex: bar,
      masterBarOccurence: 0,
      syncTime: fromBeats ?? (countInMs + bar * barMs),
    }
  })

  return {
    beats,
    keySignature: keySignatureFromRecognized(input.key),
    timeSignature: '4/4',
    bpm,
    barsPerSystem: 4,
    playalong: {
      audioUrl: input.audioUrl,
      countInMs,
      syncPoints,
    },
  }
}
