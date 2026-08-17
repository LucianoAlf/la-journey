import type { EstudoDisplayMode } from '@/lib/estudoConfig'
import { estudoToJson, needsEstudoBackfill, parseEstudo } from '@/lib/estudoConfig'
import { parsePlayalong, playalongPathFromPublicUrl } from '@/lib/playalong'
import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import { updateMaterial } from './materialService'
import { removePlayalongObject } from './playalongUpload'

export type EstudoListItem = {
  id: string
  title: string
  created_at: string | null
  updated_at: string | null
  curatorName: string | null
  displayMode: EstudoDisplayMode
}

type CatalogRow = {
  id: string
  title: string
  page_config: Record<string, unknown> | null
  journey_id: string | null
  station_id: string | null
  created_at: string | null
  updated_at: string | null
}

export async function fetchCurrentUserName(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getUser()
  const user = sessionData.user
  if (!user) return null
  const { data } = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
  const name = typeof data?.name === 'string' ? data.name.trim() : ''
  return name || user.email || null
}

function toListItem(row: CatalogRow): EstudoListItem | null {
  const estudo = parseEstudo(row.page_config?.estudo)
  if (!estudo) return null
  return {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
    curatorName: estudo.curatorName,
    displayMode: estudo.displayMode,
  }
}

async function loadCatalogRows(schoolId: string): Promise<CatalogRow[]> {
  const { data, error } = await supabase
    .from('generated_materials')
    .select('id, title, page_config, journey_id, station_id, created_at, updated_at')
    .eq('school_id', schoolId)
    .is('journey_id', null)
    .is('station_id', null)
    .order('updated_at', { ascending: false })
  if (error) handleError(error)
  return (data ?? []) as CatalogRow[]
}

async function backfillRow(row: CatalogRow): Promise<CatalogRow> {
  const existing = (row.page_config ?? {}) as Record<string, unknown>
  const next = {
    ...existing,
    estudo: estudoToJson({
      origin: 'from-mp3',
      displayMode: 'slash-beat',
      curatorName: null,
    }),
  }
  await updateMaterial(row.id, { page_config: next as never })
  return { ...row, page_config: next }
}

export async function listEstudoMaterials(schoolId: string): Promise<EstudoListItem[]> {
  const rows = await loadCatalogRows(schoolId)
  const items: EstudoListItem[] = []
  for (const row of rows) {
    let current = row
    if (needsEstudoBackfill(row)) {
      current = await backfillRow(row)
    }
    const item = toListItem(current)
    if (item) items.push(item)
  }
  return items
}

export async function deleteEstudoMaterial(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('generated_materials')
    .select('id, page_config')
    .eq('id', id)
    .single()
  if (error) handleError(error)
  const pageConfig = (data?.page_config ?? {}) as Record<string, unknown>
  if (!parseEstudo(pageConfig.estudo)) {
    throw new Error('Esta faixa não é da sala de Estudo')
  }
  const playalong = parsePlayalong(pageConfig.playalong)
  const path = playalong ? playalongPathFromPublicUrl(playalong.audioUrl) : null
  if (path) {
    try {
      await removePlayalongObject(path)
    } catch (err) {
      console.warn('playalong storage remove failed', err)
    }
  }
  const { error: blockError } = await supabase.from('material_blocks').delete().eq('material_id', id)
  if (blockError) handleError(blockError)
  const { error: materialError } = await supabase.from('generated_materials').delete().eq('id', id)
  if (materialError) handleError(materialError)
}
