import { chordsToCifraLine, type PracticeAudioStatus, type RecognizedChord } from '@/lib/practiceAudio'
import { exerciseCategoryForKind, type PracticeAudioRecipe } from '@/lib/practiceAudioRecipe'
import { supabase } from '@/lib/supabase'
import { createExercise } from './exerciseLibraryService'

const db = supabase as any

export type PracticeAudioTake = {
  id: string
  audioUrl: string | null
  audioPath: string | null
  recipe: PracticeAudioRecipe
  lyriaModel?: string
  status: PracticeAudioStatus
  recognizedChords?: RecognizedChord[]
  recognizedBpm?: number | null
  recognizedKey?: string | null
}

function invokeErrorMessage(error: { message?: string } | null, data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string') {
    return (data as { error: string }).error
  }
  return error?.message || fallback
}

export async function pingPracticeAudioIntegrations() {
  const [lyria, musicai] = await Promise.all([
    supabase.functions.invoke('lyria-generate', { body: { ping: true } }),
    supabase.functions.invoke('musicai-transcribe', { body: { ping: true } }),
  ])
  return {
    lyria: Boolean(lyria.data?.configured ?? lyria.data?.ok),
    musicai: Boolean(musicai.data?.configured ?? musicai.data?.ok),
  }
}

export async function generatePracticeAudio(
  recipe: PracticeAudioRecipe,
  repertoireId?: string | null,
): Promise<PracticeAudioTake> {
  const { data, error } = await supabase.functions.invoke('lyria-generate', {
    body: { recipe, repertoireId: repertoireId || undefined },
  })
  if (error || data?.error) {
    throw new Error(invokeErrorMessage(error, data, 'Não foi possível gerar o áudio'))
  }
  return {
    id: data.id,
    audioUrl: data.audioUrl ?? null,
    audioPath: data.audioPath ?? null,
    recipe: data.recipe ?? recipe,
    lyriaModel: data.lyriaModel,
    status: data.status ?? 'generated',
  }
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
    tags: ['audio', input.take.recipe.kind, 'lyria'],
    blocks,
    preview_data: {},
    thumbnail_url: null,
    block_count: blocks.length,
    estimated_minutes: Math.max(1, Math.round((input.take.recipe.durationSeconds || 30) / 60)),
    source: 'lyria',
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
      source: 'lyria',
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
