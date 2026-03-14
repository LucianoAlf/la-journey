import { supabase } from '@/lib/supabase'

export interface RepertoireSuggestion {
  id: string
  title: string
  artist: string | null
  chords: string[]
  key: string | null
  genre: string | null
  difficulty: number | null
  total_chords: number
  match_percent: number
}

export interface RepertoirePartialSuggestion extends RepertoireSuggestion {
  known_count: number
  missing_chords: string[]
}

/**
 * Retorna músicas do repertório onde o aluno sabe TODOS os acordes.
 * Ideal para mostrar "Você já pode tocar essas músicas!"
 */
export async function suggestRepertoire(
  knownChords: string[],
  maxResults = 20
): Promise<RepertoireSuggestion[]> {
  if (!knownChords.length) return []

  const { data, error } = await (supabase.rpc as any)('suggest_repertoire', {
    known_chords: knownChords,
    max_results: maxResults,
  })

  if (error) {
    console.error('Erro ao buscar sugestões:', error.message)
    return []
  }

  return (data ?? []) as RepertoireSuggestion[]
}

/**
 * Retorna músicas onde o aluno sabe a MAIORIA dos acordes (>= min%).
 * Mostra quais acordes faltam aprender para desbloquear a música.
 */
export async function suggestRepertoirePartial(
  knownChords: string[],
  minMatchPercent = 70,
  maxResults = 20
): Promise<RepertoirePartialSuggestion[]> {
  if (!knownChords.length) return []

  const { data, error } = await (supabase.rpc as any)('suggest_repertoire_partial', {
    known_chords: knownChords,
    min_match_percent: minMatchPercent,
    max_results: maxResults,
  })

  if (error) {
    console.error('Erro ao buscar sugestões parciais:', error.message)
    return []
  }

  return (data ?? []) as RepertoirePartialSuggestion[]
}
