import assert from 'node:assert/strict'
import {
  chordFooterText,
  getChordPosition,
  groupChordsByCagedShape,
  isRenderableChordPositions,
  libraryCountLabel,
  pianoQualityLabel,
} from '../chordLibraryDisplay'

function run() {
  assert.equal(chordFooterText({ family: 'triad', difficulty: 2 }), 'tríade · nível 2')
  assert.equal(
    chordFooterText({ family: 'triad', difficulty: 1, voicing_position: 'root_position', instrument: 'piano' }),
    'Posição Fundamental · tríade · nível 1',
  )
  assert.equal(
    chordFooterText({ family: 'triad', difficulty: 2, voicing_position: '1st_inversion', instrument: 'piano' }),
    '1ª Inversão · tríade · nível 2',
  )
  assert.equal(getChordPosition({ fingers: [[1, 3]], barres: [] }), 3)
  assert.deepEqual(
    groupChordsByCagedShape([
      { id: '1', caged_shape: 'C' },
      { id: '2', caged_shape: 'A' },
      { id: '3', caged_shape: null },
    ] as any).map(group => [group.shape, group.chords.length]),
    [['C', 1], ['A', 1], ['G', 0], ['E', 0], ['D', 0], ['?', 1]],
  )
  assert.equal(isRenderableChordPositions({ fingers: [[1, 3]], barres: [], muted: [] }), true)
  assert.equal(isRenderableChordPositions({ fingers: [], barres: [], muted: [] }), false)
  assert.equal(isRenderableChordPositions(null), false)
  assert.equal(pianoQualityLabel('major'), 'Maior')
  assert.equal(pianoQualityLabel('maior'), 'Maior')
  assert.equal(pianoQualityLabel('minor'), 'Menor')
  assert.equal(pianoQualityLabel('augmented'), 'Aum')
  assert.equal(pianoQualityLabel('diminished'), 'Dim')
  assert.equal(pianoQualityLabel(''), 'Maior')
  assert.equal(pianoQualityLabel('', 'Cm'), 'Menor')
  assert.equal(pianoQualityLabel('maj7'), 'maj7')
  assert.equal(libraryCountLabel(1, 'tablatura', 'tablaturas'), '1 tablatura')
  assert.equal(libraryCountLabel(27, 'notação', 'notações'), '27 notações')
}

run()
