import { useAsync } from './useAsync'
import { getMaterials, getMaterialById, getMaterialBlocks } from '@/services/materialService'

export function useMaterials() {
  return useAsync(() => getMaterials(), [])
}

export function useMaterial(id: string | undefined) {
  return useAsync(() => {
    if (!id) return Promise.resolve(null)
    return getMaterialById(id)
  }, [id])
}

export function useMaterialBlocks(materialId: string | undefined) {
  return useAsync(() => {
    if (!materialId) return Promise.resolve(null)
    return getMaterialBlocks(materialId)
  }, [materialId])
}
