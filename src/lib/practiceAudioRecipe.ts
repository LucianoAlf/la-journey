import type { PracticeAudioKind } from './practiceAudio'

export type LyriaModelId = 'lyria-3-clip-preview' | 'lyria-3-pro-preview'

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
  vocalize: 'vocalise / vocal warm-up',
  backing: 'instrumental backing track to play along',
  exercise: 'short classroom music exercise',
}

const CATEGORY_FOR_KIND: Record<PracticeAudioKind, string> = {
  vocalize: 'scales',
  backing: 'progression',
  exercise: 'technique',
}

export function defaultRecipe(kind: PracticeAudioKind): PracticeAudioRecipe {
  const wordlessGuide = kind === 'vocalize'
  const instruments = kind === 'vocalize' ? ['piano', 'light band'] : ['acoustic guitar', 'bass', 'keys']
  return {
    kind,
    title: kind === 'vocalize' ? 'Vocalize' : kind === 'backing' ? 'Base' : 'Exercício',
    key: 'C',
    bpm: null,
    durationSeconds: 30,
    style: kind === 'backing' ? 'pop' : 'classroom',
    instruments,
    exclude: kind === 'vocalize' ? ['lyric vocals'] : ['drums', 'lyric vocals'],
    requestedChords: kind === 'backing' ? ['C', 'G', 'D'] : [],
    scale: kind === 'backing' ? undefined : 'major',
    wordlessGuide,
    note: '',
  }
}

export function selectLyriaModel(durationSeconds: number): LyriaModelId {
  return durationSeconds <= 30 ? 'lyria-3-clip-preview' : 'lyria-3-pro-preview'
}

export function exerciseCategoryForKind(kind: PracticeAudioKind): string {
  return CATEGORY_FOR_KIND[kind]
}

function joinList(items: string[]): string {
  return items.map((item) => item.trim()).filter(Boolean).join(', ')
}

export function compilePracticeAudioPrompt(recipe: PracticeAudioRecipe): string {
  const seconds = recipe.durationSeconds
  const parts: string[] = [
    `Create a ${seconds}-second ${KIND_LABEL[recipe.kind]}.`,
  ]

  if (recipe.key) parts.push(`Key: ${recipe.key}.`)
  if (recipe.scale) parts.push(`Scale/mode: ${recipe.scale}.`)
  if (recipe.bpm && recipe.bpm > 0) parts.push(`${recipe.bpm} BPM.`)
  if (recipe.style) parts.push(`Style: ${recipe.style}.`)
  if (recipe.instruments.length) parts.push(`Instruments: ${joinList(recipe.instruments)}.`)

  if (recipe.requestedChords.length) {
    parts.push(`Only these chords: ${joinList(recipe.requestedChords)}.`)
  }

  if (recipe.wordlessGuide) {
    parts.push('Include a wordless guide vocal on "ah". No sung lyrics.')
  } else {
    parts.push('No guide vocal. No sung lyrics.')
  }

  for (const exclusion of recipe.exclude) {
    const normalized = exclusion.trim().toLowerCase()
    if (!normalized) continue
    if (normalized === 'drums' || normalized === 'bateria') parts.push('No drums.')
    else if (normalized === 'lyric vocals' || normalized === 'voz com letra') parts.push('No sung lyrics.')
    else parts.push(`No ${normalized}.`)
  }

  parts.push('Classroom play-along. Clear harmony. No artist name, no copyrighted melody.')

  const note = recipe.note?.trim()
  if (note) parts.push(note)

  return parts.join(' ')
}
