import { useState, useRef, useCallback } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import {
  FileArrowUp, SpinnerGap, MusicNotesSimple, Trash, FloppyDisk,
  Guitar, PianoKeys, MicrophoneStage, Metronome, CheckCircle, Warning
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createSong } from '@/services/repertoireService'
import { uploadGpFile, updateGpFileUrl } from '@/services/gpFileService'

interface GpImportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

/** Mapa MIDI program → instrumento legível */
function guessInstrument(track: alphaTabModule.model.Track): string {
  const name = (track.name ?? '').toLowerCase()
  const program = track.playbackInfo?.program ?? 0
  const isPercussion = track.playbackInfo?.primaryChannel === 9 || track.playbackInfo?.secondaryChannel === 9

  if (isPercussion || name.includes('drum') || name.includes('percussion') || name.includes('bateria'))
    return 'Bateria'
  if (name.includes('vocal') || name.includes('voice') || name.includes('voz') || name.includes('sing'))
    return 'Canto'
  if (name.includes('bass') || name.includes('baixo') || (program >= 32 && program <= 39))
    return 'Baixo'
  if (name.includes('piano') || name.includes('keyboard') || name.includes('teclado') || name.includes('organ') || name.includes('synth') || (program >= 0 && program <= 7) || (program >= 16 && program <= 23))
    return 'Teclado'
  if (name.includes('guitar') || name.includes('guitarra') || name.includes('violão') || name.includes('acoustic') || (program >= 24 && program <= 31))
    return name.includes('electric') || name.includes('lead') || name.includes('rhythm') || name.includes('distortion') || (program >= 29 && program <= 31) ? 'Guitarra' : 'Violão'
  if (name.includes('ukulele') || name.includes('uke'))
    return 'Ukulele'

  // Fallback por programa MIDI
  if (program >= 24 && program <= 31) return 'Violão'
  return 'Violão'
}

/** Estima gênero a partir do nome do arquivo */
function guessGenre(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('blues')) return 'Blues'
  if (lower.includes('jazz')) return 'Jazz'
  if (lower.includes('bossa')) return 'Bossa Nova'
  if (lower.includes('samba')) return 'Samba'
  if (lower.includes('reggae')) return 'Reggae'
  if (lower.includes('country')) return 'Country'
  if (lower.includes('metal') || lower.includes('heavy')) return 'Rock'
  return 'Rock'
}

/** Extrai título e artista do nome do arquivo */
function parseFilename(filename: string): { title: string; artist: string } {
  // Remove extensão e data
  const clean = filename
    .replace(/\.\w+$/, '')
    .replace(/[-_]\d{2}[-_]\d{2}[-_]\d{4}$/, '')
    .replace(/_/g, ' ')
    .trim()

  // Padrão: "Artista - Título" ou "Artista-Título"
  const sep = clean.includes(' - ') ? ' - ' : clean.includes('-') ? '-' : null
  if (sep) {
    const parts = clean.split(sep).map(s => s.trim())
    if (parts.length >= 2) {
      return { artist: parts[0], title: parts.slice(1).join(' - ') }
    }
  }
  return { title: clean, artist: '' }
}

interface ParsedGpData {
  title: string
  artist: string
  tracks: { name: string; instrument: string }[]
  instruments: string[]
  genre: string
  difficulty: number
  tempo: number
}

