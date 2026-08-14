/**
 * Executar via: npx tsx src/lib/__tests__/spotifySearch.test.ts
 */
import assert from 'node:assert/strict'
import {
  buildSpotifyTrackQuery,
  mapSpotifyTrack,
  pickSpotifyCoverUrls,
} from '../../../supabase/functions/_shared/spotify.ts'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('builds field filters with quoted title and artist', () => {
  assert.equal(
    buildSpotifyTrackQuery('Fé', 'IZA'),
    'track:"Fé" artist:"IZA"',
  )
})

test('strips quotes inside values so the filter stays valid', () => {
  assert.equal(
    buildSpotifyTrackQuery('Tempo "Perdido"', 'Legião Urbana'),
    'track:"Tempo Perdido" artist:"Legião Urbana"',
  )
})

test('omits empty artist instead of sending a blank filter', () => {
  assert.equal(buildSpotifyTrackQuery('Oceano', '  '), 'track:"Oceano"')
})

test('maps official TrackObject fields to the confirmation card', () => {
  const mapped = mapSpotifyTrack({
    id: 'abc123xyz00',
    name: 'Fé',
    duration_ms: 201000,
    external_urls: { spotify: 'https://open.spotify.com/track/abc123xyz00' },
    artists: [{ name: 'IZA' }, { name: 'Feat' }],
    album: {
      name: 'Dona de Mim',
      release_date: '2018-04-27',
      images: [
        { url: 'https://i.scdn.co/image/large', height: 640, width: 640 },
        { url: 'https://i.scdn.co/image/medium', height: 300, width: 300 },
        { url: 'https://i.scdn.co/image/small', height: 64, width: 64 },
      ],
    },
  })

  assert.equal(mapped.id, 'abc123xyz00')
  assert.equal(mapped.name, 'Fé')
  assert.equal(mapped.artist, 'IZA, Feat')
  assert.equal(mapped.album, 'Dona de Mim')
  assert.equal(mapped.year, '2018')
  assert.equal(mapped.duration_ms, 201000)
  assert.equal(mapped.url, 'https://open.spotify.com/track/abc123xyz00')
  assert.equal(mapped.images[0].url, 'https://i.scdn.co/image/large')
  assert.equal(mapped.images[0].height, 640)
  assert.equal(mapped.images[2].width, 64)
})

test('picks the 3 Spotify cover sizes widest-first', () => {
  const covers = pickSpotifyCoverUrls([
    { url: 'https://i.scdn.co/image/large', height: 640, width: 640 },
    { url: 'https://i.scdn.co/image/medium', height: 300, width: 300 },
    { url: 'https://i.scdn.co/image/small', height: 64, width: 64 },
  ])
  assert.equal(covers.large, 'https://i.scdn.co/image/large')
  assert.equal(covers.medium, 'https://i.scdn.co/image/medium')
  assert.equal(covers.small, 'https://i.scdn.co/image/small')
})
