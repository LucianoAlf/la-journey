import { useState, useCallback } from 'react'
import {
  Lightning, MagnifyingGlass, SpinnerGap,
  MicrophoneStage, Check, X, Plus, MusicNotes, ListBullets,
  ArrowLeft, Link as LinkIcon, CaretRight, CheckSquare, Square, Stack
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { searchCifraClub, importFromCifraClub, saveCifraToRepertoire, batchImportFromCifraClub } from '@/services/repertoireService'
import type { CifraData, CifraSearchResult, BatchImportResult } from '@/services/repertoireService'

interface CifraClubImportModalProps {
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

const INSTRUMENTS_OPTIONS = [
  'Violão', 'Guitarra', 'Teclado', 'Piano', 'Canto', 'Baixo', 'Ukulele', 'Bateria',
]

// Renderiza o conteúdo da cifra com syntax highlighting
function CifraContentView({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="font-mono text-[12px] leading-[1.6] whitespace-pre-wrap">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        // Seção [Intro], [Verso], etc
        if (/^\[.*\]/.test(trimmed)) {
          return (
            <div key={i} className="text-accent font-bold mt-3 mb-1 text-[13px]">
              {trimmed}
            </div>
          )
        }
        // Linha de tablatura (E|---, B|---, etc)
        if (/^\s*[EBADGe]\|/.test(line) || /^\s*\|/.test(trimmed)) {
          return (
            <div key={i} className="text-blue-400/70">
              {line}
            </div>
          )
        }
        // Linha só de acordes
        const chordPattern = /^[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9])*(?:\/[A-G][#b]?)?$/
        const tokens = trimmed.split(/\s+/)
        const chordRatio = tokens.filter(t => chordPattern.test(t) || t === '|').length / (tokens.length || 1)
        if (chordRatio > 0.5 && trimmed.length > 0) {
          return (
            <div key={i} className="text-accent font-semibold">
              {line}
            </div>
          )
        }
        // Linha vazia
        if (!trimmed) {
          return <div key={i} className="h-2" />
        }
        // Letra normal
        return (
          <div key={i} className="text-text">
            {line}
          </div>
        )
      })}
    </div>
  )
}

