import { useAsync } from './useAsync'
import { getStudents, getStudentById } from '@/services/studentService'

export function useStudents() {
  return useAsync(() => getStudents(), [])
}

export function useStudent(id: string | undefined) {
  return useAsync(() => {
    if (!id) return Promise.resolve(null)
    return getStudentById(id)
  }, [id])
}
