import { useAsync } from './useAsync'
import { getStudentProgress, getLessonLogs } from '@/services/progressService'

export function useStudentProgress(studentId?: string) {
  return useAsync(() => getStudentProgress(studentId), [studentId])
}

export function useLessonLogs(filters?: {
  studentId?: string
  classId?: string
  teacherId?: string
  date?: string
}) {
  return useAsync(
    () => getLessonLogs(filters),
    [filters?.studentId, filters?.classId, filters?.teacherId, filters?.date]
  )
}
