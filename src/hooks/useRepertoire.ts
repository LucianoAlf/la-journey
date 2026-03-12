import { useAsync } from './useAsync'
import { getRepertoire } from '@/services/repertoireService'

export function useRepertoire(filters?: {
  difficulty?: number
  genre?: string
}) {
  return useAsync(
    () => getRepertoire(filters),
    [filters?.difficulty, filters?.genre]
  )
}
