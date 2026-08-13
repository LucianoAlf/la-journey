import { buildNotebookMaterialBlocks, coverTemplateFromTags, type CoverTemplate } from '@/lib/notebookMaterialAssembler'
import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import { createDraftMaterialWithBlocks } from './materialService'

// Helper para tabelas não tipadas no database.types.ts (regenerar tipos depois)
const db = supabase as any

export interface RepertoireCollection {
  id: string
  school_id: string | null
  name: string
  description: string | null
  instrument: string
  difficulty_level: string
  genre: string | null
  tags: string[]
  cover_image_url: string | null
  is_template: boolean
  curation_status: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface RepertoireCollectionItem {
  id: string
  collection_id: string
  repertoire_id: string
  sort_order: number
  notes: string | null
  created_at: string
}

// CRUD Coleções
export async function getCollections(
  filters: { instrument?: string; genre?: string; search?: string } = {}
): Promise<RepertoireCollection[]> {
  let query = db
    .from('repertoire_collections')
    .select('*')
    .order('sort_order', { ascending: true })

  if (filters.instrument) query = query.eq('instrument', filters.instrument)
  if (filters.genre) query = query.eq('genre', filters.genre)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) handleError(error)
  return data ?? []
}

export async function getCollectionById(id: string): Promise<RepertoireCollection | null> {
  const { data, error } = await db
    .from('repertoire_collections')
    .select('*')
    .eq('id', id)
    .single()

  if (error) handleError(error)
  return data
}

export async function createCollection(
  collection: Omit<RepertoireCollection, 'id' | 'created_at' | 'updated_at'>
): Promise<RepertoireCollection> {
  const { data, error } = await db
    .from('repertoire_collections')
    .insert(collection)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateCollection(
  id: string,
  updates: Partial<RepertoireCollection>
): Promise<RepertoireCollection> {
  const { data, error } = await db
    .from('repertoire_collections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await db
    .from('repertoire_collections')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
}

// CRUD Itens
export async function getCollectionItems(
  collectionId: string
): Promise<(RepertoireCollectionItem & { repertoire: any })[]> {
  const { data, error } = await db
    .from('repertoire_collection_items')
    .select('*, repertoire(*)')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true })

  if (error) handleError(error)
  return data ?? []
}

export async function createDraftMaterialFromNotebook(
  collection: RepertoireCollection,
  schoolId: string,
  options?: {
    coverTemplate?: CoverTemplate
    coverImageUrl?: string | null
  }
): Promise<{ materialId: string; skippedMissingSongs: number }> {
  const items = await getCollectionItems(collection.id)
  const assembled = buildNotebookMaterialBlocks({
    title: collection.name,
    coverTemplate: options?.coverTemplate ?? coverTemplateFromTags(collection.tags),
    coverImageUrl: options?.coverImageUrl ?? collection.cover_image_url,
    songs: items.map((item) => item.repertoire ?? null),
  })

  if (assembled.includedSongs === 0) {
    throw new Error('Adicione pelo menos uma música.')
  }

  const materialId = await createDraftMaterialWithBlocks({
    schoolId,
    title: collection.name,
    type: 'repertoire_sheet',
    blocks: assembled.blocks,
    instrument: collection.instrument,
    level: collection.difficulty_level,
    description: collection.description,
    generationConfig: {
      source: 'repertoire_collection',
      collection_id: collection.id,
    },
  })

  return {
    materialId,
    skippedMissingSongs: assembled.skippedMissingSongs,
  }
}

export async function addItemToCollection(
  collectionId: string,
  repertoireId: string,
  notes?: string
): Promise<RepertoireCollectionItem> {
  // Pegar o maior sort_order atual
  const { data: existing } = await db
    .from('repertoire_collection_items')
    .select('sort_order')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order || 0) + 1

  const { data, error } = await db
    .from('repertoire_collection_items')
    .insert({
      collection_id: collectionId,
      repertoire_id: repertoireId,
      sort_order: nextOrder,
      notes,
    })
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateCollectionItemNotes(
  itemId: string,
  notes: string
): Promise<RepertoireCollectionItem> {
  const { data, error } = await db
    .from('repertoire_collection_items')
    .update({ notes })
    .eq('id', itemId)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function removeItemFromCollection(itemId: string): Promise<void> {
  const { error } = await db
    .from('repertoire_collection_items')
    .delete()
    .eq('id', itemId)

  if (error) handleError(error)
}

export async function reorderCollectionItems(
  collectionId: string,
  itemIds: string[]
): Promise<void> {
  // Atualizar sort_order de cada item
  for (let i = 0; i < itemIds.length; i++) {
    const { error } = await db
      .from('repertoire_collection_items')
      .update({ sort_order: i + 1 })
      .eq('id', itemIds[i])
      .eq('collection_id', collectionId)

    if (error) handleError(error)
  }
}
