/**
 * Executar via: npx tsx src/lib/__tests__/youtubeLookup.test.ts
 */
import assert from 'node:assert/strict'
import {
  extractYouTubeVideoId,
  evaluateYouTubeVideo,
  formatIso8601Duration,
  pickThumbnailUrl,
  buildYouTubeSearchQuery,
  extractSearchVideoId,
  hydrateSearchHits,
  YOUTUBE_NOT_EMBEDDABLE_MESSAGE,
} from '../../../supabase/functions/_shared/youtube.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('extracts id from watch?v=', () => {
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=KE0LxH8b7no'),
    'KE0LxH8b7no',
  )
})

test('extracts id from youtu.be', () => {
  assert.equal(
    extractYouTubeVideoId('https://youtu.be/KE0LxH8b7no'),
    'KE0LxH8b7no',
  )
})

test('extracts id from shorts', () => {
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/shorts/KE0LxH8b7no'),
    'KE0LxH8b7no',
  )
})

test('extracts id when watch URL has extra params', () => {
  assert.equal(
    extractYouTubeVideoId('https://youtube.com/watch?v=KE0LxH8b7no&t=12s'),
    'KE0LxH8b7no',
  )
})

test('returns null for a non-youtube URL without spending meaning', () => {
  assert.equal(extractYouTubeVideoId('https://open.spotify.com/track/abc'), null)
})

test('formats ISO 8601 duration from contentDetails.duration', () => {
  assert.equal(formatIso8601Duration('PT3M5S'), '3:05')
  assert.equal(formatIso8601Duration('PT1H2M3S'), '1:02:03')
  assert.equal(formatIso8601Duration('PT45S'), '0:45')
})

test('picks medium thumbnail then high then default', () => {
  assert.equal(
    pickThumbnailUrl({
      medium: { url: 'https://i.ytimg.com/vi/x/mqdefault.jpg', width: 320, height: 180 },
      high: { url: 'https://i.ytimg.com/vi/x/hqdefault.jpg', width: 480, height: 360 },
    }),
    'https://i.ytimg.com/vi/x/mqdefault.jpg',
  )
})

test('ok when embeddable and BR is not restricted', () => {
  const result = evaluateYouTubeVideo({
    id: 'KE0LxH8b7no',
    snippet: {
      title: 'IZA - Fé (Clipe Oficial)',
      channelTitle: 'IZA',
      thumbnails: { medium: { url: 'https://i.ytimg.com/vi/KE0LxH8b7no/mqdefault.jpg' } },
    },
    contentDetails: { duration: 'PT3M5S' },
    status: { embeddable: true, privacyStatus: 'public' },
  })
  assert.equal(result.ok, true)
  assert.equal(result.video?.id, 'KE0LxH8b7no')
  assert.equal(result.video?.title, 'IZA - Fé (Clipe Oficial)')
  assert.equal(result.video?.channel, 'IZA')
})

test('rejects when status.embeddable is false', () => {
  const result = evaluateYouTubeVideo({
    id: 'abc12345678',
    snippet: { title: 'Live', channelTitle: 'Canal' },
    status: { embeddable: false, privacyStatus: 'public' },
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'not_embeddable')
  assert.equal(result.message, YOUTUBE_NOT_EMBEDDABLE_MESSAGE)
})

test('rejects when BR is in regionRestriction.blocked', () => {
  const result = evaluateYouTubeVideo({
    id: 'abc12345678',
    snippet: { title: 'Blocked', channelTitle: 'Canal' },
    contentDetails: { duration: 'PT2M', regionRestriction: { blocked: ['BR'] } },
    status: { embeddable: true, privacyStatus: 'public' },
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'region_blocked')
})

test('rejects when allowed list exists and omits BR', () => {
  const result = evaluateYouTubeVideo({
    id: 'abc12345678',
    snippet: { title: 'US only', channelTitle: 'Canal' },
    contentDetails: { duration: 'PT2M', regionRestriction: { allowed: ['US'] } },
    status: { embeddable: true, privacyStatus: 'public' },
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'region_blocked')
})

test('missing items is not embeddable in the player', () => {
  const result = evaluateYouTubeVideo(null)
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'missing')
})

test('builds a free-text search q from title and artist', () => {
  assert.equal(buildYouTubeSearchQuery('Fé', 'IZA'), 'Fé IZA')
})

test('strips YouTube boolean operators from the search q', () => {
  assert.equal(buildYouTubeSearchQuery('Boating | Sailing', '-fishing'), 'Boating Sailing fishing')
})

test('extracts videoId from a search.list resource id object', () => {
  assert.equal(extractSearchVideoId({ id: { kind: 'youtube#video', videoId: 'Tr7mwAGTdK4' } }), 'Tr7mwAGTdK4')
})

test('hydrates search hits from videos.list, keeps order, drops not embeddable', () => {
  const hits = hydrateSearchHits(
    ['aaa11111111', 'bbb22222222', 'ccc33333333'],
    [
      {
        id: 'ccc33333333',
        snippet: { title: 'Third', channelTitle: 'C', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/c/mq.jpg' } } },
        contentDetails: { duration: 'PT1M' },
        status: { embeddable: true, privacyStatus: 'public' },
      },
      {
        id: 'aaa11111111',
        snippet: { title: 'First', channelTitle: 'A', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/a/mq.jpg' } } },
        contentDetails: { duration: 'PT2M' },
        status: { embeddable: true, privacyStatus: 'public' },
      },
      {
        id: 'bbb22222222',
        snippet: { title: 'Blocked embed', channelTitle: 'B' },
        status: { embeddable: false, privacyStatus: 'public' },
      },
    ],
  )
  assert.equal(hits.length, 2)
  assert.equal(hits[0].id, 'aaa11111111')
  assert.equal(hits[1].id, 'ccc33333333')
  assert.equal(hits[0].duration, '2:00')
})
