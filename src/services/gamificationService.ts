import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'

export interface DashboardStats {
  totalStudents: number
  totalClasses: number
  totalJourneys: number
  totalAchievements: number
  totalMaterials: number
}

export async function getStats(): Promise<DashboardStats> {
  const [studentsRes, classesRes, journeysRes, achievementsRes, materialsRes] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('journeys').select('id', { count: 'exact', head: true }),
    supabase.from('achievements').select('id', { count: 'exact', head: true }),
    supabase.from('generated_materials').select('id', { count: 'exact', head: true }),
  ])

  return {
    totalStudents: studentsRes.count ?? 0,
    totalClasses: classesRes.count ?? 0,
    totalJourneys: journeysRes.count ?? 0,
    totalAchievements: achievementsRes.count ?? 0,
    totalMaterials: materialsRes.count ?? 0,
  }
}
