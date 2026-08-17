import assert from 'node:assert/strict'
import {
  needsEstudoBackfill,
  parseEstudo,
  sanitizeEstudoTitle,
  estudoToJson,
} from '../estudoConfig'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('absent estudo is null', () => {
  assert.equal(parseEstudo(undefined), null)
  assert.equal(parseEstudo(null), null)
  assert.equal(parseEstudo('from-mp3'), null)
})

test('defaults displayMode and origin', () => {
  const cfg = parseEstudo({})
  assert.equal(cfg?.origin, 'from-mp3')
  assert.equal(cfg?.displayMode, 'slash-beat')
  assert.equal(cfg?.curatorName, null)
})

test('invalid displayMode falls back to slash-beat', () => {
  const cfg = parseEstudo({ origin: 'from-mp3', displayMode: 'piano', curatorName: '  Luciano  ' })
  assert.equal(cfg?.displayMode, 'slash-beat')
  assert.equal(cfg?.curatorName, 'Luciano')
})

test('keeps a valid displayMode', () => {
  assert.equal(parseEstudo({ displayMode: 'score' })?.displayMode, 'score')
  assert.deepEqual(estudoToJson(parseEstudo({ displayMode: 'chords', curatorName: 'Ana' })!), {
    origin: 'from-mp3',
    displayMode: 'chords',
    curatorName: 'Ana',
  })
})

test('catalog: estudo tagged is in; journey playalong is out', () => {
  assert.equal(needsEstudoBackfill({
    page_config: { playalong: { audioUrl: 'https://x/a.mp3' } },
    journey_id: 'j1',
    station_id: null,
  }), false)
  assert.equal(parseEstudo({ origin: 'from-mp3' }) !== null, true)
})

test('backfill: playalong without estudo and without journey', () => {
  assert.equal(needsEstudoBackfill({
    page_config: { playalong: { audioUrl: 'https://x/a.mp3' } },
    journey_id: null,
    station_id: null,
  }), true)
  assert.equal(needsEstudoBackfill({
    page_config: { playalong: { audioUrl: 'https://x/a.mp3' }, estudo: { origin: 'from-mp3' } },
    journey_id: null,
    station_id: null,
  }), false)
})

test('empty rename is rejected; trim and cap at 120', () => {
  assert.equal(sanitizeEstudoTitle('  ', 'Faixa'), null)
  assert.equal(sanitizeEstudoTitle('   Blues  ', 'Faixa'), 'Blues')
  assert.equal(sanitizeEstudoTitle('A'.repeat(130), 'Faixa')?.length, 120)
})
