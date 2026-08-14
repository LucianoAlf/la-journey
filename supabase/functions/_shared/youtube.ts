export const YOUTUBE_NOT_EMBEDDABLE_MESSAGE =
  'Esse vídeo não permite ser tocado fora do YouTube — escolha outro.'

export const YOUTUBE_REGION_BLOCKED_MESSAGE =
  'Esse vídeo não está disponível no Brasil — escolha outro.'

export const YOUTUBE_MISSING_MESSAGE =
  'Não encontramos esse vídeo. Confira o link ou escolha outro.'

export const YOUTUBE_QUOTA_MESSAGE =
  'limite diário de buscas atingido, tente amanhã ou cole a URL na mão'

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/

export interface YoutubeThumbnail {
  url?: string
  width?: number
  height?: number
}

export interface YoutubeVideoObject {
  id?: string
  snippet?: {
    title?: string
    channelTitle?: string
    thumbnails?: {
      default?: YoutubeThumbnail
      medium?: YoutubeThumbnail
      high?: YoutubeThumbnail
      standard?: YoutubeThumbnail
      maxres?: YoutubeThumbnail
    }
  }
  contentDetails?: {
    duration?: string
    regionRestriction?: {
      allowed?: string[]
      blocked?: string[]
    }
  }
  status?: {
    embeddable?: boolean
    privacyStatus?: string
  }
}

export interface YoutubeVideoHit {
  id: string
  title: string
  channel: string
  duration: string
  duration_iso: string
  thumbnail_url: string
  url: string
}

export type YoutubeEvalReason = 'ok' | 'missing' | 'not_embeddable' | 'region_blocked'

export interface YoutubeEvalResult {
  ok: boolean
  reason: YoutubeEvalReason
  message: string | null
  video: YoutubeVideoHit | null
}

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (VIDEO_ID_RE.test(trimmed)) return trimmed

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] ?? ''
    return VIDEO_ID_RE.test(id) ? id : null
  }

  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const watchId = url.searchParams.get('v')
    if (watchId && VIDEO_ID_RE.test(watchId)) return watchId

    const parts = url.pathname.split('/').filter(Boolean)
    if ((parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') && VIDEO_ID_RE.test(parts[1] ?? '')) {
      return parts[1]
    }
  }

  return null
}

export function formatIso8601Duration(iso: string | undefined): string {
  if (!iso) return ''
  const match = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return iso
  const days = Number(match[1] ?? 0)
  const hours = Number(match[2] ?? 0) + days * 24
  const minutes = Number(match[3] ?? 0)
  const seconds = Number(match[4] ?? 0)
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function pickThumbnailUrl(thumbnails: YoutubeVideoObject['snippet'] extends infer S
  ? S extends { thumbnails?: infer T } ? T : undefined
  : undefined): string {
  if (!thumbnails) return ''
  return (
    thumbnails.medium?.url
    || thumbnails.high?.url
    || thumbnails.standard?.url
    || thumbnails.maxres?.url
    || thumbnails.default?.url
    || ''
  )
}

function regionBlockedInBR(restriction: YoutubeVideoObject['contentDetails'] extends infer C
  ? C extends { regionRestriction?: infer R } ? R : undefined
  : undefined): boolean {
  if (!restriction) return false
  const blocked = (restriction.blocked ?? []).map((code) => code.toUpperCase())
  if (blocked.includes('BR')) return true
  if (restriction.allowed) {
    const allowed = restriction.allowed.map((code) => code.toUpperCase())
    return !allowed.includes('BR')
  }
  return false
}

export function evaluateYouTubeVideo(video: YoutubeVideoObject | null | undefined): YoutubeEvalResult {
  if (!video?.id) {
    return { ok: false, reason: 'missing', message: YOUTUBE_MISSING_MESSAGE, video: null }
  }

  if (video.status?.embeddable === false) {
    return { ok: false, reason: 'not_embeddable', message: YOUTUBE_NOT_EMBEDDABLE_MESSAGE, video: null }
  }

  if (regionBlockedInBR(video.contentDetails?.regionRestriction)) {
    return { ok: false, reason: 'region_blocked', message: YOUTUBE_REGION_BLOCKED_MESSAGE, video: null }
  }

  const durationIso = video.contentDetails?.duration ?? ''
  return {
    ok: true,
    reason: 'ok',
    message: null,
    video: {
      id: video.id,
      title: video.snippet?.title ?? '',
      channel: video.snippet?.channelTitle ?? '',
      duration: formatIso8601Duration(durationIso),
      duration_iso: durationIso,
      thumbnail_url: pickThumbnailUrl(video.snippet?.thumbnails),
      url: `https://www.youtube.com/watch?v=${video.id}`,
    },
  }
}

export function buildYouTubeSearchQuery(title: string, artist: string): string {
  const clean = (value: string) => value.replace(/[|"-]/g, ' ').replace(/\s+/g, ' ').trim()
  return [clean(title), clean(artist)].filter(Boolean).join(' ')
}

export function extractSearchVideoId(item: { id?: { kind?: string; videoId?: string } | string }): string {
  if (!item.id) return ''
  if (typeof item.id === 'string') return VIDEO_ID_RE.test(item.id) ? item.id : ''
  const videoId = item.id.videoId ?? ''
  return VIDEO_ID_RE.test(videoId) ? videoId : ''
}

export function hydrateSearchHits(ids: string[], videos: YoutubeVideoObject[]): YoutubeVideoHit[] {
  const byId = new Map((videos ?? []).filter((video) => video.id).map((video) => [video.id as string, video]))
  const hits: YoutubeVideoHit[] = []
  for (const id of ids) {
    const evaluated = evaluateYouTubeVideo(byId.get(id) ?? null)
    if (evaluated.ok && evaluated.video) hits.push(evaluated.video)
  }
  return hits
}