export function GpImportModal({ open, onClose, onSuccess }: GpImportModalProps) {
  const gpInputRef = useRef<HTMLInputElement>(null)
  const [gpFile, setGpFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedGpData | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Campos editáveis
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [genre, setGenre] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [mainInstrument, setMainInstrument] = useState('')

  const resetState = useCallback(() => {
    setGpFile(null)
    setParsed(null)
    setParseError(null)
    setParsing(false)
    setSaving(false)
    setTitle('')
    setArtist('')
    setGenre('')
    setDifficulty(3)
    setMainInstrument('')
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  /** Parse o arquivo GP usando AlphaTab ScoreLoader */
  const handleFileSelect = useCallback(async (file: File) => {
    setGpFile(file)
    setParsing(true)
    setParseError(null)
    setParsed(null)

    try {
      const buffer = await file.arrayBuffer()
      const data = new Uint8Array(buffer)
      const settings = new alphaTabModule.Settings()
      const score = alphaTabModule.importer.ScoreLoader.loadScoreFromBytes(data, settings)

      // Extrair dados
      const tracks = score.tracks.map((t: alphaTabModule.model.Track) => ({
        name: t.name || `Track ${t.index + 1}`,
        instrument: guessInstrument(t),
      }))

      const instruments = [...new Set(tracks.map(t => t.instrument))]

      // Tentar pegar título/artista do score, fallback do nome do arquivo
      const fromFile = parseFilename(file.name)
      const scoreTitle = score.title?.trim() || ''
      const scoreArtist = score.artist?.trim() || ''

      const finalTitle = scoreTitle || fromFile.title
      const finalArtist = scoreArtist || fromFile.artist

      // Pegar tempo do primeiro MasterBar
      let tempo = 120
      if (score.masterBars.length > 0) {
        const firstBar = score.masterBars[0]
        if (firstBar.tempoAutomation) {
          tempo = Math.round(firstBar.tempoAutomation.value)
        }
      }

      const parsedData: ParsedGpData = {
        title: finalTitle,
        artist: finalArtist,
        tracks,
        instruments,
        genre: guessGenre(file.name),
        difficulty: 3,
        tempo,
      }

      setParsed(parsedData)
      setTitle(parsedData.title)
      setArtist(parsedData.artist)
      setGenre(parsedData.genre)
      setDifficulty(parsedData.difficulty)
      setMainInstrument(instruments[0] ?? 'Violão')

    } catch (err: any) {
      console.error('[GP Import] Erro ao parsear:', err)
      setParseError(err?.message || 'Erro ao ler arquivo')
    } finally {
      setParsing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ''
  }, [handleFileSelect])

  /** Salvar no banco + upload do arquivo */
  const handleSave = useCallback(async () => {
    if (!gpFile || !title.trim()) {
      toast.error('Informe pelo menos o título da música')
      return
    }

    setSaving(true)
    try {
      // 1. Criar a música no repertoire
      const payload = {
        title: title.trim(),
        artist: artist.trim() || null,
        genre: genre || null,
        difficulty,
        instruments: mainInstrument ? [mainInstrument] : null,
        chords: [] as string[],
        bpm: parsed?.tempo ?? null,
        cifra_source: 'gp_import' as any,
      }

      const created = await createSong(payload)
      if (!created?.id) throw new Error('Erro ao criar música')

      // 2. Upload do arquivo GP
      const url = await uploadGpFile(gpFile, created.id)
      await updateGpFileUrl(created.id, url)

      toast.success(`"${title}" importada com sucesso! 🎸`)
      onSuccess()
      handleClose()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar')
    } finally {
      setSaving(false)
    }
  }, [gpFile, title, artist, genre, difficulty, mainInstrument, parsed, onSuccess, handleClose])

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="bg-surface border-border sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            Importar <span className="text-accent">Arquivo GP</span>
          </DialogTitle>
        </DialogHeader>

        <input
          ref={gpInputRef}
          type="file"
          accept=".gp,.gp3,.gp4,.gp5,.gpx,.gp7,.musicxml,.mxl"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* ====== ETAPA 1: Selecionar arquivo ====== */}
        {!parsed && !parsing && !parseError && (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => gpInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-colors cursor-pointer"
          >
            <FileArrowUp size={40} className="text-text3" />
            <div className="text-center">
              <p className="text-[14px] font-medium text-text">
                Arraste o arquivo GP aqui ou clique para selecionar
              </p>
              <p className="text-[11px] text-text3 mt-1">
                Formatos: .gp, .gp3, .gp4, .gp5, .gpx, .gp7, .musicxml
              </p>
            </div>
            <p className="text-[10px] text-text3/60 mt-2">
              Baixou do Songsterr Plus? O arquivo será lido automaticamente.
            </p>
          </div>
        )}

        {/* Parsing em andamento */}
        {parsing && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <SpinnerGap size={28} className="animate-spin text-accent" />
            <p className="text-[13px] text-text2">Lendo metadados do arquivo...</p>
          </div>
        )}

        {/* Erro no parse */}
        {parseError && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Warning size={28} className="text-red-400" />
            <p className="text-[13px] text-red-400">{parseError}</p>
            <Button variant="ghost" size="sm" onClick={resetState}>
              Tentar outro arquivo
            </Button>
          </div>
        )}

        {/* ====== ETAPA 2: Preview + edição dos metadados ====== */}
        {parsed && (
          <div className="space-y-4">
            {/* Arquivo selecionado */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle size={16} weight="fill" className="text-green-400 shrink-0" />
              <MusicNotesSimple size={14} className="text-green-400 shrink-0" />
              <span className="text-[11px] text-green-300 truncate flex-1">{gpFile?.name}</span>
              <span className="text-[10px] text-text3">{((gpFile?.size ?? 0) / 1024).toFixed(0)} KB</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-text3 hover:text-red-400"
                onClick={resetState}
              >
                <Trash size={12} />
              </Button>
            </div>

            {/* Tracks detectadas */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-text3">Tracks detectadas ({parsed.tracks.length})</Label>
              <div className="flex flex-wrap gap-1.5">
                {parsed.tracks.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] gap-1 py-0.5">
                    {t.instrument === 'Bateria' && <Metronome size={10} />}
                    {t.instrument === 'Canto' && <MicrophoneStage size={10} />}
                    {t.instrument === 'Teclado' && <PianoKeys size={10} />}
                    {(t.instrument === 'Violão' || t.instrument === 'Guitarra' || t.instrument === 'Baixo') && <Guitar size={10} />}
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tempo */}
            {parsed.tempo > 0 && (
              <p className="text-[11px] text-text3">
                Tempo: <span className="text-text font-medium">{parsed.tempo} BPM</span>
              </p>
            )}

            {/* Campos editáveis */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Título</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Nome da música"
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Artista</Label>
                <Input
                  value={artist}
                  onChange={e => setArtist(e.target.value)}
                  placeholder="Nome do artista"
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Gênero</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rock">Rock</SelectItem>
                    <SelectItem value="Pop Rock">Pop Rock</SelectItem>
                    <SelectItem value="MPB">MPB</SelectItem>
                    <SelectItem value="Pop">Pop</SelectItem>
                    <SelectItem value="Blues">Blues</SelectItem>
                    <SelectItem value="Jazz">Jazz</SelectItem>
                    <SelectItem value="Reggae">Reggae</SelectItem>
                    <SelectItem value="Bossa Nova">Bossa Nova</SelectItem>
                    <SelectItem value="Country">Country</SelectItem>
                    <SelectItem value="Metal">Metal</SelectItem>
                    <SelectItem value="Sertanejo">Sertanejo</SelectItem>
                    <SelectItem value="Forró">Forró</SelectItem>
                    <SelectItem value="Samba">Samba</SelectItem>
                    <SelectItem value="Gospel">Gospel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Dificuldade</Label>
                <Select value={String(difficulty)} onValueChange={v => setDifficulty(parseInt(v))}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 — Iniciante</SelectItem>
                    <SelectItem value="2">2 — Fácil</SelectItem>
                    <SelectItem value="3">3 — Intermediário</SelectItem>
                    <SelectItem value="4">4 — Avançado</SelectItem>
                    <SelectItem value="5">5 — Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={handleClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? (
                  <SpinnerGap size={14} className="animate-spin" />
                ) : (
                  <FloppyDisk size={14} />
                )}
                {saving ? 'Importando...' : 'Importar Música'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
