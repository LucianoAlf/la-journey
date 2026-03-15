import { useState, useCallback } from 'react'
import {
  FileText, SpinnerGap, MusicNotes, Check, X,
  Upload, Eye, ArrowLeft, CaretRight, Warning
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { parseChordPro, parseMultipleChordPro, isChordProFormat } from '@/lib/chordproParser'
import type { ChordProParsed } from '@/lib/chordproParser'
import { saveChordProToRepertoire } from '@/services/repertoireService'

interface ChordProImportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type ModalStep = 'input' | 'preview' | 'batch'

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

function CifraPreview({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="font-mono text-[12px] leading-[1.6] whitespace-pre-wrap">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (/^\[.*\]$/.test(trimmed)) {
          return <div key={i} className="text-accent font-bold mt-3 mb-1 text-[13px]">{trimmed}</div>
        }
        const chordPattern = /^[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9])*(?:\/[A-G][#b]?)?$/
        const tokens = trimmed.split(/\s+/)
        const chordRatio = tokens.filter(t => chordPattern.test(t) || t === '|').length / (tokens.length || 1)
        if (chordRatio > 0.5 && trimmed.length > 0) {
          return <div key={i} className="text-accent font-semibold">{line}</div>
        }
        if (!trimmed) return <div key={i} className="h-2" />
        return <div key={i} className="text-text">{line}</div>
      })}
    </div>
  )
}

