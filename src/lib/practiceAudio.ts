export type PracticeAudioStatus = 'generated' | 'transcribing' | 'transcribed' | 'transcribe_failed'

export type PracticeAudioKind = 'vocalize' | 'backing' | 'exercise'

export type PracticeAudioSource = 'lyria' | 'upload' | 'suno'

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

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function chordFromUnknown(item: unknown): RecognizedChord | null {
  if (!item || typeof item !== 'object') return null
  const raw = item as Record<string, unknown>
  const chord = firstString(
    raw.chord_simple_pop,
    raw.chord_basic_pop,
    raw.chord_complex_pop,
    raw.chord,
    raw.name,
  )
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
    for (const key of ['chords', 'chords map', 'chordsMap', 'data', 'result', 'items']) {
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

export function parseMusicaiKey(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null
  const obj = result as Record<string, unknown>
  return firstString(obj['root key'], obj.rootKey, obj.key, obj.recognized_key) || null
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

function normalizeTonic(value: string): string {
  return value.trim().replace('♯', '#').replace('♭', 'b').replace(/^[a-g]/, (letter) => letter.toUpperCase())
}

function parseKeyParts(value: string): { tonic: string; minor: boolean } | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^([A-Ga-g](?:#|b|♯|♭)?)\s*(major|minor|maior|menor|maj|min)?/i)
  if (!match) return null
  const tonic = normalizeTonic(match[1])
  const scale = (match[2] || '').toLowerCase()
  const minor = scale === 'minor' || scale === 'menor' || scale === 'min'
  return { tonic, minor }
}

export function recognizedKeyMatchesRequested(
  requested: { key?: string; scale?: string },
  recognized: string | null | undefined,
): boolean {
  const wanted = requested.key?.trim()
  if (!wanted) return true
  if (!recognized?.trim()) return false

  const requestedParts = parseKeyParts(
    /\b(major|minor|maior|menor|maj|min)\b/i.test(wanted)
      ? wanted
      : `${wanted} ${requested.scale || ''}`.trim(),
  )
  const recognizedParts = parseKeyParts(recognized)
  if (!requestedParts || !recognizedParts) return false
  if (requestedParts.tonic !== recognizedParts.tonic) return false
  if (/\b(major|minor|maior|menor|maj|min)\b/i.test(wanted) || requested.scale) {
    return requestedParts.minor === recognizedParts.minor
  }
  return true
}

function formatChordClock(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const mins = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function chordsToTimedCifra(chords: Array<{ chord: string; start?: number }>): string {
  return chords
    .map((item) => {
      const name = item.chord.trim()
      if (!name || name === 'N') return ''
      const start = typeof item.start === 'number' ? item.start : 0
      return `${formatChordClock(start)} ${name}`
    })
    .filter(Boolean)
    .join(' | ')
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

const PRACTICE_UPLOAD_MAX_BYTES = 20 * 1024 * 1024

export function assertPracticeUploadFile(file: { name: string; type: string; size: number }): void {
  const typeOk = /audio\/(mpeg|mp3|wav|x-wav|wave)/i.test(file.type) || /\.(mp3|wav)$/i.test(file.name)
  if (!typeOk) throw new Error('Use MP3 ou WAV')
  if (file.size > PRACTICE_UPLOAD_MAX_BYTES) throw new Error('Áudio no máximo 20MB')
}
