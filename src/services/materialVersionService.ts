import { supabase } from '@/lib/supabase'

export interface MaterialVersion {
  id: string
  material_id: string
  version_number: number
  label: string | null
  snapshot: {
    blocks: any[]
    page_config: any
  }
  created_by: string | null
  created_at: string
}

export async function saveVersion(
  materialId: string,
  schoolId: string,
  blocks: any[],
  pageConfig: any,
  label?: string,
): Promise<MaterialVersion> {
  // Buscar próximo version_number (tabela não está nos types gerados — usar cast)
  const { data: latest } = await (supabase as any)
    .from('material_versions')
    .select('version_number')
    .eq('material_id', materialId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = ((latest as any)?.version_number || 0) + 1

  const { data, error } = await (supabase as any)
    .from('material_versions')
    .insert({
      material_id: materialId,
      school_id: schoolId,
      version_number: nextVersion,
      label: label || `Versão ${nextVersion}`,
      snapshot: { blocks, page_config: pageConfig },
    })
    .select()
    .single()

  if (error) throw error
  return data as MaterialVersion
}

export async function listVersions(materialId: string): Promise<MaterialVersion[]> {
  const { data, error } = await (supabase as any)
    .from('material_versions')
    .select('*')
    .eq('material_id', materialId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return (data || []) as MaterialVersion[]
}

export async function deleteVersion(versionId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('material_versions')
    .delete()
    .eq('id', versionId)
  if (error) throw error
}
