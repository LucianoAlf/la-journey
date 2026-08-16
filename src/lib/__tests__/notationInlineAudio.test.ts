import assert from 'node:assert/strict'
import { canPlayNotePreview, isNotePreviewMuted, setNotePreviewMuted } from '../notationInlineAudio.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('preview sound plays by default when there is a pitch', () => {
  setNotePreviewMuted(false)
  assert.equal(isNotePreviewMuted(), false)
  assert.equal(canPlayNotePreview(['C/4']), true)
  assert.equal(canPlayNotePreview([]), false)
})

test('muted preview never plays, even with a pitch', () => {
  setNotePreviewMuted(true)
  assert.equal(isNotePreviewMuted(), true)
  assert.equal(canPlayNotePreview(['C/4']), false)
  setNotePreviewMuted(false)
})
