import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Books, MagnifyingGlass, Plus, SpinnerGap, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useExerciseCollections } from '@/hooks/useExerciseCollections'
import { useSchool } from '@/hooks/useSchool'
import { useAuth } from '@/contexts/AuthContext'
import { coverTemplateFromTags, withCoverTemplateTag, type CoverTemplate } from '@/lib/notebookMaterialAssembler'
import { EXERCISE_INSTRUMENTS } from '@/lib/exerciseLibraryOptions'
import {
  createDraftMaterialFromExerciseNotebook,
  getExerciseCollectionItems,
  updateExerciseCollection,
  type ExerciseCollection,
} from '@/services/exerciseCollectionService'
import { getUserById } from '@/services/userService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExerciseNotebookCard } from './ExerciseNotebookCard'
import { ExerciseNotebookDetailModal } from './ExerciseNotebookDetailModal'
import { ExerciseNotebookFormDialog } from './ExerciseNotebookFormDialog'

const INSTRUMENT_OPTIONS = [
  { value: 'all', label: 'Todos' },
  ...EXERCISE_INSTRUMENTS,
]

export function ExerciseNotebookTab() {
  const { data: school } = useSchool()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [instrument, setInstrument] = useState('all')
  const [selectedNotebook, setSelectedNotebook] = useState<ExerciseCollection | null>(null)
  const [formNotebook, setFormNotebook] = useState<ExerciseCollection | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [exerciseCounts, setExerciseCounts] = useState<Record<string, number>>({})
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [coverPersist, setCoverPersist] = useState<Record<string, Pick<ExerciseCollection, 'tags' | 'cover_image_url'>>>({})

  const { collections, loading, error, create, update, remove } = useExerciseCollections({
    search,
    instrument,
  })

  useEffect(() => {
    let active = true

    const loadCounts = async () => {
      try {
        const entries = await Promise.all(
          collections.map(async (collection) => {
            const items = await getExerciseCollectionItems(collection.id)
            return [collection.id, items.length] as const
          }),
        )

        if (!active) return
        setExerciseCounts(Object.fromEntries(entries))
      } catch (err) {
        console.error('Erro ao carregar contagem de exercícios dos cadernos:', err)
      }
    }

    if (collections.length === 0) {
      setExerciseCounts({})
      return () => {
        active = false
      }
    }

    loadCounts()

    return () => {
      active = false
    }
  }, [collections])

  const notebooks = useMemo(() => collections.map((collection) => ({
    ...collection,
    ...(coverPersist[collection.id] ?? {}),
    exerciseCount: exerciseCounts[collection.id] ?? 0,
  })), [collections, coverPersist, exerciseCounts])

  const handleCreate = async (values: {
    name: string
    description: string
    instrument: string
    difficulty_level: string
  }) => {
    return await create({
      name: values.name,
      description: values.description || null,
      instrument: values.instrument,
      difficulty_level: values.difficulty_level,
      tags: [],
      cover_image_url: null,
      is_template: false,
      curation_status: 'draft',
      sort_order: collections.length + 1,
    })
  }

  const handleUpdate = async (values: {
    name: string
    description: string
    instrument: string
    difficulty_level: string
  }) => {
    if (!formNotebook) return
    await update(formNotebook.id, {
      name: values.name,
      description: values.description || null,
      instrument: values.instrument,
      difficulty_level: values.difficulty_level,
    })
    setFormOpen(false)
    setFormNotebook(null)
  }

  const handleDelete = async (notebook: ExerciseCollection) => {
    if (!confirm(`Excluir o caderno "${notebook.name}"?`)) return
    await remove(notebook.id)
    if (selectedNotebook?.id === notebook.id) setSelectedNotebook(null)
  }

  const openNotebookAsDraft = async (
    notebook: ExerciseCollection,
    options?: {
      coverTemplate?: CoverTemplate
      coverImageUrl?: string | null
    },
  ): Promise<boolean> => {
    if (generatingId) return false
    if (!school?.id) {
      toast.error('Não foi possível identificar a escola para criar o rascunho.')
      return false
    }

    setGeneratingId(notebook.id)
    try {
      let professorName = ''
      if (user?.id) {
        try {
          professorName = (await getUserById(user.id))?.name?.trim() || ''
        } catch {
          professorName = ''
        }
      }

      const result = await createDraftMaterialFromExerciseNotebook(notebook, school.id, {
        coverTemplate: options?.coverTemplate,
        coverImageUrl: options?.coverImageUrl,
        schoolName: school?.name,
        professorName,
        logoUrl: school?.logo_url,
      })

      if (result.skippedMissingExercises > 0) {
        toast.warning(`${result.skippedMissingExercises} exercício(s) sem dados foram pulados.`)
      }
      toast.success('Rascunho criado. Use Download no editor para gerar o PDF.')
      navigate(`/editor/${result.materialId}`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível montar o caderno.')
      return false
    } finally {
      setGeneratingId(null)
    }
  }

  const handleMontar = (notebook: ExerciseCollection) => {
    void openNotebookAsDraft(notebook, {
      coverTemplate: coverTemplateFromTags(notebook.tags),
      coverImageUrl: notebook.cover_image_url,
    })
  }

  const handleItemsChange = (notebookId: string, count: number) => {
    setExerciseCounts((prev) => ({ ...prev, [notebookId]: count }))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] bg-card border border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1">
              <MagnifyingGlass size={12} /> Buscar
            </label>
            <Input
              placeholder="Ex: Técnica Grow, cromático..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>

          <div className="w-[160px] space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">
              Instrumento
            </label>
            <Select value={instrument} onValueChange={setInstrument}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-[12px] text-text3 ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {collections.length} caderno{collections.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              size="sm"
              onClick={() => {
                setFormNotebook(null)
                setFormOpen(true)
              }}
            >
              <Plus size={14} />
              Novo Caderno
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[14px] bg-red-500/10 border border-red-500/20 p-6 text-center">
          <Warning size={24} className="mx-auto mb-2 text-red-400" />
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <SpinnerGap size={32} className="animate-spin text-accent" />
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-[14px] bg-muted/30 border border-border p-8 text-center">
          <Books size={24} className="mx-auto mb-2 text-text3" />
          <p className="text-[14px] text-text2 mb-1">Nenhum caderno encontrado</p>
          <p className="text-[12px] text-text3">Crie o primeiro caderno de exercício.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((notebook) => (
            <ExerciseNotebookCard
              key={notebook.id}
              notebook={notebook}
              onOpen={setSelectedNotebook}
              onEdit={(value) => {
                setFormNotebook(value)
                setFormOpen(true)
              }}
              onDelete={handleDelete}
              onGenerate={handleMontar}
              generating={generatingId === notebook.id}
              generateDisabled={Boolean(generatingId)}
            />
          ))}
        </div>
      )}

      <ExerciseNotebookDetailModal
        notebook={selectedNotebook}
        open={!!selectedNotebook}
        onOpenChange={(open) => !open && setSelectedNotebook(null)}
        onEdit={(notebook) => {
          setSelectedNotebook(null)
          setFormNotebook(notebook)
          setFormOpen(true)
        }}
        onGenerate={handleMontar}
        onItemsChange={handleItemsChange}
        generating={generatingId === selectedNotebook?.id}
        generateDisabled={Boolean(generatingId)}
      />

      <ExerciseNotebookFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setFormNotebook(null)
        }}
        notebook={formNotebook}
        schoolId={school?.id}
        onSave={formNotebook ? handleUpdate : handleCreate}
        onPersistCover={async (notebook, cover) => {
          const updated = await updateExerciseCollection(notebook.id, {
            cover_image_url: cover.coverImageUrl,
            tags: withCoverTemplateTag(notebook.tags, cover.coverTemplate),
          })
          setCoverPersist((prev) => ({
            ...prev,
            [updated.id]: {
              tags: updated.tags,
              cover_image_url: updated.cover_image_url,
            },
          }))
          setSelectedNotebook(updated)
        }}
      />
    </div>
  )
}
