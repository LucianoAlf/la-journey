import { useState, useRef, useCallback } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import {
  MagnifyingGlass, SpinnerGap, Guitar, MicrophoneStage,
  Plus, MusicNotes, ArrowLeft, CaretRight, Lightning,
  FileArrowUp, MusicNotesSimple, Trash, FloppyDisk,
  PianoKeys, Metronome, CheckCircle, Warning,
  FileText, Upload, Eye, Check, X, GlobeSimple,
  PencilSimple, NotePencil
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'

// Services
import {
  searchCifraClub, importFromCifraClub, saveCifraToRepertoire,
  searchSongsterr, enrichFromSongsterr, saveSongsterrToRepertoire,
  createSong,
} from '@/services/repertoireService'
import { saveChordProToRepertoire } from '@/services/repertoireService'
import { uploadGpFile, updateGpFileUrl } from '@/services/gpFileService'
import type { CifraSearchResult, CifraData, SongsterrSearchResult, SongsterrImportData } from '@/services/repertoireService'

// Parser ChordPro
import { parseChordPro, parseMultipleChordPro } from '@/lib/chordproParser'
import type { ChordProParsed } from '@/lib/chordproParser'

interface UnifiedImportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  onOpenEditor?: () => void // Abrir RepertoireModal para "Criar do Zero"
}

// ─── Constantes ───

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Iniciante', 2: 'Fácil', 3: 'Médio', 4: 'Avançado', 5: 'Expert',
}

const GENRE_OPTIONS = [
  'Rock', 'Pop Rock', 'MPB', 'Pop', 'Blues', 'Jazz', 'Reggae',
  'Bossa Nova', 'Country', 'Metal', 'Sertanejo', 'Forró', 'Samba', 'Gospel',
]

// ─── Helpers GP ───

function guessInstrument(track: alphaTabModule.model.Track): string {
  const name = (track.name ?? '').toLowerCase()
  const program = track.playbackInfo?.program ?? 0
  const isPercussion = track.playbackInfo?.primaryChannel === 9 || track.playbackInfo?.secondaryChannel === 9
  if (isPercussion || name.includes('drum') || name.includes('bateria')) return 'Bateria'
  if (name.includes('vocal') || name.includes('voice') || name.includes('voz')) return 'Canto'
  if (name.includes('bass') || name.includes('baixo') || (program >= 32 && program <= 39)) return 'Baixo'
  if (name.includes('piano') || name.includes('keyboard') || name.includes('teclado') || (program >= 0 && program <= 7) || (program >= 16 && program <= 23)) return 'Teclado'
  if (name.includes('ukulele') || name.includes('uke')) return 'Ukulele'
  if (name.includes('electric') || name.includes('lead') || name.includes('distortion') || (program >= 29 && program <= 31)) return 'Guitarra'
  if (program >= 24 && program <= 31) return 'Violão'
  return 'Violão'
}

function parseFilename(filename: string): { title: string; artist: string } {
  const clean = filename.replace(/\.\w+$/, '').replace(/[-_]\d{2}[-_]\d{2}[-_]\d{4}$/, '').replace(/_/g, ' ').trim()
  const sep = clean.includes(' - ') ? ' - ' : clean.includes('-') ? '-' : null
  if (sep) {
    const parts = clean.split(sep).map(s => s.trim())
    if (parts.length >= 2) return { artist: parts[0], title: parts.slice(1).join(' - ') }
  }
  return { title: clean, artist: '' }
}

// ─── Sub-componentes de preview ───

function CifraPreview({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="font-mono text-[11px] leading-[1.6] whitespace-pre-wrap">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (/^\[.*\]$/.test(trimmed)) {
          return <div key={i} className="text-accent font-bold mt-2 mb-0.5 text-[12px]">{trimmed}</div>
        }
        const chordPattern = /^[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9])*(?:\/[A-G][#b]?)?$/
        const tokens = trimmed.split(/\s+/)
        const chordRatio = tokens.filter(t => chordPattern.test(t) || t === '|').length / (tokens.length || 1)
        if (chordRatio > 0.5 && trimmed.length > 0) {
          return <div key={i} className="text-accent font-semibold">{line}</div>
        }
        if (!trimmed) return <div key={i} className="h-1.5" />
        return <div key={i} className="text-text">{line}</div>
      })}
    </div>
  )
}

// ─── Modal Principal ───

