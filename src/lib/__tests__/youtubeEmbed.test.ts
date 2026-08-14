/**
 * Executar via: npx tsx src/lib/__tests__/youtubeEmbed.test.ts
 */
import assert from 'node:assert/strict'
import {
  youtubeCanEmbedInPage,
  youtubeEmbedSrc,
  youtubePlayerIframeAttrs,
  youtubePosterUrl,
} from '../youtubeEmbed'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('builds an embed URL with origin so YouTube gets a Referer', () => {
  const src = youtubeEmbedSrc('Tr7mwAGTdK4', 'http://127.0.0.1:3001')
  assert.ok(src.startsWith('https://www.youtube-nocookie.com/embed/Tr7mwAGTdK4?'))
  assert.ok(src.includes('origin=http%3A%2F%2F127.0.0.1%3A3001'))
})

test('prefers a higher-res stored thumbnail for the cover preview', () => {
  assert.equal(
    youtubePosterUrl('Tr7mwAGTdK4', 'https://i.ytimg.com/vi/Tr7mwAGTdK4/mqdefault.jpg'),
    'https://i.ytimg.com/vi/Tr7mwAGTdK4/hqdefault.jpg',
  )
})

test('ficha iframe matches YouTube oembed: youtube.com, referrerpolicy, no origin/jsapi', () => {
  const iframe = youtubePlayerIframeAttrs('Tr7mwAGTdK4', { autoplay: true })
  assert.equal(iframe.referrerpolicy, 'strict-origin-when-cross-origin')
  assert.ok(iframe.allow.includes('web-share'))
  assert.ok(iframe.src.startsWith('https://www.youtube.com/embed/Tr7mwAGTdK4?'))
  assert.equal(iframe.src.includes('origin='), false)
  assert.equal(iframe.src.includes('enablejsapi'), false)
  assert.ok(iframe.src.includes('autoplay=1'))
})

test('YouTube only accepts embeds from HTTPS pages', () => {
  assert.equal(youtubeCanEmbedInPage('http://127.0.0.1:3001'), false)
  assert.equal(youtubeCanEmbedInPage('http://localhost:3001'), false)
  assert.equal(youtubeCanEmbedInPage('https://la-journey.vercel.app'), true)
})

