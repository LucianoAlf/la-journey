import { useEffect, useMemo, useRef, useState } from 'react'
import { Guitar, MagnifyingGlass, PencilSimple, SpinnerGap } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { parseChordSearchIntent } from '@/lib/chordSearchIntent'
import { searchChordsForEditor, type Chord } from '@/services/contentBrowserService'
import { ChordPickerCagedResults } from './ChordPickerCagedResults'
import { ChordPickerResultCard } from './ChordPickerResultCard'

interface ChordLibraryPickerProps {
  open: boolean
  title?: string
  selectLabel?: string
  secondarySelectLabel?: string
  onClose: () => void
  onSelect: (chord: Chord) => void | Promise<void>
  onSecondarySelect?: (chord: Chord) => void | Promise<void>
  onManualEdit?: () => void
}

export function ChordLibraryPicker({
  open,
  title = 'Escolher acorde',
  selectLabel = 'Usar',
  secondarySelectLabel,
  onClose,
  onSelect,
  onSecondarySelect,
  onManualEdit,
}: ChordLibraryPickerProps) {
  const [search, setSearch] = useState('')
  const [chords, setChords] = useState<Chord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectingKey, setSelectingKey] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [cagedMode, setCagedMode] = useState(false)
  const [loadedSearch, setLoadedSearch] = useState('')
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!open) {
      requestIdRef.current += 1
      setLoading(false)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const requestedSearch = search
    let requestStarted = false

    const timer = window.setTimeout(async () => {
      requestStarted = true
      if (requestIdRef.current !== requestId) return

      setLoading(true)
      setError(null)

      try {
        const result = await searchChordsForEditor(requestedSearch)
        if (requestIdRef.current === requestId) {
          setChords(result)
          setLoadedSearch(requestedSearch)
          setHasLoadedOnce(true)
        }
      } catch (err: any) {
        if (requestIdRef.current === requestId) {
          setError(err?.message ?? 'Erro ao buscar acordes')
          setChords([])
        }
      } finally {
        if (requestIdRef.current === requestId) setLoading(false)
      }
    }, 220)

    return () => {
      window.clearTimeout(timer)
      if (requestIdRef.current === requestId) {
        requestIdRef.current += 1
        if (!requestStarted) setLoading(false)
      }
    }
  }, [open, search])

  const intent = useMemo(() => parseChordSearchIntent(search), [search])
  const currentSearchKey = search.trim().toLowerCase()
  const loadedSearchKey = loadedSearch.trim().toLowerCase()
  const resultsAreStale = loading && hasLoadedOnce && currentSearchKey !== loadedSearchKey
  const visibleChords = resultsAreStale ? [] : chords

  const helperText = useMemo(() => {
    if (resultsAreStale) return `Buscando ${intent.displayName || search.trim()}...`
    if (loading && !hasLoadedOnce) return 'Buscando acordes...'
    if (loading && visibleChords.length > 0) return `${visibleChords.length} resultado(s) prontos. Atualizando busca...`
    if (intent.exactQuality && intent.displayName) return `${visibleChords.length} resultado(s) para ${intent.displayName}`
    if (search.trim()) return `${visibleChords.length} resultado(s)`
    return 'Digite C, G, Dm7, F7M... ou escolha um acorde abaixo'
  }, [hasLoadedOnce, intent.displayName, intent.exactQuality, loading, resultsAreStale, search, visibleChords.length])

  const suggestions = useMemo(() => {
    if (!intent.rootNote) return []
    return [
      { label: 'maior', value: `${intent.rootNote} maior` },
      { label: 'menor', value: `${intent.rootNote} menor` },
      { label: 'aumentado', value: `${intent.rootNote} aumentado` },
      { label: 'diminuto', value: `${intent.rootNote} diminuto` },
      { label: '7', value: `${intent.rootNote} 7` },
      { label: '7M', value: `${intent.rootNote} 7M` },
    ]
  }, [intent.rootNote])

  const applyPrimary = async (chord: Chord) => {
    setSelectingKey(`${chord.id}:primary`)
    try {
      await onSelect(chord)
    } finally {
      setSelectingKey(null)
    }
  }

  const applySecondary = async (chord: Chord) => {
    if (!onSecondarySelect) return
    setSelectingKey(`${chord.id}:secondary`)
    try {
      await onSecondarySelect(chord)
    } finally {
      setSelectingKey(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        className="max-h-[88vh] overflow-hidden bg-surface border-border"
        style={{
          width: 'min(980px, calc(100vw - 48px))',
          maxWidth: 'min(980px, calc(100vw - 48px))',
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px]">
            <Guitar size={19} className="text-grow" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar acorde na biblioteca"
                className="h-10 pl-9 text-[13px]"
                autoFocus
              />
            </div>
            {onManualEdit && (
              <Button type="button" variant="outline" className="h-10 gap-2" onClick={onManualEdit}>
                <PencilSimple size={15} />
                Editar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[12px] text-text3">
            {loading && !hasLoadedOnce ? <SpinnerGap size={14} className="animate-spin" /> : <Guitar size={14} />}
            <span>{helperText}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCagedMode(prev => !prev)}
              className={`flex h-8 items-center gap-2 rounded-lg border px-3 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                cagedMode
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-card text-text3 hover:text-text'
              }`}
            >
              <Guitar size={14} weight={cagedMode ? 'fill' : 'regular'} />
              Modo CAGED
            </button>

            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text3">
                  Sugestões
                </span>
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => setSearch(suggestion.value)}
                    className="h-7 rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold text-text2 transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="max-h-[58vh] overflow-y-auto pr-1">
            {error ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-[13px] text-text3">
                {error}
              </div>
            ) : resultsAreStale ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-[13px] text-text3">
                <div className="flex items-center gap-2">
                  <SpinnerGap size={16} className="animate-spin" />
                  <span>Atualizando resultados...</span>
                </div>
              </div>
            ) : !loading && visibleChords.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-[13px] text-text3">
                Nenhum acorde encontrado na biblioteca.
              </div>
            ) : cagedMode ? (
              <ChordPickerCagedResults
                chords={visibleChords}
                primaryLabel={selectLabel}
                secondaryLabel={secondarySelectLabel}
                selectingKey={selectingKey}
                onPrimary={applyPrimary}
                onSecondary={onSecondarySelect ? applySecondary : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleChords.map(chord => (
                  <ChordPickerResultCard
                    key={chord.id}
                    chord={chord}
                    primaryLabel={selectLabel}
                    secondaryLabel={secondarySelectLabel}
                    primaryBusy={selectingKey === `${chord.id}:primary`}
                    secondaryBusy={selectingKey === `${chord.id}:secondary`}
                    onPrimary={() => applyPrimary(chord)}
                    onSecondary={onSecondarySelect ? () => applySecondary(chord) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
