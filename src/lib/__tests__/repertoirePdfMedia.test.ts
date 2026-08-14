/**
 * Executar via: npx tsx src/lib/__tests__/repertoirePdfMedia.test.ts
 */
import assert from 'node:assert/strict'
import {
  formatDurationMs,
  mediaAssetUrls,
  mediaFromRepertoire,
} from '../repertoirePdfMedia'
import { songsFromNotebookItems } from '../repertoirePdfSongs'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('formats milliseconds as m:ss', () => {
  assert.equal(formatDurationMs(185400), '3:05')
  assert.equal(formatDurationMs(191000), '3:11')
})

test('builds clickable cover cards without exposing raw URLs as labels', () => {
  const media = mediaFromRepertoire({
    spotify_url: 'https://open.spotify.com/track/647I6AeX6QTUWrW3mQkPCm',
    spotify_track_name: 'Fé',
    spotify_artist_name: 'IZA',
    spotify_album_name: 'Fé',
    spotify_album_year: '2022',
    spotify_duration_ms: 185400,
    spotify_cover_url_large: 'https://i.scdn.co/image/large',
    spotify_cover_url_medium: 'https://i.scdn.co/image/medium',
    youtube_url: 'https://www.youtube.com/watch?v=Tr7mwAGTdK4',
    youtube_title: 'IZA - FÉ (Videoclipe Oficial)',
    youtube_duration: '3:11',
    youtube_thumbnail_url: 'https://i.ytimg.com/vi/Tr7mwAGTdK4/mqdefault.jpg',
  })

  assert.equal(media?.spotify?.href, 'https://open.spotify.com/track/647I6AeX6QTUWrW3mQkPCm')
  assert.equal(media?.spotify?.coverUrl, 'https://i.scdn.co/image/large')
  assert.equal(media?.spotify?.label, 'Spotify')
  assert.equal(media?.spotify?.caption, 'Fé · 2022 · 3:05')
  assert.equal(media?.youtube?.href, 'https://www.youtube.com/watch?v=Tr7mwAGTdK4')
  assert.equal(media?.youtube?.coverUrl, 'https://i.ytimg.com/vi/Tr7mwAGTdK4/mqdefault.jpg')
  assert.equal(media?.youtube?.label, 'YouTube')
  assert.equal(media?.youtube?.caption, 'IZA - FÉ (Videoclipe Oficial) · 3:11')
})

test('omits a platform that has a URL but no cover — no raw link fallback', () => {
  const media = mediaFromRepertoire({
    spotify_url: 'https://open.spotify.com/track/abc',
    youtube_url: 'https://www.youtube.com/watch?v=Tr7mwAGTdK4',
    youtube_thumbnail_url: 'https://i.ytimg.com/vi/Tr7mwAGTdK4/mqdefault.jpg',
  })
  assert.equal(media?.spotify, undefined)
  assert.ok(media?.youtube)
})

test('returns undefined when neither platform has a cover', () => {
  assert.equal(mediaFromRepertoire({
    spotify_url: 'https://open.spotify.com/track/abc',
    youtube_url: 'https://youtu.be/abc',
  }), undefined)
})

test('collects cover URLs for the PDF image wait', () => {
  const media = mediaFromRepertoire({
    spotify_url: 'https://open.spotify.com/track/abc',
    spotify_cover_url_medium: 'https://i.scdn.co/image/m',
    youtube_url: 'https://www.youtube.com/watch?v=id',
    youtube_thumbnail_url: 'https://i.ytimg.com/vi/id/mqdefault.jpg',
  })
  assert.deepEqual(mediaAssetUrls(media), [
    'https://i.ytimg.com/vi/id/mqdefault.jpg',
    'https://i.scdn.co/image/m',
  ])
})

test('notebook songs carry Spotify and YouTube covers into the PDF model', () => {
  const songs = songsFromNotebookItems([
    {
      repertoire: {
        title: 'Fé',
        artist: 'IZA',
        key: 'Ebm',
        chords: ['Dm7'],
        cifra_content: 'Dm7\nHoje',
        spotify_url: 'https://open.spotify.com/track/647I6AeX6QTUWrW3mQkPCm',
        spotify_album_name: 'Fé',
        spotify_album_year: '2022',
        spotify_duration_ms: 185400,
        spotify_cover_url_large: 'https://i.scdn.co/image/large',
        youtube_url: 'https://www.youtube.com/watch?v=Tr7mwAGTdK4',
        youtube_title: 'IZA - FÉ (Videoclipe Oficial)',
        youtube_duration: '3:11',
        youtube_thumbnail_url: 'https://i.ytimg.com/vi/Tr7mwAGTdK4/mqdefault.jpg',
      },
    },
  ])
  assert.equal(songs[0].media?.spotify?.coverUrl, 'https://i.scdn.co/image/large')
  assert.equal(songs[0].media?.youtube?.href, 'https://www.youtube.com/watch?v=Tr7mwAGTdK4')
})
