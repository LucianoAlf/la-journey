import { useAsync } from './useAsync'
import { getClasses, getClassById, getClassStudents } from '@/services/classService'

export function useClasses() {
  return useAsync(() => getClasses(), [])
}

export function useClass(id: string | undefined) {
  return useAsync(() => {
    if (!id) return Promise.resolve(null)
    return getClassById(id)
  }, [id])
}

export function useClassStudents(classId: string | undefined) {
  return useAsync(() => {
    if (!classId) return Promise.resolve(null)
    return getClassStudents(classId)
  }, [classId])
}
