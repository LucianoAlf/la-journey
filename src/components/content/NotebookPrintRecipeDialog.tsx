import { useEffect, useState } from 'react'
import {
  Guitar,
  PianoKeys,
  FilePdf,
  CaretDown,
  CaretUp,
  ArrowCounterClockwise,
  SlidersHorizontal,
  MusicNotes,
  SpinnerGap,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  printRecipeFromTags,
  isSameRecipe,
  formatRecipeSummary,
  type NotebookPrintRecipe,
} from '@/lib/notebookPrintRecipe'
import {
  getCollectionItems,
  type RepertoireCollection,
  type RepertoireCollectionItem,
} from '@/services/repertoireCollectionService'

interface NotebookPrintRecipeDialogProps {
  notebook: RepertoireCollection | null
  open: boolean
  confirming?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (
    recipe: NotebookPrintRecipe,
    songRecipes?: Record<string, NotebookPrintRecipe>,
  ) => void
}

const TOGGLES: Array<{ key: keyof NotebookPrintRecipe; label: string; hint: string; icon: typeof Guitar }> = [
  { key: 'guitar', label: 'Violão', hint: 'Diagramas de braço (6 cordas)', icon: Guitar },
  { key: 'piano', label: 'Teclado', hint: 'Diagramas de teclas', icon: PianoKeys },
  { key: 'ukulele', label: 'Ukulele', hint: 'Braço de 4 cordas', icon: Guitar },
  { key: 'tab', label: 'Tablatura', hint: 'Mantém as tabs da cifra', icon: FilePdf },
]

