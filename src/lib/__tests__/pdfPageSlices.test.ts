import assert from 'node:assert/strict'
import { computePdfSlices } from '../pdfPageSlices'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('short content stays on one page', () => {
  const slices = computePdfSlices({
    contentHeight: 400,
    pageBudget: 800,
    breaks: [{ top: 0, bottom: 120 }, { top: 120, bottom: 400 }],
  })
  assert.deepEqual(slices, [{ start: 0, end: 400 }])
})

test('cuts after the last block that fully fits', () => {
  const slices = computePdfSlices({
    contentHeight: 400,
    pageBudget: 250,
    breaks: [
      { top: 0, bottom: 100 },
      { top: 100, bottom: 200 },
      { top: 200, bottom: 300 },
      { top: 300, bottom: 400 },
    ],
  })
  assert.deepEqual(slices, [
    { start: 0, end: 200 },
    { start: 200, end: 400 },
  ])
})

test('does not slice through a chord-lyric pair', () => {
  const slices = computePdfSlices({
    contentHeight: 260,
    pageBudget: 200,
    breaks: [
      { top: 0, bottom: 160 },
      { top: 160, bottom: 220 },
      { top: 220, bottom: 260 },
    ],
  })
  assert.equal(slices[0].end, 160)
  assert.notEqual(slices[0].end, 200, 'must not cut at the raw page budget')
  assert.ok(slices.every((slice) => slice.end > slice.start))
})

test('origin skips the header and only paginates the body', () => {
  const slices = computePdfSlices({
    contentHeight: 500,
    pageBudget: 200,
    origin: 100,
    breaks: [
      { top: 0, bottom: 100 },
      { top: 100, bottom: 250 },
      { top: 250, bottom: 400 },
      { top: 400, bottom: 500 },
    ],
  })
  assert.equal(slices[0].start, 100)
  assert.equal(slices[0].end, 250)
  assert.equal(slices.at(-1)?.end, 500)
})

test('first page can use a tighter budget than the rest', () => {
  const slices = computePdfSlices({
    contentHeight: 500,
    pageBudget: 250,
    firstPageBudget: 150,
    origin: 0,
    breaks: [
      { top: 0, bottom: 100 },
      { top: 100, bottom: 200 },
      { top: 200, bottom: 350 },
      { top: 350, bottom: 500 },
    ],
  })
  assert.equal(slices[0].end, 100)
  assert.ok(slices.length >= 2)
  assert.equal(slices.at(-1)?.end, 500)
})

test('oversized block still advances instead of looping', () => {
  const slices = computePdfSlices({
    contentHeight: 900,
    pageBudget: 300,
    breaks: [{ top: 0, bottom: 900 }],
  })
  assert.ok(slices.length >= 3)
  assert.equal(slices[0].start, 0)
  assert.equal(slices.at(-1)?.end, 900)
  for (const slice of slices) {
    assert.ok(slice.end - slice.start <= 300 + 1)
  }
})
