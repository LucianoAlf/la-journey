import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders, json, requireUser, serviceClient } from "../_shared/practice-audio.ts"
import { compileSunoMusicRequest, parseRecipe } from "../_shared/practice-audio-recipe.ts"

const SUNO_URL = "https://api.sunoapi.org/api/v1"
const SIGNED_SECONDS = 60 * 60 * 24 * 7
const POLL_MS = 8000
const POLL_ATTEMPTS = 18

type SunoRecord = {
  code?: number
  msg?: string
  data?: {
    taskId?: string
    status?: string
    errorMessage?: string
    response?: {
      sunoData?: Array<{
        id?: string
        audioUrl?: string
        sourceAudioUrl?: string
        duration?: number
      }>
    }
  }
}

function sunoHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }
}

function pickTrack(record: SunoRecord) {
  const tracks = record.data?.response?.sunoData ?? []
  const withUrl = tracks
    .map((track) => ({
      url: track.sourceAudioUrl || track.audioUrl,
      duration: track.duration ?? 0,
    }))
    .filter((track) => track.url)
  if (!withUrl.length) return null
  return withUrl.sort((a, b) => b.duration - a.duration)[0]
}

function sunoUserMessage(status: number, payload: unknown) {
  const text = typeof payload === "object" && payload ? JSON.stringify(payload) : String(payload ?? "")
  if (status === 429 || /insufficient credits|credit/i.test(text)) {
    return "Suno sem créditos. Recarregue em Integrações / sunoapi.org."
  }
  if (status === 401) return "Chave do Suno inválida. Confira SUNO_API_KEY na Edge."
  if (status >= 500) return "Suno falhou do lado da API. Tente de novo em instantes."
  return "Não foi possível gerar o áudio no Suno."
}

async function waitForAudio(apiKey: string, taskId: string) {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const response = await fetch(`${SUNO_URL}/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
      headers: sunoHeaders(apiKey),
    })
    const payload = await response.json().catch(() => null) as SunoRecord | null
    const status = payload?.data?.status
    const track = payload ? pickTrack(payload) : null
    if (["SUCCESS", "FIRST_SUCCESS"].includes(status ?? "") && track?.url) return track
    if (["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "FAILED", "SENSITIVE_WORD_ERROR"].includes(status ?? "")) {
      throw new Error(payload?.data?.errorMessage || "Suno não gerou o áudio.")
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
  throw new Error("Suno demorou demais. Tente de novo.")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get("SUNO_API_KEY") ?? ""
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    if (body.ping === true) {
      return json({ ok: Boolean(apiKey), configured: Boolean(apiKey) })
    }

    if (!apiKey) {
      return json({ error: "SUNO_API_KEY ausente na Edge. Confira Integrações.", code: "suno_unconfigured" }, 503)
    }

    const supabase = serviceClient()
    const auth = await requireUser(req, supabase)
    if ("error" in auth && auth.error) return auth.error

    const parsed = parseRecipe(body.recipe ?? body)
    if (typeof parsed === "string") return json({ error: parsed }, 400)

    const request = compileSunoMusicRequest(parsed)
    const callback = Deno.env.get("APP_URL")
      ? `${Deno.env.get("APP_URL")}/api/suno-callback`
      : "https://la-journey.vercel.app/api/suno-callback"

    const created = await fetch(`${SUNO_URL}/generate`, {
      method: "POST",
      headers: sunoHeaders(apiKey),
      body: JSON.stringify({
        ...request,
        callBackUrl: callback,
      }),
    })
    const createdBody = await created.json().catch(() => null) as SunoRecord | null
    if (!created.ok) {
      console.error("[suno-generate] create", created.status, createdBody)
      return json({ error: sunoUserMessage(created.status, createdBody) }, created.status >= 500 ? 502 : 400)
    }

    const taskId = createdBody?.data?.taskId
    if (!taskId) return json({ error: "Suno não devolveu taskId." }, 502)

    const track = await waitForAudio(apiKey, taskId)
    const audioResponse = await fetch(track.url!)
    if (!audioResponse.ok) return json({ error: "Não baixou o MP3 do Suno." }, 502)
    const bytes = new Uint8Array(await audioResponse.arrayBuffer())

    const id = crypto.randomUUID()
    const audioPath = `${auth.schoolId}/practice-audio/${id}.mp3`
    const { error: uploadError } = await supabase.storage
      .from("audio-tracks")
      .upload(audioPath, bytes, { contentType: "audio/mpeg", upsert: false })
    if (uploadError) {
      console.error("[suno-generate] upload", uploadError)
      return json({ error: `Erro ao gravar o áudio: ${uploadError.message}` }, 500)
    }

    const repertoireId = typeof body.repertoireId === "string" ? body.repertoireId : null
    const { error: insertError } = await supabase.from("practice_audio").insert({
      id,
      school_id: auth.schoolId,
      created_by: auth.user.id,
      source: "suno",
      kind: parsed.kind,
      title: parsed.title,
      recipe: parsed,
      lyria_model: request.model,
      audio_path: audioPath,
      duration_seconds: Math.round(track.duration || parsed.durationSeconds),
      status: "generated",
      repertoire_id: repertoireId,
    })
    if (insertError) {
      console.error("[suno-generate] insert", insertError)
      return json({ error: `Áudio gerado, mas não gravou a ficha: ${insertError.message}` }, 500)
    }

    const { data: signed } = await supabase.storage
      .from("audio-tracks")
      .createSignedUrl(audioPath, SIGNED_SECONDS)

    return json({
      id,
      audioUrl: signed?.signedUrl ?? null,
      audioPath,
      recipe: parsed,
      lyriaModel: request.model,
      source: "suno",
      status: "generated",
    })
  } catch (error) {
    console.error("[suno-generate]", error)
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500)
  }
})
