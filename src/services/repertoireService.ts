import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/lib/database.types'

export type Repertoire = Tables<'repertoire'>

export async function getRepertoire(filters?: {
  difficulty?: number
  genre?: string
}) {
  // Supabase tem limite default de 1000 rows — paginar para buscar todas
  const PAGE_SIZE = 1000
  const allData: Repertoire[] = []
  let from = 0

  while (true) {
    let query = supabase
      .from('repertoire')
      .select('*')
      .order('title')
      .range(from, from + PAGE_SIZE - 1)

    if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty)
    if (filters?.genre) query = query.eq('genre', filters.genre)

    const { data, error } = await query
    if (error) handleError(error)
    if (!data || data.length === 0) break

    allData.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allData
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

// --- Songsterr Integration ---

export interface SongsterrTrack {
  instrument: string
  name: string
  category: 'guitar' | 'bass' | 'drums' | 'vocals' | 'keys' | 'other'
  friendly: string
  views: number
  difficulty: number | null
  hash: string
}

export interface SongsterrSearchResult {
  songId: number
  artist: string
  title: string
  hasChords: boolean
  hasPlayer: boolean
  instruments: string[]
  guitarCount: number
  bassCount: number
  drumsCount: number
  tracksCount: number
  maxDifficulty: number
  url: string
  tracks: SongsterrTrack[]
}

export interface SongsterrImportData {
  title: string
  artist: string
  songsterr_id: number
  instruments: string[]
  difficulty: number
  cifra_source: string
  source_url: string
  hasChords: boolean
  hasPlayer: boolean
  tracks: SongsterrTrack[]
  tracksCount: number
  // Dados enriquecidos (preenchidos pelo songsterr-enrich)
  key?: string | null
  bpm?: number | null
  tuning?: string | null
  chords?: string[]
  cifra_content?: string
  youtube_videos?: string[]
  tags?: string[]
}

export async function searchSongsterr(query: string): Promise<SongsterrSearchResult[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(`${supabaseUrl}/functions/v1/songsterr-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ query }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || `Erro ${response.status} ao buscar no Songsterr`)
  }

  return result.results as SongsterrSearchResult[]
}

export async function importFromSongsterr(songId: number): Promise<SongsterrImportData> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(`${supabaseUrl}/functions/v1/songsterr-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ songId }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || `Erro ${response.status} ao importar do Songsterr`)
  }

  return result as SongsterrImportData
}

/**
 * Enriquece uma música do Songsterr extraindo cifra, acordes, tom, BPM,
 * vídeos YouTube e tags da página de chords.
 * Modelo "Adquirir e Reter": importa uma vez, salva no banco.
 */
export async function enrichFromSongsterr(
  songId: number,
  artist: string,
  title: string
): Promise<SongsterrImportData> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // 1. Buscar metadados básicos
  const importRes = await fetch(`${supabaseUrl}/functions/v1/songsterr-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ songId }),
  })
  const importData = await importRes.json()
  if (!importRes.ok) {
    throw new Error(importData.error || `Erro ${importRes.status} ao importar metadados`)
  }

  // 2. Enriquecer com cifra, acordes, tom, BPM, vídeos
  const enrichRes = await fetch(`${supabaseUrl}/functions/v1/songsterr-enrich`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ songId, artist, title }),
  })
  const enrichData = await enrichRes.json()
  if (!enrichRes.ok) {
    // Se enriquecimento falhar, retorna dados básicos mesmo assim
    console.warn('Enriquecimento falhou:', enrichData.error)
    return importData as SongsterrImportData
  }

  // 3. Mesclar dados básicos + enriquecidos
  return {
    ...importData,
    key: enrichData.key || null,
    bpm: enrichData.bpm || null,
    tuning: enrichData.tuning || null,
    chords: enrichData.chords || [],
    cifra_content: enrichData.cifra_content || '',
    youtube_videos: enrichData.youtube_videos || [],
    tags: enrichData.tags || [],
  } as SongsterrImportData
}

/**
 * Baixa os dados de tablatura do Songsterr (revisões JSON de cada track)
 * e salva no Supabase Storage. Retorna a URL pública do arquivo.
 */
export async function downloadGpFromSongsterr(
  songId: number,
  repertoireId?: string
): Promise<{ publicUrl: string; tracksCount: number }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  const response = await fetch(`${supabaseUrl}/functions/v1/songsterr-gp-download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId, repertoireId }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || `Erro ${response.status} ao baixar GP do Songsterr`)
  }

  return { publicUrl: result.publicUrl, tracksCount: result.tracksCount }
}

