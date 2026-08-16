import {
  barStartIndices,
  clampBarsPerSystem,
  computeBarlineIndices,
  DEFAULT_BARS_PER_SYSTEM,
  navigateBarIndex,
} from '../notationLayout.ts'
import type { InlineBeat } from '../notationInlineHydrate.ts'

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

function beat(overrides: Partial<InlineBeat> = {}): InlineBeat {
  return {
    pitches: [{ pitch: 'C/4' }],
    duration: 'q',
    isRest: false,
    ...overrides,
  }
}

test('clampBarsPerSystem defaults and clamps', () => {
  assert(clampBarsPerSystem(undefined) === DEFAULT_BARS_PER_SYSTEM, 'undefined')
  assert(clampBarsPerSystem('nope') === DEFAULT_BARS_PER_SYSTEM, 'nan')
  assert(clampBarsPerSystem(0) === 1, 'min')
  assert(clampBarsPerSystem(99) === 8, 'max')
  assert(clampBarsPerSystem(4.4) === 4, 'round')
})

test('metered 4/4 puts a barline after every 4 quarters', () => {
  const beats = [beat(), beat(), beat(), beat(), beat(), beat(), beat(), beat()]
  assert(JSON.stringify(computeBarlineIndices(beats, '4/4')) === '[3]', 'one inner barline')
  assert(JSON.stringify(barStartIndices(beats, '4/4')) === '[0,4]', 'two bars')
})

test('free time uses pedagogical barAfter', () => {
  const beats = [beat(), beat({ barAfter: true }), beat(), beat()]
  assert(JSON.stringify(barStartIndices(beats, 'free')) === '[0,2]', 'barAfter starts next bar')
})

test('navigateBarIndex jumps to the start of the next or previous bar', () => {
  const starts = [0, 4, 8]
  assert(navigateBarIndex(starts, 1, 1, 12) === 4, 'next')
  assert(navigateBarIndex(starts, 4, -1, 12) === 0, 'previous')
  assert(navigateBarIndex(starts, 10, 1, 12) === 8, 'stay on last bar')
  assert(navigateBarIndex(starts, -1, 1, 12) === 0, 'no selection goes first')
})
