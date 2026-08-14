import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Books, MagnifyingGlass, Plus, SpinnerGap, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useRepertoireCollections } from '@/hooks/useRepertoireCollections'
import { useSchool } from '@/hooks/useSchool'
import { useAuth } from '@/contexts/AuthContext'
import { withCoverTemplateTag, type CoverTemplate } from '@/lib/notebookMaterialAssembler'
import type { NotebookPrintRecipe } from '@/lib/notebookPrintRecipe'
import { createDraftMaterialFromNotebook, getCollectionItems, type RepertoireCollection } from '@/services/repertoireCollectionService'
import { generateRepertoireBookPdf } from '@/services/repertoirePdfEngine'
import { coverFromNotebook } from '@/lib/repertoirePdfCover'
import { songsFromNotebookItems } from '@/lib/repertoirePdfSongs'
import { getUserById } from '@/services/userService'
import { NotebookPrintRecipeDialog } from './NotebookPrintRecipeDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NotebookCard } from './NotebookCard'
import { NotebookDetailModal } from './NotebookDetailModal'
import { NotebookFormDialog } from './NotebookFormDialog'

const INSTRUMENT_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'universal', label: 'Universal' },
  { value: 'violão', label: 'Violão' },
  { value: 'guitarra', label: 'Guitarra' },
  { value: 'baixo', label: 'Baixo' },
  { value: 'piano', label: 'Piano' },
  { value: 'canto', label: 'Canto' },
  { value: 'ukulele', label: 'Ukulele' },
]

