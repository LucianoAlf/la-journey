import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type Class = Tables<'classes'>
export type ClassStudent = Tables<'class_students'>

export async function getClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('name')

  if (error) handleError(error)
  return data
}

export async function getClassById(id: string) {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) handleError(error)
  return data
}

export async function createClass(classData: TablesInsert<'classes'>) {
  const { data, error } = await supabase
    .from('classes')
    .insert(classData)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateClass(id: string, updates: TablesUpdate<'classes'>) {
  const { data, error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function deleteClass(id: string) {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
}

export async function getClassStudents(classId: string) {
  const { data, error } = await supabase
    .from('class_students')
    .select('*, student:students!class_students_student_id_fkey(*)')
    .eq('class_id', classId)
    .eq('is_active', true)

  if (error) handleError(error)
  return data
}

export async function enrollStudent(classId: string, studentId: string) {
  const { data, error } = await supabase
    .from('class_students')
    .insert({ class_id: classId, student_id: studentId })
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function unenrollStudent(id: string) {
  const { error } = await supabase
    .from('class_students')
    .update({ is_active: false })
    .eq('id', id)

  if (error) handleError(error)
}
