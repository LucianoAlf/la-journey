import { useEffect, useMemo, useState } from 'react'
import { BookmarkSimple, FloppyDisk, Image, MusicNotes, PianoKeys, TextAa, Waveform, Guitar } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  EXERCISE_CATEGORIES,
  EXERCISE_CONTENT_TYPES,
  EXERCISE_INSTRUMENTS,
  EXERCISE_LEVELS,
  type ExerciseCategoryValue,
  type ExerciseContentTypeValue,
  type ExerciseInstrumentValue,
  type ExerciseLevelValue,
  getReusableBlockTypeLabel,
} from '@/lib/exerciseLibraryOptions'

interface ReusableBlockPreview {
  block_type: string
  title?: string | null
}

export interface SaveAsReusablePayload {
  title: string
  description: string | null
  content_type: ExerciseContentTypeValue
  category: ExerciseCategoryValue
  instrument: ExerciseInstrumentValue
  difficulty_level: ExerciseLevelValue
  tags: string[]
}

interface SaveAsReusableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading?: boolean
  selectedBlock?: ReusableBlockPreview | null
  onSave: (payload: SaveAsReusablePayload) => Promise<void> | void
}

const BLOCK_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  text: TextAa,
  tip: BookmarkSimple,
  exercise: TextAa,
  notation: MusicNotes,
  chord_diagram: Guitar,
  chord_grid: Guitar,
  tablature: Guitar,
  keyboard: PianoKeys,
  keyboard_grid: PianoKeys,
  image: Image,
  rhythm: Waveform,
}

export function SaveAsReusableDialog({
  open,
  onOpenChange,
  loading = false,
  selectedBlock,
  onSave,
}: SaveAsReusableDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState<ExerciseContentTypeValue>('exercise')
  const [category, setCategory] = useState<ExerciseCategoryValue>('harmony')
  const [instrument, setInstrument] = useState<ExerciseInstrumentValue>('universal')
  const [difficultyLevel, setDifficultyLevel] = useState<ExerciseLevelValue>('foundation')
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(selectedBlock?.title ?? '')
    setDescription('')
    setContentType('exercise')
    setCategory('harmony')
    setInstrument('universal')
    setDifficultyLevel('foundation')
    setTags('')
  }, [open, selectedBlock])

  const parsedTags = useMemo(
    () => tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    [tags],
  )

  const BlockIcon = selectedBlock ? (BLOCK_ICON_MAP[selectedBlock.block_type] ?? BookmarkSimple) : BookmarkSimple

  const handleSubmit = async () => {
    if (!title.trim()) return
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      content_type: contentType,
      category,
      instrument,
      difficulty_level: difficultyLevel,
      tags: parsedTags,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px]">
            <FloppyDisk size={18} className="text-accent" />
            Salvar como <span className="text-accent">Bloco Reutilizável</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Progressão I-IV-V-I"
              className="h-9 text-[13px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique o objetivo pedagógico deste bloco..."
              className="min-h-[72px] text-[13px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Tipo *</Label>
              <Select value={contentType} onValueChange={(value) => setContentType(value as ExerciseContentTypeValue)}>
                <SelectTrigger className="h-9 text-[12px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_CONTENT_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Categoria *</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as ExerciseCategoryValue)}>
                <SelectTrigger className="h-9 text-[12px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_CATEGORIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Instrumento</Label>
              <Select value={instrument} onValueChange={(value) => setInstrument(value as ExerciseInstrumentValue)}>
                <SelectTrigger className="h-9 text-[12px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_INSTRUMENTS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Nível</Label>
              <Select value={difficultyLevel} onValueChange={(value) => setDifficultyLevel(value as ExerciseLevelValue)}>
                <SelectTrigger className="h-9 text-[12px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_LEVELS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Tags</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="progressão, acordes, harmonia"
              className="h-9 text-[13px]"
            />
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {parsedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-3">
            <div className="text-[11px] font-medium text-text mb-2">
              Bloco a salvar
            </div>
            {selectedBlock ? (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <BlockIcon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-text">
                    {getReusableBlockTypeLabel(selectedBlock.block_type)}
                  </div>
                  <div className="truncate text-[11px] text-text3">
                    {selectedBlock.title || '(sem título)'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-text3">Nenhum bloco selecionado.</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !selectedBlock || loading}>
            <FloppyDisk size={14} />
            {loading ? 'Salvando...' : 'Salvar na Biblioteca'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