export function RepertoireNotebookTab() {
  const { data: school } = useSchool()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [instrument, setInstrument] = useState('all')
  const [selectedNotebook, setSelectedNotebook] = useState<RepertoireCollection | null>(null)
  const [formNotebook, setFormNotebook] = useState<RepertoireCollection | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [songCounts, setSongCounts] = useState<Record<string, number>>({})
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [recipeNotebook, setRecipeNotebook] = useState<RepertoireCollection | null>(null)
  const [pendingCover, setPendingCover] = useState<{
    coverTemplate?: CoverTemplate
    coverImageUrl?: string | null
  } | null>(null)

  const { collections, loading, error, create, update, remove } = useRepertoireCollections({
    search,
    instrument,
  })

  useEffect(() => {
    let active = true

    const loadCounts = async () => {
      try {
        const entries = await Promise.all(
          collections.map(async (collection) => {
            const items = await getCollectionItems(collection.id)
            return [collection.id, items.length] as const
          }),
        )

        if (!active) return
        setSongCounts(Object.fromEntries(entries))
      } catch (err) {
        console.error('Erro ao carregar contagem de músicas dos cadernos:', err)
      }
    }

    if (collections.length === 0) {
      setSongCounts({})
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
    songCount: songCounts[collection.id] ?? 0,
  })), [collections, songCounts])

  const handleCreate = async (values: {
    name: string
    description: string
    instrument: string
    difficulty_level: string
    genre: string
  }) => {
    return await create({
      name: values.name,
      description: values.description || null,
      instrument: values.instrument,
      difficulty_level: values.difficulty_level,
      genre: values.genre || null,
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
    genre: string
  }) => {
    if (!formNotebook) return
    await update(formNotebook.id, {
      name: values.name,
      description: values.description || null,
      instrument: values.instrument,
      difficulty_level: values.difficulty_level,
      genre: values.genre || null,
    })
    setFormOpen(false)
    setFormNotebook(null)
  }

  const handleDelete = async (notebook: RepertoireCollection) => {
    if (!confirm(`Excluir o caderno "${notebook.name}"?`)) return
    await remove(notebook.id)
    if (selectedNotebook?.id === notebook.id) setSelectedNotebook(null)
  }

  const requestGenerate = (
    notebook: RepertoireCollection,
    options?: { coverTemplate?: CoverTemplate; coverImageUrl?: string | null },
  ) => {
    if (generatingId) return
    setPendingCover(options ?? null)
    setRecipeNotebook(notebook)
  }

  const openNotebookAsDraft = async (
    notebook: RepertoireCollection,
    options?: { coverTemplate?: CoverTemplate; coverImageUrl?: string | null; recipe?: NotebookPrintRecipe }
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
      const coverExtras = {
        coverTemplate: options?.coverTemplate,
        coverImageUrl: options?.coverImageUrl,
        schoolName: school?.name,
        professorName,
        logoUrl: school?.logo_url,
      }
      const result = await createDraftMaterialFromNotebook(notebook, school.id, {
        ...options,
        ...coverExtras,
      })
      if (result.skippedMissingSongs > 0) {
        toast.warning(`${result.skippedMissingSongs} música(s) sem dados foram puladas.`)
      }
      const items = await getCollectionItems(notebook.id)
      const recipe = options?.recipe
      if (recipe) {
        try {
          await generateRepertoireBookPdf({
            songs: songsFromNotebookItems(items),
            recipe,
            filename: notebook.name,
            cover: coverFromNotebook(notebook, coverExtras),
          })
          toast.success('PDF gerado no motor de repertório. Rascunho aberto no editor.')
        } catch (pdfError) {
          console.error('[PDF] Caderno:', pdfError)
          toast.error(pdfError instanceof Error ? pdfError.message : 'Não foi possível gerar o PDF.')
        }
      } else {
        toast.success('Rascunho criado. Use Download no editor para gerar o PDF.')
      }
      navigate(`/editor/${result.materialId}`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível gerar o caderno.')
      return false
    } finally {
      setGeneratingId(null)
    }
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
              placeholder="Ex: Primeiros acordes, blues..."
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
          <p className="text-[12px] text-text3">Crie o primeiro caderno de repertório.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((notebook) => (
            <NotebookCard
              key={notebook.id}
              notebook={notebook}
              onOpen={setSelectedNotebook}
              onEdit={(value) => {
                setFormNotebook(value)
                setFormOpen(true)
              }}
              onDelete={handleDelete}
              onGenerate={requestGenerate}
              generating={generatingId === notebook.id}
              generateDisabled={Boolean(generatingId)}
            />
          ))}
        </div>
      )}

      <NotebookDetailModal
        notebook={selectedNotebook}
        open={!!selectedNotebook}
        onOpenChange={(open) => !open && setSelectedNotebook(null)}
        onEdit={(notebook) => {
          setSelectedNotebook(null)
          setFormNotebook(notebook)
          setFormOpen(true)
        }}
        onGenerate={requestGenerate}
        generating={generatingId === selectedNotebook?.id}
        generateDisabled={Boolean(generatingId)}
      />

      <NotebookFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setFormNotebook(null)
        }}
        notebook={formNotebook}
        schoolId={school?.id}
        onSave={formNotebook ? handleUpdate : handleCreate}
        onGenerateAfterCreate={async (notebook, cover) => {
          requestGenerate(notebook, cover)
          return true
        }}
        onPersistCover={async (notebook, cover) => {
          await update(notebook.id, {
            cover_image_url: cover.coverImageUrl,
            tags: withCoverTemplateTag(notebook.tags, cover.coverTemplate),
          })
        }}
      />

      <NotebookPrintRecipeDialog
        notebook={recipeNotebook}
        open={!!recipeNotebook}
        confirming={Boolean(generatingId)}
        onOpenChange={(open) => {
          if (!open && !generatingId) {
            setRecipeNotebook(null)
            setPendingCover(null)
          }
        }}
        onConfirm={async (recipe) => {
          if (!recipeNotebook) return
          const notebook = recipeNotebook
          const cover = pendingCover
          const ok = await openNotebookAsDraft(notebook, { ...cover, recipe })
          if (ok) {
            setRecipeNotebook(null)
            setPendingCover(null)
          }
        }}
      />
    </div>
  )
}
