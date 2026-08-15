import assert from 'node:assert/strict'
import { exerciseCanvasPath } from '../exerciseCanvasPath'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('opens the canvas, not the material list', () => {
  assert.equal(exerciseCanvasPath('abc-123'), '/editor/abc-123')
  assert.notEqual(exerciseCanvasPath('abc-123'), '/editor')
})

test('rejects an empty material id', () => {
  assert.throws(() => exerciseCanvasPath(''), /material/i)
})