export async function saveSongsterrToRepertoire(data: SongsterrImportData) {
  // Verificar se já existe com mesmo songsterr_id
  const { data: existing } = await supabase
    .from('repertoire')
    .select('id')
    .eq('songsterr_id', data.songsterr_id)
    .maybeSingle()

  if (existing) {
    throw new Error(`"${data.title}" já está no repertório`)
  }

  // Montar youtube_url a partir do primeiro vídeo disponível
  const youtubeUrl = data.youtube_videos?.length
    ? `https://www.youtube.com/watch?v=${data.youtube_videos[0]}`
    : null

  const { data: saved, error } = await supabase
    .from('repertoire')
    .insert({
      title: data.title,
      artist: data.artist,
      songsterr_id: data.songsterr_id,
      instruments: data.instruments,
      difficulty: data.difficulty,
      cifra_source: 'songsterr',
      source_url: data.source_url,
      curation_status: 'draft',
      // Dados enriquecidos
      key: data.key || null,
      bpm: data.bpm || null,
      chords: data.chords || [],
      cifra_content: data.cifra_content || null,
      youtube_url: youtubeUrl,
    })
    .select()
    .single()

  if (error) handleError(error)

  // Após salvar, tentar baixar tablatura GP do Songsterr em background
  if (saved?.id && data.songsterr_id) {
    downloadGpFromSongsterr(data.songsterr_id, saved.id).catch((err) => {
      console.warn('[GP Download] Falha ao baixar tablatura:', err?.message)
    })
  }

  return saved
}

export async function saveChordProToRepertoire(parsed: {
  title: string
  artist: string | null
  chords: string[]
  key: string | null
  genre: string | null
  difficulty: number
  cifra_content: string
  lyrics: string | null
  bpm: number | null
  capo: number
  time_signature: string
  sections: Array<{ name: string; startLine: number }>
}, instruments: string[] = []) {
  const { data, error } = await supabase
    .from('repertoire')
    .insert({
      title: parsed.title,
      artist: parsed.artist,
      chords: parsed.chords,
      key: parsed.key,
      genre: parsed.genre,
      difficulty: parsed.difficulty,
      instruments,
      cifra_source: 'chordpro',
      cifra_content: parsed.cifra_content,
      lyrics: parsed.lyrics,
      bpm: parsed.bpm,
      capo: parsed.capo,
      time_signature: parsed.time_signature,
      sections: parsed.sections,
      is_public_domain: true,
      curation_status: 'draft',
    })
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function saveCifraToRepertoire(cifra: CifraData, instruments: string[] = []) {
  if (cifra.source_url) {
    const { data: existing } = await supabase
      .from('repertoire')
      .select('id')
      .eq('source_url', cifra.source_url)
      .maybeSingle()
    if (existing) {
      throw new Error('Essa cifra já está no repertório')
    }
  }

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

export interface SpotifyTrackHit {
  id: string
  name: string
  artist: string
  album: string
  year: string
  duration_ms: number
  url: string
  images: Array<{ url: string; height: number | null; width: number | null }>
}

export async function searchSpotifyTracks(title: string, artist: string): Promise<SpotifyTrackHit[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(`${supabaseUrl}/functions/v1/spotify-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ title, artist }),
  })

  const result = await response.json() as { tracks?: SpotifyTrackHit[]; error?: string; retry_after?: string }

  if (response.status === 429) {
    const wait = result.retry_after ? ` Espere ${result.retry_after}s.` : ''
    throw new Error(`Spotify pediu para esperar.${wait} Cole a URL na mão se precisar.`)
  }

  if (!response.ok) {
    throw new Error(result.error || `Erro ${response.status} ao buscar no Spotify`)
  }

  return result.tracks ?? []
}
