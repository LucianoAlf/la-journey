import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type GeneratedMaterial = Tables<'generated_materials'>
export type MaterialBlock = Tables<'material_blocks'>

export async function getMaterials() {
  const { data, error } = await supabase
    .from('generated_materials')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) handleError(error)
  return data
}

export async function getMaterialById(id: string) {
  const { data, error } = await supabase
    .from('generated_materials')
    .select('*')
    .eq('id', id)
    .single()

  if (error) handleError(error)
  return data
}

export async function createMaterial(material: TablesInsert<'generated_materials'>) {
  const { data, error } = await supabase
    .from('generated_materials')
    .insert(material)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateMaterial(id: string, updates: TablesUpdate<'generated_materials'>) {
  const { data, error } = await supabase
    .from('generated_materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function getMaterialBlocks(materialId: string) {
  const { data, error } = await supabase
    .from('material_blocks')
    .select('*')
    .eq('material_id', materialId)
    .order('sort_order')

  if (error) handleError(error)
  return data
}

export async function createMaterialBlock(block: TablesInsert<'material_blocks'>) {
  const { data, error } = await supabase
    .from('material_blocks')
    .insert(block)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateMaterialBlock(id: string, updates: TablesUpdate<'material_blocks'>) {
  const { data, error } = await supabase
    .from('material_blocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function reorderBlocks(blocks: { id: string; sort_order: number }[]) {
  const promises = blocks.map(({ id, sort_order }) =>
    supabase
      .from('material_blocks')
      .update({ sort_order })
      .eq('id', id)
  )

  const results = await Promise.all(promises)
  const failed = results.find(r => r.error)
  if (failed?.error) handleError(failed.error)
}
