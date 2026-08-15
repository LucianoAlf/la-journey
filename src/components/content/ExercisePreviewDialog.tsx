import { useEffect, useState } from 'react'
import { ArrowSquareOut, Copy, PencilSimple, Trash } from '@phosphor-icons/react'
import { MaterialPreview, type MaterialBlock } from '@/components/material/MaterialPreview'
import type { ExerciseLibraryItem } from '@/services/exerciseLibraryService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  A4_PAGE_HEIGHT_PX,
  A4_PAGE_WIDTH_PX,
  EXERCISE_PREVIEW_DIALOG_CLASS,
  getA4PreviewScale,
} from '@/lib/a4Preview'

const CATEGORY_LABELS: Record<string, string> = {
  technique: 'Técnica',
  harmony: 'Harmonia',
  reading: 'Leitura',
  rhythm: 'Ritmo',
  scales: 'Escalas',
  intervals: 'Intervalos',
  piece: 'Peça',
  progression: 'Progressão',
  other: 'Outro',
}

const LEVEL_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  grow: 'Grow',
  advance: 'Advance',
  master: 'Master',
}

function useA4PreviewScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => setScale(getA4PreviewScale(window.innerWidth, window.innerHeight))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

interface ExercisePreviewDialogProps {
  exercise: ExerciseLibraryItem | null
  blocks: MaterialBlock[]
  opening?: boolean
  onClose: () => void
  onEdit: (exercise: ExerciseLibraryItem) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onUseInMaterial: (exercise: ExerciseLibraryItem) => void
}

export function ExercisePreviewDialog({
  exercise,
  blocks,
  opening = false,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onUseInMaterial,
}: ExercisePreviewDialogProps) {
  const scale = useA4PreviewScale()
  const frameWidth = A4_PAGE_WIDTH_PX * scale
  const frameHeight = A4_PAGE_HEIGHT_PX * scale

  return (
    <Dialog open={!!exercise} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={EXERCISE_PREVIEW_DIALOG_CLASS}>
        <div className="flex max-h-[96vh] flex-col items-center gap-3 rounded-[14px] border border-border bg-card p-3">
          <div className="flex w-full flex-wrap items-center gap-2 px-1 pr-8">
            <DialogTitle className="text-[16px] font-semibold text-text">
              {exercise?.title}
            </DialogTitle>
            {exercise ? (
              <>
                <Badge className="rounded-full border border-green-500/20 bg-green-500/15 px-2 py-0.5 text-[9px] uppercase tracking-wider text-green-400">
                  {exercise.content_type === 'exercise' ? 'Exercício' : 'Exemplo'}
                </Badge>
                <Badge className="rounded-full border border-blue-500/20 bg-blue-500/15 px-2 py-0.5 text-[9px] uppercase tracking-wider text-blue-400">
                  {CATEGORY_LABELS[exercise.category] || exercise.category}
                </Badge>
                <Badge className="rounded-full border border-purple-500/20 bg-purple-500/15 px-2 py-0.5 text-[9px] uppercase tracking-wider text-purple-400">
                  {LEVEL_LABELS[exercise.difficulty_level] || exercise.difficulty_level}
                </Badge>
              </>
            ) : null}
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-lg border border-border bg-background/30 p-6 text-center">
              <p className="text-[13px] text-text2">Este exercício não possui blocos para preview.</p>
            </div>
          ) : (
            <div
              className="overflow-hidden rounded-sm bg-[#e8edf3] shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
              style={{ width: frameWidth, height: frameHeight }}
            >
              <div
                className="a4-page flex flex-col"
                data-theme="light"
                style={{
                  width: A4_PAGE_WIDTH_PX,
                  height: A4_PAGE_HEIGHT_PX,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div className="box-border min-h-0 flex-1 overflow-y-auto px-10 py-8">
                  <MaterialPreview blocks={blocks} />
                </div>
              </div>
            </div>
          )}

          <div className="flex w-full items-center justify-between gap-3 px-1">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={opening}
                onClick={() => exercise && onEdit(exercise)}
              >
                <PencilSimple size={14} />
                {opening ? 'Abrindo...' : 'Editar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exercise && onDuplicate(exercise.id)}
              >
                <Copy size={14} />
                Duplicar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  if (!exercise) return
                  if (confirm('Excluir?')) onDelete(exercise.id)
                }}
              >
                <Trash size={14} />
                Excluir
              </Button>
            </div>

            <Button size="sm" disabled={opening} onClick={() => exercise && onUseInMaterial(exercise)}>
              <ArrowSquareOut size={14} />
              {opening ? 'Abrindo...' : 'Usar no Material'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
