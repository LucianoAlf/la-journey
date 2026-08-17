import { listEstudoMaterials, type EstudoListItem } from '@/services/estudoCatalogService'
import { useAsync } from './useAsync'

export function useEstudoMaterials(schoolId?: string) {
  return useAsync<EstudoListItem[]>(() => {
    if (!schoolId) return Promise.resolve([])
    return listEstudoMaterials(schoolId)
  }, [schoolId])
}

export type { EstudoListItem }
