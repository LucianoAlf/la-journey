import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import {
  buildYouTubeSearchQuery,
  extractSearchVideoId,
  hydrateSearchHits,
  YOUTUBE_QUOTA_MESSAGE,
  type YoutubeVideoObject,
} from "../_shared/youtube.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
const SEARCH_LIST_UNITS = 100
const VIDEOS_LIST_UNITS = 1
const CACHE_TTL_MS = 10 * 60 * 1000

type SearchPayload = {
  query: string
  videos: ReturnType<typeof hydrateSearchHits>
  units: number
}

const searchCache = new Map<string, { expiresAt: number; payload: SearchPayload }>()

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
  console.log(`[youtube-search] units=${units} via=${via} day=${day} total=${quotaUnits}`)
}

function youtubeErrorReason(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const error = (payload as { error?: { errors?: Array<{ reason?: string }> } }).error
  return error?.errors?.[0]?.reason ?? null
}

function quotaOrRateResponse(reason: string | null, retryAfter: string) {
  if (reason === "quotaExceeded") {
    console.error("[youtube-search] quotaExceeded")
    return json({ error: YOUTUBE_QUOTA_MESSAGE, reason: "quotaExceeded" }, 403)
  }
  if (reason === "rateLimitExceeded") {
    console.error("[youtube-search] rateLimitExceeded", retryAfter)
    return json(
      { error: "YouTube pediu para esperar. Tente de novo em instantes ou cole a URL na mão.", reason: "rateLimitExceeded", retry_after: retryAfter || null },
      429,
      retryAfter ? { "Retry-After": retryAfter } : {},
    )
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json() as { title?: string; artist?: string }
    const title = (body.title ?? "").trim()
    const artist = (body.artist ?? "").trim()
    if (!title) {
      return json({ error: "Informe o título da música" }, 400)
    }

    const q = buildYouTubeSearchQuery(title, artist)
    const cacheKey = q.toLowerCase()
    const cached = searchCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      console.log("[youtube-search] cache hit", cacheKey)
      return json(cached.payload)
    }

    const apiKey = Deno.env.get("YOUTUBE_API_KEY")
    if (!apiKey) {
      console.error("[youtube-search] YOUTUBE_API_KEY missing")
      return json({ error: "YouTube indisponível no momento. Cole a URL na mão." }, 503)
    }

    const searchUrl = new URL(SEARCH_URL)
    searchUrl.searchParams.set("part", "snippet")
    searchUrl.searchParams.set("q", q)
    searchUrl.searchParams.set("type", "video")
    searchUrl.searchParams.set("maxResults", "5")
    searchUrl.searchParams.set("regionCode", "BR")
    searchUrl.searchParams.set("videoEmbeddable", "true")
    searchUrl.searchParams.set("key", apiKey)

    const searchResponse = await fetch(searchUrl)
    const searchPayload = await searchResponse.json() as {
      items?: Array<{ id?: { videoId?: string } }>
      error?: { errors?: Array<{ reason?: string }>; message?: string }
    }

    const searchReason = youtubeErrorReason(searchPayload)
    const searchGate = quotaOrRateResponse(searchReason, searchResponse.headers.get("Retry-After") ?? "")
    if (searchGate) {
      recordUnits(SEARCH_LIST_UNITS, "search.list")
      return searchGate
    }

    if (!searchResponse.ok) {
      recordUnits(SEARCH_LIST_UNITS, "search.list")
      console.error("[youtube-search] search.list failed", searchResponse.status, searchPayload.error?.message)
      return json({ error: "Não foi possível buscar no YouTube agora." }, 502)
    }

    recordUnits(SEARCH_LIST_UNITS, "search.list")

    const ids = (searchPayload.items ?? []).map(extractSearchVideoId).filter(Boolean)
    if (ids.length === 0) {
      const empty: SearchPayload = { query: q, videos: [], units: SEARCH_LIST_UNITS }
      searchCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload: empty })
      return json(empty)
    }

    const videosUrl = new URL(VIDEOS_URL)
    videosUrl.searchParams.set("part", "snippet,contentDetails,status")
    videosUrl.searchParams.set("id", ids.join(","))
    videosUrl.searchParams.set("key", apiKey)

    const videosResponse = await fetch(videosUrl)
    const videosPayload = await videosResponse.json() as {
      items?: YoutubeVideoObject[]
      error?: { errors?: Array<{ reason?: string }>; message?: string }
    }

    const videosReason = youtubeErrorReason(videosPayload)
    const videosGate = quotaOrRateResponse(videosReason, videosResponse.headers.get("Retry-After") ?? "")
    if (videosGate) {
      recordUnits(VIDEOS_LIST_UNITS, "videos.list")
      return videosGate
    }

    if (!videosResponse.ok) {
      recordUnits(VIDEOS_LIST_UNITS, "videos.list")
      console.error("[youtube-search] videos.list failed", videosResponse.status, videosPayload.error?.message)
      return json({ error: "Não foi possível buscar no YouTube agora." }, 502)
    }

    recordUnits(VIDEOS_LIST_UNITS, "videos.list")

    const result: SearchPayload = {
      query: q,
      videos: hydrateSearchHits(ids, videosPayload.items ?? []),
      units: SEARCH_LIST_UNITS + VIDEOS_LIST_UNITS,
    }
    searchCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload: result })
    return json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    console.error("[youtube-search]", message)
    return json({ error: message }, 500)
  }
})
