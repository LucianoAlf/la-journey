import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders, json, requireUser, serviceClient } from "../_shared/practice-audio.ts"
import { parseRecipe } from "../_shared/practice-audio-recipe.ts"

const SIGNED_SECONDS = 60 * 60 * 24 * 7
const MAX_BYTES = 20 * 1024 * 1024

function extForFile(name: string, mime: string) {
  if (/\.wav$/i.test(name) || /wav/i.test(mime)) return "wav"
  return "mp3"
}

function mimeForExt(ext: string) {
  return ext === "wav" ? "audio/wav" : "audio/mpeg"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabase = serviceClient()
    const auth = await requireUser(req, supabase)
    if ("error" in auth && auth.error) return auth.error

    const form = await req.formData().catch(() => null)
    if (!form) return json({ error: "Envie o arquivo de áudio." }, 400)

    const file = form.get("file")
    if (!(file instanceof File) || file.size < 1) return json({ error: "Envie um MP3 ou WAV." }, 400)
    if (file.size > MAX_BYTES) return json({ error: "Áudio no máximo 20MB." }, 400)
    const name = file.name || "audio.mp3"
    const typeOk = /audio\/(mpeg|mp3|wav|x-wav|wave)/i.test(file.type) || /\.(mp3|wav)$/i.test(name)
    if (!typeOk) return json({ error: "Use MP3 ou WAV." }, 400)

    const recipeRaw = form.get("recipe")
    let recipeBody: unknown = { kind: "backing", title: name.replace(/\.[^.]+$/, "") }
    if (typeof recipeRaw === "string" && recipeRaw.trim()) {
      try {
        recipeBody = JSON.parse(recipeRaw)
      } catch {
        return json({ error: "Receita inválida." }, 400)
      }
    }
    const parsed = parseRecipe(recipeBody)
    if (typeof parsed === "string") return json({ error: parsed }, 400)
    if (!parsed.title.trim()) parsed.title = name.replace(/\.[^.]+$/, "") || "Áudio enviado"

    const ext = extForFile(name, file.type)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const id = crypto.randomUUID()
    const audioPath = `${auth.schoolId}/practice-audio/${id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("audio-tracks")
      .upload(audioPath, bytes, { contentType: mimeForExt(ext), upsert: false })
    if (uploadError) {
      console.error("[practice-audio-upload] upload", uploadError)
      return json({ error: `Erro ao gravar o áudio: ${uploadError.message}` }, 500)
    }

    const repertoireId = typeof form.get("repertoireId") === "string" ? String(form.get("repertoireId")) : null
    const { error: insertError } = await supabase.from("practice_audio").insert({
      id,
      school_id: auth.schoolId,
      created_by: auth.user.id,
      source: "upload",
      kind: parsed.kind,
      title: parsed.title,
      recipe: parsed,
      audio_path: audioPath,
      duration_seconds: parsed.durationSeconds,
      status: "generated",
      repertoire_id: repertoireId || null,
    })
    if (insertError) {
      console.error("[practice-audio-upload] insert", insertError)
      return json({ error: `Áudio gravado, mas não criou a ficha: ${insertError.message}` }, 500)
    }

    const { data: signed } = await supabase.storage
      .from("audio-tracks")
      .createSignedUrl(audioPath, SIGNED_SECONDS)

    return json({
      id,
      audioUrl: signed?.signedUrl ?? null,
      audioPath,
      recipe: parsed,
      source: "upload",
      status: "generated",
    })
  } catch (error) {
    console.error("[practice-audio-upload]", error)
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500)
  }
})
