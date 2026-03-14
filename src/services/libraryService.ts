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
