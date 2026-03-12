import { useAsync } from './useAsync'
import { getStats } from '@/services/gamificationService'

export function useStats() {
  return useAsync(() => getStats(), [])
}
