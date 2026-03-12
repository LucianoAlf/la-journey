import { useAsync } from './useAsync'
import { getAchievements, getStudentAchievements } from '@/services/achievementService'

export function useAchievements() {
  return useAsync(() => getAchievements(), [])
}

export function useStudentAchievements(studentId: string | undefined) {
  return useAsync(() => {
    if (!studentId) return Promise.resolve(null)
    return getStudentAchievements(studentId)
  }, [studentId])
}
