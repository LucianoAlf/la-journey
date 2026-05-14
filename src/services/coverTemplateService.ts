import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert } from '@/lib/database.types'

export type SchoolCoverTemplate = Tables<'school_cover_templates'>
export type CreateSchoolCoverTemplatePayload = TablesInsert<'school_cover_templates'>

export async function listSchoolCoverTemplates(schoolId: string): Promise<SchoolCoverTemplate[]> {
  const { data, error } = await supabase
    .from('school_cover_templates')
    .select('*')
    .eq('school_id', schoolId)
    .order('updated_at', { ascending: false })

  if (error) handleError(error)
  return data ?? []
}

export async function createSchoolCoverTemplate(payload: CreateSchoolCoverTemplatePayload): Promise<SchoolCoverTemplate> {
  const { data, error } = await supabase
    .from('school_cover_templates')
    .insert(payload)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function deleteSchoolCoverTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('school_cover_templates')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
}
