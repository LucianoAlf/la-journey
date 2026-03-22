import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  FilePdf, Trash, Robot, CloudArrowUp, CheckCircle,
  CaretDown, CaretRight, FileText, Lightbulb, Barbell, Notebook,
  Spinner, ArrowLeft, MusicNotes, Guitar, Image, ListNumbers,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

import {
  importPdfWithVision,
  saveImportedTopics,
  type ImportedTopic,
  type ImportedBlock,
  type ImportResult,
  type ProgressCallback,
} from '@/services/pdfImportService'
import { ChordDiagram } from '@/components/music/ChordDiagram'
import { AlphaTexInlineRenderer } from '@/components/music/AlphaTexInlineRenderer'

type ImportStep = 'upload' | 'review' | 'done'

interface PdfImportDialogProps {
  open: boolean
  onClose: () => void
  onImportComplete: () => void
}

export function PdfImportDialog({ open, onClose, onImportComplete }: PdfImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload')

  // Step 1 - Upload
  const [file, setFile] = useState<File | null>(null)
  const [instrument, setInstrument] = useState('universal')
  const [level, setLevel] = useState('foundation')
  const [processing, setProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [processingProgress, setProcessingProgress] = useState(0)
  const [pageInfo, setPageInfo] = useState<{ current: number; total: number } | null>(null)

  // Step 2 - Review
  const [topics, setTopics] = useState<ImportedTopic[]>([])
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set())

  // Step 3 - Result
  const [result, setResult] = useState<ImportResult | null>(null)
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Reset state when dialog closes
  const handleClose = () => {
    setStep('upload')
    setFile(null)
    setTopics([])
    setResult(null)
    setProcessing(false)
    setSaving(false)
    setPageInfo(null)
    onClose()
  }

  // ─── Step 1: Upload ────────────────────────────────────

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile)
    } else {
      toast.error('Apenas arquivos PDF sao aceitos')
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  async function handleProcess() {
    if (!file) return

    setProcessing(true)
    setProcessingProgress(0)
    setPageInfo(null)

    const progressCallback: ProgressCallback = (status, progress, info) => {
      setProcessingStatus(status)
      setProcessingProgress(progress)
      if (info) setPageInfo(info)
    }

    try {
      // Use vision-based import
      const importedTopics = await importPdfWithVision(
        file,
        instrument,
        level,
        progressCallback,
      )

      if (importedTopics.length === 0 || importedTopics[0].blocks.length === 0) {
        toast.error('A IA nao conseguiu extrair conteudo desse material.')
        setProcessing(false)
        return
      }

      // Count blocks
      const totalBlocks = importedTopics.reduce((acc, t) => acc + t.blocks.length, 0)

      // Go to review
      setTopics(importedTopics)
      setStep('review')
      setProcessingProgress(100)
      toast.success(`${totalBlocks} blocos detectados!`)
    } catch (err: any) {
      console.error('Erro na importacao:', err)
      toast.error(err.message || 'Erro ao processar o PDF')
    } finally {
      setProcessing(false)
    }
  }

  // ─── Step 2: Review ────────────────────────────────────

  function toggleTopicExpand(idx: number) {
    const next = new Set(expandedTopics)
    if (next.has(idx)) {
      next.delete(idx)
    } else {
      next.add(idx)
    }
    setExpandedTopics(next)
  }

  function toggleTopicSelect(idx: number) {
    const next = [...topics]
    next[idx] = { ...next[idx], selected: !next[idx].selected }
    setTopics(next)
  }

  function toggleBlockSelect(topicIdx: number, blockIdx: number) {
    const next = [...topics]
    const blocks = [...next[topicIdx].blocks]
    blocks[blockIdx] = { ...blocks[blockIdx], selected: !blocks[blockIdx].selected }
    next[topicIdx] = { ...next[topicIdx], blocks }
    setTopics(next)
  }

  const selectedTopicsCount = topics.filter(t => t.selected).length
  const selectedBlocksCount = topics.reduce(
    (acc, t) => acc + (t.selected ? t.blocks.filter(b => b.selected).length : 0),
    0
  )

  async function handleImport() {
    const selectedTopics = topics.filter(t => t.selected)
    if (selectedTopics.length === 0) {
      toast.error('Selecione pelo menos um topico')
      return
    }

    setSaving(true)
    try {
      const sourceDocument = file?.name.replace('.pdf', '') || 'Importado'
      const importResult = await saveImportedTopics(
        selectedTopics,
        sourceDocument,
        instrument,
        'a1b2c3d4-0001-4000-8000-000000000001', // TODO: get schoolId from context
      )

      setResult(importResult)
      setStep('done')
      toast.success(`${importResult.topicsCreated} topicos importados!`)
    } catch (err: any) {
      console.error('Erro ao salvar:', err)
      toast.error(err.message || 'Erro ao salvar no banco')
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FilePdf size={18} className="text-accent" />
            {step === 'upload' && 'Importar Material (PDF)'}
            {step === 'review' && 'Revisar Conteudo Detectado'}
            {step === 'done' && 'Importacao Concluida'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FilePdf size={40} className="mx-auto text-text3 mb-2" />
                <p className="text-[13px] text-text2">Arraste o PDF aqui</p>
                <p className="text-[11px] text-text3 mt-1">ou clique para selecionar</p>
                <p className="text-[10px] text-text3 mt-2">PDF - Max 20MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected file */}
              {file && (
                <div className="flex items-center gap-2 p-2.5 bg-accent/5 rounded-lg border border-accent/20">
                  <FilePdf size={16} className="text-accent" />
                  <span className="text-[12px] text-text1 flex-1 truncate">{file.name}</span>
                  <span className="text-[10px] text-text3">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  >
                    <Trash size={12} />
                  </Button>
                </div>
              )}

              {/* Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Instrumento</Label>
                  <Select value={instrument} onValueChange={setInstrument}>
                    <SelectTrigger className="h-8 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="universal">Universal</SelectItem>
                      <SelectItem value="Violao">Violao</SelectItem>
                      <SelectItem value="Guitarra">Guitarra</SelectItem>
                      <SelectItem value="Piano">Piano</SelectItem>
                      <SelectItem value="Teclado">Teclado</SelectItem>
                      <SelectItem value="Canto">Canto</SelectItem>
                      <SelectItem value="Bateria">Bateria</SelectItem>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                      <SelectItem value="Ukulele">Ukulele</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px]">Nivel base</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="h-8 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="foundation">Foundation</SelectItem>
                      <SelectItem value="grow">Grow</SelectItem>
                      <SelectItem value="advance">Advance</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Processing status */}
              {processing && (
                <div className="space-y-2 p-3 bg-card/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Spinner size={14} className="animate-spin text-accent" />
                      <span className="text-[11px] text-text2">{processingStatus}</span>
                    </div>
                    {pageInfo && (
                      <span className="text-[10px] text-text3">
                        Pagina {pageInfo.current}/{pageInfo.total}
                      </span>
                    )}
                  </div>
                  <Progress value={processingProgress} className="h-1" />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review */}
          {step === 'review' && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex items-center justify-between text-[11px] text-text3 px-1">
                <span>{file?.name} - {topics.length} topicos detectados</span>
                <span>{selectedTopicsCount}/{topics.length} topicos - {selectedBlocksCount} blocos</span>
              </div>

              {/* Topics list */}
              <ScrollArea className="h-[380px] pr-2">
                <div className="space-y-1.5">
                  {topics.map((topic, topicIdx) => (
                    <TopicReviewItem
                      key={topicIdx}
                      topic={topic}
                      expanded={expandedTopics.has(topicIdx)}
                      onToggleExpand={() => toggleTopicExpand(topicIdx)}
                      onToggleSelect={() => toggleTopicSelect(topicIdx)}
                      onToggleBlockSelect={(blockIdx) => toggleBlockSelect(topicIdx, blockIdx)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle size={56} weight="fill" className="mx-auto text-green-500" />
              <div>
                <h3 className="text-[16px] font-semibold text-text1">Importacao concluida!</h3>
                <p className="text-[13px] text-text2 mt-1">
                  {result?.topicsCreated} topicos - {result?.blocksCreated} blocos
                </p>
              </div>
              <p className="text-[11px] text-text3 max-w-xs mx-auto">
                Os topicos foram importados com status "Rascunho".
                Revise cada um e publique quando estiver pronto.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="mt-4">
          {step === 'upload' && (
            <>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!file || processing}
                onClick={handleProcess}
              >
                {processing ? (
                  <><Spinner size={14} className="animate-spin mr-1" /> Processando...</>
                ) : (
                  <><Robot size={14} className="mr-1" /> Processar com IA</>
                )}
              </Button>
            </>
          )}

          {step === 'review' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                <ArrowLeft size={14} className="mr-1" /> Voltar
              </Button>
              <Button
                size="sm"
                disabled={saving || selectedTopicsCount === 0}
                onClick={handleImport}
              >
                {saving ? (
                  <><Spinner size={14} className="animate-spin mr-1" /> Salvando...</>
                ) : (
                  <><CloudArrowUp size={14} className="mr-1" /> Importar Selecionados</>
                )}
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button
              size="sm"
              onClick={() => {
                onImportComplete()
                handleClose()
              }}
            >
              Ir para Base Curada
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Topic Review Item ───────────────────────────────────

interface TopicReviewItemProps {
  topic: ImportedTopic
  expanded: boolean
  onToggleExpand: () => void
  onToggleSelect: () => void
  onToggleBlockSelect: (blockIdx: number) => void
}

const blockTypeIcons: Record<string, any> = {
  text: FileText,
  tip: Lightbulb,
  exercise: Barbell,
  example: Notebook,
  notation: MusicNotes,
  chord_diagram: Guitar,
  chord_chart: ListNumbers,
  image: Image,
}

const blockTypeLabels: Record<string, string> = {
  text: 'Texto',
  tip: 'Dica',
  exercise: 'Exercicio',
  example: 'Exemplo',
  notation: 'Notacao',
  chord_diagram: 'Acorde',
  chord_chart: 'Progressao',
  image: 'Imagem',
}

function TopicReviewItem({
  topic,
  expanded,
  onToggleExpand,
  onToggleSelect,
  onToggleBlockSelect,
}: TopicReviewItemProps) {
  const selectedBlocks = topic.blocks.filter(b => b.selected).length

  return (
    <div className={`rounded-lg border transition-opacity ${topic.selected ? 'border-border' : 'border-border/30 opacity-50'}`}>
      {/* Topic header */}
      <div className="flex items-center gap-2 p-2.5">
        <Checkbox
          checked={topic.selected}
          onCheckedChange={onToggleSelect}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={onToggleExpand}
        >
          {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </Button>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-text1 truncate block">{topic.title}</span>
          {topic.description && (
            <span className="text-[10px] text-text3 line-clamp-1">{topic.description}</span>
          )}
        </div>
        <span className="text-[10px] text-text3 shrink-0">({selectedBlocks} blocos)</span>
        <Badge variant="outline" className="text-[9px] shrink-0">{topic.dimension}</Badge>
        <Badge variant="outline" className="text-[9px] shrink-0">{topic.difficulty_level}</Badge>
      </div>

      {/* Blocks */}
      {expanded && (
        <div className="px-3 pb-2.5 space-y-1 ml-8 border-t border-border/50 pt-2">
          {topic.blocks.map((block, blockIdx) => (
            <BlockReviewItem
              key={blockIdx}
              block={block}
              blockIdx={blockIdx}
              selected={block.selected}
              disabled={!topic.selected}
              onToggle={() => onToggleBlockSelect(blockIdx)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Block Review Item ───────────────────────────────────

interface BlockReviewItemProps {
  block: ImportedBlock
  blockIdx: number
  selected: boolean
  disabled: boolean
  onToggle: () => void
}

function BlockReviewItem({ block, blockIdx, selected, disabled, onToggle }: BlockReviewItemProps) {
  const Icon = blockTypeIcons[block.block_type] || FileText
  const label = blockTypeLabels[block.block_type] || block.block_type
  const isVisualBlock = ['chord_diagram', 'notation', 'chord_chart', 'image'].includes(block.block_type)

  return (
    <div
      className={`flex items-start gap-2 py-1.5 px-2 rounded transition-opacity ${
        selected ? '' : 'opacity-40'
      }`}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="mt-0.5"
      />
      <Icon size={12} className="mt-0.5 text-text3 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-text2 font-medium">
            {block.title || `Bloco ${blockIdx + 1}`}
          </span>
          <Badge variant="outline" className="text-[8px] px-1 py-0">
            {label}
          </Badge>
          {block.page_number && (
            <span className="text-[9px] text-text3">p.{block.page_number}</span>
          )}
        </div>

        {/* Text preview for non-visual blocks */}
        {!isVisualBlock && block.content && (
          <p className="text-[10px] text-text3 line-clamp-2 mt-0.5">
            {block.content.substring(0, 150)}...
          </p>
        )}

        {/* Visual previews */}
        {block.block_type === 'chord_diagram' && block.svguitar_data && (
          <div className="mt-1.5 inline-block">
            <ChordDiagram
              name={block.svguitar_data.name}
              positions={block.svguitar_data.positions}
              position={block.svguitar_data.position}
              size="compact"
            />
          </div>
        )}

        {block.block_type === 'notation' && block.alphatex && (
          <div className="mt-1.5 bg-card/50 rounded p-1 max-w-[300px]">
            <AlphaTexInlineRenderer
              tex={block.alphatex}
              scale={0.5}
              minHeight={50}
            />
          </div>
        )}

        {block.block_type === 'chord_chart' && block.chord_chart_data && (
          <div className="mt-1.5 flex gap-1 flex-wrap">
            {block.chord_chart_data.slice(0, 4).map((chord, i) => (
              <ChordDiagram
                key={i}
                name={chord.name}
                positions={chord.positions}
                position={chord.position}
                size="compact"
              />
            ))}
            {block.chord_chart_data.length > 4 && (
              <span className="text-[9px] text-text3 self-center">
                +{block.chord_chart_data.length - 4} mais
              </span>
            )}
          </div>
        )}

        {block.block_type === 'image' && block.image_url && (
          <div className="mt-1.5">
            <img
              src={block.image_url}
              alt={block.title || 'Imagem'}
              className="max-h-[80px] rounded border border-border/50"
            />
          </div>
        )}
      </div>
    </div>
  )
}
