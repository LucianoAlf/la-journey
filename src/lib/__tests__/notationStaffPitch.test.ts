import { chordRowY, emptyStaffAlphaTex, ledgerLineYs, modelPitchFromStaffY, pickStaffBox, pitchFromStaffY, staffBoxesFromLineYs, staffYFromPitch } from '../notationStaffPitch.ts'

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

test('bass bottom line is G2', () => {
  assert(pitchFromStaffY(BOTTOM, TOP, BOTTOM, 'bass') === 'G/2', 'bass bottom')
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

test('staffYFromPitch is the inverse of pitchFromStaffY', () => {
  const half = (BOTTOM - TOP) / 8
  for (let step = -4; step <= 12; step += 1) {
    const y = TOP + step * half
    const pitch = pitchFromStaffY(y, TOP, BOTTOM, 'treble')
    assert(staffYFromPitch(pitch, TOP, BOTTOM, 'treble') === y, `roundtrip step ${step}`)
  }
})

test('staffYFromPitch ignores accidentals', () => {
  const natural = staffYFromPitch('C/4', TOP, BOTTOM, 'treble')
  assert(staffYFromPitch('C#/4', TOP, BOTTOM, 'treble') === natural, 'sharp same line')
})

test('no ledger lines inside the staff', () => {
  assert(ledgerLineYs(TOP + 4, TOP, BOTTOM).length === 0, 'inside staff')
})

test('C4 below treble staff gets one ledger line at its own Y', () => {
  const half = (BOTTOM - TOP) / 8
  const c4 = staffYFromPitch('C/4', TOP, BOTTOM, 'treble')
  const lines = ledgerLineYs(c4, TOP, BOTTOM)
  assert(lines.length === 1, 'one line')
  assert(lines[0] === BOTTOM + 2 * half, 'at C4 line')
})

test('high note above staff gets stacked ledger lines', () => {
  const half = (BOTTOM - TOP) / 8
  const c6 = staffYFromPitch('C/6', TOP, BOTTOM, 'treble')
  const lines = ledgerLineYs(c6, TOP, BOTTOM)
  assert(lines.length === 2, 'A5 and C6 lines')
  assert(lines.includes(TOP - 2 * half) && lines.includes(TOP - 4 * half), 'positions')
})

test('fat bar bounds snap A4 away from the real staff line', () => {
  const realTop = 100
  const realBottom = 140
  const realA4 = staffYFromPitch('A/4', realTop, realBottom, 'treble')
  const fatPitch = pitchFromStaffY(realA4, 60, 180, 'treble')
  const fatSnap = staffYFromPitch(fatPitch, 60, 180, 'treble')
  assert(Math.abs(fatSnap - realA4) > 1, 'bar visualBounds must not be used as the staff')
})

test('staffBoxesFromLineYs keeps only the five staff lines', () => {
  const boxes = staffBoxesFromLineYs([100, 110, 120, 130, 140])
  assert(boxes.length === 1, 'one staff')
  assert(boxes[0].top === 100 && boxes[0].bottom === 140, 'F5 to E4')
  assert(pitchFromStaffY(125, boxes[0].top, boxes[0].bottom, 'treble') === 'A/4', 'A4 space')
  assert(staffYFromPitch('A/4', boxes[0].top, boxes[0].bottom, 'treble') === 125, 'snap on A4')
})

test('model pitch is one octave below the written staff pitch', () => {
  const half = (BOTTOM - TOP) / 8
  const a4Y = TOP + 5 * half
  assert(pitchFromStaffY(a4Y, TOP, BOTTOM, 'treble') === 'A/4', 'written A4')
  assert(modelPitchFromStaffY(a4Y, TOP, BOTTOM, 'treble') === 'A/3', 'AlphaTab displays A/3 as A4')
})

test('chordRowY aligns the input with the chords already engraved', () => {
  const staffTop = 100
  const staffHeight = 40
  assert(chordRowY([82], staffTop, staffHeight) === 82, 'uses the measured row')
})

test('chordRowY ignores rows below the staff or from another system', () => {
  const staffTop = 200
  const staffHeight = 40
  // 120 é a fileira do sistema de cima; 210 está dentro da pauta.
  assert(chordRowY([120, 210], staffTop, staffHeight) === 200 - 40 * 0.55, 'falls back')
})

test('chordRowY without measured chords sits above the first staff line', () => {
  const y = chordRowY([], 100, 40)
  assert(y < 100, 'above the staff')
  assert(100 - y > 18, 'clear of the note head')
})

test('staffBoxesFromLineYs splits two systems', () => {
  const boxes = staffBoxesFromLineYs([40, 50, 60, 70, 80, 200, 210, 220, 230, 240])
  assert(boxes.length === 2, 'two staves')
  assert(pickStaffBox(boxes, 225)?.top === 200, 'lower system')
  assert(pickStaffBox(boxes, 55)?.top === 40, 'upper system')
})
