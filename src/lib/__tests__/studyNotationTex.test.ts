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
      keySignature: 'D',
      timeSignature: '4/4',
      bpm: 108,
      barsPerSystem: 4,
      beats: [
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, cifra: 'D', barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: false },
        { pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true, barAfter: true },
      ],
    },
  },
}

test('builds AlphaTex with slashes and cifra from a notation block', () => {
  const result = studyTexFromBlock(slashBarBlock)
  assert.ok(result)
  assert.equal(result.barsPerSystem, 4)
  assert.match(result.tex, /slashed/)
  assert.match(result.tex, /ch "D"/)
})

test('returns null without notation beats', () => {
  assert.equal(studyTexFromBlock({}), null)
  assert.equal(studyTexFromBlock({ content: { notation_data: { beats: [] } } }), null)
})
