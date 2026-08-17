import assert from 'node:assert/strict'
import { fromMp3ToStudy, titleFromAudioFilename } from '../fromMp3ToStudy'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('maps silence + mid-bar change + next bar', () => {
  const result = fromMp3ToStudy({
    audioUrl: 'https://example.com/a.mp3',
    chords: [
      { start: 1.2, end: 2.2, chord: 'C' },
      { start: 2.2, end: 3.2, chord: 'G' },
      { start: 3.2, end: 5.2, chord: 'Am' },
    ],
    bpm: 120,
    key: 'C major',
  })
  assert.equal(result.bpm, 120)
  assert.equal(result.timeSignature, '4/4')
  assert.equal(result.barsPerSystem, 4)
  assert.equal(result.keySignature, 'C')
  assert.equal(result.playalong.countInMs, 1200)
  assert.equal(result.playalong.audioUrl, 'https://example.com/a.mp3')
  assert.equal(result.beats.length, 8)
  assert.equal(result.beats[0].cifra, 'C')
  assert.equal(result.beats[2].cifra, 'G')
  assert.equal(result.beats[4].cifra, 'Am')
  assert.equal(result.beats[3].barAfter, true)
  assert.equal(result.playalong.syncPoints[0].syncTime, 1200)
  assert.equal(result.playalong.syncPoints[1].syncTime, 3200)
})

test('defaults bpm to 120 and key to C', () => {
  const result = fromMp3ToStudy({
    audioUrl: 'https://example.com/a.mp3',
    chords: [{ start: 0, end: 2, chord: 'F' }],
  })
  assert.equal(result.bpm, 120)
  assert.equal(result.keySignature, 'C')
  assert.equal(result.playalong.countInMs, 0)
})

test('keeps later chord when two quantize to the same beat', () => {
  const result = fromMp3ToStudy({
    audioUrl: 'https://example.com/a.mp3',
    chords: [
      { start: 0, end: 0.2, chord: 'C' },
      { start: 0.1, end: 2, chord: 'G' },
    ],
    bpm: 120,
  })
  assert.equal(result.beats[0].cifra, 'G')
})

test('carries chord onto the next bar downbeat', () => {
  const result = fromMp3ToStudy({
    audioUrl: 'https://example.com/a.mp3',
    chords: [{ start: 0, end: 3.5, chord: 'Dm' }],
    bpm: 120,
  })
  assert.equal(result.beats[4].cifra, 'Dm')
})

test('titleFromAudioFilename strips extension', () => {
  assert.equal(titleFromAudioFilename('Ovelha Negra.mp3'), 'Ovelha Negra')
  assert.equal(titleFromAudioFilename('base.ogg'), 'base')
})

test('throws on empty chords', () => {
  assert.throws(() => fromMp3ToStudy({ audioUrl: 'https://x', chords: [] }), /cifra/i)
})
