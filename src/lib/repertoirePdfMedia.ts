export interface RepertoirePdfMediaCard {
  href: string
  coverUrl: string
  label: string
  caption: string
}

export interface RepertoirePdfMedia {
  youtube?: RepertoirePdfMediaCard
  spotify?: RepertoirePdfMediaCard
}

export type RepertoireMediaSource = {
  spotify_url?: string | null
  spotify_track_name?: string | null
  spotify_artist_name?: string | null
  spotify_album_name?: string | null
  spotify_album_year?: string | null
  spotify_duration_ms?: number | null
  spotify_cover_url_large?: string | null
  spotify_cover_url_medium?: string | null
  spotify_cover_url_small?: string | null
  youtube_url?: string | null
  youtube_title?: string | null
  youtube_duration?: string | null
  youtube_thumbnail_url?: string | null
}

function trim(value: string | null | undefined) {
  return value?.trim() || ''
}

export function formatDurationMs(ms: number | null | undefined) {
  if (!ms || ms <= 0) return ''
  const total = Math.round(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function joinCaption(parts: Array<string | undefined>) {
  return parts.map((part) => trim(part)).filter(Boolean).join(' · ')
}

function pickCover(...urls: Array<string | null | undefined>) {
  return urls.map((url) => trim(url)).find(Boolean) || ''
}

export function mediaFromRepertoire(song: RepertoireMediaSource): RepertoirePdfMedia | undefined {
  const youtubeCover = pickCover(song.youtube_thumbnail_url)
  const youtubeHref = trim(song.youtube_url)
  const youtube = youtubeHref && youtubeCover ? {
    href: youtubeHref,
    coverUrl: youtubeCover,
    label: 'YouTube',
    caption: joinCaption([song.youtube_title, song.youtube_duration]),
  } : undefined

  const spotifyCover = pickCover(
    song.spotify_cover_url_large,
    song.spotify_cover_url_medium,
    song.spotify_cover_url_small,
  )
  const spotifyHref = trim(song.spotify_url)
  const spotify = spotifyHref && spotifyCover ? {
    href: spotifyHref,
    coverUrl: spotifyCover,
    label: 'Spotify',
    caption: joinCaption([
      song.spotify_album_name,
      song.spotify_album_year,
      formatDurationMs(song.spotify_duration_ms),
    ]),
  } : undefined

  if (!youtube && !spotify) return undefined
  return { youtube, spotify }
}

export function mediaAssetUrls(media: RepertoirePdfMedia | undefined | null) {
  if (!media) return []
  return [media.youtube?.coverUrl, media.spotify?.coverUrl].filter((url): url is string => Boolean(url))
}
