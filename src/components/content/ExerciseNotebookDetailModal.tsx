import { useEffect, useState } from 'react'
import { Books, NotePencil, Plus, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  addExerciseToCollection,
  getExerciseCollectionItems,
  removeExerciseFromCollection,
  type ExerciseCollection,
} from '@/services/exerciseCollectionService'
import {
  EXERCISE_CATEGORIES,
  EXERCISE_INSTRUMENTS,
  getExerciseOptionLabel,
} from '@/lib/exerciseLibraryOptions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddExerciseModal } from './AddExerciseModal'

interface ExerciseNotebookDetailModalProps {
  notebook: ExerciseCollection | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (notebook: ExerciseCollection) => void
  onGenerate: (notebook: ExerciseCollection) => void
  generating?: boolean
  generateDisabled?: boolean
}

type CollectionItemWithExercise = Awaited<ReturnType<typeof getExerciseCollectionItems>>[number]

const LEVEL_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  grow: 'Grow',
  advance: 'Advance',
  master: 'Master',
}

export function ExerciseNotebookDetailModal({
  notebook,
  open,
  onOpenChange,
  onEdit,
  onGenerate,
  generating,
  generateDisabled,
}: ExerciseNotebookDetailModalProps) {
  const [items, setItems] = useState<CollectionItemWithExercise[]>([])
  const [loading, setLoading] = useState(false)
  const [addExerciseOpen, setAddExerciseOpen] = useState(false)

  const loadItems = async (collectionId: string) => {
    setLoading(true)
    try {
      const data = await getExerciseCollectionItems(collectionId)
      setItems(data)
    } catch (err) {
      console.error('Erro ao carregar exercícios do caderno:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !notebook) return
    loadItems(notebook.id)
  }, [notebook, open])

  useEffect(() => {
    if (open) return
    setItems([])
    setAddExerciseOpen(false)
  }, [open])

  const handleAddExercises = async (exerciseIds: string[]) => {
    if (!notebook) return
    try {
      await Promise.all(exerciseIds.map((id) => addExerciseToCollection(notebook.id, id)))
      toast.success(
        exerciseIds.length === 1
          ? 'Exercício adicionado ao caderno!'
          : `${exerciseIds.length} exercícios adicionados ao caderno!`,
      )
      await loadItems(notebook.id)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível adicionar ao caderno. Tente de novo.'
      toast.error(message)
      throw err
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!notebook) return
    if (!confirm('Remover este exercício do caderno?')) return

    await removeExerciseFromCollection(itemId)
    toast.success('Exercício removido do caderno!')
    await loadItems(notebook.id)
  }

  const empty = items.length === 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] bg-surface border-border overflow-hidden">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="space-y-2 min-w-0">
                <DialogTitle className="flex items-center gap-2 font-serif text-[22px] text-text">
                  <Books size={18} className="text-accent" />
                  <span className="truncate">{notebook?.name}</span>
                </DialogTitle>
                {notebook && (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/20">
                      {notebook.instrument}
                    </Badge>
                    <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/20">
                      {LEVEL_LABELS[notebook.difficulty_level] || notebook.difficulty_level}
                    </Badge>
                    {notebook.is_template && (
                      <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
                        Template LA
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-[12px] text-text3">
                  {items.length} exercício{items.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-4 py-3">
            <div className="text-[12px] text-text3">
              Adicione exercícios da biblioteca e monte o rascunho no editor.
            </div>
            <Button size="sm" onClick={() => setAddExerciseOpen(true)}>
              <Plus size={14} />
              Adicionar
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0 rounded-lg border border-border bg-card/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Instrumento</TableHead>
                  <TableHead className="w-[72px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-text3">
                      Carregando exercícios do caderno...
                    </TableCell>
                  </TableRow>
                ) : empty ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-text3">
                      Adicione pelo menos um exercício
                    </TableCell>
                  </TableRow>
                ) : items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium text-text">{item.exercise?.title || '—'}</TableCell>
                    <TableCell>
                      {getExerciseOptionLabel(EXERCISE_CATEGORIES, item.exercise?.category) || '—'}
                    </TableCell>
                    <TableCell>
                      {getExerciseOptionLabel(EXERCISE_INSTRUMENTS, item.exercise?.instrument) || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remover exercício"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              {notebook && (
                <Button variant="outline" size="sm" onClick={() => onEdit(notebook)}>
                  <NotePencil size={14} />
                  Editar Caderno
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                size="sm"
                disabled={generateDisabled || generating || !notebook || empty}
                onClick={() => notebook && onGenerate(notebook)}
              >
                {generating ? 'Montando...' : 'Montar e abrir no editor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddExerciseModal
        open={addExerciseOpen}
        onOpenChange={setAddExerciseOpen}
        existingExerciseIds={items.map((item) => item.exercise_id)}
        onAddExercises={handleAddExercises}
      />
    </>
  )
}
