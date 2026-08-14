/**
 * Executar via: npx tsx src/lib/__tests__/pdfHotspots.test.ts
 */
import assert from 'node:assert/strict'
import { isSafePdfHref, mapPdfLinkRects } from '../pdfHotspots'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('maps a cover on the first content slice to a PDF link rectangle', () => {
  const [rect] = mapPdfLinkRects({
    hotspots: [{
      href: 'https://open.spotify.com/track/647I6AeX6QTUWrW3mQkPCm',
      left: 40,
      top: 120,
      width: 88,
      height: 88,
    }],
    pages: [{ start: 100, end: 800, contentTopMm: 28 }],
    marginMm: 12,
    imgWidth: 794,
    printableWidthMm: 186,
    ratio: 186 / 794,
  })

  assert.equal(rect.pageIndex, 0)
  assert.equal(rect.href, 'https://open.spotify.com/track/647I6AeX6QTUWrW3mQkPCm')
  assert.ok(Math.abs(rect.x - (12 + 40 * (186 / 794))) < 0.01)
  assert.ok(Math.abs(rect.y - (28 + (120 - 100) * (186 / 794))) < 0.01)
  assert.ok(Math.abs(rect.w - 88 * (186 / 794)) < 0.01)
  assert.ok(Math.abs(rect.h - 88 * (186 / 794)) < 0.01)
})

test('puts a header hotspot on page 0 using the margin, not the body offset', () => {
  const [rect] = mapPdfLinkRects({
    hotspots: [{ href: 'https://www.youtube.com/watch?v=Tr7mwAGTdK4', left: 10, top: 20, width: 50, height: 30 }],
    pages: [{ start: 100, end: 800, contentTopMm: 40 }],
    marginMm: 12,
    imgWidth: 794,
    printableWidthMm: 186,
    ratio: 186 / 794,
    headerEnd: 100,
  })
  assert.equal(rect.pageIndex, 0)
  assert.ok(Math.abs(rect.y - (12 + 20 * (186 / 794))) < 0.01)
})

test('places a later-page hotspot on the matching slice', () => {
  const [rect] = mapPdfLinkRects({
    hotspots: [{ href: 'https://www.youtube.com/watch?v=Tr7mwAGTdK4', left: 0, top: 900, width: 80, height: 40 }],
    pages: [
      { start: 100, end: 800, contentTopMm: 28 },
      { start: 800, end: 1400, contentTopMm: 28 },
    ],
    marginMm: 12,
    imgWidth: 794,
    printableWidthMm: 186,
    ratio: 186 / 794,
  })
  assert.equal(rect.pageIndex, 1)
  assert.ok(Math.abs(rect.y - (28 + (900 - 800) * (186 / 794))) < 0.01)
})

test('rejects javascript and relative hrefs', () => {
  assert.equal(isSafePdfHref('javascript:alert(1)'), false)
  assert.equal(isSafePdfHref('/repertorio'), false)
  assert.equal(isSafePdfHref('https://open.spotify.com/track/abc'), true)
})
