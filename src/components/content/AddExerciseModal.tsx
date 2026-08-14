import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass, MusicNotes, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  EXERCISE_CATEGORIES,
  EXERCISE_INSTRUMENTS,
  EXERCISE_LEVELS,
  getExerciseOptionLabel,
} from '@/lib/exerciseLibraryOptions'
import { getExercises, type ExerciseLibraryItem } from '@/services/exerciseLibraryService'

interface AddExerciseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingExerciseIds: string[]
  onAddExercises: (exerciseIds: string[]) => Promise<void>
}

export function AddExerciseModal({
  open,
  onOpenChange,
  existingExerciseIds,
  onAddExercises,
}: AddExerciseModalProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [open, search])

  useEffect(() => {
    if (!open) return

    const loadExercises = async () => {
      setLoading(true)
      try {
        const trimmed = debouncedSearch.trim()
        const { data } = await getExercises({ search: trimmed || null }, 0, 50)
        setExercises(data)
      } catch (err) {
        console.error('Erro ao buscar exercícios da biblioteca:', err)
      } finally {
        setLoading(false)
      }
    }

    loadExercises()
  }, [debouncedSearch, open])

  useEffect(() => {
    if (open) return
    setSearch('')
    setDebouncedSearch('')
    setSelectedIds([])
    setExercises([])
  }, [open])

  const existingIdsSet = useMemo(() => new Set(existingExerciseIds), [existingExerciseIds])

  const toggleExercise = (exerciseId: string, checked: boolean) => {
    if (existingIdsSet.has(exerciseId)) return
    setSelectedIds((prev) => (checked ? [...prev, exerciseId] : prev.filter((id) => id !== exerciseId)))
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      await onAddExercises(selectedIds)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px]">
            <Plus size={18} className="text-accent" />
            Adicionar Exercício ao Caderno
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1">
              <MagnifyingGlass size={12} /> Buscar por título
            </label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex: escala maior, arpejo..."
              className="h-9 text-[13px]"
            />
          </div>

          <ScrollArea className="max-h-[50vh] rounded-lg border border-border bg-card/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Instrumento</TableHead>
                  <TableHead>Nível</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-text3 py-8">
                      Carregando exercícios...
                    </TableCell>
                  </TableRow>
                ) : exercises.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-text3 py-8">
                      Nenhum exercício encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  exercises.map((exercise) => {
                    const alreadyAdded = existingIdsSet.has(exercise.id)
                    const checked = selectedIds.includes(exercise.id)

                    return (
                      <TableRow key={exercise.id} className={alreadyAdded ? 'opacity-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            disabled={alreadyAdded}
                            onCheckedChange={(value) => toggleExercise(exercise.id, value === true)}
                            aria-label={`Selecionar ${exercise.title}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-text flex items-center gap-2">
                            <MusicNotes size={14} className="text-accent" />
                            {exercise.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getExerciseOptionLabel(EXERCISE_CATEGORIES, exercise.category) || '—'}
                        </TableCell>
                        <TableCell>
                          {getExerciseOptionLabel(EXERCISE_INSTRUMENTS, exercise.instrument) || '—'}
                        </TableCell>
                        <TableCell>
                          {getExerciseOptionLabel(EXERCISE_LEVELS, exercise.difficulty_level) || '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
          <div className="text-[12px] text-text3">
            {exercises.length} resultado(s) · {selectedIds.length} selecionado(s)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={selectedIds.length === 0 || saving}>
              <Plus size={14} />
              {saving ? 'Adicionando...' : `Adicionar ${selectedIds.length}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
