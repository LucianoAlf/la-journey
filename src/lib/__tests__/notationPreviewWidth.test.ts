import assert from 'node:assert/strict'
import {
  A4_CANVAS_NOTATION_WIDTH,
  A4_NOTATION_CONTENT_WIDTH,
  canvasNotationWidth,
  resolveNotationPreviewWidth,
} from '../notationPreviewWidth'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('uses stored width when it is a positive number', () => {
  assert.equal(resolveNotationPreviewWidth({ width: 620 }), 620)
})

test('falls back to A4 content width when width is missing', () => {
  assert.equal(resolveNotationPreviewWidth({}), A4_NOTATION_CONTENT_WIDTH)
  assert.equal(resolveNotationPreviewWidth(null), A4_NOTATION_CONTENT_WIDTH)
  assert.equal(resolveNotationPreviewWidth(undefined), A4_NOTATION_CONTENT_WIDTH)
})

test('ignores invalid stored widths', () => {
  assert.equal(resolveNotationPreviewWidth({ width: 0 }), A4_NOTATION_CONTENT_WIDTH)
  assert.equal(resolveNotationPreviewWidth({ width: -12 }), A4_NOTATION_CONTENT_WIDTH)
  assert.equal(resolveNotationPreviewWidth({ width: '450' }), A4_NOTATION_CONTENT_WIDTH)
})

test('A4 content width is the printable page minus the usual 40px side padding', () => {
  assert.equal(A4_NOTATION_CONTENT_WIDTH, 794 - 80)
})

test('canvas AlphaTab width matches A4 content after page and block chrome', () => {
  assert.equal(A4_CANVAS_NOTATION_WIDTH, 638)
})

test('canvas notation width grows with landscape paper', () => {
  assert.equal(canvasNotationWidth(1123), 1123 - 120 - 32 - 4)
  assert.equal(canvasNotationWidth(), A4_CANVAS_NOTATION_WIDTH)
})
