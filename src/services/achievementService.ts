import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert } from '@/lib/database.types'

export type Achievement = Tables<'achievements'>
export type StudentAchievement = Tables<'student_achievements'>

export async function getAchievements() {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('name')

  if (error) handleError(error)
  return data
}

export async function createAchievement(achievement: TablesInsert<'achievements'>) {
  const { data, error } = await supabase
    .from('achievements')
    .insert(achievement)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function getStudentAchievements(studentId: string) {
  const { data, error } = await supabase
    .from('student_achievements')
    .select('*, achievement:achievements!student_achievements_achievement_id_fkey(*)')
    .eq('student_id', studentId)
    .order('unlocked_at', { ascending: false })

  if (error) handleError(error)
  return data
}

export async function unlockAchievement(unlock: TablesInsert<'student_achievements'>) {
  const { data, error } = await supabase
    .from('student_achievements')
    .insert(unlock)
    .select('*, achievement:achievements!student_achievements_achievement_id_fkey(*)')
    .single()

  if (error) handleError(error)
  return data
}
