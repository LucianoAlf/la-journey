import {
  chordsToCifraLine,
  recognizedKeyMatchesRequested,
  type PracticeAudioStatus,
  type RecognizedChord,
} from '@/lib/practiceAudio'
import { exerciseCategoryForKind, selectPracticeAudioEngine, type PracticeAudioRecipe } from '@/lib/practiceAudioRecipe'
import { supabase } from '@/lib/supabase'
import { createExercise } from './exerciseLibraryService'

const db = supabase as any

export type PracticeAudioTake = {
  id: string
  audioUrl: string | null
  audioPath: string | null
  recipe: PracticeAudioRecipe
  lyriaModel?: string
  source?: 'suno' | 'lyria' | 'upload'
  status: PracticeAudioStatus
  recognizedChords?: RecognizedChord[]
  recognizedBpm?: number | null
  recognizedKey?: string | null
  keyMatched?: boolean
}

function invokeErrorMessage(error: { message?: string } | null, data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string') {
    return (data as { error: string }).error
  }
  return error?.message || fallback
}

export async function pingPracticeAudioIntegrations() {
  const [suno, lyria, musicai] = await Promise.all([
    supabase.functions.invoke('suno-generate', { body: { ping: true } }),
    supabase.functions.invoke('lyria-generate', { body: { ping: true } }),
    supabase.functions.invoke('musicai-transcribe', { body: { ping: true } }),
  ])
  return {
    suno: Boolean(suno.data?.configured ?? suno.data?.ok),
    lyria: Boolean(lyria.data?.configured ?? lyria.data?.ok),
    musicai: Boolean(musicai.data?.configured ?? musicai.data?.ok),
  }
}

function takeFromGenerate(data: Record<string, unknown>, recipe: PracticeAudioRecipe): PracticeAudioTake {
  return {
    id: String(data.id),
    audioUrl: (data.audioUrl as string | null) ?? null,
    audioPath: (data.audioPath as string | null) ?? null,
    recipe: (data.recipe as PracticeAudioRecipe) ?? recipe,
    lyriaModel: data.lyriaModel as string | undefined,
    source: data.source === 'suno' ? 'suno' : 'lyria',
    status: (data.status as PracticeAudioStatus) ?? 'generated',
  }
}

async function generateWithLyria(
  recipe: PracticeAudioRecipe,
  repertoireId?: string | null,
): Promise<PracticeAudioTake> {
  const { data, error } = await supabase.functions.invoke('lyria-generate', {
    body: { recipe, repertoireId: repertoireId || undefined },
  })
  if (error || data?.error) {
    throw new Error(invokeErrorMessage(error, data, 'Não foi possível gerar o áudio'))
  }
  return takeFromGenerate(data, recipe)
}

async function generateWithSuno(
  recipe: PracticeAudioRecipe,
  repertoireId?: string | null,
): Promise<PracticeAudioTake> {
  const suno = await supabase.functions.invoke('suno-generate', {
    body: { recipe, repertoireId: repertoireId || undefined },
  })
  if (!suno.error && !suno.data?.error && suno.data?.id) {
    return takeFromGenerate(suno.data, recipe)
  }
  const sunoUnavailable = suno.data?.code === 'suno_unconfigured' || suno.data?.status === 503
  if (!sunoUnavailable && (suno.error || suno.data?.error)) {
    const message = invokeErrorMessage(suno.error, suno.data, '')
    if (message && !/não encontrado|not found|FunctionsHttpError/i.test(message)) {
      throw new Error(message || 'Não foi possível gerar o áudio no Suno')
    }
  }
  return generateWithLyria(recipe, repertoireId)
}

export async function generatePracticeAudio(
  recipe: PracticeAudioRecipe,
  repertoireId?: string | null,
): Promise<PracticeAudioTake> {
  const engine = selectPracticeAudioEngine(recipe)
  if (engine === 'lyria') return generateWithLyria(recipe, repertoireId)
  return generateWithSuno(recipe, repertoireId)
}

