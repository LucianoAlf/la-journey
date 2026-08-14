export const YOUTUBE_EMBED_HOST = 'https://www.youtube-nocookie.com'
export const YOUTUBE_PLAYER_HOST = 'https://www.youtube.com'
export const YOUTUBE_PLAYER_REFERRER_POLICY = 'strict-origin-when-cross-origin'
export const YOUTUBE_PLAYER_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'

export function youtubeEmbedSrc(videoId: string, origin?: string) {
  const params = new URLSearchParams({ rel: '0' })
  if (origin) params.set('origin', origin)
  return `${YOUTUBE_EMBED_HOST}/embed/${videoId}?${params.toString()}`
}

export function youtubePosterUrl(videoId: string, stored?: string | null) {
  const saved = stored?.trim()
  if (saved) return saved.replace('/mqdefault.jpg', '/hqdefault.jpg')
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function youtubeCanEmbedInPage(origin: string) {
  try {
    return new URL(origin).protocol === 'https:'
  } catch {
    return false
  }
}

export function youtubePlayerIframeAttrs(videoId: string, options?: { autoplay?: boolean }) {
  const params = new URLSearchParams({ rel: '0' })
  if (options?.autoplay) params.set('autoplay', '1')
  return {
    src: `${YOUTUBE_PLAYER_HOST}/embed/${videoId}?${params.toString()}`,
    referrerpolicy: YOUTUBE_PLAYER_REFERRER_POLICY,
    allow: YOUTUBE_PLAYER_ALLOW,
  }
}
