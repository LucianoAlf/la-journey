import assert from 'node:assert/strict'
import { beatsToAlphaTex } from '../beatsToAlphaTex.ts'
import { countBars, ovelhaNegraBeats } from '../ovelhaNegraBeats.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('Ovelha Negra has 45 bars from the video mapping', () => {
  assert.equal(countBars(ovelhaNegraBeats), 45)
})

test('sections land on the bar-opening beats from the four screens', () => {
  const markers = ovelhaNegraBeats
    .filter(beat => beat.sectionStart)
    .map(beat => beat.sectionStart?.marker)
  assert.deepEqual(markers, ['A', "A'", 'B', 'Interlúdio', "A'", 'B', 'Interlúdio', 'Solo'])
})

test('mixed meter 2/4 appears in the A-section turnarounds', () => {
  const twoFour = ovelhaNegraBeats.filter(beat => beat.timeSignature === '2/4')
  assert.equal(twoFour.length, 3)
  assert.equal(twoFour[0].cifra, 'A')
})

test('simile bars keep stored content out of the tex', () => {
  const simileBars = ovelhaNegraBeats.filter(beat => beat.simile === 'simple').length
  assert.equal(simileBars, 12)
  const tex = beatsToAlphaTex(ovelhaNegraBeats, {
    clef: 'treble',
    keySignature: 'D',
    timeSignature: '4/4',
    timeSignatureMode: 'metered',
    includeLyrics: false,
  })
  assert.equal((tex.match(/\\simile simple/g) ?? []).length, 12)
  assert.ok(tex.includes('\\section "A" ""'))
  assert.ok(tex.includes('\\section "A\'" ""'))
  assert.ok(tex.includes('\\rc 7'))
  assert.ok(tex.includes('\\jump fine'))
  assert.ok(tex.includes(':1 b3{slashed ch "D"}'))
  assert.ok(!tex.includes('Violao'))
})
