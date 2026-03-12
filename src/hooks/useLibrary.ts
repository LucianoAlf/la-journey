import { useAsync } from './useAsync'
import { getChords, getScales } from '@/services/libraryService'
import type { Database } from '@/lib/database.types'

export function useChords(instrument?: Database['public']['Enums']['chord_instrument']) {
  return useAsync(() => getChords(instrument), [instrument])
}

export function useScales() {
  return useAsync(() => getScales(), [])
}
