import assert from 'node:assert/strict'
import {
  editorChordToKeyboardRenderData,
  keyboardEntryToDisplayData,
  keyboardBlockToEditorChord,
} from '../keyboardBlockAdapter'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('converts flat keyboard render_data into KeyboardEditor chord props', () => {
  const chord = keyboardBlockToEditorChord({
    id: 'block-1',
    title: 'Teclado plano',
    render_data: {
      chord_name: 'C',
      keys: ['C4', 'E4', 'G4'],
      root: 'C',
      octave: 4,
      fingering_rh: [1, 3, 5],
    },
  })

  assert.equal(chord?.name, 'C')
  assert.deepEqual(chord?.positions.keys, ['C4', 'E4', 'G4'])
  assert.equal(chord?.positions.root, 'C')
  assert.equal(chord?.positions.octave, 4)
  assert.deepEqual(chord?.positions.fingering_rh, [1, 3, 5])
})

test('converts keyboard chord collections and derives root from chord name', () => {
  const chord = keyboardBlockToEditorChord({
    id: 'block-2',
    title: 'Acordes com Tensões - Teclado',
    render_data: {
      title: 'Tensões - Teclado',
      chords: [
        { name: 'C7M(9)', keys: ['C4', 'E4', 'G4', 'B4', 'D5'] },
        { name: 'F7M(#11)', keys: ['F3', 'A3', 'C4', 'E4', 'B4'] },
      ],
    },
  }, { chordIndex: 1 })

  assert.equal(chord?.name, 'F7M(#11)')
  assert.deepEqual(chord?.positions.keys, ['F3', 'A3', 'C4', 'E4', 'B4'])
  assert.equal(chord?.positions.root, 'F')
  assert.equal(chord?.positions.octave, 3)
  assert.deepEqual(chord?.positions.fingering_rh, [1, 2, 3, 4, 5])
})

test('converts keyboard_grid items by index', () => {
  const chord = keyboardBlockToEditorChord({
    id: 'block-3',
    render_data: {
      keyboards: [
        { chord_name: 'C', keys: ['C4', 'E4', 'G4'] },
        { chord_name: 'Dm', keys: ['D4', 'F4', 'A4'], fingering_rh: [1, 3, 5] },
      ],
    },
  }, { keyboardIndex: 1 })

  assert.equal(chord?.name, 'Dm')
  assert.deepEqual(chord?.positions.keys, ['D4', 'F4', 'A4'])
  assert.deepEqual(chord?.positions.fingering_rh, [1, 3, 5])
})

test('serializes KeyboardEditor output without dropping secondary fields', () => {
  const renderData = editorChordToKeyboardRenderData({
    name: 'C/E',
    positions: {
      keys: ['E4', 'G4', 'C5'],
      keys_lh: ['E3'],
      root: 'C',
      octave: 5,
      fingering_rh: [1, 2, 5],
      fingering_lh: [5],
      type: 'triad',
      quality: 'Maior',
      octave_start: 3,
      octave_count: 2,
      voicing_position: '1st_inversion',
    },
  })

  assert.deepEqual(renderData.keys_lh, ['E3'])
  assert.equal(renderData.voicing_position, '1st_inversion')
})

test('normalizes canvas display to the same octave window and inferred fingering as the editor', () => {
  const display = keyboardEntryToDisplayData({
    name: 'Notas Naturais no Teclado',
    keys: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    highlights: [{ from: 'E4', to: 'F4', label: 'ST' }],
  })

  assert.deepEqual(display?.range, ['C3', 'C5'])
  assert.equal(display?.root, 'C')
  assert.equal(display?.rootOctave, 4)
  assert.deepEqual(display?.fingeringRH, [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(display?.highlights, [{ from: 'E4', to: 'F4', label: 'ST' }])
})
