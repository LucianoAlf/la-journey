import { useState, useEffect, useCallback } from 'react'
import { getChordsPaginated, getChordsCount, getScales } from '@/services/libraryService'
import type { Chord } from '@/services/libraryService'
import type { Database } from '@/lib/database.types'
import { useAsync } from './useAsync'

type ChordInstrument = Database['public']['Enums']['chord_instrument']

interface UseChordsPaginatedOpts {
  instrument?: ChordInstrument
  search?: string
  difficulty?: number
  tag?: string
  pageSize?: number
}

interface UseChordsPaginatedReturn {
  data: Chord[]
  loading: boolean
  error: string | null
  count: number
  page: number
  pageSize: number
  totalPages: number
  setPage: (p: number) => void
  refetch: () => void
}

export function useChords(instrument?: ChordInstrument, opts?: Omit<UseChordsPaginatedOpts, 'instrument'>): UseChordsPaginatedReturn {
  const pageSize = opts?.pageSize ?? 60
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Chord[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  // Reset página quando filtros mudam
  useEffect(() => { setPage(0) }, [instrument, opts?.search, opts?.difficulty, opts?.tag])

  const refetch = useCallback(() => setFetchKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getChordsPaginated({
      instrument,
      search: opts?.search,
      difficulty: opts?.difficulty,
      tag: opts?.tag,
      page,
      pageSize,
    })
      .then(result => {
        if (cancelled) return
        setData(result.data)
        setCount(result.count)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar acordes')
        setData([])
        setCount(0)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [instrument, opts?.search, opts?.difficulty, opts?.tag, page, pageSize, fetchKey])

  return {
    data,
    loading,
    error,
    count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
    setPage,
    refetch,
  }
}

export function useScales() {
  return useAsync(() => getScales(), [])
}