export function UnifiedImportModal({ open, onClose, onSuccess, onOpenEditor }: UnifiedImportModalProps) {
  const [activeTab, setActiveTab] = useState('search')

  // ─── Estado: Busca Online (Cifra Club + Songsterr) ───
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSource, setSearchSource] = useState<'cifraclub' | 'songsterr'>('cifraclub')
  const [searching, setSearching] = useState(false)
  const [cifraResults, setCifraResults] = useState<CifraSearchResult[]>([])
  const [songsterrResults, setSongsterrResults] = useState<SongsterrSearchResult[]>([])
  const [searchStep, setSearchStep] = useState<'search' | 'results' | 'preview'>('search')
  const [cifraPreview, setCifraPreview] = useState<CifraData | null>(null)
  const [songsterrPreview, setSongsterrPreview] = useState<SongsterrImportData | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [savingSearch, setSavingSearch] = useState(false)

  // ─── Estado: Guitar Pro ───
  const gpInputRef = useRef<HTMLInputElement>(null)
  const [gpFile, setGpFile] = useState<File | null>(null)
  const [gpParsing, setGpParsing] = useState(false)
  const [gpParsed, setGpParsed] = useState<{
    title: string; artist: string; tracks: { name: string; instrument: string }[];
    instruments: string[]; genre: string; difficulty: number; tempo: number
  } | null>(null)
  const [gpError, setGpError] = useState<string | null>(null)
  const [gpSaving, setGpSaving] = useState(false)
  const [gpTitle, setGpTitle] = useState('')
  const [gpArtist, setGpArtist] = useState('')
  const [gpGenre, setGpGenre] = useState('')
  const [gpDifficulty, setGpDifficulty] = useState(3)

  // ─── Estado: ChordPro ───
  const [cpRaw, setCpRaw] = useState('')
  const [cpPreview, setCpPreview] = useState<ChordProParsed | null>(null)
  const [cpBatch, setCpBatch] = useState<ChordProParsed[]>([])
  const [cpStep, setCpStep] = useState<'input' | 'preview' | 'batch'>('input')
  const [cpSaving, setCpSaving] = useState(false)
  const [cpDifficulty, setCpDifficulty] = useState(1)
  const [cpGenre, setCpGenre] = useState('')

  // ─── Reset completo ───
  const resetAll = useCallback(() => {
    setSearchQuery('')
    setSearching(false)
    setCifraResults([])
    setSongsterrResults([])
    setSearchStep('search')
    setCifraPreview(null)
    setSongsterrPreview(null)
    setLoadingPreview(false)
    setSavingSearch(false)
    setGpFile(null)
    setGpParsing(false)
    setGpParsed(null)
    setGpError(null)
    setGpSaving(false)
    setGpTitle('')
    setGpArtist('')
    setGpGenre('')
    setGpDifficulty(3)
    setCpRaw('')
    setCpPreview(null)
    setCpBatch([])
    setCpStep('input')
    setCpSaving(false)
    setCpDifficulty(1)
    setCpGenre('')
  }, [])

  const handleClose = useCallback(() => {
    resetAll()
    onClose()
  }, [resetAll, onClose])

  // ═══════════════════════════════════════════
  // ABA 1: BUSCAR ONLINE
  // ═══════════════════════════════════════════

  const handleOnlineSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (!q) return

    setSearching(true)
    setCifraResults([])
    setSongsterrResults([])

    try {
      if (searchSource === 'cifraclub') {
        const results = await searchCifraClub(q)
        setCifraResults(results)
        if (results.length > 0) {
          setSearchStep('results')
          toast.success(`${results.length} resultado${results.length > 1 ? 's' : ''} no Cifra Club`)
        } else {
          toast.info('Nenhum resultado no Cifra Club. Tente o Songsterr.')
        }
      } else {
        const results = await searchSongsterr(q)
        setSongsterrResults(results)
        if (results.length > 0) {
          setSearchStep('results')
          toast.success(`${results.length} resultado${results.length > 1 ? 's' : ''} no Songsterr`)
        } else {
          toast.info('Nenhum resultado no Songsterr. Tente o Cifra Club.')
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao buscar')
    } finally {
      setSearching(false)
    }
  }, [searchQuery, searchSource])

  const handleSelectCifra = useCallback(async (result: CifraSearchResult) => {
    setLoadingPreview(true)
    try {
      const data = await importFromCifraClub(result.url)
      setCifraPreview(data)
      setSearchStep('preview')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar cifra')
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const handleSelectSongsterr = useCallback(async (result: SongsterrSearchResult) => {
    setLoadingPreview(true)
    try {
      const data = await enrichFromSongsterr(result.songId, result.artist, result.title)
      setSongsterrPreview(data)
      setSearchStep('preview')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar dados do Songsterr')
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const handleSaveCifra = useCallback(async () => {
    if (!cifraPreview) return
    setSavingSearch(true)
    try {
      await saveCifraToRepertoire(cifraPreview, ['Violão'])
      toast.success(`"${cifraPreview.title}" importada!`)
      onSuccess()
      handleClose()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar')
    } finally {
      setSavingSearch(false)
    }
  }, [cifraPreview, onSuccess, handleClose])

  const handleSaveSongsterr = useCallback(async () => {
    if (!songsterrPreview) return
    setSavingSearch(true)
    try {
      await saveSongsterrToRepertoire(songsterrPreview)
      toast.success(`"${songsterrPreview.title}" importada!`)
      onSuccess()
      handleClose()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar')
    } finally {
      setSavingSearch(false)
    }
  }, [songsterrPreview, onSuccess, handleClose])

  // ═══════════════════════════════════════════
  // ABA 2: GUITAR PRO
  // ═══════════════════════════════════════════

  const handleGpFileSelect = useCallback(async (file: File) => {
    setGpFile(file)
    setGpParsing(true)
    setGpError(null)
    setGpParsed(null)

    try {
      const buffer = await file.arrayBuffer()
      const data = new Uint8Array(buffer)
      const settings = new alphaTabModule.Settings()
      const score = alphaTabModule.importer.ScoreLoader.loadScoreFromBytes(data, settings)

      const tracks = score.tracks.map((t: alphaTabModule.model.Track) => ({
        name: t.name || `Track ${t.index + 1}`,
        instrument: guessInstrument(t),
      }))
      const instruments = [...new Set(tracks.map(t => t.instrument))]
      const fromFile = parseFilename(file.name)
      const finalTitle = score.title?.trim() || fromFile.title
      const finalArtist = score.artist?.trim() || fromFile.artist
      let tempo = 120
      if (score.masterBars.length > 0 && score.masterBars[0].tempoAutomation) {
        tempo = Math.round(score.masterBars[0].tempoAutomation.value)
      }

      const parsedData = { title: finalTitle, artist: finalArtist, tracks, instruments, genre: 'Rock', difficulty: 3, tempo }
      setGpParsed(parsedData)
      setGpTitle(parsedData.title)
      setGpArtist(parsedData.artist)
      setGpGenre(parsedData.genre)
      setGpDifficulty(parsedData.difficulty)
    } catch (err: any) {
      setGpError(err?.message || 'Erro ao ler arquivo')
    } finally {
      setGpParsing(false)
    }
  }, [])

  const handleGpSave = useCallback(async () => {
    if (!gpFile || !gpTitle.trim()) return
    setGpSaving(true)
    try {
      const created = await createSong({
        title: gpTitle.trim(),
        artist: gpArtist.trim() || null,
        genre: gpGenre || null,
        difficulty: gpDifficulty,
        instruments: gpParsed?.instruments ?? ['Violão'],
        chords: [],
        bpm: gpParsed?.tempo ?? null,
        cifra_source: 'gp_import' as any,
      })
      if (!created?.id) throw new Error('Erro ao criar música')
      const url = await uploadGpFile(gpFile, created.id)
      await updateGpFileUrl(created.id, url)
      toast.success(`"${gpTitle}" importada! 🎸`)
      onSuccess()
      handleClose()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar')
    } finally {
      setGpSaving(false)
    }
  }, [gpFile, gpTitle, gpArtist, gpGenre, gpDifficulty, gpParsed, onSuccess, handleClose])

  // ═══════════════════════════════════════════
  // ABA 3: CHORDPRO
  // ═══════════════════════════════════════════

  const handleCpFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const allFiles = Array.from(files)
    if (allFiles.length === 1) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        if (!content) return
        setCpRaw(content)
        handleCpParseSingle(content)
      }
      reader.readAsText(allFiles[0])
    } else {
      const parsed: ChordProParsed[] = []
      let loaded = 0
      for (const file of allFiles) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const content = ev.target?.result as string
          if (content) {
            const result = parseChordPro(content)
            if (result.title === 'Sem título') result.title = file.name.replace(/\.(cho|chopro|pro|crd|chordpro|chord)$/i, '')
            parsed.push(result)
          }
          loaded++
          if (loaded === allFiles.length) {
            setCpBatch(parsed)
            setCpStep('batch')
            toast.success(`${parsed.length} música${parsed.length > 1 ? 's' : ''} detectada${parsed.length > 1 ? 's' : ''}`)
          }
        }
        reader.readAsText(file)
      }
    }
    e.target.value = ''
  }, [])

  const handleCpParseSingle = useCallback((content?: string) => {
    const text = content || cpRaw
    if (!text.trim()) return

    const songs = parseMultipleChordPro(text)
    if (songs.length > 1) {
      setCpBatch(songs)
      setCpStep('batch')
      toast.success(`${songs.length} músicas detectadas`)
      return
    }

    const parsed = parseChordPro(text)
    setCpPreview(parsed)
    setCpDifficulty(parsed.chords.length > 8 ? 3 : parsed.chords.length > 4 ? 2 : 1)
    setCpGenre(parsed.genre || '')
    setCpStep('preview')
  }, [cpRaw])

  const handleCpSaveSingle = useCallback(async () => {
    if (!cpPreview) return
    setCpSaving(true)
    try {
      await saveChordProToRepertoire({
        title: cpPreview.title,
        artist: cpPreview.artist || null,
        chords: cpPreview.chords,
        key: cpPreview.key,
        genre: cpGenre || cpPreview.genre,
        difficulty: cpDifficulty,
        cifra_content: cpPreview.cifraContent,
        lyrics: cpPreview.lyrics || null,
        bpm: cpPreview.bpm,
        capo: cpPreview.capo,
        time_signature: cpPreview.timeSignature,
        sections: cpPreview.sections,
      }, ['Violão'])
      toast.success(`"${cpPreview.title}" importada!`)
      onSuccess()
      handleClose()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar')
    } finally {
      setCpSaving(false)
    }
  }, [cpPreview, cpDifficulty, cpGenre, onSuccess, handleClose])

  const handleCpBatchSave = useCallback(async () => {
    if (cpBatch.length === 0) return
    setCpSaving(true)
    let success = 0, errors = 0
    for (const p of cpBatch) {
      try {
        await saveChordProToRepertoire({
          title: p.title, artist: p.artist || null, chords: p.chords, key: p.key,
          genre: p.genre, difficulty: p.chords.length > 8 ? 3 : p.chords.length > 4 ? 2 : 1,
          cifra_content: p.cifraContent, lyrics: p.lyrics || null, bpm: p.bpm,
          capo: p.capo, time_signature: p.timeSignature, sections: p.sections,
        }, ['Violão'])
        success++
      } catch { errors++ }
    }
    if (success > 0) { toast.success(`${success} música${success > 1 ? 's' : ''} importada${success > 1 ? 's' : ''}!`); onSuccess() }
    if (errors > 0) toast.error(`${errors} falha${errors > 1 ? 's' : ''}`)
    setCpSaving(false)
    if (errors === 0) handleClose()
  }, [cpBatch, onSuccess, handleClose])

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-[780px] bg-surface border-border max-h-[88vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="font-serif text-[22px] flex items-center gap-2">
            <Plus size={22} weight="bold" className="text-accent" />
            Adicionar <span className="text-accent">Música</span>
          </DialogTitle>
          <p className="text-[12px] text-text3 mt-1">
            Importe de diversas fontes ou crie do zero
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start gap-0 rounded-none border-b border-border bg-transparent px-6 shrink-0 h-auto py-0">
            <TabsTrigger
              value="search"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-accent data-[state=active]:bg-transparent px-4 py-2.5 text-[12px] gap-1.5"
            >
              <GlobeSimple size={15} weight="fill" />
              Buscar Online
            </TabsTrigger>
            <TabsTrigger
              value="gp"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-400 data-[state=active]:text-green-400 data-[state=active]:bg-transparent px-4 py-2.5 text-[12px] gap-1.5"
            >
              <FileArrowUp size={15} weight="fill" />
              Guitar Pro
            </TabsTrigger>
            <TabsTrigger
              value="chordpro"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-400 data-[state=active]:text-purple-400 data-[state=active]:bg-transparent px-4 py-2.5 text-[12px] gap-1.5"
            >
              <FileText size={15} weight="fill" />
              ChordPro
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-amber-400 data-[state=active]:bg-transparent px-4 py-2.5 text-[12px] gap-1.5"
            >
              <NotePencil size={15} weight="fill" />
              Criar do Zero
            </TabsTrigger>
          </TabsList>

          {/* ═══ ABA: BUSCAR ONLINE ═══ */}
          <TabsContent value="search" className="flex-1 overflow-y-auto px-6 py-4 m-0">
            {searchStep === 'search' && (
              <div className="space-y-4">
                {/* Toggle de fonte */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSearchSource('cifraclub')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                      searchSource === 'cifraclub'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-text3 hover:text-text2 border border-border'
                    }`}
                  >
                    <Lightning size={14} weight="fill" /> Cifra Club
                  </button>
                  <button
                    onClick={() => setSearchSource('songsterr')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                      searchSource === 'songsterr'
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'text-text3 hover:text-text2 border border-border'
                    }`}
                  >
                    <Guitar size={14} weight="fill" /> Songsterr
                  </button>
                </div>

                {/* Barra de busca */}
                <div className="flex gap-2">
                  <Input
                    placeholder={searchSource === 'cifraclub' ? 'Ex: Legião Urbana, Beatles...' : 'Ex: Wonderwall Oasis, Stairway...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleOnlineSearch()}
                    disabled={searching}
                    className="flex-1 h-11 text-[13px]"
                    autoFocus
                  />
                  <Button onClick={handleOnlineSearch} disabled={searching || !searchQuery.trim()} className="h-11 px-5">
                    {searching ? <SpinnerGap size={18} className="animate-spin" /> : <MagnifyingGlass size={18} />}
                    {searching ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>

                <p className="text-text3 text-[11px]">
                  {searchSource === 'cifraclub'
                    ? 'Busca cifras com acordes e letra diretamente do Cifra Club.'
                    : 'Busca tablaturas profissionais do Songsterr com tablatura GP.'}
                </p>
              </div>
            )}

            {searchStep === 'results' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSearchStep('search')}>
                    <ArrowLeft size={14} /> Voltar
                  </Button>
                  <span className="text-[12px] text-text3">
                    {searchSource === 'cifraclub' ? cifraResults.length : songsterrResults.length} resultado(s)
                  </span>
                </div>

                <ScrollArea className="h-[380px]">
                  <div className="space-y-1.5">
                    {searchSource === 'cifraclub' && cifraResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectCifra(r)}
                        disabled={loadingPreview}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/30 hover:bg-accent/5 transition-colors text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-text truncate">{r.title}</div>
                          <div className="text-[11px] text-text3">{r.artist}</div>
                        </div>
                        <CaretRight size={14} className="text-text3 shrink-0" />
                      </button>
                    ))}
                    {searchSource === 'songsterr' && songsterrResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSongsterr(r)}
                        disabled={loadingPreview}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-orange-500/30 hover:bg-orange-500/5 transition-colors text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-text truncate">{r.title}</div>
                          <div className="text-[11px] text-text3">{r.artist}</div>
                        </div>
                        <CaretRight size={14} className="text-text3 shrink-0" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                {loadingPreview && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <SpinnerGap size={18} className="animate-spin text-accent" />
                    <span className="text-[12px] text-text2">Carregando detalhes...</span>
                  </div>
                )}
              </div>
            )}

            {searchStep === 'preview' && cifraPreview && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setCifraPreview(null); setSearchStep('results') }}>
                    <ArrowLeft size={14} /> Voltar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Título</Label>
                    <Input value={cifraPreview.title} readOnly className="h-9 text-[13px]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Artista</Label>
                    <Input value={cifraPreview.artist} readOnly className="h-9 text-[13px]" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {cifraPreview.chords.slice(0, 8).map(c => (
                    <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>
                  ))}
                  {cifraPreview.chords.length > 8 && (
                    <Badge variant="secondary" className="text-[10px]">+{cifraPreview.chords.length - 8}</Badge>
                  )}
                </div>

                <ScrollArea className="h-[200px] rounded-lg border border-border p-3">
                  <CifraPreview content={cifraPreview.cifra_content} />
                </ScrollArea>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button onClick={handleSaveCifra} disabled={savingSearch}>
                    {savingSearch ? <SpinnerGap size={14} className="animate-spin" /> : <Check size={14} />}
                    Importar para Repertório
                  </Button>
                </div>
              </div>
            )}

            {searchStep === 'preview' && songsterrPreview && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setSongsterrPreview(null); setSearchStep('results') }}>
                    <ArrowLeft size={14} /> Voltar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Título</Label>
                    <Input value={songsterrPreview.title} readOnly className="h-9 text-[13px]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Artista</Label>
                    <Input value={songsterrPreview.artist} readOnly className="h-9 text-[13px]" />
                  </div>
                </div>

                {songsterrPreview.tracks && songsterrPreview.tracks.length > 0 && (
                  <div>
                    <Label className="text-[11px] mb-1">Tracks ({songsterrPreview.tracks.length})</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {songsterrPreview.tracks.map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{t.friendly || t.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button onClick={handleSaveSongsterr} disabled={savingSearch}>
                    {savingSearch ? <SpinnerGap size={14} className="animate-spin" /> : <Check size={14} />}
                    Importar para Repertório
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ ABA: GUITAR PRO ═══ */}
          <TabsContent value="gp" className="flex-1 overflow-y-auto px-6 py-4 m-0">
            <input
              ref={gpInputRef}
              type="file"
              accept=".gp,.gp3,.gp4,.gp5,.gpx,.gp7,.musicxml,.mxl"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGpFileSelect(f); e.target.value = '' }}
              className="hidden"
            />

            {!gpParsed && !gpParsing && !gpError && (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleGpFileSelect(f) }}
                onClick={() => gpInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed border-border hover:border-green-400/40 hover:bg-green-400/5 transition-colors cursor-pointer"
              >
                <FileArrowUp size={36} className="text-text3" />
                <p className="text-[13px] font-medium text-text">Arraste o arquivo GP aqui ou clique para selecionar</p>
                <p className="text-[11px] text-text3">.gp, .gp3, .gp4, .gp5, .gpx, .gp7, .musicxml</p>
              </div>
            )}

            {gpParsing && (
              <div className="flex flex-col items-center gap-3 py-12">
                <SpinnerGap size={28} className="animate-spin text-green-400" />
                <p className="text-[13px] text-text2">Lendo metadados do arquivo...</p>
              </div>
            )}

            {gpError && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Warning size={28} className="text-red-400" />
                <p className="text-[13px] text-red-400">{gpError}</p>
                <Button variant="ghost" size="sm" onClick={() => { setGpFile(null); setGpError(null); setGpParsed(null) }}>
                  Tentar outro arquivo
                </Button>
              </div>
            )}

            {gpParsed && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle size={16} weight="fill" className="text-green-400 shrink-0" />
                  <MusicNotesSimple size={14} className="text-green-400 shrink-0" />
                  <span className="text-[11px] text-green-300 truncate flex-1">{gpFile?.name}</span>
                  <span className="text-[10px] text-text3">{((gpFile?.size ?? 0) / 1024).toFixed(0)} KB</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-text3 hover:text-red-400" onClick={() => { setGpFile(null); setGpParsed(null) }}>
                    <Trash size={12} />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {gpParsed.tracks.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1 py-0.5">
                      {t.instrument === 'Bateria' && <Metronome size={10} />}
                      {t.instrument === 'Canto' && <MicrophoneStage size={10} />}
                      {t.instrument === 'Teclado' && <PianoKeys size={10} />}
                      {(t.instrument === 'Violão' || t.instrument === 'Guitarra' || t.instrument === 'Baixo') && <Guitar size={10} />}
                      {t.name}
                    </Badge>
                  ))}
                </div>

                {gpParsed.tempo > 0 && (
                  <p className="text-[11px] text-text3">Tempo: <span className="text-text font-medium">{gpParsed.tempo} BPM</span></p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Título</Label>
                    <Input value={gpTitle} onChange={e => setGpTitle(e.target.value)} className="h-9 text-[13px]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Artista</Label>
                    <Input value={gpArtist} onChange={e => setGpArtist(e.target.value)} className="h-9 text-[13px]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Gênero</Label>
                    <Select value={gpGenre} onValueChange={setGpGenre}>
                      <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {GENRE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Dificuldade</Label>
                    <Select value={String(gpDifficulty)} onValueChange={v => setGpDifficulty(parseInt(v))}>
                      <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(d => <SelectItem key={d} value={String(d)}>{d} — {DIFFICULTY_LABELS[d]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button onClick={handleGpSave} disabled={gpSaving || !gpTitle.trim()}>
                    {gpSaving ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                    {gpSaving ? 'Importando...' : 'Importar Música'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ ABA: CHORDPRO ═══ */}
          <TabsContent value="chordpro" className="flex-1 overflow-y-auto px-6 py-4 m-0">
            {cpStep === 'input' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border hover:border-purple-400/40 hover:bg-purple-400/5 transition-colors rounded-xl">
                  <label className="flex flex-col items-center justify-center p-6 cursor-pointer gap-2">
                    <Upload size={28} className="text-text3" />
                    <span className="text-[12px] text-text2">Upload de arquivos .cho / .chopro / .pro</span>
                    <span className="text-[10px] text-text3">Suporta múltiplos para importação em lote</span>
                    <input
                      type="file"
                      accept=".cho,.chopro,.pro,.crd,.chordpro,.chord,.txt"
                      multiple
                      className="hidden"
                      onChange={handleCpFileUpload}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-text3 text-[10px] uppercase tracking-wider">ou cole o conteúdo</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <Textarea
                  placeholder={`{title: Nome da Música}\n{artist: Artista}\n{key: Am}\n\n[Am]Primeira linha [C]com acordes`}
                  value={cpRaw}
                  onChange={(e) => setCpRaw(e.target.value)}
                  rows={10}
                  className="font-mono text-[11px]"
                />

                <div className="flex justify-end">
                  <Button onClick={() => handleCpParseSingle()} disabled={!cpRaw.trim()}>
                    <Eye size={14} /> Analisar
                  </Button>
                </div>
              </div>
            )}

            {cpStep === 'preview' && cpPreview && (
              <div className="space-y-3">
                <Button variant="ghost" size="sm" onClick={() => setCpStep('input')}>
                  <ArrowLeft size={14} /> Voltar
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Título</Label>
                    <Input value={cpPreview.title} readOnly className="h-9 text-[13px]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Artista</Label>
                    <Input value={cpPreview.artist || ''} readOnly className="h-9 text-[13px]" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {cpPreview.chords.map(c => (
                    <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Dificuldade</Label>
                    <Select value={String(cpDifficulty)} onValueChange={v => setCpDifficulty(Number(v))}>
                      <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(d => <SelectItem key={d} value={String(d)}>{d} — {DIFFICULTY_LABELS[d]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Gênero</Label>
                    <Input value={cpGenre} onChange={e => setCpGenre(e.target.value)} placeholder="Ex: Rock, MPB" className="h-9 text-[13px]" />
                  </div>
                </div>

                <ScrollArea className="h-[180px] rounded-lg border border-border p-3">
                  <CifraPreview content={cpPreview.cifraContent} />
                </ScrollArea>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button onClick={handleCpSaveSingle} disabled={cpSaving}>
                    {cpSaving ? <SpinnerGap size={14} className="animate-spin" /> : <Check size={14} />}
                    Importar para Repertório
                  </Button>
                </div>
              </div>
            )}

            {cpStep === 'batch' && (
              <div className="space-y-3">
                <Button variant="ghost" size="sm" onClick={() => setCpStep('input')}>
                  <ArrowLeft size={14} /> Voltar
                </Button>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-1.5">
                    {cpBatch.map((song, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium text-text truncate">{song.title}</div>
                          <div className="text-[10px] text-text3">{song.artist || 'Sem artista'} · {song.chords.length} acordes</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {song.chords.slice(0, 3).map(c => (
                            <Badge key={c} variant="outline" className="font-mono text-[9px]">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button onClick={handleCpBatchSave} disabled={cpSaving}>
                    {cpSaving ? <SpinnerGap size={14} className="animate-spin" /> : <MusicNotes size={14} />}
                    Importar {cpBatch.length} música{cpBatch.length > 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ ABA: CRIAR DO ZERO ═══ */}
          <TabsContent value="manual" className="flex-1 overflow-y-auto px-6 py-4 m-0">
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <NotePencil size={32} weight="duotone" className="text-amber-400" />
              </div>
              <div className="text-center">
                <h3 className="text-[16px] font-serif font-semibold text-text">Criar música do zero</h3>
                <p className="text-[12px] text-text3 mt-1 max-w-xs">
                  Preencha manualmente os dados da música: título, artista, acordes, cifra e muito mais.
                </p>
              </div>
              <Button
                onClick={() => {
                  handleClose()
                  onOpenEditor?.()
                }}
                className="mt-2"
              >
                <PencilSimple size={16} />
                Abrir Formulário
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
