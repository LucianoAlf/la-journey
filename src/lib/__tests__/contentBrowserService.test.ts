import assert from 'node:assert/strict'
import { parseChordSearchIntent } from '../chordSearchIntent'
import { filterChordsByIntent, mergeChordSearchResults, sortChordsForEditorSearch } from '../chordSearchSort'

function run() {
  {
    const sorted = sortChordsForEditorSearch('G', [
      { id: 'caug', name: 'Caug', canonical_name: null },
      { id: 'g7', name: 'G7', canonical_name: null },
      { id: 'g', name: 'G', canonical_name: null },
      { id: 'ag', name: 'A/G', canonical_name: null },
    ] as any)

    assert.deepEqual(sorted.map(chord => chord.name), ['G', 'G7', 'A/G', 'Caug'])
  }

  {
    const sorted = sortChordsForEditorSearch('F7M', [
      { id: 'fmaj7', name: 'Fmaj7', canonical_name: 'F7M' },
      { id: 'f7m9', name: 'F7M(9)', canonical_name: null },
      { id: 'bf7m', name: 'BbF7M', canonical_name: null },
    ] as any)

    assert.deepEqual(sorted.map(chord => chord.name), ['Fmaj7', 'F7M(9)', 'BbF7M'])
  }

  {
    const merged = mergeChordSearchResults('G', [
      { id: 'caug', name: 'Caug', canonical_name: null },
      { id: 'g', name: 'G', canonical_name: null },
    ], [
      { id: 'g', name: 'G', canonical_name: null },
      { id: 'g7', name: 'G7', canonical_name: null },
    ] as any)

    assert.deepEqual(merged.map(chord => chord.name), ['G', 'G7', 'Caug'])
  }

  {
    const chords = [
      { id: 'c1', name: 'C', root_note: 'C', family: 'triad', quality: 'major', caged_shape: 'C' },
      { id: 'c2', name: 'C', root_note: 'C', family: 'triad', quality: 'major', caged_shape: 'A' },
      { id: 'cSlash', name: 'C/B', root_note: 'C', family: 'triad', quality: 'major', caged_shape: 'C' },
      { id: 'cm', name: 'Cm', root_note: 'C', family: 'triad', quality: 'minor', caged_shape: 'C' },
      { id: 'caug', name: 'Caug', root_note: 'C', family: 'triad', quality: 'aug', caged_shape: 'C' },
    ] as any

    assert.deepEqual(
      filterChordsByIntent(chords, parseChordSearchIntent('C maj')).map(chord => chord.name),
      ['C', 'C'],
    )
    assert.deepEqual(
      filterChordsByIntent(chords, parseChordSearchIntent('C aumentado')).map(chord => chord.name),
      ['Caug'],
    )
  }
}

run()
