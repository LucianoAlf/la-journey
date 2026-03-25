import { useState, useMemo } from 'react'
import { useExerciseLibrary, useExerciseCounts } from '@/hooks/useExerciseLibrary'
import type { ExerciseLibraryFilters } from '@/services/exerciseLibraryService'
import { ExerciseCard } from './ExerciseCard'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MagnifyingGlass, SpinnerGap, Warning } from '@phosphor-icons/react'

// Sub-abas
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
]

// Instrumentos
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

// Níveis
const LEVELS = [
  { value: 'all', label: 'Todos' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'grow', label: 'Grow' },
  { value: 'advance', label: 'Advance' },
  { value: 'master', label: 'Master' },
]

export function ExerciseTab() {
  // Estado local
  const [activeSubTab, setActiveSubTab] = useState('all')
  const [search, setSearch] = useState('')
  const [instrument, setInstrument] = useState('all')
  const [level, setLevel] = useState('all')

  // Pegar contagens
  const { counts } = useExerciseCounts()

  // Construir filtros combinados
  const filters: ExerciseLibraryFilters = useMemo(() => {
    const subTabFilter = SUB_TABS.find(t => t.id === activeSubTab)?.filter || {}

    return {
      ...subTabFilter,
      search: search || undefined,
      instrument: instrument !== 'all' ? instrument : undefined,
      difficulty_level: level !== 'all' ? level : undefined,
    }
  }, [activeSubTab, search, instrument, level])

  // Hook de exercícios
  const { exercises, count, loading, error, remove, duplicate, refetch } = useExerciseLibrary(filters)

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

  return (
    <div className="space-y-4">
      {/* Sub-abas */}
      <div className="flex flex-wrap gap-1.5">
        {SUB_TABS.map(tab => {
          // Contagem da sub-aba
          let tabCount = 0
          if (tab.id === 'all') {
            tabCount = counts.total || 0
          } else if (tab.id === 'exercises') {
            tabCount = counts.exercise || 0
          } else if (tab.id === 'examples') {
            tabCount = counts.example || 0
          } else if (tab.filter.category) {
            tabCount = counts[tab.filter.category] || 0
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`
                px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors
                ${activeSubTab === tab.id
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted/50 text-text3 hover:bg-muted hover:text-text2'
                }
              `}
            >
              {tab.label}
              {tabCount > 0 && (
                <span className="ml-1.5 opacity-70">({tabCount})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="rounded-[14px] bg-card border border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Busca */}
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1">
              <MagnifyingGlass size={12} /> Buscar
            </label>
            <Input
              placeholder="Ex: progressão, escala, arpejo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>

          {/* Instrumento */}
          <div className="w-[140px] space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">
              Instrumento
            </label>
            <Select value={instrument} onValueChange={setInstrument}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENTS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nível */}
          <div className="w-[130px] space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">
              Nível
            </label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contador */}
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
        </div>
      </div>

      {/* Conteúdo */}
      {error ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map(exercise => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
