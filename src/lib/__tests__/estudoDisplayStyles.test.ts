import assert from 'node:assert/strict'
import { applyEstudoBarsPerRow, hiddenGlyphsForDisplay } from '../estudoDisplayStyles'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('pulso hides stems and accidentals', () => {
  const glyphs = hiddenGlyphsForDisplay('slash-beat')
  assert.deepEqual(glyphs.sort(), ['accidentals', 'beams', 'flags', 'stem'].sort())
})

test('cifra hides figures and rests, keeps staff for barlines', () => {
  const glyphs = hiddenGlyphsForDisplay('chords')
  assert.ok(glyphs.includes('rests'))
  assert.ok(glyphs.includes('notehead'))
  assert.ok(glyphs.includes('stem'))
})

test('ritmo hides the bequadro on slashes and keeps stems', () => {
  assert.deepEqual(hiddenGlyphsForDisplay('slash-rhythm'), ['accidentals'])
})

test('score keeps figures', () => {
  assert.deepEqual(hiddenGlyphsForDisplay('score'), [])
})

test('bars per row is a no-op without a score', () => {
  applyEstudoBarsPerRow(null, 4)
})

test('bars per row is a no-op when masterBars is empty', () => {
  const score = { masterBars: [], tracks: [{ defaultSystemsLayout: 0, systemsLayout: ['x'] }] }
  applyEstudoBarsPerRow(score as never, 4)
  assert.deepEqual(score.tracks[0].systemsLayout, ['x'])
})