export async function generateAndVerifyPracticeAudio(
  recipe: PracticeAudioRecipe,
  repertoireId?: string | null,
  maxAttempts = 2,
): Promise<PracticeAudioTake> {
  let last: PracticeAudioTake | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const generated = await generatePracticeAudio(recipe, repertoireId)
    const transcribed = await transcribePracticeAudio(generated.id)
    const merged: PracticeAudioTake = {
      ...generated,
      ...transcribed,
      audioUrl: transcribed.audioUrl || generated.audioUrl,
      audioPath: transcribed.audioPath || generated.audioPath,
      recipe: transcribed.recipe || generated.recipe,
      source: generated.source,
    }
    const keyMatched = recognizedKeyMatchesRequested(recipe, merged.recognizedKey)
    last = { ...merged, keyMatched }
    if (keyMatched || !recipe.key?.trim()) return last
  }
  return last as PracticeAudioTake
}

export async function transcribePracticeAudio(practiceAudioId: string): Promise<PracticeAudioTake> {
  const { data, error } = await supabase.functions.invoke('musicai-transcribe', {
    body: { practiceAudioId },
  })
  if (error && !data) {
    throw new Error(invokeErrorMessage(error, data, 'Não foi possível reconhecer a cifra'))
  }
  if (data?.status === 'transcribe_failed') {
    return {
      id: practiceAudioId,
      audioUrl: null,
      audioPath: data.audioPath ?? null,
      recipe: data.recipe,
      status: 'transcribe_failed',
    }
  }
  if (data?.error && data?.status !== 'transcribed') {
    throw new Error(data.error)
  }
  return {
    id: data.id ?? practiceAudioId,
    audioUrl: data.audioUrl ?? null,
    audioPath: data.audioPath ?? null,
    recipe: data.recipe,
    status: data.status ?? 'transcribed',
    recognizedChords: data.recognizedChords ?? [],
    recognizedBpm: data.recognizedBpm ?? null,
    recognizedKey: data.recognizedKey ?? null,
  }
}

export async function updateRecognizedChords(
  practiceAudioId: string,
  chords: RecognizedChord[],
  extras?: { bpm?: number | null; key?: string | null },
) {
  const { error } = await db
    .from('practice_audio')
    .update({
      recognized_chords: chords,
      recognized_bpm: extras?.bpm ?? undefined,
      recognized_key: extras?.key ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', practiceAudioId)
  if (error) throw new Error(error.message)
}

export async function savePracticeAudioToLibrary(input: {
  take: PracticeAudioTake
  schoolId: string
  linkRepertoire?: boolean
  repertoireId?: string | null
}) {
  const cifra = chordsToCifraLine(input.take.recognizedChords ?? [])
  const audioUrl = input.take.audioUrl
  const blocks = [
    {
      block_type: 'audio',
      title: input.take.recipe.title,
      content: '',
      render_data: { url: audioUrl, caption: input.take.recipe.kind, path: input.take.audioPath },
      sort_order: 0,
    },
    {
      block_type: 'text',
      title: 'Cifra',
      content: cifra || '—',
      render_data: {},
      sort_order: 1,
    },
  ]

  const exercise = await createExercise({
    school_id: input.schoolId,
    title: input.take.recipe.title,
    description: cifra ? `Áudio ${input.take.recipe.kind} · ${cifra}` : `Áudio ${input.take.recipe.kind}`,
    content_type: 'exercise',
    category: exerciseCategoryForKind(input.take.recipe.kind),
    instrument: 'universal',
    difficulty_level: 'foundation',
    tags: ['audio', input.take.recipe.kind, input.take.source === 'suno' ? 'suno' : 'lyria'],
    blocks,
    preview_data: {},
    thumbnail_url: null,
    block_count: blocks.length,
    estimated_minutes: Math.max(1, Math.round((input.take.recipe.durationSeconds || 30) / 60)),
    source: input.take.source === 'suno' ? 'suno' : 'lyria',
    source_reference: input.take.id,
    curation_status: 'draft',
    is_template: false,
    curated_by: null,
  })

  await db.from('practice_audio').update({
    exercise_id: exercise.id,
    updated_at: new Date().toISOString(),
  }).eq('id', input.take.id)

  if (input.linkRepertoire && input.repertoireId && input.take.audioPath) {
    await db.from('backing_tracks').insert({
      repertoire_id: input.repertoireId,
      stem_type: 'mix',
      source: input.take.source === 'suno' ? 'suno' : 'lyria',
      storage_path: input.take.audioPath,
      duration_seconds: input.take.recipe.durationSeconds,
    })
    await db.from('repertoire').update({
      backing_track_url: audioUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', input.repertoireId)
  }

  return exercise
}