export function CifraClubImportModal({ open, onClose, onSuccess }: CifraClubImportModalProps) {
  const [step, setStep] = useState<ModalStep>('search')
  const [query, setQuery] = useState('')
  const [urlMode, setUrlMode] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchResults, setSearchResults] = useState<CifraSearchResult[]>([])
  const [resultFilter, setResultFilter] = useState('')
  const [preview, setPreview] = useState<CifraData | null>(null)
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(['Violão'])
  const [editDifficulty, setEditDifficulty] = useState<number>(1)
  const [editGenre, setEditGenre] = useState<string>('')
  // Seleção múltipla para importação em lote
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const [batchImporting, setBatchImporting] = useState(false)
  const [batchResults, setBatchResults] = useState<BatchImportResult[] | null>(null)

  // Buscar por nome
  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      toast.error('Digite o nome do artista ou da música')
      return
    }

    setSearching(true)
    setSearchResults([])
    try {
      const results = await searchCifraClub(q)
      setSearchResults(results)
      if (results.length > 0) {
        setStep('results')
        toast.success(`${results.length} música${results.length > 1 ? 's' : ''} encontrada${results.length > 1 ? 's' : ''}`)
      } else {
        toast.error('Nenhum resultado. Tente outro nome ou use a opção "Colar URL".')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao buscar')
    } finally {
      setSearching(false)
    }
  }, [query])

  // Selecionar música da lista → importar cifra completa
  const handleSelectSong = useCallback(async (result: CifraSearchResult) => {
    setLoading(true)
    try {
      const data = await importFromCifraClub(result.url)
      setPreview(data)
      setEditDifficulty(data.difficulty)
      setEditGenre(data.genre || '')
      setStep('preview')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar cifra')
    } finally {
      setLoading(false)
    }
  }, [])

  // Importar via URL direta (fallback)
  const handleUrlImport = useCallback(async () => {
    const u = urlInput.trim()
    if (!u || !u.includes('cifraclub.com.br')) {
      toast.error('URL deve ser do cifraclub.com.br')
      return
    }

    setLoading(true)
    try {
      const data = await importFromCifraClub(u)
      setPreview(data)
      setEditDifficulty(data.difficulty)
      setEditGenre(data.genre || '')
      setStep('preview')
      toast.success(`"${data.title}" encontrada!`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao buscar cifra')
    } finally {
      setLoading(false)
    }
  }, [urlInput])

  const handleSave = async () => {
    if (!preview) return
    setSaving(true)
    try {
      const cifraToSave = {
        ...preview,
        difficulty: editDifficulty,
        genre: editGenre || preview.genre,
      }
      await saveCifraToRepertoire(cifraToSave, selectedInstruments)
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
    setUrlMode(false)
    setUrlInput('')
    setSearchResults([])
    setResultFilter('')
    setPreview(null)
    setSelectedInstruments(['Violão'])
    setEditDifficulty(1)
    setEditGenre('')
    setSelectedUrls(new Set())
    setBatchResults(null)
    setBatchImporting(false)
  }

  // Importação em lote
  const handleBatchImport = async () => {
    if (selectedUrls.size === 0) {
      toast.error('Selecione pelo menos uma música')
      return
    }
    setBatchImporting(true)
    setBatchResults(null)
    try {
      const urls = Array.from(selectedUrls)
      const response = await batchImportFromCifraClub(urls, selectedInstruments)
      setBatchResults(response.results)
      const { success, duplicates, errors } = response.summary
      if (success > 0) {
        toast.success(`${success} música${success > 1 ? 's' : ''} importada${success > 1 ? 's' : ''} com sucesso!`)
        onSuccess()
      }
      if (duplicates > 0) {
        toast.info(`${duplicates} já existia${duplicates > 1 ? 'm' : ''} no repertório`)
      }
      if (errors > 0) {
        toast.error(`${errors} falha${errors > 1 ? 's' : ''} na importação`)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro na importação em lote')
    } finally {
      setBatchImporting(false)
    }
  }

  const toggleSelectUrl = (url: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedUrls.size === filteredResults.length) {
      setSelectedUrls(new Set())
    } else {
      setSelectedUrls(new Set(filteredResults.map(r => r.url)))
    }
  }

  const handleBack = () => {
    if (step === 'preview') {
      setPreview(null)
      setStep(searchResults.length > 0 ? 'results' : 'search')
    } else if (step === 'results') {
      setBatchResults(null)
      setSelectedUrls(new Set())
      setStep('search')
    }
  }

  const toggleInstrument = (inst: string) => {
    setSelectedInstruments(prev =>
      prev.includes(inst)
        ? prev.filter(i => i !== inst)
        : [...prev, inst]
    )
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  // Filtrar resultados localmente
  const filteredResults = resultFilter
    ? searchResults.filter(r =>
        r.title.toLowerCase().includes(resultFilter.toLowerCase())
      )
    : searchResults

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`sm:max-w-[800px] bg-surface border-border max-h-[90vh] overflow-hidden flex flex-col ${step !== 'search' ? 'h-[85vh]' : ''}`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-serif text-[22px] flex items-center gap-2">
            <Lightning size={22} weight="fill" className="text-yellow-400" />
            Importar do <span className="text-accent">Cifra Club</span>
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
            {!urlMode ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Nome do artista, banda ou música</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Legião Urbana, Beatles, Ana Vilela..."
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      disabled={searching}
                      className="flex-1 h-11 text-sm"
                      autoFocus
                    />
                    <Button onClick={handleSearch} disabled={searching || !query.trim()} className="h-11 px-5">
                      {searching ? (
                        <SpinnerGap size={18} className="animate-spin" />
                      ) : (
                        <MagnifyingGlass size={18} />
                      )}
                      {searching ? 'Buscando...' : 'Buscar'}
                    </Button>
                  </div>
                  <p className="text-text3 text-[11px]">
                    Digite o nome do artista para ver a lista de músicas, ou o nome exato da música.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-text3 text-[10px] uppercase tracking-wider">ou</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <button
                  onClick={() => setUrlMode(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-card/80 text-text2 text-sm transition-colors"
                >
                  <LinkIcon size={16} className="text-text3" />
                  Tenho a URL da música no Cifra Club
                  <CaretRight size={14} className="ml-auto text-text3" />
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => setUrlMode(false)} className="text-text3 hover:text-text transition-colors">
                    <ArrowLeft size={16} />
                  </button>
                  <Label className="text-sm">Colar URL do Cifra Club</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.cifraclub.com.br/artista/musica/"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                    disabled={loading}
                    className="flex-1 h-11 text-sm font-mono"
                    autoFocus
                  />
                  <Button onClick={handleUrlImport} disabled={loading || !urlInput.trim()} className="h-11 px-5">
                    {loading ? (
                      <SpinnerGap size={18} className="animate-spin" />
                    ) : (
                      <MagnifyingGlass size={18} />
                    )}
                    {loading ? 'Importando...' : 'Importar'}
                  </Button>
                </div>
                <p className="text-text3 text-[11px]">
                  Ex: https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===== ETAPA 2: LISTA DE RESULTADOS ===== */}
        {step === 'results' && (
          <div className="flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="shrink-0 flex items-center justify-between gap-3 mb-2">
              <p className="text-text2 text-sm">
                <span className="font-semibold text-text">{searchResults.length}</span> música{searchResults.length > 1 ? 's' : ''} encontrada{searchResults.length > 1 ? 's' : ''}
                {searchResults[0]?.artist && (
                  <> de <span className="font-semibold text-accent">{searchResults[0].artist}</span></>
                )}
              </p>
              <div className="flex items-center gap-2">
                {searchResults.length > 10 && (
                  <Input
                    placeholder="Filtrar por nome..."
                    value={resultFilter}
                    onChange={e => setResultFilter(e.target.value)}
                    className="w-40 h-7 text-xs"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-7 text-[11px] text-text3 hover:text-text gap-1"
                >
                  {selectedUrls.size === filteredResults.length && filteredResults.length > 0 ? (
                    <CheckSquare size={14} weight="fill" className="text-accent" />
                  ) : (
                    <Square size={14} />
                  )}
                  {selectedUrls.size > 0 ? `${selectedUrls.size} selecionada${selectedUrls.size > 1 ? 's' : ''}` : 'Selecionar'}
                </Button>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8 gap-2 text-text3">
                <SpinnerGap size={20} className="animate-spin" />
                <span className="text-sm">Importando cifra completa...</span>
              </div>
            )}

            {batchImporting && (
              <div className="flex items-center justify-center py-8 gap-2 text-text3">
                <SpinnerGap size={20} className="animate-spin" />
                <span className="text-sm">Importando {selectedUrls.size} música{selectedUrls.size > 1 ? 's' : ''}...</span>
              </div>
            )}

            {!loading && !batchImporting && (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="space-y-1">
                  {filteredResults.map((result, i) => {
                    const isSelected = selectedUrls.has(result.url)
                    const batchStatus = batchResults?.find(r => r.url === result.url)
                    return (
                      <div
                        key={`${result.slug}-${i}`}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all group ${
                          batchStatus?.status === 'success'
                            ? 'border-green-500/30 bg-green-500/5'
                            : batchStatus?.status === 'duplicate'
                            ? 'border-yellow-500/30 bg-yellow-500/5'
                            : batchStatus?.status === 'error'
                            ? 'border-red-500/30 bg-red-500/5'
                            : isSelected
                            ? 'border-accent/30 bg-accent/5'
                            : 'border-transparent hover:border-accent/20 hover:bg-accent/5'
                        }`}
                      >
                        {/* Checkbox para seleção em lote */}
                        <button
                          onClick={() => toggleSelectUrl(result.url)}
                          className="shrink-0 p-0.5"
                          disabled={!!batchStatus}
                        >
                          {batchStatus?.status === 'success' ? (
                            <Check size={16} weight="bold" className="text-green-400" />
                          ) : batchStatus?.status === 'duplicate' ? (
                            <Check size={16} weight="bold" className="text-yellow-400" />
                          ) : batchStatus?.status === 'error' ? (
                            <X size={16} weight="bold" className="text-red-400" />
                          ) : isSelected ? (
                            <CheckSquare size={16} weight="fill" className="text-accent" />
                          ) : (
                            <Square size={16} className="text-text3 group-hover:text-text2" />
                          )}
                        </button>

                        {/* Conteúdo clicável → preview individual */}
                        <button
                          onClick={() => handleSelectSong(result)}
                          className="flex-1 flex items-center gap-3 min-w-0"
                          disabled={!!batchStatus}
                        >
                          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            <MusicNotes size={14} className="text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text truncate group-hover:text-accent transition-colors">
                              {result.title}
                            </p>
                            <p className="text-[11px] text-text3 truncate">
                              {result.artist}
                              {batchStatus?.status === 'success' && ' · Importada ✓'}
                              {batchStatus?.status === 'duplicate' && ' · Já existe'}
                              {batchStatus?.status === 'error' && ` · ${batchStatus.error}`}
                            </p>
                          </div>
                        </button>

                        <CaretRight size={14} className="text-text3 group-hover:text-accent shrink-0 transition-colors" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer com botão de importação em lote */}
            {selectedUrls.size > 0 && !batchResults && (
              <div className="shrink-0 flex items-center justify-between pt-3 border-t border-border mt-2">
                <p className="text-text3 text-[11px]">
                  <span className="text-accent font-semibold">{selectedUrls.size}</span> música{selectedUrls.size > 1 ? 's' : ''} selecionada{selectedUrls.size > 1 ? 's' : ''}
                  {selectedUrls.size > 20 && <span className="text-yellow-400"> (máx. 20 por vez)</span>}
                </p>
                <Button
                  onClick={handleBatchImport}
                  disabled={batchImporting}
                  className="gap-1.5"
                >
                  {batchImporting ? (
                    <SpinnerGap size={14} className="animate-spin" />
                  ) : (
                    <Stack size={14} weight="fill" />
                  )}
                  {batchImporting ? 'Importando...' : `Importar ${Math.min(selectedUrls.size, 20)} música${selectedUrls.size > 1 ? 's' : ''}`}
                </Button>
              </div>
            )}

            {/* Resumo após importação em lote */}
            {batchResults && (
              <div className="shrink-0 flex items-center justify-between pt-3 border-t border-border mt-2">
                <p className="text-text3 text-[11px]">
                  <span className="text-green-400 font-semibold">{batchResults.filter(r => r.status === 'success').length}</span> importadas
                  {batchResults.filter(r => r.status === 'duplicate').length > 0 && (
                    <> · <span className="text-yellow-400">{batchResults.filter(r => r.status === 'duplicate').length}</span> duplicadas</>
                  )}
                  {batchResults.filter(r => r.status === 'error').length > 0 && (
                    <> · <span className="text-red-400">{batchResults.filter(r => r.status === 'error').length}</span> erros</>
                  )}
                </p>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ===== ETAPA 3: PREVIEW ===== */}
        {step === 'preview' && preview && (
          <div className="flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header compacto */}
            <div className="shrink-0 flex items-center justify-between gap-3 py-3 border-b border-border">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-text truncate">{preview.title}</h3>
                <p className="text-text2 text-sm flex items-center gap-1.5">
                  <MicrophoneStage size={14} />
                  {preview.artist || 'Artista desconhecido'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {preview.key && (
                  <Badge variant="outline" className="font-mono text-xs">
                    Tom: {preview.key}
                  </Badge>
                )}
                <Badge className={`text-[10px] border ${DIFFICULTY_COLORS[editDifficulty] || ''}`}>
                  {DIFFICULTY_LABELS[editDifficulty]}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {preview.chords.length} acordes
                </Badge>
              </div>
            </div>

            {/* Tabs: Cifra | Dados */}
            <Tabs defaultValue="cifra" className="flex-1 min-h-0 flex flex-col mt-2">
              <TabsList className="shrink-0 grid w-full grid-cols-2 h-9">
                <TabsTrigger value="cifra" className="text-xs gap-1.5">
                  <MusicNotes size={14} /> Cifra Completa
                </TabsTrigger>
                <TabsTrigger value="dados" className="text-xs gap-1.5">
                  <ListBullets size={14} /> Dados & Ajustes
                </TabsTrigger>
              </TabsList>

              {/* Tab: Cifra completa */}
              <TabsContent value="cifra" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[300px] rounded-lg border border-border bg-bg p-4">
                  <CifraContentView content={preview.cifra_content} />
                </ScrollArea>
              </TabsContent>

              {/* Tab: Dados & Ajustes */}
              <TabsContent value="dados" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {/* Acordes */}
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-text3 text-[10px] font-medium uppercase tracking-wide mb-2">
                        Acordes ({preview.chords.length})
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {preview.chords.map(chord => (
                          <Badge key={chord} variant="secondary" className="text-xs font-mono px-2 py-0.5">
                            {chord}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Estrutura */}
                    {Object.keys(preview.chord_structure).length > 0 && (
                      <div className="rounded-lg border border-border bg-card p-3">
                        <p className="text-text3 text-[10px] font-medium uppercase tracking-wide mb-2">
                          Estrutura
                        </p>
                        <div className="space-y-1">
                          {Object.entries(preview.chord_structure).map(([section, chords]) => (
                            <div key={section} className="flex items-baseline gap-2 text-sm">
                              <span className="text-accent font-medium capitalize w-24 shrink-0 text-xs">
                                {section.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-text2 font-mono text-[11px]">
                                {chords}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ajustes */}
                    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                      <p className="text-text3 text-[10px] font-medium uppercase tracking-wide">
                        Ajustar antes de salvar
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Dificuldade</Label>
                          <Select
                            value={String(editDifficulty)}
                            onValueChange={val => setEditDifficulty(parseInt(val))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 - Iniciante</SelectItem>
                              <SelectItem value="2">2 - Fácil</SelectItem>
                              <SelectItem value="3">3 - Médio</SelectItem>
                              <SelectItem value="4">4 - Avançado</SelectItem>
                              <SelectItem value="5">5 - Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Gênero</Label>
                          <Select
                            value={editGenre || preview.genre || ''}
                            onValueChange={val => setEditGenre(val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Rock">Rock</SelectItem>
                              <SelectItem value="Pop">Pop</SelectItem>
                              <SelectItem value="Pop Rock">Pop Rock</SelectItem>
                              <SelectItem value="MPB">MPB</SelectItem>
                              <SelectItem value="Sertanejo">Sertanejo</SelectItem>
                              <SelectItem value="Reggae">Reggae</SelectItem>
                              <SelectItem value="Blues">Blues</SelectItem>
                              <SelectItem value="Jazz">Jazz</SelectItem>
                              <SelectItem value="Bossa Nova">Bossa Nova</SelectItem>
                              <SelectItem value="Forró">Forró</SelectItem>
                              <SelectItem value="Pagode">Pagode</SelectItem>
                              <SelectItem value="Samba">Samba</SelectItem>
                              <SelectItem value="Gospel">Gospel</SelectItem>
                              <SelectItem value="Country">Country</SelectItem>
                              <SelectItem value="Funk">Funk</SelectItem>
                              <SelectItem value="R&B">R&B</SelectItem>
                              <SelectItem value="Indie">Indie</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Instrumentos</Label>
                        <div className="flex gap-1.5 flex-wrap">
                          {INSTRUMENTS_OPTIONS.map(inst => (
                            <button
                              key={inst}
                              onClick={() => toggleInstrument(inst)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                                selectedInstruments.includes(inst)
                                  ? 'bg-accent/20 text-accent border-accent/40'
                                  : 'bg-card text-text3 border-border hover:border-text3'
                              }`}
                            >
                              {selectedInstruments.includes(inst) && <Check size={10} className="inline mr-1" />}
                              {inst}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* YouTube */}
                    {preview.youtube_url && (
                      <a
                        href={preview.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent text-xs hover:underline block"
                      >
                        Assistir no YouTube &rarr;
                      </a>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Footer fixo */}
            <div className="shrink-0 flex justify-between items-center pt-3 border-t border-border mt-2">
              <p className="text-text3 text-[11px]">
                Cifra Club &middot; Status: <span className="text-yellow-400">Rascunho</span>
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <X size={14} /> Limpar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
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
