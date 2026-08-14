import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import {
  extractYouTubeVideoId,
  evaluateYouTubeVideo,
  YOUTUBE_QUOTA_MESSAGE,
  type YoutubeVideoObject,
} from "../_shared/youtube.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
const VIDEOS_LIST_UNITS = 1
const CACHE_TTL_MS = 10 * 60 * 1000

type LookupPayload = Awaited<ReturnType<typeof evaluateYouTubeVideo>> & { units: number }

const videoCache = new Map<string, { expiresAt: number; payload: LookupPayload }>()

let quotaDay = ""
let quotaUnits = 0

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  })
}

function pacificDay(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
}

function recordUnits(units: number, via: string) {
  const day = pacificDay()
  if (day !== quotaDay) {
    quotaDay = day
    quotaUnits = 0
  }
  quotaUnits += units
  console.log(`[youtube-lookup] units=${units} via=${via} day=${day} total=${quotaUnits}`)
}

function youtubeErrorReason(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const error = (payload as { error?: { errors?: Array<{ reason?: string }> } }).error
  return error?.errors?.[0]?.reason ?? null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json() as { url?: string; videoId?: string }
    const videoId = extractYouTubeVideoId(body.videoId ?? body.url ?? "")

    if (!videoId) {
      return json({ error: "Cole um link do YouTube (watch, youtu.be ou shorts)." }, 400)
    }

    const cached = videoCache.get(videoId)
    if (cached && cached.expiresAt > Date.now()) {
      console.log("[youtube-lookup] cache hit", videoId)
      return json(cached.payload)
    }

    const apiKey = Deno.env.get("YOUTUBE_API_KEY")
    if (!apiKey) {
      console.error("[youtube-lookup] YOUTUBE_API_KEY missing")
      return json({ error: "YouTube indisponível no momento. Cole a URL na mão." }, 503)
    }

    const search = new URL(VIDEOS_URL)
    search.searchParams.set("part", "snippet,contentDetails,status")
    search.searchParams.set("id", videoId)
    search.searchParams.set("key", apiKey)

    const response = await fetch(search)
    const payload = await response.json() as {
      items?: YoutubeVideoObject[]
      error?: { errors?: Array<{ reason?: string }>; message?: string }
    }

    const reason = youtubeErrorReason(payload)

    if (response.status === 403 && reason === "quotaExceeded") {
      recordUnits(VIDEOS_LIST_UNITS, "videos.list")
      console.error("[youtube-lookup] quotaExceeded")
      return json({ error: YOUTUBE_QUOTA_MESSAGE, reason: "quotaExceeded" }, 403)
    }

    if (reason === "rateLimitExceeded") {
      recordUnits(VIDEOS_LIST_UNITS, "videos.list")
      const retryAfter = response.headers.get("Retry-After") ?? ""
      console.error("[youtube-lookup] rateLimitExceeded", retryAfter)
      return json(
        { error: "YouTube pediu para esperar. Tente de novo em instantes ou cole a URL na mão.", reason: "rateLimitExceeded", retry_after: retryAfter || null },
        429,
        retryAfter ? { "Retry-After": retryAfter } : {},
      )
    }

    if (!response.ok) {
      recordUnits(VIDEOS_LIST_UNITS, "videos.list")
      console.error("[youtube-lookup] videos.list failed", response.status, payload.error?.message)
      return json({ error: "Não foi possível validar o vídeo agora." }, 502)
    }

    recordUnits(VIDEOS_LIST_UNITS, "videos.list")

    const item = (payload.items ?? [])[0] ?? null
    const evaluated = evaluateYouTubeVideo(item)
    const result: LookupPayload = { ...evaluated, units: VIDEOS_LIST_UNITS }

    videoCache.set(videoId, {
      expiresAt: Date.now() + (evaluated.ok ? CACHE_TTL_MS : 60_000),
      payload: result,
    })
    return json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    console.error("[youtube-lookup]", message)
    return json({ error: message }, 500)
  }
})
