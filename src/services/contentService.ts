import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/lib/database.types'

export type ContentTopic = Tables<'content_topics'>
export type ContentBlock = Tables<'content_blocks'>
export type CurationStatus = Database['public']['Enums']['curation_status']

export async function getTopics(filters?: {
  instrument?: string
  pillar?: Database['public']['Enums']['pillar_type']
  difficulty?: Database['public']['Enums']['difficulty_level']
}) {
  let query = supabase
    .from('content_topics')
    .select('*')
    .order('title')

  if (filters?.instrument) query = query.eq('instrument', filters.instrument)
  if (filters?.pillar) query = query.eq('pillar', filters.pillar)
  if (filters?.difficulty) query = query.eq('difficulty_level', filters.difficulty)

  const { data, error } = await query
  if (error) handleError(error)
  return data
}

export async function getTopicById(id: string) {
  const { data, error } = await supabase
    .from('content_topics')
    .select('*')
    .eq('id', id)
    .single()

  if (error) handleError(error)
  return data
}

export async function getBlocks(topicId: string) {
  const { data, error } = await supabase
    .from('content_blocks')
    .select('*')
    .eq('topic_id', topicId)
    .order('sort_order')

  if (error) handleError(error)
  return data
}

export async function createBlock(block: TablesInsert<'content_blocks'>) {
  const { data, error } = await supabase
    .from('content_blocks')
    .insert(block)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateBlock(id: string, updates: TablesUpdate<'content_blocks'>) {
  const { data, error } = await supabase
    .from('content_blocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateCurationStatus(id: string, status: CurationStatus) {
  const { data, error } = await supabase
    .from('content_blocks')
    .update({ curation_status: status })
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}
