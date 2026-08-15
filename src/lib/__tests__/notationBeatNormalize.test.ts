import assert from 'node:assert/strict'
import { editorDurationFromRaw } from '../notationBeatNormalize'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('maps AlphaTex numeric durations to editor tokens', () => {
  assert.equal(editorDurationFromRaw('1'), 'w')
  assert.equal(editorDurationFromRaw('2'), 'h')
  assert.equal(editorDurationFromRaw('4'), 'q')
})

test('keeps editor duration tokens', () => {
  assert.equal(editorDurationFromRaw('w'), 'w')
  assert.equal(editorDurationFromRaw('h'), 'h')
  assert.equal(editorDurationFromRaw('q'), 'q')
  assert.equal(editorDurationFromRaw('8'), '8')
  assert.equal(editorDurationFromRaw('16'), '16')
})

test('strips dots and rest markers before mapping', () => {
  assert.equal(editorDurationFromRaw('2d'), 'h')
  assert.equal(editorDurationFromRaw('4r'), 'q')
  assert.equal(editorDurationFromRaw('1dd'), 'w')
})

test('unknown duration falls back to quarter', () => {
  assert.equal(editorDurationFromRaw(''), 'q')
  assert.equal(editorDurationFromRaw('9'), 'q')
})
