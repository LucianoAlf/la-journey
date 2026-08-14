import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import {
  buildSpotifyTrackQuery,
  mapSpotifyTrack,
  type SpotifyTrackObject,
} from "../_shared/spotify.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const TOKEN_URL = "https://accounts.spotify.com/api/token"
const SEARCH_URL = "https://api.spotify.com/v1/search"
const TOKEN_REFRESH_SKEW_MS = 60_000

let cachedToken: { accessToken: string; expiresAt: number } | null = null

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  })
}

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt - now > TOKEN_REFRESH_SKEW_MS) {
    return cachedToken.accessToken
  }

  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials missing")
  }

  const basic = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  const payload = await response.json() as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!response.ok || !payload.access_token) {
    console.error("[spotify-search] token failed", payload.error, payload.error_description)
    throw new Error(payload.error_description || "Falha ao autenticar no Spotify")
  }

  const expiresInSec = payload.expires_in ?? 3600
  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: now + expiresInSec * 1000,
  }
  return cachedToken.accessToken
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

    const q = buildSpotifyTrackQuery(title, artist)
    const token = await getAccessToken()
    const searchUrl = `${SEARCH_URL}?q=${encodeURIComponent(q)}&type=track&limit=5&market=BR`

    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") ?? ""
      console.error("[spotify-search] 429", retryAfter)
      return json(
        { error: "Spotify pediu para esperar. Tente de novo em instantes.", retry_after: retryAfter || null },
        429,
        retryAfter ? { "Retry-After": retryAfter } : {},
      )
    }

    if (!response.ok) {
      const errBody = await response.text()
      console.error("[spotify-search] search failed", response.status, errBody)
      return json({ error: "Não foi possível buscar no Spotify agora." }, 502)
    }

    const payload = await response.json() as { tracks?: { items?: Array<SpotifyTrackObject | null>; total?: number } }
    const items = (payload.tracks?.items ?? []).filter((item): item is SpotifyTrackObject => Boolean(item))
    const tracks = items.map(mapSpotifyTrack).filter((track) => track.id && track.url)

    return json({
      query: q,
      total: payload.tracks?.total ?? tracks.length,
      tracks,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    console.error("[spotify-search]", message)
    if (message.includes("autenticar") || message.includes("credentials")) {
      return json({ error: "Spotify indisponível no momento. Cole a URL na mão." }, 503)
    }
    return json({ error: message }, 500)
  }
})
