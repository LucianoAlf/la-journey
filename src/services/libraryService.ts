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
 * Usa constraint unique chord_library_name_instrument_unique.
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
