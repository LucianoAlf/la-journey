import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowSquareOut, Copy, MagnifyingGlass, PencilSimple, SpinnerGap, Trash, Warning } from '@phosphor-icons/react'
import { ExerciseCard } from './ExerciseCard'
import { ExerciseNotebookTab } from './ExerciseNotebookTab'
import { MaterialPreview, type MaterialBlock } from '@/components/material/MaterialPreview'
import { useExerciseCounts, useExerciseLibrary } from '@/hooks/useExerciseLibrary'
import type { ExerciseLibraryFilters, ExerciseLibraryItem } from '@/services/exerciseLibraryService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SUB_TABS = [
  { id: 'all', label: 'Todos', filter: {} },
  { id: 'exercises', label: 'Exercícios', filter: { content_type: 'exercise' as const } },
  { id: 'examples', label: 'Exemplos', filter: { content_type: 'example' as const } },
  { id: 'reading', label: 'Leitura', filter: { category: 'reading' } },
  { id: 'technique', label: 'Técnica', filter: { category: 'technique' } },
  { id: 'rhythm', label: 'Ritmo', filter: { category: 'rhythm' } },
  { id: 'harmony', label: 'Harmonia', filter: { category: 'harmony' } },
  { id: 'scales', label: 'Escalas', filter: { category: 'scales' } },
  { id: 'intervals', label: 'Intervalos', filter: { category: 'intervals' } },
  { id: 'pieces', label: 'Peças', filter: { category: 'piece' } },
  { id: 'notebooks', label: 'Cadernos', filter: {} },
]

const INSTRUMENTS = [
  { value: 'all', label: 'Todos' },
  { value: 'universal', label: 'Universal' },
  { value: 'Violão', label: 'Violão' },
  { value: 'Guitarra', label: 'Guitarra' },
  { value: 'Piano', label: 'Piano' },
  { value: 'Baixo', label: 'Baixo' },
  { value: 'Bateria', label: 'Bateria' },
  { value: 'Canto', label: 'Canto' },
]

const LEVELS = [
  { value: 'all', label: 'Todos' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'grow', label: 'Grow' },
  { value: 'advance', label: 'Advance' },
  { value: 'master', label: 'Master' },
]

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

function getBlocksArray(blocks: unknown): MaterialBlock[] {
  if (Array.isArray(blocks)) return blocks as MaterialBlock[]
  if (typeof blocks === 'string') {
    try {
      const parsed = JSON.parse(blocks)
      return Array.isArray(parsed) ? (parsed as MaterialBlock[]) : []
    } catch {
      return []
    }
  }
  return []
}

