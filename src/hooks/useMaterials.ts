import { useAsync } from './useAsync'
import { listMaterials, getMaterialWithBlocks } from '@/services/materialService'
import type { MaterialListItem, MaterialWithBlocks } from '@/services/materialService'

export function useMaterials(schoolId?: string) {
  return useAsync<MaterialListItem[]>(() => listMaterials(schoolId), [schoolId])
}

export function useMaterialWithBlocks(materialId: string | undefined) {
  return useAsync<MaterialWithBlocks[] | null>(() => {
    if (!materialId) return Promise.resolve(null)
    return getMaterialWithBlocks(materialId)
  }, [materialId])
}
