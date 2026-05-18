import assert from 'node:assert/strict'
import {
  chordFooterText,
  getChordPosition,
  groupChordsByCagedShape,
  isRenderableChordPositions,
} from '../chordLibraryDisplay'

function run() {
  assert.equal(chordFooterText({ family: 'triad', difficulty: 2 }), 'tríade · nível 2')
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
}

run()
