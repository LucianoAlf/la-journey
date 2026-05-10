import { getLedgerLines, pitchToY } from '../../components/music/NotationSvgEditor'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
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

const TOP_Y = 40

test('does not draw a ledger line for D4 below treble staff', () => {
  const y = pitchToY('D/4', 'treble', TOP_Y)

  assert(getLedgerLines(y, TOP_Y).length === 0, 'D4 is the space below the staff and should not have a ledger line')
})

test('draws the first ledger line through C4 below treble staff', () => {
  const y = pitchToY('C/4', 'treble', TOP_Y)
  const lines = getLedgerLines(y, TOP_Y)

  assert(lines.length === 1, 'C4 should have exactly one ledger line')
  assert(lines[0] === y, 'C4 ledger line should cross the notehead')
})

test('does not draw a ledger line for G5 above treble staff', () => {
  const y = pitchToY('G/5', 'treble', TOP_Y)

  assert(getLedgerLines(y, TOP_Y).length === 0, 'G5 is the space above the staff and should not have a ledger line')
})

test('draws the first ledger line through A5 above treble staff', () => {
  const y = pitchToY('A/5', 'treble', TOP_Y)
  const lines = getLedgerLines(y, TOP_Y)

  assert(lines.length === 1, 'A5 should have exactly one ledger line')
  assert(lines[0] === y, 'A5 ledger line should cross the notehead')
})
