import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSchool } from '@/hooks/useSchool'
import {
  createCollection,
  deleteCollection,
  getCollections,
  updateCollection,
  type RepertoireCollection,
} from '@/services/repertoireCollectionService'

export interface RepertoireCollectionFilters {
  instrument?: string | null
  genre?: string | null
  search?: string | null
}

export function useRepertoireCollections(filters: RepertoireCollectionFilters = {}) {
  const { data: school, loading: schoolLoading } = useSchool()
  const [collections, setCollections] = useState<RepertoireCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const normalizedFilters = useMemo(() => ({
    instrument: filters.instrument && filters.instrument !== 'all' ? filters.instrument : undefined,
    genre: filters.genre && filters.genre !== 'all' ? filters.genre : undefined,
    search: filters.search?.trim() || undefined,
  }), [filters.genre, filters.instrument, filters.search])

  const fetchCollections = useCallback(async () => {
    if (schoolLoading) return

    setLoading(true)
    setError(null)

    try {
      const data = await getCollections(normalizedFilters)
      setCollections(data)
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar cadernos')
      console.error('Erro ao carregar cadernos:', err)
    } finally {
      setLoading(false)
    }
  }, [normalizedFilters, schoolLoading])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const handleCreate = async (
    payload: Omit<RepertoireCollection, 'id' | 'created_at' | 'updated_at' | 'school_id'>,
  ) => {
    if (!school?.id) {
      const err = new Error('Escola não identificada')
      toast.error(err.message)
      throw err
    }

    try {
      const created = await createCollection({
        ...payload,
        school_id: school.id,
      })
      toast.success('Caderno criado!')
      await fetchCollections()
      return created
    } catch (err: any) {
      toast.error('Erro ao criar caderno')
      throw err
    }
  }

  const handleUpdate = async (id: string, updates: Partial<RepertoireCollection>) => {
    try {
      const updated = await updateCollection(id, updates)
      toast.success('Caderno atualizado!')
      await fetchCollections()
      return updated
    } catch (err: any) {
      toast.error('Erro ao atualizar caderno')
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCollection(id)
      toast.success('Caderno removido!')
      await fetchCollections()
    } catch (err: any) {
      toast.error('Erro ao remover caderno')
      throw err
    }
  }

  return {
    collections,
    loading: loading || schoolLoading,
    error,
    school,
    refetch: fetchCollections,
    create: handleCreate,
    update: handleUpdate,
    remove: handleDelete,
  }
}
