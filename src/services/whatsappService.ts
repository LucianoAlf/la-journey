import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type WhatsappMessage = Tables<'whatsapp_messages'>
export type WhatsappTemplate = Tables<'whatsapp_templates'>

export async function getMessages(studentId?: string) {
  let query = supabase
    .from('whatsapp_messages')
    .select('*')

  if (studentId) query = query.eq('related_student_id', studentId)

  const { data, error } = await query.order('sent_at', { ascending: false })
  if (error) handleError(error)
  return data
}

export async function getTemplates() {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .order('name')

  if (error) handleError(error)
  return data
}

export async function createTemplate(template: TablesInsert<'whatsapp_templates'>) {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .insert(template)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateTemplate(id: string, updates: TablesUpdate<'whatsapp_templates'>) {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}
