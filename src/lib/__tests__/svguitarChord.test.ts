/**
 * Executar via: npx tsx src/lib/__tests__/svguitarChord.test.ts
 */
import assert from 'node:assert/strict'
import { svguitarFretOffset } from '../svguitarChord'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('keeps Cifra-style Gm7 relative to position 3 (barre on fret 1)', () => {
  assert.equal(svguitarFretOffset(3, [[6, 1, '1'], [5, 3, '3'], [1, 1, '1']], [{ fret: 1 }]), 0)
})

test('converts absolute Gm7 (barre on guitar fret 3) to SVGuitar relative', () => {
  assert.equal(svguitarFretOffset(3, [[6, 3, '1'], [5, 5, '3']], [{ fret: 3 }]), 2)
})

test('does not shift open-position chords', () => {
  assert.equal(svguitarFretOffset(1, [[5, 3], [4, 2], [2, 1]], []), 0)
})

test('shifts a high-position voicing stored in absolute frets', () => {
  assert.equal(svguitarFretOffset(5, [[6, 5], [5, 7]], [{ fret: 5 }]), 4)
})

test('keeps a high-position voicing already stored relative to the window', () => {
  assert.equal(svguitarFretOffset(5, [[6, 1], [5, 3]], [{ fret: 1 }]), 0)
})
