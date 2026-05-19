import assert from 'node:assert/strict'
import {
  adaptChordLibraryItem,
  adaptContentBlockItem,
  adaptExerciseLibraryItem,
  adaptNotationLibraryItem,
  adaptRepertoireItem,
} from '../contentBrowserAdapters'

function run() {
  {
    const blocks = adaptContentBlockItem({
      block_type: 'exercise',
      title: 'Escala pentatonica',
      content: { html: '<p>Toque em duas oitavas.</p>' },
      render_data: { style: { spacing: 8 } },
    })

    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].blockType, 'exercise')
    assert.equal(blocks[0].title, 'Escala pentatonica')
    assert.deepEqual(blocks[0].renderData, { style: { spacing: 8 } })
  }

  {
    const blocks = adaptContentBlockItem({
      block_type: 'chord_chart',
      title: 'Transicoes de G',
      content: {
        text: 'Duas formas de G no braco.',
        chords: [
          {
            name: 'G',
            position: 7,
            positions: {
              muted: [2, 3, 5, 6],
              barres: [],
              fingers: [[1, 4, null], [4, 1, null]],
            },
          },
        ],
      },
      render_data: {},
    })

    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].blockType, 'chord_grid')
    assert.equal(blocks[0].title, 'Transicoes de G')
    assert.deepEqual((blocks[0].renderData as any).chords, [
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
    const blocks = adaptNotationLibraryItem({
      name: 'Escala de Do',
      notation_data: { staves: [{ notes: ['C4:q'] }] },
      render_data: { alphaTex: '\\title \"Escala\"' },
    })

    assert.equal(blocks[0].blockType, 'notation')
    assert.equal(blocks[0].title, 'Escala de Do')
    assert.deepEqual(blocks[0].renderData?.notation, { staves: [{ notes: ['C4:q'] }] })
  }

  {
    const blocks = adaptChordLibraryItem({
      name: 'G',
      instrument: 'guitar',
      positions: { frets: [3, 2, 0, 0, 0, 3] },
      fingers: { fingers: [2, 1, 0, 0, 0, 3] },
      barre: null,
      svg_config: { variant: 'open' },
    })

    assert.equal(blocks[0].blockType, 'chord_diagram')
    assert.equal(blocks[0].title, 'G')
    assert.equal(blocks[0].renderData?.chord_name, 'G')
  }

  {
    const blocks = adaptRepertoireItem({
      title: 'Asa Branca',
      artist: 'Luiz Gonzaga',
      key: 'G',
      chords: ['G', 'D7'],
      cifra_content: '[G]Quando olhei a terra ardendo',
    })

    assert.equal(blocks[0].blockType, 'text')
    assert.equal(blocks[0].title, 'Asa Branca')
    assert.match(String(blocks[0].content?.html), /Luiz Gonzaga/)
    assert.match(String(blocks[0].content?.html), /G, D7/)
  }

  {
    const blocks = adaptRepertoireItem({
      title: 'Asa Branca',
      artist: 'Luiz Gonzaga',
      key: 'G',
      chords: ['G', 'D7', 'C'],
      cifra_content: '[G]Quando olhei a terra ardendo',
    }, { includeChordGrid: true })

    assert.equal(blocks.length, 2)
    assert.equal(blocks[0].blockType, 'text')
    assert.equal(blocks[1].blockType, 'chord_grid')
    assert.deepEqual((blocks[1].renderData as any).chords, ['G', 'D7', 'C'])
    assert.equal((blocks[1].renderData as any).columns, 3)
  }

  {
    const blocks = adaptExerciseLibraryItem({
      blocks: [
        { block_type: 'text', title: 'Intro', content: { text: 'Leia' }, render_data: null },
        { block_type: 'notation', title: 'Pauta', content: null, render_data: { alphaTex: '3.3' } },
      ],
    })

    assert.equal(blocks.length, 2)
    assert.equal(blocks[1].blockType, 'notation')
  }
}

run()
