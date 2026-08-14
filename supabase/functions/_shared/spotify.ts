export interface SpotifyImage {
  url: string
  height: number | null
  width: number | null
}

export interface SpotifyTrackHit {
  id: string
  name: string
  artist: string
  album: string
  year: string
  duration_ms: number
  url: string
  images: SpotifyImage[]
}

export function buildSpotifyTrackQuery(title: string, artist: string): string {
  const parts: string[] = []
  const track = quoteFilterValue(title)
  const artistName = quoteFilterValue(artist)
  if (track) parts.push(`track:${track}`)
  if (artistName) parts.push(`artist:${artistName}`)
  return parts.join(' ')
}

function quoteFilterValue(value: string): string {
  const cleaned = value.replace(/"/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return `"${cleaned}"`
}

type SpotifyArtist = { name?: string }
type SpotifyAlbum = {
  name?: string
  release_date?: string
  images?: Array<{ url?: string; height?: number | null; width?: number | null }>
}

export type SpotifyTrackObject = {
  id?: string
  name?: string
  duration_ms?: number
  external_urls?: { spotify?: string }
  artists?: SpotifyArtist[]
  album?: SpotifyAlbum
}

export function mapSpotifyTrack(track: SpotifyTrackObject): SpotifyTrackHit {
  const images: SpotifyImage[] = (track.album?.images ?? [])
    .filter((image): image is { url: string; height?: number | null; width?: number | null } => Boolean(image.url))
    .map((image) => ({
      url: image.url,
      height: image.height ?? null,
      width: image.width ?? null,
    }))

  return {
    id: track.id ?? '',
    name: track.name ?? '',
    artist: (track.artists ?? []).map((item) => item.name ?? '').filter(Boolean).join(', '),
    album: track.album?.name ?? '',
    year: (track.album?.release_date ?? '').slice(0, 4),
    duration_ms: track.duration_ms ?? 0,
    url: track.external_urls?.spotify ?? '',
    images,
  }
}

export function formatTrackDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function pickSpotifyCoverUrls(images: SpotifyImage[]): {
  large: string
  medium: string
  small: string
} {
  const sorted = [...images]
    .filter((image) => image.url)
    .sort((a, b) => (b.width ?? b.height ?? 0) - (a.width ?? a.height ?? 0))

  const large = sorted[0]?.url ?? ''
  const small = sorted[sorted.length - 1]?.url ?? large
  const medium = sorted[1]?.url ?? large
  return { large, medium, small }
}
