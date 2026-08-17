import assert from 'node:assert/strict'
import { applyEstudoCifraChip, ESTUDO_CIFRA_CHIPS, nextCifraBeatIndex } from '../estudoCifra'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('chip order is 7 maj7 m7 m sus triangle', () => {
  assert.deepEqual(ESTUDO_CIFRA_CHIPS.map((chip) => chip.label), ['7', 'maj7', 'm7', 'm', 'sus', '△'])
})

test('sus on Bb becomes Bbsus4; triangle on F becomes Fmaj7', () => {
  assert.equal(applyEstudoCifraChip('Bb', 'sus'), 'Bbsus4')
  assert.equal(applyEstudoCifraChip('F', 'tri'), 'Fmaj7')
  assert.equal(applyEstudoCifraChip('C', '7'), 'C7')
})

test('next cifra beat wraps to the first chord', () => {
  const beats = [{ cifra: 'C' }, {}, { cifra: 'G' }, {}]
  assert.equal(nextCifraBeatIndex(beats, 0), 2)
  assert.equal(nextCifraBeatIndex(beats, 2), 0)
  assert.equal(nextCifraBeatIndex([{ cifra: 'Dm' }], 0), 0)
})
