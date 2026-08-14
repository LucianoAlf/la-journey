import {
  coverTemplateFromTags,
  withCoverTemplateTag,
  type CoverTemplate,
} from '@/lib/notebookMaterialAssembler'
import { buildExerciseNotebookBlocks } from '@/lib/exerciseNotebookAssembler'
import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import { createDraftMaterialWithBlocks } from './materialService'
import type { ExerciseLibraryItem } from './exerciseLibraryService'

const db = supabase as any

export interface ExerciseCollection {
  id: string
  school_id: string | null
  name: string
  description: string | null
  instrument: string
  difficulty_level: string
  tags: string[]
  cover_image_url: string | null
  is_template: boolean
  curation_status: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ExerciseCollectionItem {
  id: string
  collection_id: string
  exercise_id: string
  sort_order: number
  notes: string | null
  created_at: string
}

type ExerciseCollectionItemWithExercise = ExerciseCollectionItem & {
  exercise: ExerciseLibraryItem | null
}

function mapItemWithExercise(item: Record<string, unknown>): ExerciseCollectionItemWithExercise {
  const exercise = (item.exercise ?? item.exercise_library ?? null) as ExerciseLibraryItem | null
  const { exercise_library: _ignored, ...rest } = item
  return {
    ...(rest as unknown as ExerciseCollectionItem),
    exercise,
  }
}

export async function getExerciseCollections(
  filters: { instrument?: string; search?: string } = {},
): Promise<ExerciseCollection[]> {
  let query = db
    .from('exercise_collections')
    .select('*')
    .order('sort_order', { ascending: true })

  if (filters.instrument) query = query.eq('instrument', filters.instrument)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) handleError(error)
  return data ?? []
}

export async function createExerciseCollection(
  collection: Omit<ExerciseCollection, 'id' | 'created_at' | 'updated_at'>,
): Promise<ExerciseCollection> {
  const { data, error } = await db
    .from('exercise_collections')
    .insert(collection)
    .select()
    .single()
  if (error) handleError(error)
  return data
}

export async function updateExerciseCollection(
  id: string,
  updates: Partial<ExerciseCollection>,
): Promise<ExerciseCollection> {
  const { data, error } = await db
    .from('exercise_collections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) handleError(error)
  return data
}

export async function deleteExerciseCollection(id: string): Promise<void> {
  const { error } = await db.from('exercise_collections').delete().eq('id', id)
  if (error) handleError(error)
}

export async function getExerciseCollectionItems(
  collectionId: string,
): Promise<ExerciseCollectionItemWithExercise[]> {
  const aliased = await db
    .from('exercise_collection_items')
    .select('*, exercise:exercise_library(*)')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true })

  if (!aliased.error) {
    return (aliased.data ?? []).map(mapItemWithExercise)
  }

  const { data, error } = await db
    .from('exercise_collection_items')
    .select('*, exercise_library(*)')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true })
  if (error) handleError(error)
  return (data ?? []).map(mapItemWithExercise)
}

export async function addExerciseToCollection(
  collectionId: string,
  exerciseId: string,
  notes?: string,
): Promise<ExerciseCollectionItem> {
  const { data: existing } = await db
    .from('exercise_collection_items')
    .select('sort_order')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order || 0) + 1
  const { data, error } = await db
    .from('exercise_collection_items')
    .insert({
      collection_id: collectionId,
      exercise_id: exerciseId,
      sort_order: nextOrder,
      notes,
    })
    .select()
    .single()
  if (error) handleError(error)
  return data
}

export async function removeExerciseFromCollection(itemId: string): Promise<void> {
  const { error } = await db
    .from('exercise_collection_items')
    .delete()
    .eq('id', itemId)
  if (error) handleError(error)
}

export async function createDraftMaterialFromExerciseNotebook(
  collection: ExerciseCollection,
  schoolId: string,
  options?: {
    coverTemplate?: CoverTemplate
    coverImageUrl?: string | null
    schoolName?: string | null
    professorName?: string | null
    logoUrl?: string | null
  },
): Promise<{ materialId: string; skippedMissingExercises: number }> {
  const items = await getExerciseCollectionItems(collection.id)
  const coverTemplate = options?.coverTemplate ?? coverTemplateFromTags(collection.tags) ?? 'modern'

  if (options?.coverTemplate) {
    try {
      await updateExerciseCollection(collection.id, {
        tags: withCoverTemplateTag(collection.tags, options.coverTemplate),
        cover_image_url: options.coverImageUrl ?? collection.cover_image_url,
      })
    } catch {
      // capa ainda entra no rascunho se o tag falhar
    }
  }

  const assembled = buildExerciseNotebookBlocks({
    title: collection.name,
    coverTemplate,
    coverImageUrl: options?.coverImageUrl ?? collection.cover_image_url,
    instrument: collection.instrument,
    level: collection.difficulty_level,
    schoolName: options?.schoolName,
    professorName: options?.professorName,
    logoUrl: options?.logoUrl,
    exercises: items.map((item) => item.exercise ?? null),
  })

  if (assembled.includedExercises === 0) {
    throw new Error('Adicione pelo menos um exercício.')
  }

  const materialId = await createDraftMaterialWithBlocks({
    schoolId,
    title: collection.name,
    type: 'exercise_sheet',
    blocks: assembled.blocks,
    instrument: collection.instrument,
    level: collection.difficulty_level,
    description: collection.description,
    generationConfig: {
      source: 'exercise_collection',
      collection_id: collection.id,
    },
  })

  return {
    materialId,
    skippedMissingExercises: assembled.skippedMissingExercises,
  }
}