export function ChordProImportModal({ open, onClose, onSuccess }: ChordProImportModalProps) {
  const [step, setStep] = useState<ModalStep>('input')
  const [rawInput, setRawInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<ChordProParsed | null>(null)
  const [batchParsed, setBatchParsed] = useState<ChordProParsed[]>([])
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 })
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(['Violão'])
  const [editDifficulty, setEditDifficulty] = useState(1)
  const [editGenre, setEditGenre] = useState('')

  const handleReset = () => {
    setStep('input')
    setRawInput('')
    setPreview(null)
    setBatchParsed([])
    setSelectedInstruments(['Violão'])
    setEditDifficulty(1)
    setEditGenre('')
    setBatchSaving(false)
    setBatchProgress({ done: 0, total: 0 })
  }

  // Upload de arquivo .cho / .chopro / .pro / .crd
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const allFiles = Array.from(files)

    if (allFiles.length === 1) {
      // Arquivo único → preview direto
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        if (!content) return
        setRawInput(content)
        handleParseSingle(content)
      }
      reader.readAsText(allFiles[0])
    } else {
      // Múltiplos arquivos → batch
      const parsed: ChordProParsed[] = []
      let loaded = 0

      for (const file of allFiles) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const content = ev.target?.result as string
          if (content) {
            const result = parseChordPro(content)
            if (result.title === 'Sem título') {
              result.title = file.name.replace(/\.(cho|chopro|pro|crd|chordpro|chord)$/i, '')
            }
            parsed.push(result)
          }
          loaded++
          if (loaded === allFiles.length) {
            setBatchParsed(parsed)
            setStep('batch')
            toast.success(`${parsed.length} música${parsed.length > 1 ? 's' : ''} detectada${parsed.length > 1 ? 's' : ''}`)
          }
        }
        reader.readAsText(file)
      }
    }

    // Reset input para permitir re-upload
    e.target.value = ''
  }, [])

  const handleParseSingle = (content?: string) => {
    const text = content || rawInput
    if (!text.trim()) {
      toast.error('Cole ou carregue um arquivo ChordPro')
      return
    }

    // Detectar múltiplas músicas no mesmo texto
    const songs = parseMultipleChordPro(text)
    if (songs.length > 1) {
      setBatchParsed(songs)
      setStep('batch')
      toast.success(`${songs.length} músicas detectadas no texto`)
      return
    }

    const parsed = parseChordPro(text)
    setPreview(parsed)
    setEditDifficulty(parsed.chords.length > 8 ? 3 : parsed.chords.length > 4 ? 2 : 1)
    setEditGenre(parsed.genre || '')
    setStep('preview')
  }

  const handleSaveSingle = async () => {
    if (!preview) return
    setSaving(true)
    try {
      await saveChordProToRepertoire({
        title: preview.title,
        artist: preview.artist || null,
        chords: preview.chords,
        key: preview.key,
        genre: editGenre || preview.genre,
        difficulty: editDifficulty,
        cifra_content: preview.cifraContent,
        lyrics: preview.lyrics || null,
        bpm: preview.bpm,
        capo: preview.capo,
        time_signature: preview.timeSignature,
        sections: preview.sections,
      }, selectedInstruments)

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

  const handleBatchSave = async () => {
    if (batchParsed.length === 0) return
    setBatchSaving(true)
    setBatchProgress({ done: 0, total: batchParsed.length })
    let success = 0
    let errors = 0

    for (const parsed of batchParsed) {
      try {
        await saveChordProToRepertoire({
          title: parsed.title,
          artist: parsed.artist || null,
          chords: parsed.chords,
          key: parsed.key,
          genre: parsed.genre,
          difficulty: estimateBatchDifficulty(parsed),
          cifra_content: parsed.cifraContent,
          lyrics: parsed.lyrics || null,
          bpm: parsed.bpm,
          capo: parsed.capo,
          time_signature: parsed.timeSignature,
          sections: parsed.sections,
        }, selectedInstruments)
        success++
      } catch {
        errors++
      }
      setBatchProgress({ done: success + errors, total: batchParsed.length })
    }

    if (success > 0) {
      toast.success(`${success} música${success > 1 ? 's' : ''} importada${success > 1 ? 's' : ''} com sucesso!`)
      onSuccess()
    }
    if (errors > 0) {
      toast.error(`${errors} falha${errors > 1 ? 's' : ''} na importação`)
    }

    setBatchSaving(false)
    if (success > 0 && errors === 0) {
      handleReset()
      onClose()
    }
  }

  function estimateBatchDifficulty(parsed: ChordProParsed): number {
    const n = parsed.chords.length
    if (n > 8) return 3
    if (n > 4) return 2
    return 1
  }

  const toggleInstrument = (inst: string) => {
    setSelectedInstruments(prev =>
      prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst]
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { handleReset(); onClose() } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} weight="fill" className="text-purple-400" />
            {step === 'input' && 'Importar ChordPro'}
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('input')} className="text-text3 hover:text-text mr-1">
                  <ArrowLeft size={18} />
                </button>
                Preview da Cifra
              </>
            )}
            {step === 'batch' && (
              <>
                <button onClick={() => setStep('input')} className="text-text3 hover:text-text mr-1">
                  <ArrowLeft size={18} />
                </button>
                Importar em Lote ({batchParsed.length} músicas)
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* STEP: INPUT */}
        {step === 'input' && (
          <div className="space-y-4">
            <p className="text-text2 text-[13px]">
              Cole o conteúdo de um arquivo ChordPro ou faça upload de arquivos <code className="text-accent">.cho</code> / <code className="text-accent">.chopro</code> / <code className="text-accent">.pro</code>
            </p>

            {/* Upload de arquivo */}
            <div className="card border-2 border-dashed border-border hover:border-accent/50 transition-colors">
              <label className="flex flex-col items-center justify-center p-6 cursor-pointer gap-2">
                <Upload size={28} className="text-text3" />
                <span className="text-[13px] text-text2">Arraste ou clique para selecionar arquivos ChordPro</span>
                <span className="text-[11px] text-text3">Suporta múltiplos arquivos para importação em lote</span>
                <input
                  type="file"
                  accept=".cho,.chopro,.pro,.crd,.chordpro,.chord,.txt"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-text3 text-[11px]">OU COLE O CONTEÚDO</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Textarea para colar */}
            <Textarea
              placeholder={`{title: Nome da Música}\n{artist: Artista}\n{key: Am}\n\n{start_of_verse}\n[Am]Primeira linha com [C]acordes\n[G]Segunda [F]linha\n{end_of_verse}`}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={12}
              className="font-mono text-[12px]"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { handleReset(); onClose() }}>
                Cancelar
              </Button>
              <Button onClick={() => handleParseSingle()} disabled={!rawInput.trim()}>
                <Eye size={16} /> Analisar
              </Button>
            </div>
          </div>
        )}

        {/* STEP: PREVIEW (single) */}
        {step === 'preview' && preview && (
          <div className="space-y-4">
            {/* Metadados */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Título</Label>
                <Input value={preview.title} readOnly className="text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Artista</Label>
                <Input value={preview.artist || ''} readOnly className="text-[13px]" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Tom</Label>
                <Input value={preview.key || preview.chords[0] || '—'} readOnly className="text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">BPM</Label>
                <Input value={preview.bpm ?? '—'} readOnly className="text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Capo</Label>
                <Input value={preview.capo || '0'} readOnly className="text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Compasso</Label>
                <Input value={preview.timeSignature} readOnly className="text-[13px]" />
              </div>
            </div>

            {/* Acordes detectados */}
            <div>
              <Label className="text-[12px] mb-1.5">Acordes detectados ({preview.chords.length})</Label>
              <div className="flex flex-wrap gap-1.5">
                {preview.chords.map(c => (
                  <Badge key={c} variant="outline" className="font-mono text-[11px]">{c}</Badge>
                ))}
                {preview.chords.length === 0 && (
                  <span className="text-text3 text-[12px]">Nenhum acorde detectado</span>
                )}
              </div>
            </div>

            {/* Seções */}
            {preview.sections.length > 0 && (
              <div>
                <Label className="text-[12px] mb-1.5">Seções ({preview.sections.length})</Label>
                <div className="flex flex-wrap gap-1.5">
                  {preview.sections.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[11px]">{s.name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Edição */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Dificuldade</Label>
                <Select value={String(editDifficulty)} onValueChange={v => setEditDifficulty(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(d => (
                      <SelectItem key={d} value={String(d)}>{d} — {DIFFICULTY_LABELS[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Gênero</Label>
                <Input value={editGenre} onChange={e => setEditGenre(e.target.value)} placeholder="Ex: Rock, MPB, Sertanejo" className="text-[13px]" />
              </div>
            </div>

            {/* Instrumentos */}
            <div>
              <Label className="text-[12px] mb-1.5">Instrumentos</Label>
              <div className="flex flex-wrap gap-1.5">
                {INSTRUMENTS_OPTIONS.map(inst => (
                  <button
                    key={inst}
                    onClick={() => toggleInstrument(inst)}
                    className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                      selectedInstruments.includes(inst)
                        ? 'bg-accent/15 text-accent border-accent/30'
                        : 'bg-surface border-border text-text3 hover:text-text2'
                    }`}
                  >
                    {inst}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview da cifra */}
            <div>
              <Label className="text-[12px] mb-1.5">Preview da Cifra</Label>
              <ScrollArea className="h-[200px] card p-3">
                <CifraPreview content={preview.cifraContent} />
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('input')}>
                <ArrowLeft size={14} /> Voltar
              </Button>
              <Button onClick={handleSaveSingle} disabled={saving}>
                {saving ? <SpinnerGap size={16} className="animate-spin" /> : <Check size={16} />}
                Importar para Repertório
              </Button>
            </div>
          </div>
        )}

        {/* STEP: BATCH */}
        {step === 'batch' && (
          <div className="space-y-4">
            {/* Instrumentos */}
            <div>
              <Label className="text-[12px] mb-1.5">Instrumentos (aplica a todas)</Label>
              <div className="flex flex-wrap gap-1.5">
                {INSTRUMENTS_OPTIONS.map(inst => (
                  <button
                    key={inst}
                    onClick={() => toggleInstrument(inst)}
                    className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                      selectedInstruments.includes(inst)
                        ? 'bg-accent/15 text-accent border-accent/30'
                        : 'bg-surface border-border text-text3 hover:text-text2'
                    }`}
                  >
                    {inst}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de músicas detectadas */}
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {batchParsed.map((song, i) => (
                  <div key={i} className="card p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13px] text-text truncate">{song.title}</div>
                      <div className="text-[11px] text-text3 flex items-center gap-2 mt-0.5">
                        {song.artist && <span>{song.artist}</span>}
                        <span>{song.chords.length} acordes</span>
                        {song.key && <span>Tom: {song.key}</span>}
                        {song.capo > 0 && <span>Capo: {song.capo}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {song.chords.slice(0, 4).map(c => (
                        <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>
                      ))}
                      {song.chords.length > 4 && (
                        <Badge variant="secondary" className="text-[10px]">+{song.chords.length - 4}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Progresso */}
            {batchSaving && (
              <div className="flex items-center gap-3">
                <SpinnerGap size={16} className="animate-spin text-accent" />
                <div className="flex-1">
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-[12px] text-text2">
                  {batchProgress.done}/{batchProgress.total}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('input')}>
                <ArrowLeft size={14} /> Voltar
              </Button>
              <Button onClick={handleBatchSave} disabled={batchSaving || batchParsed.length === 0}>
                {batchSaving ? (
                  <SpinnerGap size={16} className="animate-spin" />
                ) : (
                  <MusicNotes size={16} />
                )}
                Importar {batchParsed.length} música{batchParsed.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