export function NotebookPrintRecipeDialog({
  notebook,
  open,
  confirming,
  onOpenChange,
  onConfirm,
}: NotebookPrintRecipeDialogProps) {
  const [recipe, setRecipe] = useState<NotebookPrintRecipe>(
    printRecipeFromTags(notebook?.tags, notebook?.instrument),
  )
  const [items, setItems] = useState<Array<RepertoireCollectionItem & { repertoire: any }>>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [showPerSong, setShowPerSong] = useState(false)
  const [songOverrides, setSongOverrides] = useState<Record<string, NotebookPrintRecipe>>({})

  useEffect(() => {
    if (!open || !notebook) return
    const defaultRecipe = printRecipeFromTags(notebook.tags, notebook.instrument)
    setRecipe(defaultRecipe)
    setSongOverrides({})
    setShowPerSong(false)

    let isMounted = true
    setLoadingItems(true)
    getCollectionItems(notebook.id)
      .then((loaded) => {
        if (!isMounted) return
        setItems(loaded)
        // Se alguma música já tiver tag de receita própria no seu registro, pré-carregar
        const initialOverrides: Record<string, NotebookPrintRecipe> = {}
        for (const item of loaded) {
          const song = item.repertoire
          if (song?.id && song.tags) {
            const specificRecipe = printRecipeFromTags(song.tags, null)
            if (!isSameRecipe(specificRecipe, defaultRecipe)) {
              initialOverrides[song.id] = specificRecipe
            }
          }
        }
        setSongOverrides(initialOverrides)
      })
      .catch((err) => {
        console.error('[NotebookPrintRecipeDialog] Erro ao carregar músicas do caderno:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingItems(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, notebook])

  const overrideCount = Object.keys(songOverrides).length

  const handleToggleSongRecipeKey = (songId: string, key: keyof NotebookPrintRecipe) => {
    setSongOverrides((prev) => {
      const current = prev[songId] ? { ...prev[songId] } : { ...recipe }
      current[key] = !current[key]
      if (isSameRecipe(current, recipe)) {
        const next = { ...prev }
        delete next[songId]
        return next
      }
      return { ...prev, [songId]: current }
    })
  }

  const handleResetSong = (songId: string) => {
    setSongOverrides((prev) => {
      const next = { ...prev }
      delete next[songId]
      return next
    })
  }

  const handleConfirm = () => {
    const cleanedOverrides: Record<string, NotebookPrintRecipe> = {}
    for (const [id, r] of Object.entries(songOverrides)) {
      if (!isSameRecipe(r, recipe)) {
        cleanedOverrides[id] = r
      }
    }
    onConfirm(recipe, Object.keys(cleanedOverrides).length > 0 ? cleanedOverrides : undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface border-border p-6 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-text flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-accent" />
            O que entra no caderno
          </DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-text2 -mt-1">
          Mesmo motor da folha de repertório. Configure os diagramas e elementos para todas as músicas ou personalize faixas específicas.
        </p>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Receita Global do Caderno */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text3">
                Padrão do Caderno
              </span>
              <span className="text-[11px] text-text2">
                {formatRecipeSummary(recipe)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TOGGLES.map((item) => {
                const on = recipe[item.key]
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setRecipe((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className={`flex items-start justify-between rounded-[12px] border p-2.5 text-left transition-all ${
                      on
                        ? 'border-accent/50 bg-accent/10 shadow-sm'
                        : 'border-border bg-card/40 text-text3 hover:border-border/80'
                    }`}
                  >
                    <span className="space-y-0.5">
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
                        <Icon size={14} className={on ? 'text-accent' : 'text-text3'} />
                        {item.label}
                      </span>
                      <span className="block text-[10px] text-text3 leading-tight">{item.hint}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${on ? 'bg-accent/20 text-accent' : 'bg-muted text-text3'}`}>
                      {on ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Seção de Personalização por Música */}
          {items.length > 0 && (
            <div className="rounded-[12px] border border-border bg-card/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPerSong((prev) => !prev)}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MusicNotes size={16} className="text-accent" />
                  <span className="text-[12px] font-semibold text-text">
                    Personalizar por Música ({items.length})
                  </span>
                  {overrideCount > 0 && (
                    <Badge variant="foundation" className="text-[10px] px-1.5 py-0">
                      {overrideCount} {overrideCount === 1 ? 'personalizada' : 'personalizadas'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-text3">
                  {showPerSong ? 'Recolher' : 'Expandir'}
                  {showPerSong ? <CaretUp size={12} /> : <CaretDown size={12} />}
                </div>
              </button>

              {showPerSong && (
                <div className="border-t border-border p-3 space-y-2.5 bg-background/50">
                  <p className="text-[11px] text-text3">
                    Ajuste os diagramas individualmente para músicas que precisem de layout instrumental diferente.
                  </p>
                  <ScrollArea className="max-h-[220px] pr-2">
                    <div className="space-y-2">
                      {items.map((item, idx) => {
                        const song = item.repertoire
                        const songId = song?.id || item.repertoire_id
                        const currentSongRecipe = songId && songOverrides[songId] ? songOverrides[songId] : recipe
                        const isCustom = songId ? Boolean(songOverrides[songId]) : false

                        return (
                          <div
                            key={item.id || idx}
                            className={`p-2.5 rounded-[10px] border transition-colors ${
                              isCustom
                                ? 'border-accent/40 bg-accent/5'
                                : 'border-border/60 bg-card/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-[12px] text-text truncate block">
                                  {song?.title || 'Sem título'}
                                </span>
                                <span className="text-[10px] text-text3 truncate block">
                                  {song?.artist || 'Artista desconhecido'}
                                  {song?.key && ` · Tom: ${song.key}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isCustom ? (
                                  <>
                                    <Badge variant="outline" className="text-[9px] font-mono border-accent/40 text-accent">
                                      Custom
                                    </Badge>
                                    {songId && (
                                      <button
                                        type="button"
                                        title="Restaurar padrão do caderno"
                                        onClick={() => handleResetSong(songId)}
                                        className="p-1 text-text3 hover:text-text rounded hover:bg-muted transition-colors"
                                      >
                                        <ArrowCounterClockwise size={12} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[10px] text-text3 italic">
                                    Padrão
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Mini Toggle Chips */}
                            <div className="flex flex-wrap gap-1.5">
                              {TOGGLES.map((t) => {
                                const on = currentSongRecipe[t.key]
                                return (
                                  <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => songId && handleToggleSongRecipeKey(songId, t.key)}
                                    className={`px-2 py-1 rounded-[6px] text-[10px] font-medium border transition-all ${
                                      on
                                        ? 'bg-accent/20 border-accent/60 text-accent font-semibold'
                                        : 'bg-muted/40 border-border/60 text-text3 hover:text-text'
                                    }`}
                                  >
                                    {t.label} {on ? '✓' : '—'}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {loadingItems && (
            <div className="flex items-center justify-center py-2 text-text3 text-[11px] gap-1.5">
              <SpinnerGap size={14} className="animate-spin" />
              Carregando faixas do caderno...
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
          <p className="text-[11px] text-text3 flex items-center gap-1.5">
            <Guitar size={13} />
            <PianoKeys size={13} />
            Editor A4 com corte automático
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={confirming}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={confirming || !notebook}
              onClick={handleConfirm}
            >
              {confirming ? (
                <>
                  <SpinnerGap size={14} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FilePdf size={14} />
                  Montar e abrir no editor
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
