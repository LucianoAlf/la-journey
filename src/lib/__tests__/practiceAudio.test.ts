/**
 * Executar via: npx tsx src/lib/__tests__/practiceAudio.test.ts
 */
import assert from 'node:assert/strict'
import {
  applyPracticeAudioEvent,
  chordsToCifraLine,
  extractLyriaAudio,
  parseMusicaiBpm,
  parseMusicaiChords,
  parseMusicaiKey,
  preferSimplePopChords,
} from '../practiceAudio'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('generated → transcribing → transcribed', () => {
  const row = { status: 'generated' as const, audio_path: 'practice-audio/a.mp3' }
  const mid = applyPracticeAudioEvent(row, { type: 'transcribe_start' })
  assert.equal(mid.status, 'transcribing')
  assert.equal(mid.audio_path, 'practice-audio/a.mp3')
  const done = applyPracticeAudioEvent(mid, { type: 'transcribe_ok' })
  assert.equal(done.status, 'transcribed')
  assert.equal(done.audio_path, 'practice-audio/a.mp3')
})

test('transcribe failure keeps audio_path', () => {
  const row = { status: 'transcribing' as const, audio_path: 'practice-audio/a.mp3' }
  const failed = applyPracticeAudioEvent(row, { type: 'transcribe_fail' })
  assert.equal(failed.status, 'transcribe_failed')
  assert.equal(failed.audio_path, 'practice-audio/a.mp3')
})

test('extracts Lyria audio from steps[].content[] not output_audio', () => {
  const interaction = {
    output_audio: null,
    steps: [
      {
        content: [
          { type: 'text', text: 'Working...' },
          { type: 'audio', mime_type: 'audio/mpeg', data: '//abc123' },
        ],
      },
    ],
  }
  const audio = extractLyriaAudio(interaction)
  assert.equal(audio?.mimeType, 'audio/mpeg')
  assert.equal(audio?.data, '//abc123')
})

test('extract returns null when there is no audio part', () => {
  assert.equal(extractLyriaAudio({ steps: [{ content: [{ type: 'text', text: 'nope' }] }] }), null)
})

test('parses Music.AI chord array and prefers Simple Pop', () => {
  const raw = {
    chords: [
      { start: 0, end: 2, chord: 'C', class: 'Simple Pop' },
      { start: 0, end: 2, chord: 'Cmaj7', class: 'Jazz' },
      { start: 2, end: 4, chord: 'G', class: 'Simple Pop' },
    ],
  }
  const preferred = preferSimplePopChords(parseMusicaiChords(raw))
  assert.deepEqual(preferred, [
    { start: 0, end: 2, chord: 'C' },
    { start: 2, end: 4, chord: 'G' },
  ])
})

test('parses Music.AI chords-and-beat-mapping fields', () => {
  const raw = [
    {
      start: 0.34,
      end: 1.14,
      chord_simple_pop: 'D#',
      chord_complex_jazz: 'D#maj7',
    },
    {
      start: 2.72,
      end: 4.28,
      chord_simple_pop: 'Cm',
      chord_complex_jazz: 'C-',
    },
  ]
  assert.deepEqual(parseMusicaiChords(raw), [
    { start: 0.34, end: 1.14, chord: 'D#' },
    { start: 2.72, end: 4.28, chord: 'Cm' },
  ])
})

test('parses BPM from beats or tempo fields', () => {
  assert.equal(parseMusicaiBpm({ bpm: 96 }), 96)
  assert.equal(parseMusicaiBpm({ bpm: '76' }), 76)
  assert.equal(parseMusicaiBpm({ tempo: { bpm: 110.4 } }), 110)
  assert.equal(parseMusicaiBpm({ beats: { bpm: 80 } }), 80)
  assert.equal(parseMusicaiBpm({}), null)
})

test('parses root key from Music.AI job result', () => {
  assert.equal(parseMusicaiKey({ 'root key': 'Eb major' }), 'Eb major')
  assert.equal(parseMusicaiKey({ key: 'C' }), 'C')
  assert.equal(parseMusicaiKey({}), null)
})

test('cifra line collapses consecutive repeats', () => {
  assert.equal(
    chordsToCifraLine([
      { chord: 'C' },
      { chord: 'C' },
      { chord: 'G' },
      { chord: 'D' },
    ]),
    'C | G | D',
  )
})
