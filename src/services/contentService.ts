import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/lib/database.types'

export type ContentTopic = Tables<'content_topics'>
export type ContentBlock = Tables<'content_blocks'>
export type CurationStatus = Database['public']['Enums']['curation_status']

// Extended types with curation workflow fields
export type ContentTopicWithCuration = ContentTopic
export type ContentBlockWithCuration = ContentBlock

// ─── Topics CRUD ─────────────────────────────────────────

export async function getTopics(filters?: {
  instrument?: string
  dimension?: Database['public']['Enums']['topic_dimension']
  difficulty?: Database['public']['Enums']['difficulty_level']
}) {
  let query = supabase
    .from('content_topics')
    .select('*')
    .order('title')

  if (filters?.instrument) query = query.eq('instrument', filters.instrument)
  if (filters?.dimension) query = query.eq('dimension', filters.dimension)
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

export async function createTopic(topic: TablesInsert<'content_topics'>) {
  const { data, error } = await supabase
    .from('content_topics')
    .insert(topic)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateTopic(id: string, updates: TablesUpdate<'content_topics'>) {
  const { data, error } = await supabase
    .from('content_topics')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function deleteTopic(id: string) {
  // First delete all blocks
  const { error: blocksError } = await supabase
    .from('content_blocks')
    .delete()
    .eq('topic_id', id)

  if (blocksError) handleError(blocksError)

  // Then delete the topic
  const { error } = await supabase
    .from('content_topics')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
}

export async function updateTopicStatus(id: string, status: CurationStatus) {
  // Note: topics don't have curation_status in schema, this updates associated blocks
  const { data, error } = await supabase
    .from('content_blocks')
    .update({ curation_status: status })
    .eq('topic_id', id)
    .select()

  if (error) handleError(error)
  return data
}

// ─── Blocks CRUD ─────────────────────────────────────────

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

export async function deleteBlock(id: string) {
  const { error } = await supabase
    .from('content_blocks')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
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

export async function reorderBlocks(topicId: string, blockIds: string[]) {
  // Update sort_order for each block
  const updates = blockIds.map((id, index) =>
    supabase
      .from('content_blocks')
      .update({ sort_order: index + 1 })
      .eq('id', id)
      .eq('topic_id', topicId)
  )

  await Promise.all(updates)

  // Return updated blocks
  return getBlocks(topicId)
}

// ─── Topic with Curation (for imports) ───────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80) + '-' + Date.now().toString(36)
}

export async function createTopicWithCuration(data: {
  title: string
  description?: string | null
  instrument?: string
  dimension?: string
  difficulty_level?: string
  tags?: string[]
  estimated_minutes?: number
  school_id?: string  // For blocks, not topic
  source_document?: string | null
}): Promise<ContentTopicWithCuration> {
  const insertData: TablesInsert<'content_topics'> = {
    title: data.title,
    slug: generateSlug(data.title),
    description: data.description,
    instrument: data.instrument,
    dimension: data.dimension as any,
    // pillar uses different enum (pillar_type) - leave null, use dimension instead
    difficulty_level: data.difficulty_level as any,
    tags: data.tags,
    estimated_minutes: data.estimated_minutes,
    source_document: data.source_document,
  }

  const { data: topic, error } = await supabase
    .from('content_topics')
    .insert(insertData)
    .select()
    .single()

  if (error) handleError(error)
  return topic as ContentTopicWithCuration
}
