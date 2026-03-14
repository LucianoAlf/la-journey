import { useAsync } from './useAsync'
import { getNotations, getTablatures } from '@/services/notationService'

export function useNotations() {
  return useAsync(() => getNotations(), [])
}

export function useTablatures() {
  return useAsync(() => getTablatures(), [])
}
