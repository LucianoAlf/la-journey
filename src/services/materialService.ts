import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Json, Tables } from '@/lib/database.types'

export type GeneratedMaterial = Tables<'generated_materials'>
export type MaterialBlockRow = Tables<'material_blocks'>

type GeneratedMaterialInsertInput = Partial<GeneratedMaterial> & {
  school_id: string
  title: string
}

type MaterialBlockInsertInput = {
  material_id: string
  block_type: MaterialBlockRow['block_type']
  title?: string | null
  content?: Json | null
  render_data?: Json | null
  sort_order?: number | null
  is_edited?: boolean | null
  original_content?: Json | null
}

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
  page_config: Record<string, unknown> | null
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

export interface MaterialTemplateListItem {
  id: string
  title: string
  type: GeneratedMaterial['type']
  format: GeneratedMaterial['format']
  school_id: string
  status: GeneratedMaterial['status']
  template_instrument: string | null
  template_level: string | null
  template_description: string | null
  template_cover_url: string | null
  block_count: number
}

export interface MaterialTemplateDetail {
  material: GeneratedMaterial
  blocks: MaterialBlockRow[]
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
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

export async function listMaterialTemplates(schoolId?: string): Promise<MaterialTemplateListItem[]> {
  let query = supabase
    .from('generated_materials')
    .select(`
      id,
      title,
      type,
      format,
      school_id,
      status,
      template_instrument,
      template_level,
      template_description,
      template_cover_url,
      is_template
    `)
    .eq('is_template', true)
    .order('title')

  if (schoolId) {
    query = query.or(`school_id.is.null,school_id.eq.${schoolId}`)
  }

  const { data, error } = await query
  if (error) handleError(error)

  const templates = (data ?? []) as GeneratedMaterial[]
  const templateIds = templates.map((template) => template.id)

  if (templateIds.length === 0) return []

  const countMap = new Map<string, number>()
  for (const ids of chunkArray(templateIds, 200)) {
    const { data: blocks, error: blocksError } = await supabase
      .from('material_blocks')
      .select('material_id')
      .in('material_id', ids)

    if (blocksError) handleError(blocksError)

    for (const block of ((blocks ?? []) as Array<{ material_id: string }>)) {
      const materialId = block.material_id
      countMap.set(materialId, (countMap.get(materialId) ?? 0) + 1)
    }
  }

  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    type: template.type,
    format: template.format,
    school_id: template.school_id,
    status: template.status,
    template_instrument: template.template_instrument,
    template_level: template.template_level,
    template_description: template.template_description,
    template_cover_url: template.template_cover_url,
    block_count: countMap.get(template.id) ?? 0,
  }))
}

export async function getMaterialTemplateDetail(templateId: string): Promise<MaterialTemplateDetail> {
  const { data: material, error: materialError } = await supabase
    .from('generated_materials')
    .select('*')
    .eq('id', templateId)
    .eq('is_template', true)
    .single()

  if (materialError) handleError(materialError)

  const { data: blocks, error: blocksError } = await supabase
    .from('material_blocks')
    .select('*')
    .eq('material_id', templateId)
    .order('sort_order')

  if (blocksError) handleError(blocksError)

  return {
    material: material as GeneratedMaterial,
    blocks: (blocks ?? []) as MaterialBlockRow[],
  }
}

export async function cloneMaterialFromTemplate(params: {
  templateId: string
  schoolId: string
  title: string
}): Promise<string> {
  const { material: template, blocks } = await getMaterialTemplateDetail(params.templateId)

  const materialInsert: GeneratedMaterialInsertInput = {
    school_id: params.schoolId,
    title: params.title,
    type: template.type,
    format: template.format,
    page_config: template.page_config,
    page_count: blocks.length,
    status: 'ready',
    is_draft: true,
    is_template: false,
    version: 1,
    generation_config: null,
    template_cover_url: null,
    template_description: null,
    template_instrument: null,
    template_level: null,
    journey_id: null,
    stage_id: null,
    station_id: null,
  }

  const { data: newMaterial, error: newMaterialError } = await (supabase
    .from('generated_materials') as any)
    .insert(materialInsert)
    .select('id')
    .single()

  if (newMaterialError) handleError(newMaterialError)
  const createdMaterial = newMaterial as { id: string } | null
  if (!createdMaterial?.id) throw new Error('Não foi possível criar o material a partir do template')

  if (blocks.length > 0) {
    const clonedBlocks: MaterialBlockInsertInput[] = blocks.map((block) => ({
      material_id: createdMaterial.id,
      block_type: block.block_type,
      title: block.title,
      content: block.content,
      render_data: block.render_data,
      sort_order: block.sort_order,
      is_edited: false,
      original_content: null,
    }))

    const { error: blocksInsertError } = await (supabase
      .from('material_blocks') as any)
      .insert(clonedBlocks)

    if (blocksInsertError) handleError(blocksInsertError)
  }

  return createdMaterial.id
}

// --- Funções diretas (complementares) ---

export async function updateMaterial(id: string, updates: Partial<GeneratedMaterial>) {
  const { data, error } = await (supabase
    .from('generated_materials') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}
