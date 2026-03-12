import { useAsync } from './useAsync'
import { getSchool } from '@/services/schoolService'

export function useSchool() {
  return useAsync(() => getSchool(), [])
}
