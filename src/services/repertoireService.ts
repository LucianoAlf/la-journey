import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/lib/database.types'

export type Repertoire = Tables<'repertoire'>

export async function getRepertoire(filters?: {
  difficulty?: number
  genre?: string
}) {
  let query = supabase
    .from('repertoire')
    .select('*')
    .order('title')

  if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty)
  if (filters?.genre) query = query.eq('genre', filters.genre)

  const { data, error } = await query
  if (error) handleError(error)
  return data
}

export async function createSong(song: TablesInsert<'repertoire'>) {
  const { data, error } = await supabase
    .from('repertoire')
    .insert(song)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateSong(id: string, updates: TablesUpdate<'repertoire'>) {
  const { data, error } = await supabase
    .from('repertoire')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function deleteSong(id: string) {
  const { error } = await supabase
    .from('repertoire')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
}
