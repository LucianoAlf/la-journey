export type PracticeAudioStatus = 'generated' | 'transcribing' | 'transcribed' | 'transcribe_failed'

export type PracticeAudioKind = 'vocalize' | 'backing' | 'exercise'

export type PracticeAudioSource = 'lyria' | 'upload'

export type PracticeAudioEvent =
  | { type: 'transcribe_start' }
  | { type: 'transcribe_ok' }
  | { type: 'transcribe_fail' }

export type PracticeAudioStatusRow = {
  status: PracticeAudioStatus
  audio_path: string | null
}

export type RecognizedChord = {
  start: number
  end: number
  chord: string
  class?: string
}

export type LyriaAudioPart = {
  data: string
  mimeType: string
}

export function applyPracticeAudioEvent(
  row: PracticeAudioStatusRow,
  event: PracticeAudioEvent,
): PracticeAudioStatusRow {
  const audio_path = row.audio_path
  if (event.type === 'transcribe_start') {
    return { status: 'transcribing', audio_path }
  }
  if (event.type === 'transcribe_ok') {
    return { status: 'transcribed', audio_path }
  }
  return { status: 'transcribe_failed', audio_path }
}

export function extractLyriaAudio(interaction: unknown): LyriaAudioPart | null {
  if (!interaction || typeof interaction !== 'object') return null
  const steps = (interaction as { steps?: unknown }).steps
  if (!Array.isArray(steps)) return null

  for (const step of steps) {
    if (!step || typeof step !== 'object') continue
    const content = (step as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (!part || typeof part !== 'object') continue
      const typed = part as { type?: string; mime_type?: string; mimeType?: string; data?: string }
      if (typed.type !== 'audio' || typeof typed.data !== 'string' || !typed.data) continue
      return {
        data: typed.data,
        mimeType: typed.mime_type || typed.mimeType || 'audio/mpeg',
      }
    }
  }
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function chordFromUnknown(item: unknown): RecognizedChord | null {
  if (!item || typeof item !== 'object') return null
  const raw = item as { start?: unknown; end?: unknown; chord?: unknown; class?: unknown; name?: unknown }
  const chord = typeof raw.chord === 'string' ? raw.chord : typeof raw.name === 'string' ? raw.name : ''
  const start = asNumber(raw.start)
  const end = asNumber(raw.end)
  if (!chord || start == null || end == null) return null
  const parsed: RecognizedChord = { start, end, chord }
  if (typeof raw.class === 'string' && raw.class) parsed.class = raw.class
  return parsed
}

export function parseMusicaiChords(result: unknown): RecognizedChord[] {
  if (!result) return []
  const bags: unknown[] = []
  if (Array.isArray(result)) bags.push(result)
  if (typeof result === 'object') {
    const obj = result as Record<string, unknown>
    for (const key of ['chords', 'data', 'result', 'items']) {
      if (obj[key] != null) bags.push(obj[key])
    }
  }

  const found: RecognizedChord[] = []
  for (const bag of bags) {
    if (!Array.isArray(bag)) continue
    for (const item of bag) {
      const chord = chordFromUnknown(item)
      if (chord) found.push(chord)
    }
    if (found.length) return found
  }
  return found
}

export function preferSimplePopChords(chords: RecognizedChord[]): RecognizedChord[] {
  if (!chords.some((c) => /simple\s*pop/i.test(c.class ?? ''))) {
    return chords.map(({ start, end, chord }) => ({ start, end, chord }))
  }

  const bySlot = new Map<string, RecognizedChord>()
  for (const item of chords) {
    const key = `${item.start}:${item.end}`
    const current = bySlot.get(key)
    const isSimple = /simple\s*pop/i.test(item.class ?? '')
    if (!current || isSimple) bySlot.set(key, item)
  }

  return [...bySlot.values()]
    .sort((a, b) => a.start - b.start)
    .map(({ start, end, chord }) => ({ start, end, chord }))
}

export function parseMusicaiBpm(result: unknown): number | null {
  if (result == null) return null
  if (typeof result === 'number') return Number.isFinite(result) ? Math.round(result) : null
  if (typeof result !== 'object') return null

  const obj = result as Record<string, unknown>
  const direct = asNumber(obj.bpm)
  if (direct != null && direct > 0) return Math.round(direct)

  for (const key of ['tempo', 'beats', 'analysis', 'result', 'data']) {
    const nested = parseMusicaiBpm(obj[key])
    if (nested != null) return nested
  }
  return null
}

export function chordsToCifraLine(chords: Array<{ chord: string }>): string {
  const unique: string[] = []
  for (const item of chords) {
    const name = item.chord.trim()
    if (!name) continue
    if (unique[unique.length - 1] === name) continue
    unique.push(name)
  }
  return unique.join(' | ')
}
