import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, Database } from '@/lib/database.types'

export type Chord = Tables<'chord_library'>
export type Scale = Tables<'scale_library'>

export async function getChords(instrument?: Database['public']['Enums']['chord_instrument']) {
  let query = supabase
    .from('chord_library')
    .select('*')
    .order('name')

  if (instrument) query = query.eq('instrument', instrument)

  const { data, error } = await query
  if (error) handleError(error)
  return data
}

/** Busca paginada de acordes com filtros semânticos (para a Biblioteca Musical) */
export async function getChordsPaginated(opts: {
  instrument?: Database['public']['Enums']['chord_instrument']
  search?: string
  difficulty?: number
  tag?: string
  rootNote?: string
  family?: string
  quality?: string
  excludeSlash?: boolean
  onlySlash?: boolean
  slashType?: string
  accidental?: 'natural' | 'sharp_flat'
  cagedShape?: 'C' | 'A' | 'G' | 'E' | 'D'
  hasBarre?: boolean | null
  voicingPosition?: string
  page?: number
  pageSize?: number
}): Promise<{ data: Chord[]; count: number }> {
  const { instrument, search, difficulty, tag, rootNote, family, quality, excludeSlash, onlySlash, slashType, accidental, cagedShape, hasBarre, voicingPosition, page = 0, pageSize = 60 } = opts
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('chord_library')
    .select('*', { count: 'exact' })
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .range(from, to)

  if (instrument) query = query.eq('instrument', instrument)
  if (search) query = query.or(`name.ilike.%${search}%,canonical_name.ilike.%${search}%`)
  if (difficulty && difficulty > 0) query = query.eq('difficulty', difficulty)
  if (tag && tag !== 'todos') query = query.contains('tags', [tag])
  if (rootNote) query = query.eq('root_note', rootNote)
  if (family) query = query.eq('family', family)
  if (quality) query = query.eq('quality', quality)
  if (excludeSlash) query = query.not('name', 'like', '%/%')
  if (onlySlash) query = query.like('name', '%/%')
  if (slashType) query = (query as any).eq('slash_type', slashType)
  if (accidental === 'natural') query = (query as any).in('root_note', ['C','D','E','F','G','A','B'])
  if (accidental === 'sharp_flat') query = (query as any).not('root_note', 'in', '("C","D","E","F","G","A","B")')
  if (cagedShape) query = (query as any).eq('caged_shape', cagedShape)
  if (hasBarre === true) query = (query as any).eq('has_barre', true)
  if (hasBarre === false) query = (query as any).eq('has_barre', false)
  if (voicingPosition) query = (query as any).eq('voicing_position', voicingPosition)

  const { data, error, count } = await query
  if (error) handleError(error)
  return { data: data ?? [], count: count ?? 0 }
}

/** Contagem rápida de acordes por instrumento */
export async function getChordsCount(instrument?: Database['public']['Enums']['chord_instrument']): Promise<number> {
  let query = supabase
    .from('chord_library')
    .select('id', { count: 'exact', head: true })

  if (instrument) query = query.eq('instrument', instrument)

  const { count, error } = await query
  if (error) handleError(error)
  return count ?? 0
}

export async function getChordsByNames(names: string[], instrument?: Database['public']['Enums']['chord_instrument']) {
  if (!names.length) return []
  let query = supabase
    .from('chord_library')
    .select('*')
    .in('name', names)

  if (instrument) query = query.eq('instrument', instrument)

  const { data, error } = await query
  if (error) handleError(error)
  return data ?? []
}

export async function getScales() {
  const { data, error } = await supabase
    .from('scale_library')
    .select('*')
    .order('name')

  if (error) handleError(error)
  return data
}

export async function createChord(chord: TablesInsert<'chord_library'>) {
  const { data, error } = await supabase
    .from('chord_library')
    .insert(chord)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

/**
 * Insere múltiplos acordes em batch via upsert, ignorando duplicatas (name+instrument).
 * Constraint unique: chord_library_name_instrument_caged_unique (name, instrument, COALESCE(caged_shape, '')).
 * Retorna quantos foram inseridos com sucesso.
 */
export async function insertChordsBatch(
  chords: TablesInsert<'chord_library'>[],
  onProgress?: (inserted: number, total: number) => void
): Promise<number> {
  if (!chords.length) return 0

  const BATCH_SIZE = 50
  let inserted = 0

  for (let i = 0; i < chords.length; i += BATCH_SIZE) {
    const batch = chords.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('chord_library')
      .upsert(batch, { onConflict: 'name,instrument', ignoreDuplicates: true })
      .select('id')

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} erro:`, error.message)
      continue
    }
    inserted += data?.length ?? 0
    onProgress?.(inserted, chords.length)
  }

  return inserted
}

export async function updateChord(id: string, chord: Partial<TablesInsert<'chord_library'>>) {
  const { data, error } = await supabase
    .from('chord_library')
    .update(chord)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function deleteChord(id: string) {
  const { error } = await supabase
    .from('chord_library')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
}

export async function createScale(scale: TablesInsert<'scale_library'>) {
  const { data, error } = await supabase
    .from('scale_library')
    .insert(scale)
    .select()
    .single()

  if (error) handleError(error)
  return data
}
