// src/lib/__tests__/notationInlineKeyboard.test.ts
import { resolveNotationKeyAction } from '../notationInlineKeyboard.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

const noSelection = { hasSelection: false }
const withSelection = { hasSelection: true }

test('letters insert notes', () => {
  const action = resolveNotationKeyAction({ key: 'c' }, noSelection)
  assert(action?.type === 'insert-note' && action.note === 'C', 'c inserts C')
})

test('shift+letter adds to chord only with selection', () => {
  const chord = resolveNotationKeyAction({ key: 'B', shiftKey: true }, withSelection)
  assert(chord?.type === 'add-chord-note' && chord.note === 'B', 'Shift+B builds chord')
  assert(resolveNotationKeyAction({ key: 'B', shiftKey: true }, noSelection) === null, 'no-op without selection')
})

test('digits 1-7 set duration (numpad sends the same key)', () => {
  const quarter = resolveNotationKeyAction({ key: '5' }, noSelection)
  assert(quarter?.type === 'set-duration' && quarter.duration === 'q', '5 = seminima')
  const whole = resolveNotationKeyAction({ key: '7' }, noSelection)
  assert(whole?.type === 'set-duration' && whole.duration === 'w', '7 = semibreve')
})

test('dot toggles with . and , (numpad ABNT)', () => {
  assert(resolveNotationKeyAction({ key: '.' }, noSelection)?.type === 'toggle-dot', 'period')
  assert(resolveNotationKeyAction({ key: ',' }, noSelection)?.type === 'toggle-dot', 'comma')
})

test('0 inserts rest, space toggles play', () => {
  assert(resolveNotationKeyAction({ key: '0' }, noSelection)?.type === 'insert-rest', 'rest')
  assert(resolveNotationKeyAction({ key: ' ' }, noSelection)?.type === 'toggle-play', 'play')
})

test('accidentals: # sharp, - flat, = natural', () => {
  const sharp = resolveNotationKeyAction({ key: '#' }, noSelection)
  assert(sharp?.type === 'set-accidental' && sharp.accidental === '#', 'sharp')
  const flat = resolveNotationKeyAction({ key: '-' }, noSelection)
  assert(flat?.type === 'set-accidental' && flat.accidental === 'b', 'flat')
  const natural = resolveNotationKeyAction({ key: '=' }, noSelection)
  assert(natural?.type === 'set-accidental' && natural.accidental === 'n', 'natural')
})

test('arrows navigate and transpose', () => {
  const left = resolveNotationKeyAction({ key: 'ArrowLeft' }, withSelection)
  assert(left?.type === 'navigate' && left.delta === -1, 'left')
  const right = resolveNotationKeyAction({ key: 'ArrowRight' }, withSelection)
  assert(right?.type === 'navigate' && right.delta === 1, 'right')
  const up = resolveNotationKeyAction({ key: 'ArrowUp' }, withSelection)
  assert(up?.type === 'transpose' && up.direction === 1 && up.octave === false, 'up = diatonic')
  const octaveDown = resolveNotationKeyAction({ key: 'ArrowDown', ctrlKey: true }, withSelection)
  assert(octaveDown?.type === 'transpose' && octaveDown.direction === -1 && octaveDown.octave === true, 'ctrl+down = octave')
})

test('ctrl+arrows and tab jump a whole bar', () => {
  const next = resolveNotationKeyAction({ key: 'ArrowRight', ctrlKey: true }, withSelection)
  assert(next?.type === 'navigate-bar' && next.delta === 1, 'ctrl+right')
  const prev = resolveNotationKeyAction({ key: 'ArrowLeft', metaKey: true }, withSelection)
  assert(prev?.type === 'navigate-bar' && prev.delta === -1, 'meta+left')
  const tab = resolveNotationKeyAction({ key: 'Tab' }, withSelection)
  assert(tab?.type === 'navigate-bar' && tab.delta === 1, 'tab')
  const shiftTab = resolveNotationKeyAction({ key: 'Tab', shiftKey: true }, withSelection)
  assert(shiftTab?.type === 'navigate-bar' && shiftTab.delta === -1, 'shift+tab')
})

test('r repeats last note', () => {
  assert(resolveNotationKeyAction({ key: 'r' }, noSelection)?.type === 'repeat-last-note', 'repeat')
})

test('delete and backspace', () => {
  const del = resolveNotationKeyAction({ key: 'Delete' }, withSelection)
  assert(del?.type === 'delete-beat' && del.backspace === false, 'delete')
  const back = resolveNotationKeyAction({ key: 'Backspace' }, withSelection)
  assert(back?.type === 'delete-beat' && back.backspace === true, 'backspace')
})

test('undo/redo with ctrl or meta', () => {
  assert(resolveNotationKeyAction({ key: 'z', ctrlKey: true }, noSelection)?.type === 'undo', 'ctrl+z')
  assert(resolveNotationKeyAction({ key: 'y', metaKey: true }, noSelection)?.type === 'redo', 'meta+y')
})

test('V leaves writing and becomes select mode', () => {
  assert(
    resolveNotationKeyAction({ key: 'v' }, { hasSelection: true, noteInputArmed: true })?.type === 'leave-note-input',
    'v = select',
  )
  assert(resolveNotationKeyAction({ key: 'v' }, withSelection) === null, 'v is idle when already selecting')
})

test('escape leaves writing first, then selection, then bubbles', () => {
  assert(
    resolveNotationKeyAction({ key: 'Escape' }, { hasSelection: true, noteInputArmed: true })?.type === 'leave-note-input',
    'esc 1 = pointer / no ghost',
  )
  assert(
    resolveNotationKeyAction({ key: 'Escape' }, { hasSelection: false, noteInputArmed: true })?.type === 'leave-note-input',
    'esc leaves writing even without a selected note',
  )
  assert(resolveNotationKeyAction({ key: 'Escape' }, withSelection)?.type === 'release-selection', 'esc 2 = clear selection')
  assert(resolveNotationKeyAction({ key: 'Escape' }, noSelection) === null, 'esc 3 bubbles')
})

test('unhandled keys return null', () => {
  assert(resolveNotationKeyAction({ key: 'x' }, noSelection) === null, 'x')
  assert(resolveNotationKeyAction({ key: 'F1' }, noSelection) === null, 'F1')
  assert(resolveNotationKeyAction({ key: 'c', ctrlKey: true }, noSelection) === null, 'ctrl+c stays free')
})
