import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesUpdate } from '@/lib/database.types'

export type School = Tables<'schools'>

export async function getSchool() {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .single()

  if (error) handleError(error)
  return data
}

export async function updateSchool(id: string, updates: TablesUpdate<'schools'>) {
  const { data, error } = await supabase
    .from('schools')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}
