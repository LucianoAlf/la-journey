import assert from 'node:assert/strict'
import { parseChordSearchIntent } from '../chordSearchIntent'

function run() {
  assert.deepEqual(parseChordSearchIntent('C maj'), {
    raw: 'C maj',
    rootNote: 'C',
    quality: 'major',
    family: 'triad',
    exactQuality: true,
    displayName: 'C maior',
    normalizedName: 'C',
  })

  assert.deepEqual(parseChordSearchIntent('Dó maior'), {
    raw: 'Dó maior',
    rootNote: 'C',
    quality: 'major',
    family: 'triad',
    exactQuality: true,
    displayName: 'C maior',
    normalizedName: 'C',
  })

  assert.deepEqual(parseChordSearchIntent('Cm'), {
    raw: 'Cm',
    rootNote: 'C',
    quality: 'minor',
    family: 'triad',
    exactQuality: true,
    displayName: 'C menor',
    normalizedName: 'Cm',
  })

  assert.deepEqual(parseChordSearchIntent('C aumentado'), {
    raw: 'C aumentado',
    rootNote: 'C',
    quality: 'aug',
    family: 'triad',
    exactQuality: true,
    displayName: 'C aumentado',
    normalizedName: 'Caug',
  })

  assert.deepEqual(parseChordSearchIntent('C7M'), {
    raw: 'C7M',
    rootNote: 'C',
    quality: 'maj7',
    family: 'tetrad',
    exactQuality: true,
    displayName: 'C 7M',
    normalizedName: 'Cmaj7',
  })

  const rootOnly = parseChordSearchIntent('C')
  assert.equal(rootOnly.rootNote, 'C')
  assert.equal(rootOnly.exactQuality, false)
}

run()
