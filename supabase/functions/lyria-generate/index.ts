import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import {
  corsHeaders,
  decodeBase64Audio,
  extractLyriaAudio,
  json,
  lyriaUserMessage,
  requireUser,
  serviceClient,
} from "../_shared/practice-audio.ts"
import {
  compilePracticeAudioPrompt,
  parseRecipe,
  selectLyriaModel,
} from "../_shared/practice-audio-recipe.ts"

const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
const SIGNED_SECONDS = 60 * 60 * 24 * 7

async function fetchInteraction(apiKey: string, model: string, prompt: string) {
  const response = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: prompt }),
  })
  const payload = await response.json().catch(() => null)
  return { response, payload }
}

async function getInteraction(apiKey: string, id: string) {
  const response = await fetch(`${INTERACTIONS_URL}/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { "x-goog-api-key": apiKey },
  })
  const payload = await response.json().catch(() => null)
  return { response, payload }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY") ?? ""
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    if (body.ping === true) {
      return json({ ok: Boolean(apiKey), configured: Boolean(apiKey) })
    }

    if (!apiKey) {
      return json({ error: "GEMINI_API_KEY ausente na Edge. Confira Integrações." }, 503)
    }

    const supabase = serviceClient()
    const auth = await requireUser(req, supabase)
    if ("error" in auth && auth.error) return auth.error

    const parsed = parseRecipe(body.recipe ?? body)
    if (typeof parsed === "string") return json({ error: parsed }, 400)

    const model = selectLyriaModel(parsed.durationSeconds)
    const prompt = compilePracticeAudioPrompt(parsed)
    console.log(`[lyria-generate] model=${model} kind=${parsed.kind} seconds=${parsed.durationSeconds}`)

    const first = await fetchInteraction(apiKey, model, prompt)
    if (!first.response.ok) {
      console.error("[lyria-generate] lyria_http", first.response.status, first.payload)
      return json({ error: lyriaUserMessage(first.response.status, first.payload) }, first.response.status >= 500 ? 502 : 400)
    }

    let audio = extractLyriaAudio(first.payload)
    const interactionId = (first.payload as { id?: string } | null)?.id
    if (!audio && interactionId) {
      for (let attempt = 0; attempt < 8 && !audio; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const next = await getInteraction(apiKey, interactionId)
        audio = extractLyriaAudio(next.payload)
      }
    }

    if (!audio) {
      return json({ error: "Lyria respondeu sem áudio. Tente de novo com outra receita." }, 502)
    }

    const id = crypto.randomUUID()
    const ext = audio.mimeType.includes("wav") ? "wav" : "mp3"
    const audioPath = `${auth.schoolId}/practice-audio/${id}.${ext}`
    const bytes = decodeBase64Audio(audio.data)

    const { error: uploadError } = await supabase.storage
      .from("audio-tracks")
      .upload(audioPath, bytes, { contentType: audio.mimeType, upsert: false })
    if (uploadError) {
      console.error("[lyria-generate] upload", uploadError)
      return json({ error: `Erro ao gravar o áudio: ${uploadError.message}` }, 500)
    }

    const repertoireId = typeof body.repertoireId === "string" ? body.repertoireId : null
    const { error: insertError } = await supabase.from("practice_audio").insert({
      id,
      school_id: auth.schoolId,
      created_by: auth.user.id,
      source: "lyria",
      kind: parsed.kind,
      title: parsed.title,
      recipe: parsed,
      lyria_model: model,
      audio_path: audioPath,
      duration_seconds: parsed.durationSeconds,
      status: "generated",
      repertoire_id: repertoireId,
    })
    if (insertError) {
      console.error("[lyria-generate] insert", insertError)
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
      lyriaModel: model,
      status: "generated",
    })
  } catch (error) {
    console.error("[lyria-generate]", error)
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500)
  }
})
