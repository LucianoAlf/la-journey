import assert from 'node:assert/strict'
import {
  buildChordLibraryLookupNames,
  chordLibraryRowToGridChord,
  shouldAllowLocalChordFallback,
} from '../../services/chordLibraryResolver'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('builds ordered lookup candidates for template tension chords', () => {
  assert.deepEqual(buildChordLibraryLookupNames('C7M(9)'), ['C7M(9)', 'Cmaj9', 'Cmaj7(9)', 'CM9'])
  assert.deepEqual(buildChordLibraryLookupNames('Dm7(11)'), ['Dm7(11)', 'Dm11', 'Dmin11'])
  assert.deepEqual(buildChordLibraryLookupNames('G7(13)'), ['G7(13)', 'G13', 'G7(9/13)'])
  assert.deepEqual(buildChordLibraryLookupNames('Am7(9)'), ['Am7(9)', 'Am9', 'Amin9'])
  assert.deepEqual(buildChordLibraryLookupNames('F7M(#11)'), ['F7M(#11)', 'F7M(11+)', 'Fmaj7#11', 'Fmaj7(#11)', 'Fmaj#11'])
})

test('builds lookup candidates for simple triads and seventh chords', () => {
  assert.deepEqual(buildChordLibraryLookupNames('C'), ['C'])
  assert.deepEqual(buildChordLibraryLookupNames('Dm'), ['Dm'])
  assert.deepEqual(buildChordLibraryLookupNames('Bdim'), ['Bdim', 'B°', 'Bm(b5)'])
  assert.deepEqual(buildChordLibraryLookupNames('C7M'), ['C7M', 'Cmaj7', 'CM7'])
  assert.deepEqual(buildChordLibraryLookupNames('Em7'), ['Em7', 'Emin7'])
})

test('allows local fallback only for simple non-tension chords', () => {
  assert.equal(shouldAllowLocalChordFallback('C'), true)
  assert.equal(shouldAllowLocalChordFallback('Dm'), true)
  assert.equal(shouldAllowLocalChordFallback('C7M'), true)
  assert.equal(shouldAllowLocalChordFallback('F7M(#11)'), false)
  assert.equal(shouldAllowLocalChordFallback('C7M(9)'), false)
  assert.equal(shouldAllowLocalChordFallback('G7(13)'), false)
})

test('maps chord_library rows to structured chord_grid objects', () => {
  const resolved = chordLibraryRowToGridChord({
    id: 'chord-id',
    name: 'Fmaj#11',
    canonical_name: 'Fmaj#11',
    instrument: 'guitar',
    positions: {
      fingers: [[6, 1, '1'], [5, 0], [4, 2, '2']],
      barres: [],
      muted: [],
      position: 1,
    },
    svg_config: { strings: 6 },
  })

  assert.deepEqual(resolved, {
    chord_name: 'Fmaj#11',
    name: 'Fmaj#11',
    chord_library_id: 'chord-id',
    source: 'chord_library',
    fingers: [[6, 1, '1'], [5, 0], [4, 2, '2']],
    barres: [],
    muted: [],
    position: 1,
    strings: 6,
  })
})
