import assert from 'node:assert/strict'
import { hydrateNotationFromBlock } from '../notationInlineHydrate.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const twoStaves = {
  notation: {
    type: 'staff',
    staves: [
      { clef: 'treble', key_signature: 'C', notes: ['C/4:q', 'D/4:q'], accidentals: [null, null] },
      { clef: 'treble', key_signature: 'C', notes: ['E/4:q', 'F/4:q', 'G/4:q'], accidentals: [null, null, null] },
    ],
  },
}

test('full score hydrates every legacy stave, not index 0', () => {
  const session = hydrateNotationFromBlock({ render_data: twoStaves, content: {}, staveIndex: null })
  assert.equal(session.beats.length, 5)
  assert.equal(session.beats[1].barAfter, true)
  assert.equal(session.clef, 'treble')
})

test('pointed stave hydrates only that stave', () => {
  const session = hydrateNotationFromBlock({ render_data: twoStaves, content: {}, staveIndex: 1 })
  assert.equal(session.beats.length, 3)
  assert.equal(session.beats[0].pitches[0].pitch, 'E/4')
})

test('pointed stave ignores notation_data on multi-stave blocks', () => {
  const session = hydrateNotationFromBlock({
    render_data: {
      ...twoStaves,
      notation_data: {
        beats: [{ pitches: [{ pitch: 'A/4' }], duration: 'q', isRest: false }],
      },
    },
    content: {},
    staveIndex: 1,
  })
  assert.equal(session.beats.length, 3)
  assert.equal(session.beats[0].pitches[0].pitch, 'E/4')
})

test('notation_data beats win over legacy staves', () => {
  const session = hydrateNotationFromBlock({
    render_data: {
      ...twoStaves,
      notation_data: {
        beats: [{ pitches: [{ pitch: 'A/4' }], duration: 'q', isRest: false }],
        clef: 'bass',
        keySignature: 'G',
        timeSignature: '3/4',
        bpm: 90,
        grandStaff: false,
      },
    },
    content: {},
    staveIndex: null,
  })
  assert.equal(session.beats.length, 1)
  assert.equal(session.beats[0].pitches[0].pitch, 'A/4')
  assert.equal(session.clef, 'bass')
  assert.equal(session.keySignature, 'G')
  assert.equal(session.timeSignature, '3/4')
  assert.equal(session.bpm, 90)
})

test('content.notation_data is used when render_data has none', () => {
  const session = hydrateNotationFromBlock({
    render_data: {},
    content: {
      notation_data: {
        beats: [{ pitches: [{ pitch: 'C/5' }], duration: 'h', isRest: false }],
        clef: 'treble',
      },
    },
    staveIndex: null,
  })
  assert.equal(session.beats[0].pitches[0].pitch, 'C/5')
  assert.equal(session.beats[0].duration, 'h')
})

test('render_data notation_data wins over stale content', () => {
  const session = hydrateNotationFromBlock({
    render_data: {
      notation_data: {
        beats: [{ pitches: [{ pitch: 'E/5' }], duration: 'q', isRest: false }],
        clef: 'bass',
      },
    },
    content: {
      notation_data: {
        beats: [{ pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false }],
        clef: 'treble',
      },
    },
    staveIndex: null,
  })
  assert.equal(session.beats[0].pitches[0].pitch, 'E/5')
  assert.equal(session.clef, 'bass')
})

test('notation_data beats preserve cifra on the beat', () => {
  const session = hydrateNotationFromBlock({
    render_data: {
      notation_data: {
        beats: [
          { pitches: [{ pitch: 'D/4' }], duration: 'q', isRest: false, cifra: 'D' },
          { pitches: [{ pitch: 'G/4' }], duration: 'q', isRest: false, cifra: 'G' },
        ],
        clef: 'treble',
      },
    },
    content: {},
    staveIndex: null,
  })
  assert.equal(session.beats[0].cifra, 'D')
  assert.equal(session.beats[1].cifra, 'G')
})

test('notation_data beats preserve slash and do not turn empty slash into a rest', () => {
  const session = hydrateNotationFromBlock({
    render_data: {
      notation_data: {
        beats: [
          { pitches: [{ pitch: 'B/4' }], duration: 'q', isRest: false, slash: true, cifra: 'D' },
          { pitches: [], duration: 'q', slash: true },
        ],
        clef: 'treble',
      },
    },
    content: {},
    staveIndex: null,
  })
  assert.equal(session.beats[0].slash, true)
  assert.equal(session.beats[0].cifra, 'D')
  assert.equal(session.beats[1].slash, true)
  assert.equal(session.beats[1].isRest, false)
})
