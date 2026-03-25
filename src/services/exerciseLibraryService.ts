import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'

// Helper para tabelas não tipadas no database.types.ts (regenerar tipos depois)
const db = supabase as any

// Tipos
export interface ExerciseLibraryItem {
  id: string
  school_id: string | null
  title: string
  description: string | null
  content_type: 'exercise' | 'example'
  category: string
  instrument: string
  difficulty_level: string
  tags: string[]
  blocks: any[] // Array de blocos [{block_type, title, content, render_data, sort_order}]
  preview_data: any
  thumbnail_url: string | null
  block_count: number
  estimated_minutes: number
  source: string | null
  source_reference: string | null
  curation_status: string
  is_template: boolean
  curated_by: string | null
  created_at: string
  updated_at: string
}

export interface ExerciseLibraryFilters {
  content_type?: 'exercise' | 'example' | null
  category?: string | null
  instrument?: string | null
  difficulty_level?: string | null
  search?: string | null
  is_template?: boolean | null
  curation_status?: string | null
}

// CRUD
export async function getExercises(
  filters: ExerciseLibraryFilters = {},
  page: number = 0,
  pageSize: number = 20
): Promise<{ data: ExerciseLibraryItem[]; count: number }> {
  let query = db
    .from('exercise_library')
    .select('*', { count: 'exact' })

  if (filters.content_type) {
    query = query.eq('content_type', filters.content_type)
  }
  if (filters.category) {
    query = query.eq('category', filters.category)
  }
  if (filters.instrument) {
    query = query.eq('instrument', filters.instrument)
  }
  if (filters.difficulty_level) {
    query = query.eq('difficulty_level', filters.difficulty_level)
  }
  if (filters.is_template !== null && filters.is_template !== undefined) {
    query = query.eq('is_template', filters.is_template)
  }
  if (filters.curation_status) {
    query = query.eq('curation_status', filters.curation_status)
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  query = query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  const { data, error, count } = await query

  if (error) handleError(error)
  return { data: data ?? [], count: count ?? 0 }
}

export async function getExerciseById(id: string): Promise<ExerciseLibraryItem | null> {
  const { data, error } = await db
    .from('exercise_library')
    .select('*')
    .eq('id', id)
    .single()

  if (error) handleError(error)
  return data
}

export async function createExercise(
  exercise: Omit<ExerciseLibraryItem, 'id' | 'created_at' | 'updated_at'>
): Promise<ExerciseLibraryItem> {
  const { data, error } = await db
    .from('exercise_library')
    .insert(exercise)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateExercise(
  id: string,
  updates: Partial<ExerciseLibraryItem>
): Promise<ExerciseLibraryItem> {
  const { data, error } = await db
    .from('exercise_library')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await db
    .from('exercise_library')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
}

export async function duplicateExercise(id: string): Promise<ExerciseLibraryItem> {
  const original = await getExerciseById(id)
  if (!original) throw new Error('Exercício não encontrado')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const currentSchoolId = (user?.user_metadata as { school_id?: string } | undefined)?.school_id ?? null

  const { id: _, created_at, updated_at, ...rest } = original
  return createExercise({
    ...rest,
    school_id: currentSchoolId,
    title: `${rest.title} (cópia)`,
    is_template: false,
    curation_status: 'draft',
  })
}

// Contadores por categoria
export async function getExerciseCounts(): Promise<Record<string, number>> {
  const { data, error } = await db
    .from('exercise_library')
    .select('content_type, category')

  if (error) handleError(error)

  const counts: Record<string, number> = { total: 0, exercise: 0, example: 0 }

  for (const item of data ?? []) {
    counts.total++
    counts[item.content_type] = (counts[item.content_type] || 0) + 1
    counts[item.category] = (counts[item.category] || 0) + 1
  }

  return counts
}
