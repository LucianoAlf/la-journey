import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSchool } from '@/hooks/useSchool'
import {
  createExerciseCollection,
  deleteExerciseCollection,
  getExerciseCollections,
  updateExerciseCollection,
  type ExerciseCollection,
} from '@/services/exerciseCollectionService'

export interface ExerciseCollectionFilters {
  instrument?: string | null
  search?: string | null
}

export function useExerciseCollections(filters: ExerciseCollectionFilters = {}) {
  const { data: school, loading: schoolLoading } = useSchool()
  const [collections, setCollections] = useState<ExerciseCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const normalizedFilters = useMemo(() => ({
    instrument: filters.instrument && filters.instrument !== 'all' ? filters.instrument : undefined,
    search: filters.search?.trim() || undefined,
  }), [filters.instrument, filters.search])

  const fetchCollections = useCallback(async () => {
    if (schoolLoading) return

    setLoading(true)
    setError(null)

    try {
      const data = await getExerciseCollections(normalizedFilters)
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
    payload: Omit<ExerciseCollection, 'id' | 'created_at' | 'updated_at' | 'school_id'>,
  ) => {
    if (!school?.id) {
      const err = new Error('Escola não identificada')
      toast.error(err.message)
      throw err
    }

    try {
      const created = await createExerciseCollection({
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

  const handleUpdate = async (id: string, updates: Partial<ExerciseCollection>) => {
    try {
      const updated = await updateExerciseCollection(id, updates)
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
      await deleteExerciseCollection(id)
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
