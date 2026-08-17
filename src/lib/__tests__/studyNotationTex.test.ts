import assert from 'node:assert/strict'
import { studyTexFromBlock } from '../studyNotationTex'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const slashBarBlock = {
  content: {
    notation_data: {
      clef: 'treble',
      keySignature: 'F',
      timeSignature: '4/4',
      bpm: 120,
      barsPerSystem: 4,
      beats: [
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, cifra: 'F', barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: true },
      ],
    },
  },
}

test('slash-beat omits key signature and keeps slashes', () => {
  const result = studyTexFromBlock(slashBarBlock, 'slash-beat')
  assert.ok(result)
  assert.match(result.tex, /slashed/)
  assert.match(result.tex, /ch "F"/)
  assert.doesNotMatch(result.tex, /\\ks/)
  assert.equal(result.indexMap.length, 4)
})

test('score keeps the F key signature', () => {
  const result = studyTexFromBlock(slashBarBlock, 'score')
  assert.ok(result)
  assert.match(result.tex, /\\ks/)
})

test('chords hide figures and keep cifra', () => {
  const result = studyTexFromBlock(slashBarBlock, 'chords')
  assert.ok(result)
  assert.match(result.tex, /ch "F"/)
  assert.match(result.tex, /\br\b/)
  assert.match(result.tex, /\|/)
  assert.doesNotMatch(result.tex, /slashed/)
  assert.doesNotMatch(result.tex, /\\ks/)
})

test('returns null without notation beats', () => {
  assert.equal(studyTexFromBlock({}), null)
  assert.equal(studyTexFromBlock({ content: { notation_data: { beats: [] } } }), null)
})
