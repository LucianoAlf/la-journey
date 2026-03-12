import { useAsync } from './useAsync'
import { getNotations } from '@/services/notationService'

export function useNotations() {
  return useAsync(() => getNotations(), [])
}
