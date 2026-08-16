import assert from 'node:assert/strict'
import { parsePlayalong, playalongToJson } from '../playalong'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('absent playalong is null', () => {
  assert.equal(parsePlayalong(undefined), null)
  assert.equal(parsePlayalong(null), null)
  assert.equal(parsePlayalong({}), null)
})

test('requires audioUrl string', () => {
  assert.equal(parsePlayalong({ audioUrl: 1 }), null)
  const p = parsePlayalong({ audioUrl: 'https://x/a.mp3' })
  assert.equal(p?.audioUrl, 'https://x/a.mp3')
  assert.equal(p?.countInMs, 0)
  assert.deepEqual(p?.syncPoints, [])
})

test('keeps sync points with bar index and syncTime', () => {
  const p = parsePlayalong({
    audioUrl: '/playalong/ovelha.mp3',
    countInMs: 2220,
    syncPoints: [
      { masterBarIndex: 0, masterBarOccurence: 0, syncTime: 2220 },
      { masterBarIndex: 5, masterBarOccurence: 0, syncTime: 13320 },
    ],
  })
  assert.equal(p?.countInMs, 2220)
  assert.equal(p?.syncPoints[1].masterBarIndex, 5)
  assert.deepEqual(playalongToJson(p!), p)
})

test('drops invalid sync points, keeps valid ones', () => {
  const p = parsePlayalong({
    audioUrl: '/a.mp3',
    syncPoints: [{ masterBarIndex: 'x' }, { masterBarIndex: 1, masterBarOccurence: 0, syncTime: 1000 }],
  })
  assert.equal(p?.syncPoints.length, 1)
  assert.equal(p?.syncPoints[0].masterBarIndex, 1)
})
