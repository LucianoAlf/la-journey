import assert from 'node:assert/strict'
import {
  applyCifraAccidental,
  applyCifraQuality,
  applyCifraRoot,
  cifraRootLabel,
  cifraSuggestions,
  normalizeCifraSymbol,
} from '../notationCifra.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('empty and whitespace become null', () => {
  assert.equal(normalizeCifraSymbol(null), null)
  assert.equal(normalizeCifraSymbol(''), null)
  assert.equal(normalizeCifraSymbol('   '), null)
})

test('trims and keeps Brazilian lead-sheet names', () => {
  assert.equal(normalizeCifraSymbol('  Gm  '), 'Gm')
  assert.equal(normalizeCifraSymbol('Eø'), 'Eø')
  assert.equal(normalizeCifraSymbol('D7(#9)'), 'D7(#9)')
  assert.equal(normalizeCifraSymbol('Bbmaj7'), 'Bbmaj7')
})

test('strips quotes that would break AlphaTex and caps length', () => {
  assert.equal(normalizeCifraSymbol('C"7'), 'C7')
  assert.equal(normalizeCifraSymbol('A'.repeat(30)), 'A'.repeat(24))
})

test('chord layer shows whole chords over the current root', () => {
  const fromEmpty = cifraSuggestions('')
  assert.equal(fromEmpty[0], 'C')
  assert.equal(fromEmpty[1], 'Cm')
  const fromBb = cifraSuggestions('Bb7')
  assert.ok(fromBb.every(chord => chord.startsWith('Bb')), `expected Bb chords, got ${fromBb.join(' ')}`)
  assert.ok(fromBb.includes('Bbmaj7'))
  assert.equal(cifraRootLabel('D7(#9)'), 'D')
  assert.equal(cifraRootLabel('Ebm7'), 'Eb')
})

test('root and quality chips keep the other half of the symbol', () => {
  assert.equal(applyCifraRoot('G7', 'C'), 'C7')
  assert.equal(applyCifraRoot('', 'D'), 'D')
  assert.equal(applyCifraQuality('C', '7'), 'C7')
  assert.equal(applyCifraQuality('Cm7', 'ø'), 'Cø')
  assert.equal(applyCifraQuality('G7', ''), 'G')
  assert.equal(applyCifraAccidental('C7', 'b'), 'Cb7')
  assert.equal(applyCifraAccidental('C#7', '#'), 'C7')
})
