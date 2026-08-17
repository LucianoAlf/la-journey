import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import {
  applyPracticeAudioEvent,
  corsHeaders,
  json,
  parseMusicaiBpm,
  parseMusicaiChords,
  parseMusicaiKey,
  preferSimplePopChords,
  requireUser,
  serviceClient,
  type RecognizedChord,
} from "../_shared/practice-audio.ts"

const MUSIC_AI_URL = "https://api.music.ai/v1"
const POLL_MS = 2000
const POLL_ATTEMPTS = 60
const SIGNED_SECONDS = 60 * 60

type MusicaiJob = {
  id?: string
  status?: string
  result?: Record<string, unknown> | null
  error?: { message?: string } | null
}

function musicaiHeaders(apiKey: string) {
  return {
    Authorization: apiKey,
    "Content-Type": "application/json",
  }
}

async function createJob(apiKey: string, workflow: string, inputUrl: string, name: string) {
  const response = await fetch(`${MUSIC_AI_URL}/job`, {
    method: "POST",
    headers: musicaiHeaders(apiKey),
    body: JSON.stringify({
      name,
      workflow,
      params: { inputUrl },
    }),
  })
  const payload = await response.json().catch(() => null) as MusicaiJob | null
  if (!response.ok) {
    console.error("[musicai-transcribe] create_job", workflow, response.status, payload)
  }
  return { ok: response.ok, status: response.status, payload }
}

async function uploadToMusicai(apiKey: string, bytes: Uint8Array, mimeType: string) {
  const signed = await fetch(`${MUSIC_AI_URL}/upload`, { headers: { Authorization: apiKey } })
  if (!signed.ok) return null
  const urls = await signed.json().catch(() => null) as { uploadUrl?: string; downloadUrl?: string } | null
  if (!urls?.uploadUrl || !urls.downloadUrl) return null
  const put = await fetch(urls.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType || "audio/mpeg" },
    body: bytes,
  })
  if (!put.ok) return null
  return urls.downloadUrl
}

async function getJob(apiKey: string, id: string) {
  const response = await fetch(`${MUSIC_AI_URL}/job/${encodeURIComponent(id)}`, {
    headers: { Authorization: apiKey },
  })
  const payload = await response.json().catch(() => null) as MusicaiJob | null
  return { ok: response.ok, payload }
}

async function pollJob(apiKey: string, id: string): Promise<MusicaiJob> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const { payload } = await getJob(apiKey, id)
    const status = payload?.status
    if (status === "SUCCEEDED" || status === "FAILED") return payload ?? { status: "FAILED" }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
  return { status: "FAILED", error: { message: "Timeout no reconhecimento" } }
}

function looksLikeChords(parsed: unknown[]): boolean {
  return parsed.some((item) =>
    item && typeof item === "object" && (
      "chord_simple_pop" in item ||
      "chord" in item ||
      ("start" in item && "end" in item)
    )
  )
}

async function fetchResultJson(result: Record<string, unknown> | null | undefined): Promise<unknown> {
  if (!result) return null
  const merged: Record<string, unknown> = { ...result }
  for (const value of Object.values(result)) {
    if (typeof value !== "string" || !/^https?:\/\//.test(value)) continue
    try {
      const response = await fetch(value)
      if (!response.ok) continue
      const text = await response.text()
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) {
          if (looksLikeChords(parsed)) merged.chords = parsed
          else merged.beats = parsed
        } else if (parsed && typeof parsed === "object") {
          Object.assign(merged, parsed)
        }
      } catch {
        // binary / non-json output — ignore
      }
    } catch {
      // ignore unreachable CDN files
    }
  }
  return merged
}

