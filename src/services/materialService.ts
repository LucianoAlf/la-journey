import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesUpdate } from '@/lib/database.types'

export type GeneratedMaterial = Tables<'generated_materials'>
export type MaterialBlockRow = Tables<'material_blocks'>

// --- Tipos para as RPCs ---

export interface SaveMaterialBlock {
  block_type: string
  title?: string | null
  content?: Record<string, unknown> | null
  render_data?: Record<string, unknown> | null
  sort_order: number
}

export interface MaterialWithBlocks {
  material_id: string
  material_title: string
  material_type: string | null
  material_status: string | null
  is_draft: boolean | null
  version: number | null
  journey_name: string | null
  stage_name: string | null
  station_name: string | null
  school_name: string | null
  generation_config: Record<string, unknown> | null
  generated_at: string | null
  // Campos do bloco (cada row = 1 bloco)
  block_id: string | null
  block_type: string | null
  block_title: string | null
  block_content: Record<string, unknown> | null
  block_render_data: Record<string, unknown> | null
  block_sort_order: number | null
  block_is_edited: boolean | null
  block_original_content: Record<string, unknown> | null
}

export interface MaterialListItem {
  id: string
  title: string
  type: string | null
  status: string | null
  is_draft: boolean | null
  version: number | null
  block_count: number
  journey_name: string | null
  stage_name: string | null
  station_name: string | null
  created_at: string | null
  updated_at: string | null
}

// --- RPC 1: Salvar material gerado ---

export async function saveGeneratedMaterial(params: {
  schoolId: string
  journeyId: string
  stageId: string
  stationId: string
  title: string
  type: string
  generationConfig: Record<string, unknown>
  blocks: SaveMaterialBlock[]
}): Promise<string> {
  const { data, error } = await (supabase.rpc as any)('save_generated_material', {
    p_school_id: params.schoolId,
    p_journey_id: params.journeyId,
    p_stage_id: params.stageId,
    p_station_id: params.stationId,
    p_title: params.title,
    p_type: params.type,
    p_generation_config: params.generationConfig,
    p_blocks: params.blocks,
  })

  if (error) handleError(error)
  return data as string
}

// --- RPC 2: Carregar material com blocos ---

export async function getMaterialWithBlocks(materialId: string): Promise<MaterialWithBlocks[]> {
  const { data, error } = await (supabase.rpc as any)('get_material_with_blocks', {
    p_material_id: materialId,
  })

  if (error) handleError(error)
  return (data ?? []) as MaterialWithBlocks[]
}

// --- RPC 3: Atualizar bloco individual ---

export async function updateMaterialBlockRpc(params: {
  blockId: string
  title?: string | null
  content?: Record<string, unknown> | null
  renderData?: Record<string, unknown> | null
}): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('update_material_block', {
    p_block_id: params.blockId,
    p_title: params.title ?? null,
    p_content: params.content ?? null,
    p_render_data: params.renderData ?? null,
  })

  if (error) handleError(error)
  return data as boolean
}

// --- RPC 4: Reordenar blocos ---

export async function reorderMaterialBlocks(
  materialId: string,
  blockIds: string[],
): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('reorder_material_blocks', {
    p_material_id: materialId,
    p_block_ids: blockIds,
  })

  if (error) handleError(error)
  return data as boolean
}

// --- RPC 5: Adicionar bloco ---

export async function addMaterialBlock(params: {
  materialId: string
  blockType: string
  title?: string | null
  content?: Record<string, unknown> | null
  renderData?: Record<string, unknown> | null
  afterOrder?: number | null
}): Promise<string> {
  const { data, error } = await (supabase.rpc as any)('add_material_block', {
    p_material_id: params.materialId,
    p_block_type: params.blockType,
    p_title: params.title ?? null,
    p_content: params.content ?? null,
    p_render_data: params.renderData ?? null,
    p_after_order: params.afterOrder ?? null,
  })

  if (error) handleError(error)
  return data as string
}

// --- RPC 6: Deletar bloco ---

export async function deleteMaterialBlock(blockId: string): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('delete_material_block', {
    p_block_id: blockId,
  })

  if (error) handleError(error)
  return data as boolean
}

// --- RPC 7: Listar materiais ---

export async function listMaterials(schoolId?: string): Promise<MaterialListItem[]> {
  const { data, error } = await (supabase.rpc as any)('list_materials', {
    p_school_id: schoolId ?? null,
  })

  if (error) handleError(error)
  return (data ?? []) as MaterialListItem[]
}

// --- Funções diretas (complementares) ---

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
