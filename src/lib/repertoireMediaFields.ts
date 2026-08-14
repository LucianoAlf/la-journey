import { pickSpotifyCoverUrls, type SpotifyTrackHit } from '../../supabase/functions/_shared/spotify.ts'
import type { YoutubeVideoHit } from '../../supabase/functions/_shared/youtube.ts'

export function fieldsFromSpotifyHit(track: SpotifyTrackHit) {
  const covers = pickSpotifyCoverUrls(track.images)
  return {
    spotify_url: track.url,
    spotify_track_id: track.id,
    spotify_track_name: track.name,
    spotify_artist_name: track.artist,
    spotify_album_name: track.album,
    spotify_album_year: track.year,
    spotify_duration_ms: track.duration_ms,
    spotify_cover_url_large: covers.large,
    spotify_cover_url_medium: covers.medium,
    spotify_cover_url_small: covers.small,
  }
}

export function emptySpotifyFields() {
  return {
    spotify_url: '',
    spotify_track_id: '',
    spotify_track_name: '',
    spotify_artist_name: '',
    spotify_album_name: '',
    spotify_album_year: '',
    spotify_duration_ms: 0,
    spotify_cover_url_large: '',
    spotify_cover_url_medium: '',
    spotify_cover_url_small: '',
  }
}

export function fieldsFromYoutubeHit(video: YoutubeVideoHit | null) {
  if (!video) {
    return {
      youtube_url: '',
      youtube_video_id: '',
      youtube_title: '',
      youtube_channel: '',
      youtube_duration: '',
      youtube_thumbnail_url: '',
    }
  }
  return {
    youtube_url: video.url,
    youtube_video_id: video.id,
    youtube_title: video.title,
    youtube_channel: video.channel,
    youtube_duration: video.duration,
    youtube_thumbnail_url: video.thumbnail_url,
  }
}

export function emptyYoutubeFields() {
  return fieldsFromYoutubeHit(null)
}

export function nullIfEmpty(value: number | null | undefined): number | null
export function nullIfEmpty(value: string | null | undefined): string | null
export function nullIfEmpty(value: string | number | null | undefined): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value > 0 ? value : null
  return value.trim() ? value : null
}