function pickKey(chords: RecognizedChord[], fallback?: string | null) {
  return chords[0]?.chord ?? fallback ?? null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get("MUSIC_AI_API_KEY") ?? ""
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    if (body.ping === true) {
      return json({ ok: Boolean(apiKey), configured: Boolean(apiKey) })
    }

    if (!apiKey) {
      return json({ error: "MUSIC_AI_API_KEY ausente na Edge. Confira Integrações." }, 503)
    }

    const supabase = serviceClient()
    const auth = await requireUser(req, supabase)
    if ("error" in auth && auth.error) return auth.error

    const practiceAudioId = typeof body.practiceAudioId === "string" ? body.practiceAudioId : null
    const audioUrlInput = typeof body.audioUrl === "string" ? body.audioUrl : null

    let audioUrl = audioUrlInput
    let row: Record<string, unknown> | null = null

    if (practiceAudioId) {
      const { data, error } = await supabase
        .from("practice_audio")
        .select("*")
        .eq("id", practiceAudioId)
        .eq("school_id", auth.schoolId)
        .single()
      if (error || !data) return json({ error: "Take de áudio não encontrado" }, 404)
      row = data
      if (!audioUrl && data.audio_path) {
        const { data: signed } = await supabase.storage
          .from("audio-tracks")
          .createSignedUrl(data.audio_path, SIGNED_SECONDS)
        audioUrl = signed?.signedUrl ?? null
      }
      const next = applyPracticeAudioEvent(
        { status: data.status, audio_path: data.audio_path },
        { type: "transcribe_start" },
      )
      await supabase.from("practice_audio").update({
        status: next.status,
        updated_at: new Date().toISOString(),
      }).eq("id", practiceAudioId)
    }

    if (!audioUrl && !row?.audio_path) return json({ error: "Informe practiceAudioId ou audioUrl" }, 400)

    let inputUrl = audioUrl
    if (row?.audio_path) {
      const { data: file } = await supabase.storage.from("audio-tracks").download(row.audio_path as string)
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const uploaded = await uploadToMusicai(apiKey, bytes, file.type || "audio/mpeg")
        if (uploaded) inputUrl = uploaded
      }
    }
    if (!inputUrl) return json({ error: "Não foi possível preparar o áudio para o Music.AI" }, 502)

    const chordsJob = await createJob(
      apiKey,
      "music-ai/chords-and-beat-mapping",
      inputUrl,
      `chords-${practiceAudioId ?? "url"}`,
    )
    if (!chordsJob.ok || !chordsJob.payload?.id) {
      if (practiceAudioId) {
        await supabase.from("practice_audio").update({
          status: "transcribe_failed",
          updated_at: new Date().toISOString(),
        }).eq("id", practiceAudioId)
      }
      const detail = (chordsJob.payload as { message?: string } | null)?.message
      return json({
        error: detail || "Music.AI recusou o job de cifra.",
        status: "transcribe_failed",
      }, 502)
    }

    const chordsDone = await pollJob(apiKey, chordsJob.payload.id)

    if (chordsDone.status !== "SUCCEEDED") {
      if (practiceAudioId) {
        const failed = applyPracticeAudioEvent(
          { status: "transcribing", audio_path: (row?.audio_path as string) ?? null },
          { type: "transcribe_fail" },
        )
        await supabase.from("practice_audio").update({
          status: failed.status,
          musicai_job_id: chordsJob.payload.id,
          updated_at: new Date().toISOString(),
        }).eq("id", practiceAudioId)
      }
      return json({
        error: chordsDone.error?.message || "Reconhecimento de cifra falhou.",
        status: "transcribe_failed",
        audioPath: row?.audio_path ?? null,
      }, 200)
    }

    const chordsJson = await fetchResultJson(chordsDone.result)
    const chords = preferSimplePopChords(parseMusicaiChords(chordsJson))
    const bpm = parseMusicaiBpm(chordsJson) ?? parseMusicaiBpm(chordsDone.result)
    const recognizedKey = parseMusicaiKey(chordsJson)
      ?? parseMusicaiKey(chordsDone.result)
      ?? pickKey(chords, typeof row?.recipe === "object" && row?.recipe
        ? (row.recipe as { key?: string }).key
        : null)

    if (practiceAudioId) {
      const ok = applyPracticeAudioEvent(
        { status: "transcribing", audio_path: (row?.audio_path as string) ?? null },
        { type: "transcribe_ok" },
      )
      await supabase.from("practice_audio").update({
        status: ok.status,
        recognized_chords: chords,
        recognized_bpm: bpm,
        recognized_key: recognizedKey,
        musicai_job_id: chordsJob.payload.id,
        updated_at: new Date().toISOString(),
      }).eq("id", practiceAudioId)
    }

    return json({
      id: practiceAudioId,
      status: "transcribed",
      recognizedChords: chords,
      recognizedBpm: bpm,
      recognizedKey,
      musicaiJobId: chordsJob.payload.id,
      audioPath: row?.audio_path ?? null,
    })
  } catch (error) {
    console.error("[musicai-transcribe]", error)
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500)
  }
})
