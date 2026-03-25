import { useState, useEffect, useCallback } from 'react'
import {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  duplicateExercise,
  getExerciseCounts,
  type ExerciseLibraryItem,
  type ExerciseLibraryFilters,
} from '@/services/exerciseLibraryService'
import { toast } from 'sonner'

export function useExerciseLibrary(filters: ExerciseLibraryFilters = {}) {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchExercises = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getExercises(filters, page)
      setExercises(result.data)
      setCount(result.count)
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao buscar exercícios:', err)
    } finally {
      setLoading(false)
    }
  }, [
    filters.content_type,
    filters.category,
    filters.instrument,
    filters.difficulty_level,
    filters.search,
    filters.is_template,
    filters.curation_status,
    page,
  ])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  const handleCreate = async (exercise: Parameters<typeof createExercise>[0]) => {
    try {
      const created = await createExercise(exercise)
      toast.success('Exercício criado!')
      await fetchExercises()
      return created
    } catch (err: any) {
      toast.error('Erro ao criar exercício')
      throw err
    }
  }

  const handleUpdate = async (id: string, updates: Partial<ExerciseLibraryItem>) => {
    try {
      const updated = await updateExercise(id, updates)
      toast.success('Exercício atualizado!')
      await fetchExercises()
      return updated
    } catch (err: any) {
      toast.error('Erro ao atualizar exercício')
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExercise(id)
      toast.success('Exercício removido!')
      await fetchExercises()
    } catch (err: any) {
      toast.error('Erro ao remover exercício')
      throw err
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await duplicateExercise(id)
      toast.success('Exercício duplicado!')
      await fetchExercises()
      return duplicated
    } catch (err: any) {
      toast.error('Erro ao duplicar exercício')
      throw err
    }
  }

  return {
    exercises,
    count,
    loading,
    error,
    page,
    setPage,
    refetch: fetchExercises,
    create: handleCreate,
    update: handleUpdate,
    remove: handleDelete,
    duplicate: handleDuplicate,
  }
}

export function useExerciseCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getExerciseCounts()
      .then(setCounts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { counts, loading }
}
