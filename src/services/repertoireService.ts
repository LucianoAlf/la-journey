import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/lib/database.types'

export type Repertoire = Tables<'repertoire'>

export async function getRepertoire(filters?: {
  difficulty?: number
  genre?: string
}) {
  let query = supabase
    .from('repertoire')
    .select('*')
    .order('title')

  if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty)
  if (filters?.genre) query = query.eq('genre', filters.genre)

  const { data, error } = await query
  if (error) handleError(error)
  return data
}

export async function createSong(song: TablesInsert<'repertoire'>) {
  const { data, error } = await supabase
    .from('repertoire')
    .insert(song)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateSong(id: string, updates: TablesUpdate<'repertoire'>) {
  const { data, error } = await supabase
    .from('repertoire')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function deleteSong(id: string) {
  const { error } = await supabase
    .from('repertoire')
    .delete()
    .eq('id', id)

  if (error) handleError(error)
}

// --- Cifra Club Integration ---

export interface CifraSearchResult {
  title: string
  artist: string
  url: string
  slug: string
}

export async function searchCifraClub(query: string): Promise<CifraSearchResult[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(`${supabaseUrl}/functions/v1/cifra-club-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ query }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || `Erro ${response.status} ao buscar`)
  }

  return result.results as CifraSearchResult[]
}

export interface CifraData {
  title: string
  artist: string
  key: string | null
  chords: string[]
  chord_structure: Record<string, string>
  difficulty: number
  genre: string | null
  youtube_url: string | null
  source_url: string
  cifra_content: string
  lyrics: string
}

export async function importFromCifraClub(url: string): Promise<CifraData> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(`${supabaseUrl}/functions/v1/cifra-club-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ url }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || `Erro ${response.status} ao importar`)
  }

  return result as CifraData
}

// --- Batch Import (múltiplas músicas de uma vez) ---

export interface BatchImportResult {
  url: string
  status: 'success' | 'error' | 'duplicate'
  title?: string
  artist?: string
  error?: string
  id?: string
}

export interface BatchImportResponse {
  results: BatchImportResult[]
  summary: {
    total: number
    success: number
    duplicates: number
    errors: number
  }
}

export async function batchImportFromCifraClub(
  urls: string[],
  instruments: string[] = []
): Promise<BatchImportResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) throw new Error('Autenticação necessária')

  const response = await fetch(`${supabaseUrl}/functions/v1/cifra-club-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ urls, instruments }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || `Erro ${response.status} na importação em lote`)
  }

  return result as BatchImportResponse
}

export async function saveCifraToRepertoire(cifra: CifraData, instruments: string[] = []) {
  const { data, error } = await supabase
    .from('repertoire')
    .insert({
      title: cifra.title,
      artist: cifra.artist,
      chords: cifra.chords,
      key: cifra.key,
      genre: cifra.genre,
      difficulty: cifra.difficulty,
      instruments,
      chord_structure: cifra.chord_structure,
      cifra_source: 'cifra_club',
      cifra_content: cifra.cifra_content,
      lyrics: cifra.lyrics,
      source_url: cifra.source_url,
      is_public_domain: false,
      youtube_url: cifra.youtube_url,
      curation_status: 'draft',
    })
    .select()
    .single()

  if (error) handleError(error)
  return data
}
