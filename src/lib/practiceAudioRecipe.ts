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

export type PracticeAudioEngine = 'suno' | 'lyria'

export function selectPracticeAudioEngine(_recipe: Pick<PracticeAudioRecipe, 'wordlessGuide'>): PracticeAudioEngine {
  return 'suno'
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

function scaleWord(scale?: string): string {
  if (!scale) return ''
  const normalized = scale.trim().toLowerCase()
  if (normalized === 'major' || normalized === 'maior') return 'major'
  if (normalized === 'minor' || normalized === 'menor') return 'minor'
  return scale.trim()
}

export function describePracticeKey(recipe: Pick<PracticeAudioRecipe, 'key' | 'scale'>): string | null {
  const key = recipe.key?.trim()
  if (!key) return null
  if (/\b(major|minor|maior|menor|maj|min)\b/i.test(key)) return key
  const scale = scaleWord(recipe.scale)
  return scale ? `${key} ${scale}` : key
}

export function compilePracticeAudioPrompt(recipe: PracticeAudioRecipe): string {
  const seconds = recipe.durationSeconds
  const keyName = describePracticeKey(recipe)
  const tonic = recipe.key?.trim()
  const lead = keyName
    ? `Create a ${seconds}-second ${KIND_LABEL[recipe.kind]} in ${keyName}.`
    : `Create a ${seconds}-second ${KIND_LABEL[recipe.kind]}.`
  const parts: string[] = [lead]

  if (tonic && keyName) {
    parts.push(`The tonic is ${tonic}. Stay in ${keyName} from the first note to the last. Do not modulate. Do not transpose. Do not change key.`)
  }
  if (recipe.kind === 'vocalize' && keyName && tonic) {
    parts.push(`The melody and guide vocal use only the ${keyName} scale and resolve on ${tonic}.`)
  }
  if (recipe.bpm && recipe.bpm > 0) parts.push(`${recipe.bpm} BPM.`)
  if (recipe.style) parts.push(`Style: ${recipe.style}.`)
  if (recipe.instruments.length) parts.push(`Instruments: ${joinList(recipe.instruments)}.`)

  if (recipe.requestedChords.length) {
    const inKey = keyName ? ` in ${keyName}` : ''
    parts.push(`Only these chords${inKey}: ${joinList(recipe.requestedChords)}.`)
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

export type SunoMusicRequest = {
  customMode: true
  instrumental: boolean
  model: 'V5_5'
  title: string
  style: string
  duration: number
  prompt?: string
}

export function compileSunoMusicRequest(recipe: PracticeAudioRecipe): SunoMusicRequest {
  const keyName = describePracticeKey(recipe)
  const vocalize = recipe.wordlessGuide
  const styleParts: string[] = []
  if (vocalize) {
    styleParts.push(
      keyName
        ? `Classroom vocalise for singing students in ${keyName}. Solo piano accompaniment. Female wordless guide vocals singing only ah. Ascending and descending ${keyName} scale. Stay in ${keyName}. Do not modulate.`
        : 'Classroom vocalise for singing students. Solo piano accompaniment. Wordless guide vocals singing only ah.',
    )
  } else if (keyName) {
    styleParts.push(`Solo instrumental classroom practice in ${keyName}. Stay in ${keyName}. Do not modulate.`)
  } else {
    styleParts.push('Solo instrumental classroom practice.')
  }
  if (recipe.bpm && recipe.bpm > 0) styleParts.push(`${recipe.bpm} BPM.`)
  if (recipe.style) styleParts.push(`Style: ${recipe.style}.`)
  if (recipe.instruments.length) styleParts.push(`Instruments: ${joinList(recipe.instruments)}.`)
  if (recipe.requestedChords.length) {
    const inKey = keyName ? ` in ${keyName}` : ''
    styleParts.push(`Only these chords${inKey}: ${joinList(recipe.requestedChords)}.`)
  }
  if (vocalize) {
    styleParts.push('No drums. No lyrics with words. No artist name, no copyrighted melody.')
  } else {
    styleParts.push('Instrumental only. No vocals. No sung lyrics. No artist name, no copyrighted melody.')
  }
  for (const exclusion of recipe.exclude) {
    const normalized = exclusion.trim().toLowerCase()
    if (!normalized) continue
    if (normalized === 'drums' || normalized === 'bateria') styleParts.push('No drums.')
    else if (normalized === 'lyric vocals' || normalized === 'voz com letra') continue
    else styleParts.push(`No ${normalized}.`)
  }
  const note = recipe.note?.trim()
  if (note) styleParts.push(note)

  const title = recipe.title.trim().slice(0, 100) || 'Classroom piano'
  const request: SunoMusicRequest = {
    customMode: true,
    instrumental: !vocalize,
    model: 'V5_5',
    title,
    style: styleParts.join(' ').slice(0, 1000),
    duration: recipe.durationSeconds,
  }
  if (vocalize) {
    request.prompt = '[Verse]\nAh ah ah ah ah ah ah ah\nAh ah ah ah ah ah ah ah\n[Verse]\nAh ah ah ah ah ah ah ah\nAh ah ah ah ah ah ah'
  }
  return request
}
