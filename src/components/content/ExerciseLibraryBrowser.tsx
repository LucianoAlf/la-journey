import { useMemo, useState } from 'react'
import { BookmarkSimple, FunnelSimple, Guitar, MusicNotes, PianoKeys, Plus, TextAa } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary'
import type { ExerciseLibraryItem } from '@/services/exerciseLibraryService'
import {
  EXERCISE_CATEGORIES,
  EXERCISE_CONTENT_TYPES,
  EXERCISE_INSTRUMENTS,
  EXERCISE_LEVELS,
  getExerciseOptionLabel,
} from '@/lib/exerciseLibraryOptions'

interface ExerciseLibraryBrowserProps {
  open: boolean
  onClose: () => void
  onSelect: (exercise: ExerciseLibraryItem) => Promise<void> | void
  mode?: 'modal' | 'inline'
  insertingId?: string | null
}

const BLOCK_TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  text: TextAa,
  tip: BookmarkSimple,
  exercise: TextAa,
  notation: MusicNotes,
  chord_diagram: Guitar,
  chord_grid: Guitar,
  tablature: Guitar,
  keyboard: PianoKeys,
  keyboard_grid: PianoKeys,
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function buildPreviewText(exercise: ExerciseLibraryItem) {
  const firstBlock = exercise.blocks?.[0]
  if (!firstBlock) return 'Sem preview disponível.'

  if (typeof firstBlock.title === 'string' && firstBlock.title.trim()) {
    return firstBlock.title
  }

  const html = firstBlock.content?.html
  if (typeof html === 'string' && html.trim()) {
    return stripHtml(html).slice(0, 120)
  }

  if (Array.isArray(firstBlock.render_data?.chords)) {
    return firstBlock.render_data.chords
      .slice(0, 4)
      .map((chord: any) => chord?.chord_name || chord?.name)
      .filter(Boolean)
      .join(' · ')
  }

  return `${exercise.block_count} bloco(s) reutilizáveis`
}

function getBlockTypeCounts(blocks: any[]) {
  return blocks.reduce<Record<string, number>>((acc, block) => {
    const key = String(block?.block_type ?? 'text')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

export function ExerciseLibraryBrowser({
  open,
  onClose,
  onSelect,
  mode = 'modal',
  insertingId = null,
}: ExerciseLibraryBrowserProps) {
  const [search, setSearch] = useState('')
  const [contentType, setContentType] = useState<string>('all')
  const [category, setCategory] = useState<string>('all')
  const [instrument, setInstrument] = useState<string>('all')
  const [difficultyLevel, setDifficultyLevel] = useState<string>('all')

  const filters = useMemo(() => ({
    search: search.trim() || null,
    content_type: contentType === 'all' ? null : contentType as 'exercise' | 'example',
    category: category === 'all' ? null : category,
    instrument: instrument === 'all' ? null : instrument,
    difficulty_level: difficultyLevel === 'all' ? null : difficultyLevel,
  }), [search, contentType, category, instrument, difficultyLevel])

  const { exercises, count, loading, page, setPage } = useExerciseLibrary(filters)
  const totalPages = Math.max(1, Math.ceil(count / 20))

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-w-5xl max-h-[88vh] bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px]">
            <BookmarkSimple size={18} className="text-accent" />
            Adicionar <span className="text-accent">Da Biblioteca</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-hidden">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Buscar por título ou descrição..."
              className="h-9 text-[13px]"
            />

            <Select value={contentType} onValueChange={(value) => { setContentType(value); setPage(0) }}>
              <SelectTrigger className="h-9 text-[12px] w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {EXERCISE_CONTENT_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={(value) => { setCategory(value); setPage(0) }}>
              <SelectTrigger className="h-9 text-[12px] w-full">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {EXERCISE_CATEGORIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={instrument} onValueChange={(value) => { setInstrument(value); setPage(0) }}>
              <SelectTrigger className="h-9 text-[12px] w-full">
                <SelectValue placeholder="Instrumento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos instrumentos</SelectItem>
                {EXERCISE_INSTRUMENTS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyLevel} onValueChange={(value) => { setDifficultyLevel(value); setPage(0) }}>
              <SelectTrigger className="h-9 text-[12px] w-full">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos níveis</SelectItem>
                {EXERCISE_LEVELS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-[12px] text-text3">
            <div className="flex items-center gap-2">
              <FunnelSimple size={14} />
              {loading ? 'Carregando biblioteca...' : `${count} item(ns) encontrados`}
            </div>
            <div>Página {page + 1} de {totalPages}</div>
          </div>

          <div className="max-h-[58vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-lg border border-border bg-card/40 p-6 text-center text-[13px] text-text3">
                Carregando exercícios...
              </div>
            ) : exercises.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-[13px] text-text3">
                Nenhum item encontrado com esses filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {exercises.map((exercise) => {
                  const typeCounts = getBlockTypeCounts(exercise.blocks ?? [])
                  return (
                    <div
                      key={exercise.id}
                      className="rounded-xl border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant={exercise.content_type === 'exercise' ? 'advance' : 'accent'}>
                              {getExerciseOptionLabel(EXERCISE_CONTENT_TYPES, exercise.content_type)}
                            </Badge>
                            <Badge variant="outline">
                              {getExerciseOptionLabel(EXERCISE_CATEGORIES, exercise.category)}
                            </Badge>
                            <Badge variant="outline">
                              {getExerciseOptionLabel(EXERCISE_LEVELS, exercise.difficulty_level)}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="text-[14px] font-semibold text-text">{exercise.title}</h3>
                            <p className="mt-1 text-[12px] leading-relaxed text-text2">
                              {buildPreviewText(exercise)}
                            </p>
                          </div>
                        </div>

                        {mode === 'modal' && (
                          <Button
                            size="sm"
                            onClick={() => onSelect(exercise)}
                            disabled={insertingId === exercise.id}
                          >
                            <Plus size={14} />
                            {insertingId === exercise.id ? 'Inserindo...' : 'Inserir'}
                          </Button>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {Object.entries(typeCounts).slice(0, 4).map(([blockType, total]) => {
                          const BlockIcon = BLOCK_TYPE_ICONS[blockType] ?? BookmarkSimple
                          return (
                            <Badge key={blockType} variant="secondary" className="gap-1 text-[10px]">
                              <BlockIcon size={10} />
                              {total}
                            </Badge>
                          )
                        })}
                        <Badge variant="secondary" className="text-[10px]">
                          {exercise.block_count} bloco(s)
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {getExerciseOptionLabel(EXERCISE_INSTRUMENTS, exercise.instrument)}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage(Math.max(0, page - 1))}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
