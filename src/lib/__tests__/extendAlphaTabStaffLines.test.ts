import assert from 'node:assert/strict'
import {
  extendedStaffLineWidth,
  isStaffLineRect,
  resolveStaffTargetWidth,
} from '../extendAlphaTabStaffLines'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('recognizes thin full-ish rects as staff lines', () => {
  assert.equal(isStaffLineRect(1.053, 280), true)
  assert.equal(isStaffLineRect(1.053, 603), true)
})

test('ignores barlines, noteheads and background rects', () => {
  assert.equal(isStaffLineRect(33.4, 1.3), false)
  assert.equal(isStaffLineRect(12, 12), false)
  assert.equal(isStaffLineRect(1.053, 10), false)
})

test('extends a short staff line leaving the same inset on the right as the left', () => {
  // x=35 left inset → right edge at 638-35, width 568
  assert.equal(extendedStaffLineWidth(35, 280, 638), 568)
})

test('shortens a line that was flush to the container edge', () => {
  assert.equal(extendedStaffLineWidth(35, 603, 638), 568)
})

test('keeps a line that already has matching side insets', () => {
  assert.equal(extendedStaffLineWidth(35, 568, 638), 568)
})

test('target width is the wider of container and svg', () => {
  assert.equal(resolveStaffTargetWidth(638, 280), 638)
  assert.equal(resolveStaffTargetWidth(0, 280), 280)
  assert.equal(resolveStaffTargetWidth(500, 638), 638)
})
