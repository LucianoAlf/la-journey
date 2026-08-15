import { emptyStaffAlphaTex, pitchFromStaffY } from '../notationStaffPitch.ts'

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

const TOP = 40
const BOTTOM = 80

test('treble top line is F5', () => {
  assert(pitchFromStaffY(TOP, TOP, BOTTOM, 'treble') === 'F/5', 'top line')
})

test('treble bottom line is E4', () => {
  assert(pitchFromStaffY(BOTTOM, TOP, BOTTOM, 'treble') === 'E/4', 'bottom line')
})

test('treble space below staff is D4', () => {
  const half = (BOTTOM - TOP) / 8
  assert(pitchFromStaffY(BOTTOM + half, TOP, BOTTOM, 'treble') === 'D/4', 'space below')
})

test('treble first ledger below is C4', () => {
  const half = (BOTTOM - TOP) / 8
  assert(pitchFromStaffY(BOTTOM + 2 * half, TOP, BOTTOM, 'treble') === 'C/4', 'ledger C4')
})

test('bass top line is A3', () => {
  assert(pitchFromStaffY(TOP, TOP, BOTTOM, 'bass') === 'A/3', 'bass top')
})

test('empty staff tex has clef and a rest so AlphaTab draws a staff', () => {
  const tex = emptyStaffAlphaTex({ clef: 'treble', keySignature: 'C', timeSignature: null })
  assert(tex.includes('\\clef'), 'clef')
  assert(tex.includes('r'), 'rest so the staff exists')
  assert(!/\\ts\s+\d/.test(tex), 'free time must not emit \\ts')
})

test('metered empty staff emits time signature', () => {
  const tex = emptyStaffAlphaTex({ clef: 'treble', keySignature: 'C', timeSignature: '4/4' })
  assert(/\\ts\s+4\s+4/.test(tex), '4/4')
})
