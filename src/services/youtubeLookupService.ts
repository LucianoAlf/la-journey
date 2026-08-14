import { supabase } from '@/lib/supabase'
import {
  extractYouTubeVideoId,
  type YoutubeEvalResult,
  type YoutubeVideoHit,
} from '../../supabase/functions/_shared/youtube.ts'

export { extractYouTubeVideoId }
export type { YoutubeEvalResult, YoutubeVideoHit }

const CACHE_TTL_MS = 10 * 60 * 1000
const lookupCache = new Map<string, { expiresAt: number; result: YoutubeEvalResult }>()

export class YoutubeLookupError extends Error {
  status: number
  reason: string | null

  constructor(message: string, status: number, reason: string | null = null) {
    super(message)
    this.status = status
    this.reason = reason
  }
}

export async function lookupYouTubeVideo(urlOrId: string): Promise<YoutubeEvalResult> {
  const videoId = extractYouTubeVideoId(urlOrId)
  if (!videoId) {
    return {
      ok: false,
      reason: 'missing',
      message: 'Cole um link do YouTube (watch, youtu.be ou shorts).',
      video: null,
    }
  }

  const cached = lookupCache.get(videoId)
  if (cached && cached.expiresAt > Date.now()) return cached.result

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(`${supabaseUrl}/functions/v1/youtube-lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ videoId }),
  })

  const result = await response.json() as YoutubeEvalResult & {
    error?: string
    reason?: string
    retry_after?: string
  }

  if (response.status === 429) {
    const wait = result.retry_after ? ` Espere ${result.retry_after}s.` : ''
    throw new YoutubeLookupError(
      `YouTube pediu para esperar.${wait} Cole a URL na mão se precisar.`,
      429,
      'rateLimitExceeded',
    )
  }

  if (!response.ok) {
    throw new YoutubeLookupError(
      result.error || `Erro ${response.status} ao validar o YouTube`,
      response.status,
      result.reason ?? null,
    )
  }

  const evaluated: YoutubeEvalResult = {
    ok: result.ok,
    reason: result.reason,
    message: result.message,
    video: result.video,
  }
  lookupCache.set(videoId, {
    expiresAt: Date.now() + (evaluated.ok ? CACHE_TTL_MS : 60_000),
    result: evaluated,
  })
  return evaluated
}

function rememberYoutubeHit(video: YoutubeVideoHit) {
  lookupCache.set(video.id, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    result: { ok: true, reason: 'ok', message: null, video },
  })
}

export async function searchYouTubeVideos(title: string, artist: string): Promise<YoutubeVideoHit[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(`${supabaseUrl}/functions/v1/youtube-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ title, artist }),
  })

  const result = await response.json() as {
    videos?: YoutubeVideoHit[]
    error?: string
    reason?: string
    retry_after?: string
  }

  if (response.status === 429) {
    const wait = result.retry_after ? ` Espere ${result.retry_after}s.` : ''
    throw new YoutubeLookupError(
      `YouTube pediu para esperar.${wait} Cole a URL na mão se precisar.`,
      429,
      'rateLimitExceeded',
    )
  }

  if (!response.ok) {
    throw new YoutubeLookupError(
      result.error || `Erro ${response.status} ao buscar no YouTube`,
      response.status,
      result.reason ?? null,
    )
  }

  const videos = result.videos ?? []
  for (const video of videos) rememberYoutubeHit(video)
  return videos
}
