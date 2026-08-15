import assert from 'node:assert/strict'
import {
  deleteBeat,
  insertNote,
  insertRest,
  replaceNote,
  sessionToAlphaTex,
  applySessionToRenderData,
} from '../notationInlineOps.ts'
import type { InlineBeat } from '../notationInlineHydrate.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const c4: InlineBeat = { pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false }

test('insertNote appends after index and selects the new beat', () => {
  const next = insertNote({
    beats: [c4],
    selectedBeatIdx: 0,
    pitch: 'E/4',
    afterIdx: 0,
    duration: 'q',
    accidental: null,
    dotted: false,
    doubleDotted: false,
  })
  assert.equal(next.beats.length, 2)
  assert.equal(next.beats[1].pitches[0].pitch, 'E/4')
  assert.equal(next.selectedBeatIdx, 1)
})

test('replaceNote changes pitch in place', () => {
  const next = replaceNote({ beats: [c4], atIdx: 0, pitch: 'G/4', accidental: '#' })
  assert.equal(next.beats[0].pitches[0].pitch, 'G/4')
  assert.equal(next.beats[0].pitches[0].accidental, '#')
  assert.equal(next.beats[0].isRest, false)
})

test('deleteBeat removes and clamps selection', () => {
  const next = deleteBeat({
    beats: [c4, { pitches: [{ pitch: 'D/4' }], duration: 'q', isRest: false }],
    selectedBeatIdx: 1,
    idx: 1,
  })
  assert.equal(next.beats.length, 1)
  assert.equal(next.selectedBeatIdx, 0)
})

test('insertRest uses current duration', () => {
  const next = insertRest({
    beats: [c4],
    selectedBeatIdx: 0,
    duration: 'h',
    dotted: false,
    doubleDotted: false,
  })
  assert.equal(next.beats[1].isRest, true)
  assert.equal(next.beats[1].duration, 'h')
})

test('sessionToAlphaTex emits the new pitch', () => {
  const { tex, indexMap } = sessionToAlphaTex({
    beats: [
      c4,
      { pitches: [{ pitch: 'E/4' }], duration: 'q', isRest: false },
    ],
    clef: 'treble',
    keySignature: 'C',
    timeSignature: 'free',
    bpm: 120,
    grandStaff: false,
  })
  assert.match(tex, /e4/i)
  assert.ok(indexMap.length >= 2)
})

test('applySessionToRenderData writes notation_data and alphaTex without dropping other keys', () => {
  const rd = applySessionToRenderData(
    { foo: 1, notation: { type: 'staff', staves: [] } },
    {
      beats: [{ pitches: [{ pitch: 'C/4' }], duration: 'q', isRest: false }],
      clef: 'treble',
      keySignature: 'C',
      timeSignature: 'free',
      bpm: 120,
      grandStaff: false,
      title: 'Intervalos',
    },
  )
  assert.equal(rd.foo, 1)
  assert.equal(rd.clef, 'treble')
  assert.ok(Array.isArray(rd.notation_data.beats))
  assert.equal(typeof rd.alphaTex, 'string')
  assert.match(rd.alphaTex, /c4/i)
  assert.equal(rd.notation.staves.length >= 1, true)
})
