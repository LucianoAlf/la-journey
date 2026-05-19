import assert from 'node:assert/strict'
import {
  appendLibraryChordToDiagramAsGridBlock,
  applyLibraryChordToDiagramBlock,
  applyLibraryChordToGridBlock,
  chordLibraryItemToRenderData,
  getRenderableGridChords,
} from '../editorChordSelection'

const chord = {
  id: 'g-major',
  name: 'G',
  canonical_name: 'G',
  instrument: 'guitar',
  family: 'major',
  quality: 'major',
  root_note: 'G',
  difficulty: 1,
  positions: {
    fingers: [[2, 5], [3, 6], [3, 1]],
    barres: [],
    muted: [],
    position: 1,
  },
  svg_config: {
    strings: 6,
  },
}

function run() {
  {
    const chords = getRenderableGridChords([
      {
        name: 'G',
        position: 7,
        positions: {
          muted: [2, 3, 5, 6],
          barres: [],
          fingers: [[1, 4, null], [4, 1, null]],
        },
      },
    ])

    assert.deepEqual(chords, [
      {
        chord_name: 'G',
        name: 'G',
        fingers: [[1, 4, null], [4, 1, null]],
        barres: [],
        muted: [2, 3, 5, 6],
        position: 7,
      },
    ])
  }

  {
    const renderData = chordLibraryItemToRenderData(chord) as any

    assert.equal(renderData.chord_name, 'G')
    assert.equal(renderData.chord_library_id, 'g-major')
    assert.deepEqual(renderData.fingers, [[2, 5], [3, 6], [3, 1]])
    assert.deepEqual(renderData.barres, [])
    assert.deepEqual(renderData.muted, [])
    assert.equal(renderData.position, 1)
    assert.equal(renderData.strings, 6)
  }

  {
    const renderData = chordLibraryItemToRenderData({
      id: 'c-caged-e',
      name: 'C',
      canonical_name: 'C',
      instrument: 'guitar',
      caged_shape: 'E',
      positions: {
        muted: [],
        barres: [{ fret: 8, fromString: 6, toString: 1 }],
        fingers: [[3, 9, '2'], [5, 10, '3'], [4, 10, '4']],
      },
      svg_config: {},
    }) as any

    assert.equal(renderData.position, 8)
    assert.equal(renderData.caged_shape, 'E')
    assert.deepEqual(renderData.fingers, [[3, 9, '2'], [5, 10, '3'], [4, 10, '4']])
    assert.deepEqual(renderData.barres, [{ fret: 8, fromString: 6, toString: 1 }])
  }

  {
    const block = {
      id: 'block-1',
      title: 'C',
      render_data: { chord_name: 'C', custom: true },
    }
    const next = applyLibraryChordToDiagramBlock(block, chord)

    assert.equal(next.title, 'G')
    assert.equal((next.render_data as any).chord_name, 'G')
    assert.equal((next.render_data as any).chord_library_id, 'g-major')
    assert.equal((next.render_data as any).custom, true)
  }

  {
    const block = {
      id: 'grid-1',
      render_data: {
        columns: 3,
        chords: [{ chord_name: 'C' }],
      },
    }
    const next = applyLibraryChordToGridBlock(block, chord)

    assert.equal(next.render_data.columns, 3)
    assert.deepEqual(next.render_data.chords.map((item: any) => item.chord_name), ['C', 'G'])
    assert.equal((next.render_data.chords[1] as any).chord_library_id, 'g-major')
  }

  {
    const block = {
      id: 'grid-1',
      render_data: {
        columns: 3,
        chords: [{ chord_name: 'C' }, { chord_name: 'C' }, { chord_name: 'C' }],
      },
    }
    const next = applyLibraryChordToGridBlock(block, chord)

    assert.equal(next.render_data.columns, 4)
    assert.deepEqual(next.render_data.chords.map((item: any) => item.chord_name), ['C', 'C', 'C', 'G'])
  }

  {
    const block = {
      id: 'grid-1',
      render_data: {
        columns: 3,
        chords: [{ chord_name: 'C' }, { chord_name: 'Dm' }],
      },
    }
    const next = applyLibraryChordToGridBlock(block, chord, 1)

    assert.equal(next.render_data.columns, 3)
    assert.deepEqual(next.render_data.chords.map((item: any) => item.chord_name), ['C', 'G'])
  }

  {
    const block = {
      id: 'grid-1',
      render_data: {
        columns: 3,
        chords: [{ chord_name: '', fingers: [], barres: [], muted: [], position: 1 }],
      },
    }
    const next = applyLibraryChordToGridBlock(block, chord)

    assert.equal(next.render_data.columns, 3)
    assert.deepEqual(next.render_data.chords.map((item: any) => item.chord_name), ['G'])
  }

  {
    const block = {
      id: 'block-1',
      block_type: 'chord_diagram',
      title: 'C',
      render_data: {
        chord_name: 'C',
        fingers: [[1, 2]],
        barres: [],
        muted: [6],
        position: 1,
        strings: 6,
      },
    }
    const next = appendLibraryChordToDiagramAsGridBlock(block, chord)
    const renderData = next.render_data as any

    assert.equal(next.block_type, 'chord_grid')
    assert.equal(next.title, 'Grade de Acordes')
    assert.equal(renderData.columns, 3)
    assert.deepEqual(renderData.chords.map((item: any) => item.chord_name), ['C', 'G'])
    assert.deepEqual(renderData.chords[0].fingers, [[1, 2]])
    assert.equal(renderData.chords[1].chord_library_id, 'g-major')
  }

  {
    const block = {
      id: 'empty-block',
      block_type: 'chord_diagram',
      title: '',
      render_data: {
        chord_name: '',
        fingers: [],
        barres: [],
        muted: [],
        position: 1,
      },
    }
    const next = appendLibraryChordToDiagramAsGridBlock(block, chord)
    const renderData = next.render_data as any

    assert.equal(next.block_type, 'chord_grid')
    assert.deepEqual(renderData.chords.map((item: any) => item.chord_name), ['G'])
  }

  {
    const block = {
      id: 'empty-block-null',
      block_type: 'chord_diagram',
      title: null,
      render_data: null,
    }
    const next = appendLibraryChordToDiagramAsGridBlock(block, chord)
    const renderData = next.render_data as any

    assert.equal(next.block_type, 'chord_grid')
    assert.deepEqual(renderData.chords.map((item: any) => item.chord_name), ['G'])
  }

  {
    const block = {
      id: 'malformed-grid-as-diagram',
      block_type: 'chord_diagram',
      title: 'Grade de Acordes',
      render_data: {
        columns: 3,
        chords: [
          { chord_name: '', fingers: [], barres: [], muted: [], position: 1 },
          { chord_name: 'C', fingers: [[1, 2]], barres: [], muted: [], position: 1 },
        ],
      },
    }
    const next = appendLibraryChordToDiagramAsGridBlock(block, chord)
    const renderData = next.render_data as any

    assert.equal(next.block_type, 'chord_grid')
    assert.deepEqual(renderData.chords.map((item: any) => item.chord_name), ['C', 'G'])
  }
}

run()
