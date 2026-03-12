import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type User = Tables<'users'>

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (error) handleError(error)
  return data
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) handleError(error)
  return data
}

export async function createUser(user: TablesInsert<'users'>) {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateUser(id: string, updates: TablesUpdate<'users'>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}
