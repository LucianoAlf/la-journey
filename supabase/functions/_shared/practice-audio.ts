import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2"

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? ""
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!url || !key) throw new Error("Configuração Supabase incompleta na Edge Function")
  return createClient(url, key)
}

export async function requireUser(req: Request, supabase: SupabaseClient) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return { error: json({ error: "Autenticação necessária" }, 401) }
  }
  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return { error: json({ error: "Token inválido" }, 401) }
  }
  const { data: userData } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", user.id)
    .single()
  if (!userData?.school_id) {
    return { error: json({ error: "Usuário sem escola" }, 403) }
  }
  return { user, schoolId: userData.school_id as string }
}

export function extractLyriaAudio(interaction: unknown): { data: string; mimeType: string } | null {
  if (!interaction || typeof interaction !== "object") return null
  const steps = (interaction as { steps?: unknown }).steps
  if (!Array.isArray(steps)) return null
  for (const step of steps) {
    if (!step || typeof step !== "object") continue
    const content = (step as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (!part || typeof part !== "object") continue
      const typed = part as { type?: string; mime_type?: string; mimeType?: string; data?: string }
      if (typed.type !== "audio" || typeof typed.data !== "string" || !typed.data) continue
      return { data: typed.data, mimeType: typed.mime_type || typed.mimeType || "audio/mpeg" }
    }
  }
  return null
}

export function decodeBase64Audio(data: string): Uint8Array {
  const cleaned = data.replace(/^data:audio\/[^;]+;base64,/, "")
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export type PracticeAudioStatus = "generated" | "transcribing" | "transcribed" | "transcribe_failed"

export type PracticeAudioEvent =
  | { type: "transcribe_start" }
  | { type: "transcribe_ok" }
  | { type: "transcribe_fail" }

export type RecognizedChord = {
  start: number
  end: number
  chord: string
  class?: string
}

export function applyPracticeAudioEvent(
  row: { status: PracticeAudioStatus; audio_path: string | null },
  event: PracticeAudioEvent,
) {
  const audio_path = row.audio_path
  if (event.type === "transcribe_start") return { status: "transcribing" as const, audio_path }
  if (event.type === "transcribe_ok") return { status: "transcribed" as const, audio_path }
  return { status: "transcribe_failed" as const, audio_path }
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function chordFromUnknown(item: unknown): RecognizedChord | null {
  if (!item || typeof item !== "object") return null
  const raw = item as Record<string, unknown>
  const chord = firstString(
    raw.chord_simple_pop,
    raw.chord_basic_pop,
    raw.chord_complex_pop,
    raw.chord,
    raw.name,
  )
  const start = asNumber(raw.start)
  const end = asNumber(raw.end)
  if (!chord || start == null || end == null) return null
  const parsed: RecognizedChord = { start, end, chord }
  if (typeof raw.class === "string" && raw.class) parsed.class = raw.class
  return parsed
}

export function parseMusicaiChords(result: unknown): RecognizedChord[] {
  if (!result) return []
  const bags: unknown[] = []
  if (Array.isArray(result)) bags.push(result)
  if (typeof result === "object") {
    const obj = result as Record<string, unknown>
    for (const key of ["chords", "chords map", "chordsMap", "data", "result", "items"]) {
      if (obj[key] != null) bags.push(obj[key])
    }
  }
  const found: RecognizedChord[] = []
  for (const bag of bags) {
    if (!Array.isArray(bag)) continue
    for (const item of bag) {
      const chord = chordFromUnknown(item)
      if (chord) found.push(chord)
    }
    if (found.length) return found
  }
  return found
}

export function preferSimplePopChords(chords: RecognizedChord[]): RecognizedChord[] {
  if (!chords.some((c) => /simple\s*pop/i.test(c.class ?? ""))) {
    return chords.map(({ start, end, chord }) => ({ start, end, chord }))
  }
  const bySlot = new Map<string, RecognizedChord>()
  for (const item of chords) {
    const key = `${item.start}:${item.end}`
    const current = bySlot.get(key)
    const isSimple = /simple\s*pop/i.test(item.class ?? "")
    if (!current || isSimple) bySlot.set(key, item)
  }
  return [...bySlot.values()]
    .sort((a, b) => a.start - b.start)
    .map(({ start, end, chord }) => ({ start, end, chord }))
}

export function parseMusicaiKey(result: unknown): string | null {
  if (!result || typeof result !== "object") return null
  const obj = result as Record<string, unknown>
  return firstString(obj["root key"], obj.rootKey, obj.key, obj.recognized_key) || null
}

export function parseMusicaiBpm(result: unknown): number | null {
  if (result == null) return null
  if (typeof result === "number") return Number.isFinite(result) ? Math.round(result) : null
  if (typeof result !== "object") return null
  const obj = result as Record<string, unknown>
  const direct = asNumber(obj.bpm)
  if (direct != null && direct > 0) return Math.round(direct)
  for (const key of ["tempo", "beats", "analysis", "result", "data"]) {
    const nested = parseMusicaiBpm(obj[key])
    if (nested != null) return nested
  }
  return null
}

export function lyriaUserMessage(status: number, payload: unknown): string {
  const text = typeof payload === "object" && payload
    ? JSON.stringify(payload)
    : String(payload ?? "")
  if (status === 403 || /billing|paid.?tier|PERMISSION_DENIED/i.test(text)) {
    return "Lyria precisa de billing pago no Gemini. Confira Integrações."
  }
  if (/recitation|copyright|artist|filtered|safety|blocked/i.test(text)) {
    return "O filtro do Lyria recusou o pedido (artista, letra ou faixa protegida). Mude a receita e tente de novo."
  }
  if (status >= 500) return "Lyria falhou do lado da Google. Tente de novo em instantes."
  return "Não foi possível gerar o áudio."
}
