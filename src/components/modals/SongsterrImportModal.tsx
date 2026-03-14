import { useState, useCallback } from 'react'
import {
  MagnifyingGlass, SpinnerGap, Guitar, MicrophoneStage,
  Plus, MusicNotes, ArrowLeft, CaretRight,
  LinkSimple, MusicNote, Metronome, YoutubeLogo
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  searchSongsterr, enrichFromSongsterr, saveSongsterrToRepertoire,
} from '@/services/repertoireService'
import type { SongsterrSearchResult, SongsterrImportData } from '@/services/repertoireService'

interface SongsterrImportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type ModalStep = 'search' | 'results' | 'preview'

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Iniciante', 2: 'Fácil', 3: 'Médio', 4: 'Avançado', 5: 'Expert',
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'bg-green-500/20 text-green-400 border-green-500/30',
  2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  5: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const CATEGORY_ICONS: Record<string, string> = {
  guitar: '🎸',
  bass: '🎸',
  drums: '🥁',
  vocals: '🎤',
  keys: '🎹',
  other: '🎵',
}

const CATEGORY_LABELS: Record<string, string> = {
  guitar: 'Violão/Guitarra',
  bass: 'Baixo',
  drums: 'Bateria',
  vocals: 'Voz',
  keys: 'Teclado',
  other: 'Outro',
}

function InstrumentBadges({ instruments }: { instruments: string[] }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {instruments.map(inst => (
        <span
          key={inst}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-card border border-border"
          title={inst}
        >
          {CATEGORY_ICONS[inst] || '🎵'}
        </span>
      ))}
    </div>
  )
}

