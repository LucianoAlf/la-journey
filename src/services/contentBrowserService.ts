import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'
import { generateEmbedding } from '@/services/aiService'
import { getExercises, type ExerciseLibraryItem } from '@/services/exerciseLibraryService'
import { getNotations, type NotationLibraryRow } from '@/services/notationService'
import { type Chord } from '@/services/libraryService'
import { filterChordsByIntent, mergeChordSearchResults, sortChordsForEditorSearch } from '@/lib/chordSearchSort'
import { isRenderableChordPositions } from '@/lib/chordLibraryDisplay'
import { parseChordSearchIntent } from '@/lib/chordSearchIntent'

export type CuratedContentBlock = Pick<Tables<'content_blocks'>, 'id' | 'block_type' | 'title' | 'content' | 'render_data' | 'curation_status'> & {
  similarity?: number | null
}

export type RepertoireContentItem = Pick<Tables<'repertoire'>, 'id' | 'title' | 'artist' | 'key' | 'chords' | 'cifra_content' | 'genre' | 'difficulty'>

export async function searchExerciseLibraryForEditor(search: string) {
  return getExercises({ search: search.trim() || null }, 0, 24)
}

async function searchCuratedBlocksByText(search: string): Promise<CuratedContentBlock[]> {
  const queryText = search.trim()
  const normalizedQuery = normalizeSearchText(queryText)

  const query = supabase
    .from('content_blocks')
    .select('id, block_type, title, content, render_data, curation_status')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(queryText ? 200 : 24)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as CuratedContentBlock[]
  if (!normalizedQuery) return rows.slice(0, 24)

  return rows
    .filter(row => normalizeSearchText([
      row.title,
      row.block_type,
      row.curation_status,
      row.content,
      row.render_data,
    ].map(value => typeof value === 'string' ? value : JSON.stringify(value ?? '')).join(' ')).includes(normalizedQuery))
    .slice(0, 24)
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export async function searchCuratedBlocksForEditor(search: string): Promise<CuratedContentBlock[]> {
  const query = search.trim()
  if (query.length < 2) return searchCuratedBlocksByText('')

  try {
    const { embedding } = await generateEmbedding(query)
    const { data, error } = await (supabase.rpc as any)('match_content_blocks', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.25,
      match_count: 24,
      filter_instrument: null,
      filter_difficulty: null,
    })

    if (error) throw error
    const semanticResults = (data ?? []) as CuratedContentBlock[]
    if (semanticResults.length > 0) return semanticResults
  } catch (error) {
    console.warn('[ContentBrowser] semantic search fallback:', error)
  }

  return searchCuratedBlocksByText(query)
}

export async function searchNotationsForEditor(search: string): Promise<NotationLibraryRow[]> {
  const notations = await getNotations()
  const query = search.trim().toLowerCase()
  if (!query) return notations.slice(0, 24)

  return notations
    .filter(item => [
      item.name,
      item.description,
      item.category,
      item.subcategory,
      ...(item.tags ?? []),
    ].filter(Boolean).join(' ').toLowerCase().includes(query))
    .slice(0, 24)
}

const chordEditorSearchCache = new Map<string, Chord[]>()

function normalizeChordEditorSearch(search: string) {
  return search.trim()
}

function createChordEditorBaseQuery() {
  return supabase
    .from('chord_library')
    .select('*')
    .eq('instrument', 'guitar')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(80)
}

function filterRenderableChords(chords: Chord[]) {
  const renderable = chords.filter(chord => isRenderableChordPositions(chord.positions))
  if (import.meta.env.DEV && renderable.length !== chords.length) {
    console.warn('[ChordPicker] filtered non-renderable chords', chords.length - renderable.length)
  }
  return renderable
}

export async function searchChordsForEditor(search: string): Promise<Chord[]> {
  const query = normalizeChordEditorSearch(search)
  const cacheKey = query.toLowerCase()
  const cached = chordEditorSearchCache.get(cacheKey)
  if (cached) return cached

  if (!query) {
    const { data, error } = await createChordEditorBaseQuery()
    if (error) throw error
    const results = sortChordsForEditorSearch(query, filterRenderableChords((data ?? []) as Chord[])).slice(0, 24)
    chordEditorSearchCache.set(cacheKey, results)
    return results
  }

  const intent = parseChordSearchIntent(query)
  if (intent.rootNote) {
    let request = createChordEditorBaseQuery().eq('root_note', intent.rootNote)
    if (intent.exactQuality && intent.quality) request = request.eq('quality', intent.quality)
    if (intent.exactQuality && intent.family) request = request.eq('family', intent.family)

    const { data, error } = await request
    if (error) throw error

    const results = filterChordsByIntent(
      filterRenderableChords((data ?? []) as Chord[]),
      intent,
    ).slice(0, 24)
    chordEditorSearchCache.set(cacheKey, results)
    return results
  }

  const [byName, byCanonicalName] = await Promise.all([
    createChordEditorBaseQuery().ilike('name', `${query}%`),
    createChordEditorBaseQuery().ilike('canonical_name', `${query}%`),
  ])

  if (byName.error) throw byName.error
  if (byCanonicalName.error) throw byCanonicalName.error

  let results = mergeChordSearchResults(
    query,
    filterRenderableChords((byName.data ?? []) as Chord[]),
    filterRenderableChords((byCanonicalName.data ?? []) as Chord[]),
  )

  if (results.length < 8) {
    const [nameContains, canonicalContains] = await Promise.all([
      createChordEditorBaseQuery().ilike('name', `%${query}%`),
      createChordEditorBaseQuery().ilike('canonical_name', `%${query}%`),
    ])

    if (nameContains.error) throw nameContains.error
    if (canonicalContains.error) throw canonicalContains.error

    results = mergeChordSearchResults(
      query,
      results,
      filterRenderableChords((nameContains.data ?? []) as Chord[]),
      filterRenderableChords((canonicalContains.data ?? []) as Chord[]),
    )
  }

  const limitedResults = results.slice(0, 24)
  chordEditorSearchCache.set(cacheKey, limitedResults)
  return limitedResults
}

export async function searchRepertoireForEditor(search: string): Promise<RepertoireContentItem[]> {
  const query = search.trim()
  let request = supabase
    .from('repertoire')
    .select('id, title, artist, key, chords, cifra_content, genre, difficulty')
    .order('title')
    .limit(24)

  if (query) {
    request = request.or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
  }

  const { data, error } = await request
  if (error) throw error
  return (data ?? []) as RepertoireContentItem[]
}

export type {
  ExerciseLibraryItem,
  NotationLibraryRow,
  Chord,
}
