import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MagnifyingGlass, Sparkle, SpinnerGap, Warning } from '@phosphor-icons/react'
import { PracticeAudioModal } from '@/components/music/PracticeAudioModal'
import { Button } from '@/components/ui/button'
import { ExerciseCard } from './ExerciseCard'
import { ExerciseNotebookTab } from './ExerciseNotebookTab'
import { ExercisePreviewDialog } from './ExercisePreviewDialog'
import { type MaterialBlock } from '@/components/material/MaterialPreview'
import { useExerciseCounts, useExerciseLibrary } from '@/hooks/useExerciseLibrary'
import { useSchool } from '@/hooks/useSchool'
import { exerciseCanvasPath } from '@/lib/exerciseCanvasPath'
import {
  createDraftMaterialFromExercise,
  type ExerciseLibraryFilters,
  type ExerciseLibraryItem,
} from '@/services/exerciseLibraryService'
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
  const { data: school } = useSchool()
  const [activeSubTab, setActiveSubTab] = useState('all')
  const [search, setSearch] = useState('')
  const [instrument, setInstrument] = useState('all')
  const [level, setLevel] = useState('all')
  const [previewExercise, setPreviewExercise] = useState<ExerciseLibraryItem | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

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

  const { exercises, count, loading, error, remove, duplicate, refetch } = useExerciseLibrary(filters)
  const [audioOpen, setAudioOpen] = useState(false)

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

  const openExerciseAsDraft = async (exercise: ExerciseLibraryItem, mode: 'use' | 'edit') => {
    if (openingId) return
    if (!school?.id) {
      toast.error('Não foi possível identificar a escola para criar o rascunho.')
      return
    }

    setOpeningId(exercise.id)
    try {
      const materialId = await createDraftMaterialFromExercise(exercise, school.id)
      setPreviewExercise(null)
      toast.success(
        mode === 'edit'
          ? 'Aberto no editor. Imprima quando estiver pronto — salvar de volta na biblioteca vem no próximo passo.'
          : 'Rascunho criado. Ajuste se quiser e use Imprimir / PDF.'
      )
      navigate(exerciseCanvasPath(materialId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível abrir o exercício no editor.')
    } finally {
      setOpeningId(null)
    }
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
                Monte cadernos de exercício a partir da biblioteca. Cada caderno vira um material no editor.
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

              <div className="flex items-center gap-3 ml-auto">
                <Button size="sm" className="h-9" onClick={() => setAudioOpen(true)}>
                  <Sparkle size={14} weight="fill" />
                  Gerar áudio
                </Button>
                <div className="text-[12px] text-text3">
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <SpinnerGap size={14} className="animate-spin" />
                      Carregando...
                    </span>
                  ) : (
                    <span>{count} exercício{count !== 1 ? 's' : ''}</span>
                  )}
                </div>
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
              opening={openingId === exercise.id}
              onPreview={setPreviewExercise}
              onUseInMaterial={(item) => openExerciseAsDraft(item, 'use')}
              onEdit={(item) => openExerciseAsDraft(item, 'edit')}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <PracticeAudioModal
        open={audioOpen}
        onOpenChange={setAudioOpen}
        schoolId={school?.id}
        onSaved={() => { void refetch() }}
      />

      {!isNotebookTab && (
        <ExercisePreviewDialog
          exercise={previewExercise}
          blocks={previewBlocks}
          opening={!!previewExercise && openingId === previewExercise.id}
          onClose={() => setPreviewExercise(null)}
          onEdit={(item) => openExerciseAsDraft(item, 'edit')}
          onDuplicate={async (id) => {
            await handleDuplicate(id)
            setPreviewExercise(null)
          }}
          onDelete={async (id) => {
            await handleDelete(id)
            setPreviewExercise(null)
          }}
          onUseInMaterial={(item) => openExerciseAsDraft(item, 'use')}
        />
      )}
    </div>
  )
}
