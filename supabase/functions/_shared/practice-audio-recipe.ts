export type PracticeAudioKind = "vocalize" | "backing" | "exercise"
export type LyriaModelId = "lyria-3-clip-preview" | "lyria-3-pro-preview"
export type PracticeAudioDuration = 30 | 60 | 120 | 180

export type PracticeAudioRecipe = {
  kind: PracticeAudioKind
  title: string
  key?: string
  bpm?: number | null
  durationSeconds: PracticeAudioDuration
  style?: string
  instruments: string[]
  exclude: string[]
  requestedChords: string[]
  scale?: string
  wordlessGuide: boolean
  note?: string
}

const KIND_LABEL: Record<PracticeAudioKind, string> = {
  vocalize: "vocalise / vocal warm-up",
  backing: "instrumental backing track to play along",
  exercise: "short classroom music exercise",
}

export function selectLyriaModel(durationSeconds: number): LyriaModelId {
  return durationSeconds <= 30 ? "lyria-3-clip-preview" : "lyria-3-pro-preview"
}

function joinList(items: string[]): string {
  return items.map((item) => item.trim()).filter(Boolean).join(", ")
}

export function compilePracticeAudioPrompt(recipe: PracticeAudioRecipe): string {
  const seconds = recipe.durationSeconds
  const parts: string[] = [`Create a ${seconds}-second ${KIND_LABEL[recipe.kind]}.`]

  if (recipe.key) parts.push(`Key: ${recipe.key}.`)
  if (recipe.scale) parts.push(`Scale/mode: ${recipe.scale}.`)
  if (recipe.bpm && recipe.bpm > 0) parts.push(`${recipe.bpm} BPM.`)
  if (recipe.style) parts.push(`Style: ${recipe.style}.`)
  if (recipe.instruments.length) parts.push(`Instruments: ${joinList(recipe.instruments)}.`)
  if (recipe.requestedChords.length) parts.push(`Only these chords: ${joinList(recipe.requestedChords)}.`)

  if (recipe.wordlessGuide) parts.push('Include a wordless guide vocal on "ah". No sung lyrics.')
  else parts.push("No guide vocal. No sung lyrics.")

  for (const exclusion of recipe.exclude) {
    const normalized = exclusion.trim().toLowerCase()
    if (!normalized) continue
    if (normalized === "drums" || normalized === "bateria") parts.push("No drums.")
    else if (normalized === "lyric vocals" || normalized === "voz com letra") parts.push("No sung lyrics.")
    else parts.push(`No ${normalized}.`)
  }

  parts.push("Classroom play-along. Clear harmony. No artist name, no copyrighted melody.")
  const note = recipe.note?.trim()
  if (note) parts.push(note)
  return parts.join(" ")
}

const KINDS = new Set<PracticeAudioKind>(["vocalize", "backing", "exercise"])
const DURATIONS = new Set<PracticeAudioDuration>([30, 60, 120, 180])

export function parseRecipe(body: unknown): PracticeAudioRecipe | string {
  if (!body || typeof body !== "object") return "Receita inválida"
  const raw = body as Record<string, unknown>
  const kind = raw.kind
  if (typeof kind !== "string" || !KINDS.has(kind as PracticeAudioKind)) {
    return "Informe o tipo: vocalize, backing ou exercise"
  }
  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  if (!title) return "Informe um título"
  const durationSeconds = Number(raw.durationSeconds)
  if (!DURATIONS.has(durationSeconds as PracticeAudioDuration)) {
    return "Duração deve ser 30, 60, 120 ou 180 segundos"
  }
  const asStringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

  return {
    kind: kind as PracticeAudioKind,
    title,
    key: typeof raw.key === "string" ? raw.key : undefined,
    bpm: typeof raw.bpm === "number" && raw.bpm > 0 ? raw.bpm : null,
    durationSeconds: durationSeconds as PracticeAudioDuration,
    style: typeof raw.style === "string" ? raw.style : undefined,
    instruments: asStringArray(raw.instruments),
    exclude: asStringArray(raw.exclude),
    requestedChords: asStringArray(raw.requestedChords),
    scale: typeof raw.scale === "string" ? raw.scale : undefined,
    wordlessGuide: Boolean(raw.wordlessGuide),
    note: typeof raw.note === "string" ? raw.note : "",
  }
}
