import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type StudentProgress = Tables<'student_progress'>
export type LessonLog = Tables<'lesson_logs'>

export async function getStudentProgress(studentId?: string) {
  let query = supabase
    .from('student_progress')
    .select('*')

  if (studentId) query = query.eq('student_id', studentId)

  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) handleError(error)
  return data
}

export async function updateProgress(id: string, updates: TablesUpdate<'student_progress'>) {
  const { data, error } = await supabase
    .from('student_progress')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function getLessonLogs(filters?: {
  studentId?: string
  classId?: string
  teacherId?: string
  date?: string
}) {
  let query = supabase
    .from('lesson_logs')
    .select('*')

  if (filters?.studentId) query = query.eq('student_id', filters.studentId)
  if (filters?.classId) query = query.eq('class_id', filters.classId)
  if (filters?.teacherId) query = query.eq('teacher_id', filters.teacherId)
  if (filters?.date) query = query.eq('date', filters.date)

  const { data, error } = await query.order('date', { ascending: false })
  if (error) handleError(error)
  return data
}

export async function createLessonLog(log: TablesInsert<'lesson_logs'>) {
  const { data, error } = await supabase
    .from('lesson_logs')
    .insert(log)
    .select()
    .single()

  if (error) handleError(error)
  return data
}
