import assert from 'node:assert/strict'
import * as alphaTabModule from '@coderline/alphatab'
import { buildAlphaTabSettings } from '../alphaTabSettings'

const editorPurposes = [
  'editor-notation-score',
  'canvas-notation-score',
  'snapshot-notation',
] as const

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('editor, canvas and snapshot keep the player off', () => {
  for (const purpose of editorPurposes) {
    const s = buildAlphaTabSettings({ purpose })
    assert.equal(s.player.enablePlayer, false, purpose)
    assert.equal(s.player.playerMode, alphaTabModule.PlayerMode.Disabled, purpose)
  }
})

test('study-playalong enables external-media player without animated beat cursor', () => {
  const study = buildAlphaTabSettings({ purpose: 'study-playalong', barsPerRow: 4 })
  assert.equal(study.player.enablePlayer, true)
  assert.equal(study.player.enableCursor, true)
  assert.equal(study.player.enableAnimatedBeatCursor, false)
  assert.equal(study.player.playerMode, alphaTabModule.PlayerMode.EnabledExternalMedia)
  assert.equal(study.display.barsPerRow, 4)
})
