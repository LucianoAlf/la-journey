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

// ─── Tablaturas (category = 'tablature' na notation_library) ────────

export interface TablatureLibraryRow {
  id: string
  name: string
  category: 'tablature'
  subcategory: string | null
  notation_data: { lines: string[]; label?: string; columns?: number }
  description: string | null
  difficulty: number
  tags: string[] | null
  school_id: string | null
  created_at: string | null
}

export async function getTablatures(): Promise<TablatureLibraryRow[]> {
  const res: any = await db
    .from('notation_library')
    .select('*')
    .eq('category', 'tablature')
    .order('created_at', { ascending: false })
  if (res.error) throw res.error
  return (res.data ?? []) as TablatureLibraryRow[]
}

export async function createTablature(tab: {
  name: string
  notation_data: { lines: string[]; label?: string; columns?: number }
  description?: string
  difficulty?: number
  tags?: string[]
  subcategory?: string
}): Promise<TablatureLibraryRow> {
  const res: any = await db
    .from('notation_library')
    .insert({
      name: tab.name,
      category: 'tablature',
      subcategory: tab.subcategory ?? null,
      clef: 'tab',
      key_signature: 'C',
      notation_data: tab.notation_data,
      description: tab.description ?? null,
      difficulty: tab.difficulty ?? 1,
      tags: tab.tags ?? [],
    })
    .select()
    .single()
  if (res.error) throw res.error
  return res.data as TablatureLibraryRow
}

export async function updateTablature(id: string, tab: Partial<{
  name: string
  notation_data: { lines: string[]; label?: string; columns?: number }
  description: string
  difficulty: number
  tags: string[]
  subcategory: string
}>): Promise<TablatureLibraryRow> {
  const res: any = await db
    .from('notation_library')
    .update(tab)
    .eq('id', id)
    .select()
    .single()
  if (res.error) throw res.error
  return res.data as TablatureLibraryRow
}

export async function deleteTablature(id: string): Promise<void> {
  const res: any = await db.from('notation_library').delete().eq('id', id)
  if (res.error) throw res.error
}