export function SongsterrImportModal({ open, onClose, onSuccess }: SongsterrImportModalProps) {
  const [step, setStep] = useState<ModalStep>('search')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchResults, setSearchResults] = useState<SongsterrSearchResult[]>([])
  const [preview, setPreview] = useState<SongsterrImportData | null>(null)

  // Buscar músicas
  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (q.length < 2) {
      toast.error('Digite pelo menos 2 caracteres')
      return
    }

    setSearching(true)
    setSearchResults([])
    try {
      const results = await searchSongsterr(q)
      setSearchResults(results)
      if (results.length > 0) {
        setStep('results')
        toast.success(`${results.length} música${results.length > 1 ? 's' : ''} encontrada${results.length > 1 ? 's' : ''}`)
      } else {
        toast.error('Nenhum resultado. Tente outro nome.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao buscar no Songsterr')
    } finally {
      setSearching(false)
    }
  }, [query])

  // Selecionar música → buscar detalhes + enriquecer com cifra/acordes
  const handleSelectSong = useCallback(async (result: SongsterrSearchResult) => {
    setLoading(true)
    try {
      const data = await enrichFromSongsterr(result.songId, result.artist, result.title)
      setPreview(data)
      setStep('preview')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar detalhes')
    } finally {
      setLoading(false)
    }
  }, [])

  // Salvar no repertório
  const handleSave = async () => {
    if (!preview) return
    setSaving(true)
    try {
      await saveSongsterrToRepertoire(preview)
      toast.success(`"${preview.title}" importada com sucesso!`)
      onSuccess()
      handleReset()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar música')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setStep('search')
    setQuery('')
    setSearchResults([])
    setPreview(null)
  }

  const handleBack = () => {
    if (step === 'preview') {
      setPreview(null)
      setStep(searchResults.length > 0 ? 'results' : 'search')
    } else if (step === 'results') {
      setStep('search')
    }
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`sm:max-w-[700px] bg-surface border-border max-h-[90vh] overflow-hidden flex flex-col ${step !== 'search' ? 'h-[80vh]' : ''}`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-serif text-[22px] flex items-center gap-2">
            <Guitar size={22} weight="fill" className="text-orange-400" />
            Importar do <span className="text-orange-400">Songsterr</span>
            {step !== 'search' && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="ml-auto text-text3">
                <ArrowLeft size={14} /> Voltar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ===== ETAPA 1: BUSCAR ===== */}
        {step === 'search' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por artista ou música..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  disabled={searching}
                  className="flex-1 h-11 text-sm"
                  autoFocus
                />
                <Button onClick={handleSearch} disabled={searching || query.trim().length < 2} className="h-11 px-5 bg-orange-500 hover:bg-orange-600">
                  {searching ? (
                    <SpinnerGap size={18} className="animate-spin" />
                  ) : (
                    <MagnifyingGlass size={18} />
                  )}
                  {searching ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
              <p className="text-text3 text-[11px]">
                Busca tablatura profissional com múltiplos instrumentos (guitarra, baixo, bateria, teclado).
              </p>
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 space-y-1.5">
              <p className="text-orange-400 text-xs font-semibold flex items-center gap-1.5">
                <Guitar size={14} weight="fill" /> Sobre o Songsterr
              </p>
              <p className="text-text3 text-[11px] leading-relaxed">
                O Songsterr oferece tablaturas profissionais com múltiplos instrumentos, 
                dificuldade por track e player interativo. As músicas importadas ficam vinculadas 
                ao Songsterr para acesso às tabs completas.
              </p>
              <div className="flex gap-3 pt-1">
                <span className="text-[10px] text-text3 flex items-center gap-1">🎸 Guitarra/Violão</span>
                <span className="text-[10px] text-text3 flex items-center gap-1">🎸 Baixo</span>
                <span className="text-[10px] text-text3 flex items-center gap-1">🥁 Bateria</span>
                <span className="text-[10px] text-text3 flex items-center gap-1">🎹 Teclado</span>
                <span className="text-[10px] text-text3 flex items-center gap-1">🎤 Voz</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== ETAPA 2: LISTA DE RESULTADOS ===== */}
        {step === 'results' && (
          <div className="flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="shrink-0 flex items-center justify-between gap-3 mb-2">
              <p className="text-text2 text-sm">
                <span className="font-semibold text-text">{searchResults.length}</span> resultado{searchResults.length > 1 ? 's' : ''}
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8 gap-2 text-text3">
                <SpinnerGap size={20} className="animate-spin" />
                <span className="text-sm">Extraindo cifra e metadados...</span>
              </div>
            )}

            {!loading && (
              <ScrollArea className="flex-1">
                <div className="space-y-1 pr-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.songId}
                      onClick={() => handleSelectSong(result)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-orange-500/20 hover:bg-orange-500/5 text-left transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                        <MusicNotes size={16} className="text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate group-hover:text-orange-400 transition-colors">
                          {result.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-text3 truncate">
                            {result.artist}
                          </span>
                          <span className="text-[9px] text-text3/50">·</span>
                          <span className="text-[10px] text-text3/70">
                            {result.tracksCount} track{result.tracksCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <InstrumentBadges instruments={result.instruments} />
                        {result.maxDifficulty > 0 && (
                          <Badge className={`text-[9px] border ${DIFFICULTY_COLORS[result.maxDifficulty] || ''}`}>
                            {DIFFICULTY_LABELS[result.maxDifficulty]}
                          </Badge>
                        )}
                        <CaretRight size={14} className="text-text3 group-hover:text-orange-400 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* ===== ETAPA 3: PREVIEW ===== */}
        {step === 'preview' && preview && (
          <div className="flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-3 py-3 border-b border-border">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-text truncate">{preview.title}</h3>
                <p className="text-text2 text-sm flex items-center gap-1.5">
                  <MicrophoneStage size={14} />
                  {preview.artist}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`text-[10px] border ${DIFFICULTY_COLORS[preview.difficulty] || ''}`}>
                  {DIFFICULTY_LABELS[preview.difficulty] || `Nível ${preview.difficulty}`}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {preview.tracksCount} tracks
                </Badge>
              </div>
            </div>

            {/* Conteúdo */}
            <ScrollArea className="flex-1 mt-3">
              <div className="space-y-4 pr-2">
                {/* Metadados musicais enriquecidos */}
                {(preview.key || preview.bpm || preview.chords?.length) && (
                  <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                    <p className="text-orange-400 text-[10px] font-medium uppercase tracking-wide mb-2 flex items-center gap-1">
                      <MusicNote size={12} weight="fill" /> Dados Musicais
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {preview.key && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-text3">Tom:</span>
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                            {preview.key}
                          </Badge>
                        </div>
                      )}
                      {preview.bpm && (
                        <div className="flex items-center gap-1.5">
                          <Metronome size={12} className="text-text3" />
                          <span className="text-xs text-text2">{preview.bpm} BPM</span>
                        </div>
                      )}
                      {preview.tuning && preview.tuning !== 'Standard (EADGBE)' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-text3">Afinação:</span>
                          <span className="text-xs text-text2">{preview.tuning}</span>
                        </div>
                      )}
                    </div>
                    {preview.chords && preview.chords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {preview.chords.map(chord => (
                          <Badge key={chord} variant="outline" className="text-[10px] px-1.5 py-0.5">
                            {chord}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Preview da cifra */}
                {preview.cifra_content && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-text3 text-[10px] font-medium uppercase tracking-wide mb-2">
                      Cifra (preview)
                    </p>
                    <pre className="font-mono text-[11px] text-text2 leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                      {preview.cifra_content.split('\n').slice(0, 30).join('\n')}
                      {preview.cifra_content.split('\n').length > 30 && '\n...'}
                    </pre>
                  </div>
                )}

                {/* YouTube */}
                {preview.youtube_videos && preview.youtube_videos.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-text3 text-[10px] font-medium uppercase tracking-wide mb-2 flex items-center gap-1">
                      <YoutubeLogo size={12} weight="fill" className="text-red-400" /> Vídeos ({preview.youtube_videos.length})
                    </p>
                    <a
                      href={`https://www.youtube.com/watch?v=${preview.youtube_videos[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-400 hover:underline"
                    >
                      Assistir no YouTube →
                    </a>
                  </div>
                )}

                {/* Instrumentos disponíveis */}
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-text3 text-[10px] font-medium uppercase tracking-wide mb-2">
                    Instrumentos ({preview.instruments.length})
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {preview.instruments.map(inst => (
                      <Badge key={inst} variant="outline" className="text-xs px-2.5 py-1 gap-1.5">
                        {inst === 'Violão' && '🎸'}
                        {inst === 'Baixo' && '🎸'}
                        {inst === 'Bateria' && '🥁'}
                        {inst === 'Voz' && '🎤'}
                        {inst === 'Teclado' && '🎹'}
                        {inst === 'Outro' && '🎵'}
                        {inst}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tracks detalhados */}
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-text3 text-[10px] font-medium uppercase tracking-wide mb-2">
                    Tracks ({preview.tracks.length})
                  </p>
                  <div className="space-y-1.5">
                    {preview.tracks.map((track, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-2.5 py-2 rounded-lg bg-bg border border-border/50"
                      >
                        <span className="text-base">
                          {CATEGORY_ICONS[track.category] || '🎵'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text truncate">
                            {track.name || track.instrument}
                          </p>
                          <p className="text-[10px] text-text3">
                            {CATEGORY_LABELS[track.category] || track.category}
                            {track.views > 0 && ` · ${track.views.toLocaleString('pt-BR')} views`}
                          </p>
                        </div>
                        {track.difficulty && (
                          <Badge className={`text-[9px] border ${DIFFICULTY_COLORS[track.difficulty] || ''}`}>
                            Nível {track.difficulty}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Link para Songsterr */}
                <a
                  href={preview.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-orange-400 text-xs hover:underline"
                >
                  <LinkSimple size={14} />
                  Abrir no Songsterr →
                </a>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="shrink-0 flex justify-between items-center pt-3 border-t border-border mt-2">
              <p className="text-text3 text-[11px]">
                Songsterr
                {preview.cifra_content ? ' · Cifra extraída ✓' : ''}
                {preview.key ? ` · Tom: ${preview.key}` : ''}
                {preview.bpm ? ` · ${preview.bpm} BPM` : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft size={14} /> Voltar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                  {saving ? (
                    <SpinnerGap size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  {saving ? 'Salvando...' : 'Salvar no Repertório'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