export function ExerciseTab() {
  const navigate = useNavigate()
  const [activeSubTab, setActiveSubTab] = useState('all')
  const [search, setSearch] = useState('')
  const [instrument, setInstrument] = useState('all')
  const [level, setLevel] = useState('all')
  const [previewExercise, setPreviewExercise] = useState<ExerciseLibraryItem | null>(null)

  const { counts } = useExerciseCounts()
  const isNotebookTab = activeSubTab === 'notebooks'

  const filters: ExerciseLibraryFilters = useMemo(() => {
    if (isNotebookTab) {
      return {
        search: undefined,
        instrument: undefined,
        difficulty_level: undefined,
      }
    }

    const subTabFilter = SUB_TABS.find((tab) => tab.id === activeSubTab)?.filter || {}

    return {
      ...subTabFilter,
      search: search || undefined,
      instrument: instrument !== 'all' ? instrument : undefined,
      difficulty_level: level !== 'all' ? level : undefined,
    }
  }, [activeSubTab, instrument, isNotebookTab, level, search])

  const { exercises, count, loading, error, remove, duplicate } = useExerciseLibrary(filters)

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await duplicate(id)
    } catch (err) {
      console.error('Erro ao duplicar:', err)
    }
  }

  const handleUseInMaterial = (exercise: ExerciseLibraryItem) => {
    const blocks = getBlocksArray(exercise.blocks)
    navigate('/editor', { state: { insertBlocks: blocks } })
    setPreviewExercise(null)
  }

  const handleEditExercise = (exercise: ExerciseLibraryItem) => {
    const blocks = getBlocksArray(exercise.blocks)
    navigate('/editor', {
      state: {
        insertBlocks: blocks,
        editingExerciseId: exercise.id,
      },
    })
    setPreviewExercise(null)
  }

  const previewBlocks = useMemo(() => getBlocksArray(previewExercise?.blocks), [previewExercise])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {SUB_TABS.map((tab) => {
          let tabCount = 0

          if (tab.id === 'all') tabCount = counts.total || 0
          else if (tab.id === 'exercises') tabCount = counts.exercise || 0
          else if (tab.id === 'examples') tabCount = counts.example || 0
          else if (tab.filter.category) tabCount = counts[tab.filter.category] || 0

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted/50 text-text3 hover:bg-muted hover:text-text2'
              }`}
            >
              {tab.label}
              {tabCount > 0 && <span className="ml-1.5 opacity-70">({tabCount})</span>}
            </button>
          )
        })}
      </div>

      <div className="rounded-[14px] bg-card border border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          {isNotebookTab ? (
            <div className="w-full">
              <p className="text-[12px] text-text3">
                Explore e organize cadernos de repertório sem misturar a lógica da biblioteca de exercícios.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1">
                  <MagnifyingGlass size={12} /> Buscar
                </label>
                <Input
                  placeholder="Ex: progressão, escala, arpejo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>

              <div className="w-[140px] space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">
                  Instrumento
                </label>
                <Select value={instrument} onValueChange={setInstrument}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENTS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[130px] space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">
                  Nível
                </label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-[12px] text-text3 ml-auto">
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <SpinnerGap size={14} className="animate-spin" />
                    Carregando...
                  </span>
                ) : (
                  <span>{count} exercício{count !== 1 ? 's' : ''}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {isNotebookTab ? (
        <ExerciseNotebookTab />
      ) : error ? (
        <div className="rounded-[14px] bg-red-500/10 border border-red-500/20 p-6 text-center">
          <Warning size={24} className="mx-auto mb-2 text-red-400" />
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <SpinnerGap size={32} className="animate-spin text-accent" />
        </div>
      ) : exercises.length === 0 ? (
        <div className="rounded-[14px] bg-muted/30 border border-border p-8 text-center">
          <p className="text-[14px] text-text2 mb-1">Nenhum exercício encontrado</p>
          <p className="text-[12px] text-text3">
            {search || instrument !== 'all' || level !== 'all'
              ? 'Tente ajustar os filtros'
              : 'Crie seu primeiro exercício no Editor de Material'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onPreview={setPreviewExercise}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Dialog open={!isNotebookTab && !!previewExercise} onOpenChange={(open) => !open && setPreviewExercise(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-[14px] border-border bg-card">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle className="text-[18px] font-semibold text-text">
                {previewExercise?.title}
              </DialogTitle>
              {previewExercise ? (
                <>
                  <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-green-500/15 text-green-400 border-green-500/20">
                    {previewExercise.content_type === 'exercise' ? 'Exercício' : 'Exemplo'}
                  </Badge>
                  <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/20">
                    {CATEGORY_LABELS[previewExercise.category] || previewExercise.category}
                  </Badge>
                  <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/20">
                    {LEVEL_LABELS[previewExercise.difficulty_level] || previewExercise.difficulty_level}
                  </Badge>
                </>
              ) : null}
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {previewBlocks.length === 0 ? (
              <div className="rounded-lg border border-border bg-background/30 p-6 text-center">
                <p className="text-[13px] text-text2">Este exercício não possui blocos para preview.</p>
              </div>
            ) : (
              <div className="rounded-[14px] border border-border bg-background/30 p-4">
                <MaterialPreview blocks={previewBlocks} />
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewExercise && handleEditExercise(previewExercise)}
              >
                <PencilSimple size={14} />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!previewExercise) return
                  await handleDuplicate(previewExercise.id)
                  setPreviewExercise(null)
                }}
              >
                <Copy size={14} />
                Duplicar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={async () => {
                  if (!previewExercise) return
                  if (confirm('Excluir?')) {
                    await handleDelete(previewExercise.id)
                    setPreviewExercise(null)
                  }
                }}
              >
                <Trash size={14} />
                Excluir
              </Button>
            </div>

            <Button size="sm" onClick={() => previewExercise && handleUseInMaterial(previewExercise)}>
              <ArrowSquareOut size={14} />
              Usar no Material
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
