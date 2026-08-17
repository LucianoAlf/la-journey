import assert from 'node:assert/strict'
import { cifraOverlayFixedStyle } from '../estudoCifraOverlay'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('sits above the beat, centered on it', () => {
  const style = cifraOverlayFixedStyle({ left: 100, top: 200, width: 40, height: 50 })
  assert.equal(style.position, 'fixed')
  assert.equal(style.left, 120)
  assert.ok((style.top as number) < 200)
  assert.equal(style.transform, 'translate(-50%, -100%)')
})

test('does not go above the viewport', () => {
  const style = cifraOverlayFixedStyle({ left: 10, top: 4, width: 20, height: 20 })
  assert.ok((style.top as number) >= 8)
})
