import assert from 'node:assert/strict'
import { getMaterialBlockEmptyState } from '../materialBlockEmptyState'

function run() {
  assert.deepEqual(
    getMaterialBlockEmptyState({
      blockType: 'text',
      content: { text: '', html: '<p><br></p>' },
      renderData: {},
      title: '',
    }),
    {
      kind: 'text',
      headline: 'Escreva seu texto aqui',
      detail: 'Clique duas vezes ou use a barra para começar a editar.',
    },
  )

  assert.equal(
    getMaterialBlockEmptyState({
      blockType: 'text',
      content: { html: '<p>Melodia e ritmo</p>' },
      renderData: {},
      title: '',
    }),
    null,
  )

  assert.deepEqual(
    getMaterialBlockEmptyState({
      blockType: 'notation',
      content: {},
      renderData: {},
      title: '',
    }),
    {
      kind: 'notation',
      headline: 'Pentagrama vazio',
      detail: 'Clique em Editar Notação para adicionar notas.',
    },
  )

  assert.equal(
    getMaterialBlockEmptyState({
      blockType: 'notation',
      content: {},
      renderData: { alphaTex: ':4 c4 d4 e4' },
      title: '',
    }),
    null,
  )

  assert.deepEqual(
    getMaterialBlockEmptyState({
      blockType: 'tablature',
      content: { text: '' },
      renderData: {
        alphaTex: '',
        tab: '',
        notation_data: {
          grid: Array.from({ length: 6 }, () => Array(16).fill(null)),
        },
      },
      title: 'Tablatura',
    }),
    {
      kind: 'tablature',
      headline: 'Tablatura vazia',
      detail: 'Clique em Editar tablatura para adicionar casas e ritmo.',
    },
  )

  assert.equal(
    getMaterialBlockEmptyState({
      blockType: 'tablature',
      content: { text: '' },
      renderData: {
        notation_data: {
          grid: [[null, 3, null]],
        },
      },
      title: 'Tablatura',
    }),
    null,
  )

  assert.deepEqual(
    getMaterialBlockEmptyState({
      blockType: 'chord_diagram',
      content: { text: '' },
      renderData: {},
      title: '',
    }),
    {
      kind: 'chord_diagram',
      headline: 'Acorde vazio',
      detail: 'Clique em Editar acorde para escolher um acorde.',
    },
  )

  assert.equal(
    getMaterialBlockEmptyState({
      blockType: 'chord_diagram',
      content: { text: '' },
      renderData: { chord_name: 'C', fingers: [[2, 1]], barres: [], muted: [] },
      title: '',
    }),
    null,
  )

  assert.deepEqual(
    getMaterialBlockEmptyState({
      blockType: 'keyboard',
      content: { text: '' },
      renderData: { keys: [], keys_lh: [], hand: 'rh' },
      title: 'Teclado',
    }),
    {
      kind: 'keyboard',
      headline: 'Teclado vazio',
      detail: 'Clique em Editar teclado para configurar notas e mãos.',
    },
  )

  assert.equal(
    getMaterialBlockEmptyState({
      blockType: 'keyboard',
      content: { text: '' },
      renderData: { keys: ['C4', 'E4', 'G4'], hand: 'rh' },
      title: 'C',
    }),
    null,
  )

  assert.deepEqual(
    getMaterialBlockEmptyState({
      blockType: 'keyboard_grid',
      content: { text: '' },
      renderData: { keyboards: [], columns: 3 },
      title: 'Grade de Teclados',
    }),
    {
      kind: 'keyboard_grid',
      headline: 'Grade de teclados vazia',
      detail: 'Clique em Adicionar teclado para montar a grade.',
    },
  )

  assert.equal(
    getMaterialBlockEmptyState({
      blockType: 'keyboard_grid',
      content: { text: '' },
      renderData: { keyboards: [{ chord_name: 'C', keys: ['C4', 'E4', 'G4'] }], columns: 3 },
      title: 'Grade de Teclados',
    }),
    null,
  )
}

run()
