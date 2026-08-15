import assert from 'node:assert/strict'
import {
  A4_PAGE_HEIGHT_PX,
  A4_PAGE_WIDTH_PX,
  EXERCISE_PREVIEW_DIALOG_CLASS,
  getA4PreviewScale,
} from '../a4Preview'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('A4 page matches the editor canvas', () => {
  assert.equal(A4_PAGE_WIDTH_PX, 794)
  assert.equal(A4_PAGE_HEIGHT_PX, 1123)
})

test('dialog class overrides the default sm:max-w-lg so the sheet can be 794px', () => {
  assert.match(EXERCISE_PREVIEW_DIALOG_CLASS, /sm:max-w-none/)
})

test('does not scale down when the viewport fits a full A4 sheet', () => {
  assert.equal(getA4PreviewScale(1400, 1400), 1)
})

test('scales the sheet to fit a shorter viewport without stretching', () => {
  const scale = getA4PreviewScale(900, 800)
  assert.ok(scale < 1)
  assert.ok(scale * A4_PAGE_HEIGHT_PX <= 800 - 140)
  assert.ok(scale * A4_PAGE_WIDTH_PX <= 900 - 48)
})
