import assert from 'node:assert/strict'
import { buildContentPreview } from '../contentPreview'
import type { PreparedMaterialBlock } from '../contentBrowserAdapters'

function run() {
  {
    const preview = buildContentPreview([
      {
        blockType: 'text',
        title: 'Instrucoes',
        content: { html: '<p>Leia com atencao.</p>' },
        renderData: null,
      },
      {
        blockType: 'notation',
        title: 'Colcheias',
        content: { text: 'Leitura' },
        renderData: { alphaTex: ':8 c4 d4 e4 f4' },
      },
      {
        blockType: 'chord_grid',
        title: 'C - F - G',
        content: null,
        renderData: {
          chords: [
            { chord_name: 'C', fingers: [[5, 3, '3']] },
            { chord_name: 'F', fingers: [[6, 1, '1']] },
            { chord_name: 'G', fingers: [[6, 3, '2']] },
          ],
        },
      },
    ] satisfies PreparedMaterialBlock[])

    assert.deepEqual(preview.chips.map(chip => chip.label), ['Texto', 'Pauta', 'Acordes'])
    assert.equal(preview.chips.find(chip => chip.kind === 'chord')?.detail, 'C, F, G')
    assert.equal(preview.summary, 'Texto + Pauta + Acordes')
    assert.equal(preview.primaryKind, 'notation')
  }

  {
    const preview = buildContentPreview([
      {
        blockType: 'tablature',
        title: 'Cromatico',
        content: { text: 'Exercicio cromatico' },
        renderData: { alphaTex: '\\instrument guitar . :4 1.6 2.6' },
      },
      {
        blockType: 'keyboard_grid',
        title: 'Triades',
        content: null,
        renderData: { keyboards: [{ name: 'C', keys: ['C4', 'E4', 'G4'] }] },
      },
    ] satisfies PreparedMaterialBlock[])

    assert.deepEqual(preview.chips.map(chip => chip.label), ['Tablatura', 'Teclado'])
    assert.equal(preview.summary, 'Tablatura + Teclado')
    assert.equal(preview.primaryKind, 'tablature')
  }
}

run()
