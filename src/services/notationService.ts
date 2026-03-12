import { supabase } from '@/lib/supabase'

// Tipo manual (notation_library ainda não está nos types gerados)
export interface NotationLibraryRow {
  id: string
  name: string
  category: string
  subcategory: string | null
  clef: string
  key_signature: string
  time_signature: string | null
  notation_data: any
  render_data: any | null
  description: string | null
  difficulty: number
  tags: string[] | null
  sort_order: number | null
  school_id: string | null
  created_at: string | null
}

export interface NotationInsert {
  name: string
  category: string
  subcategory?: string | null
  clef: string
  key_signature: string
  time_signature?: string | null
  notation_data: any
  description?: string | null
  difficulty: number
  tags?: string[] | null
  sort_order?: number | null
}

// notation_library ainda não está nos types gerados — usar client sem tipagem
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase

export async function getNotations(): Promise<NotationLibraryRow[]> {
  const res: any = await db.from('notation_library').select('*').order('sort_order', { ascending: true })
  if (res.error) throw res.error
  return (res.data ?? []) as NotationLibraryRow[]
}

export async function createNotation(notation: NotationInsert): Promise<NotationLibraryRow> {
  const res: any = await db.from('notation_library').insert(notation).select().single()
  if (res.error) throw res.error
  return res.data as NotationLibraryRow
}

export async function updateNotation(id: string, notation: Partial<NotationInsert>): Promise<NotationLibraryRow> {
  const res: any = await db.from('notation_library').update(notation).eq('id', id).select().single()
  if (res.error) throw res.error
  return res.data as NotationLibraryRow
}

export async function deleteNotation(id: string): Promise<void> {
  const res: any = await db.from('notation_library').delete().eq('id', id)
  if (res.error) throw res.error
}
