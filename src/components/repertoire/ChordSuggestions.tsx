import { useState, useEffect, useCallback } from 'react'
import { MusicNotes, Lightning, Lock, Star, CaretDown, CaretUp, SpinnerGap } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  suggestRepertoire,
  suggestRepertoirePartial,
  type RepertoireSuggestion,
  type RepertoirePartialSuggestion,
} from '@/services/suggestRepertoireService'

interface ChordSuggestionsProps {
  /** Acordes que o aluno domina (da ficha atual + transpostos) */
  knownChords: string[]
  /** Callback ao clicar numa sugestão para abrir a ficha */
  onOpenSong?: (songId: string) => void
}

/**
 * Painel de sugestões pedagógicas: mostra músicas do repertório
 * que o aluno pode tocar com os acordes que já domina.
 */
export function ChordSuggestions({ knownChords, onOpenSong }: ChordSuggestionsProps) {
  const [fullMatches, setFullMatches] = useState<RepertoireSuggestion[]>([])
  const [partialMatches, setPartialMatches] = useState<RepertoirePartialSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    if (knownChords.length < 2) {
      setFullMatches([])
      setPartialMatches([])
      return
    }

    setLoading(true)
    try {
      const [full, partial] = await Promise.all([
        suggestRepertoire(knownChords, 10),
        suggestRepertoirePartial(knownChords, 60, 10),
      ])
      setFullMatches(full)
      setPartialMatches(partial)
    } catch (err) {
      console.error('Erro ao buscar sugestões:', err)
    } finally {
      setLoading(false)
    }
  }, [knownChords])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const totalSuggestions = fullMatches.length + partialMatches.length

  if (knownChords.length < 2) return null

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <Lightning size={16} weight="fill" className="text-gold" />
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 group-hover:text-text2 transition-colors">
          Sugestões Pedagógicas
        </span>
        {loading ? (
          <SpinnerGap size={12} className="animate-spin text-text3" />
        ) : totalSuggestions > 0 ? (
          <Badge variant="gold" className="text-[9px] px-1.5 py-0">
            {totalSuggestions}
          </Badge>
        ) : null}
        <span className="ml-auto">
          {expanded ? <CaretUp size={12} className="text-text3" /> : <CaretDown size={12} className="text-text3" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-text3 text-[12px] py-3">
              <SpinnerGap size={14} className="animate-spin" /> Buscando sugestões...
            </div>
          )}

          {!loading && totalSuggestions === 0 && (
            <div className="text-[12px] text-text3 py-2">
              Nenhuma sugestão encontrada. Adicione mais músicas ao repertório.
            </div>
          )}

          {/* Músicas que o aluno JÁ pode tocar */}
          {fullMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Star size={12} weight="fill" className="text-gold" />
                <span className="text-[10px] font-semibold text-gold uppercase tracking-wider">
                  Pronto para tocar
                </span>
              </div>
              <div className="space-y-1">
                {fullMatches.map(song => (
                  <button
                    key={song.id}
                    onClick={() => onOpenSong?.(song.id)}
                    className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg
                      bg-gold/5 border border-gold/15 hover:bg-gold/10 transition-all group"
                  >
                    <MusicNotes size={14} className="text-gold shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-text truncate">
                        {song.title}
                      </div>
                      <div className="text-[10px] text-text3 truncate">
                        {song.artist} · {song.total_chords} acordes
                        {song.genre && ` · ${song.genre}`}
                      </div>
                    </div>
                    <Badge variant="foundation" className="text-[9px] px-1.5 shrink-0">
                      100%
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Músicas quase prontas */}
          {partialMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lock size={12} className="text-accent" />
                <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
                  Quase lá — aprenda mais acordes
                </span>
              </div>
              <div className="space-y-1">
                {partialMatches.map(song => (
                  <button
                    key={song.id}
                    onClick={() => onOpenSong?.(song.id)}
                    className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg
                      bg-surface border border-border hover:border-accent/30 transition-all group"
                  >
                    <MusicNotes size={14} className="text-text3 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-text truncate">
                        {song.title}
                      </div>
                      <div className="text-[10px] text-text3 truncate">
                        {song.artist} · Faltam: {song.missing_chords.join(', ')}
                      </div>
                    </div>
                    <Badge variant="accent" className="text-[9px] px-1.5 shrink-0">
                      {song.match_percent}%
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
