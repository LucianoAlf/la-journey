import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { BookmarkSimple, Books, Columns, FunnelSimple, Guitar, ImageSquare, ListNumbers, MagnifyingGlass, MusicNotes, PianoKeys, Plus, SpinnerGap, TextAa, TextT } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  searchChordsForEditor,
  searchCuratedBlocksForEditor,
  searchExerciseLibraryForEditor,
  searchNotationsForEditor,
  searchRepertoireForEditor,
  type Chord,
  type CuratedContentBlock,
  type ExerciseLibraryItem,
  type NotationLibraryRow,
  type RepertoireContentItem,
} from '@/services/contentBrowserService'
import {
  adaptChordLibraryItem,
  adaptContentBlockItem,
  adaptExerciseLibraryItem,
  adaptNotationLibraryItem,
  adaptRepertoireItem,
  type PreparedMaterialBlock,
} from '@/lib/contentBrowserAdapters'
import { buildContentPreview, type ContentPreviewKind, type ContentPreviewSummary } from '@/lib/contentPreview'
import { getExerciseOptionLabel, EXERCISE_CATEGORIES, EXERCISE_LEVELS } from '@/lib/exerciseLibraryOptions'

type ContentBrowserTab = 'exercises' | 'curated' | 'notation' | 'chords' | 'repertoire'

interface ContentBrowserItem {
  id: string
  title: string
  subtitle: string
  badge: string
  meta?: string
  blocks: PreparedMaterialBlock[]
  preview: ContentPreviewSummary
  actions?: Array<{
    id: string
    label: string
    blocks: PreparedMaterialBlock[]
  }>
}

interface ContentBrowserProps {
  open: boolean
  onClose: () => void
  onSelect: (blocks: PreparedMaterialBlock[], item: ContentBrowserItem) => Promise<void> | void
  insertingId?: string | null
}

const TAB_LABELS: Record<ContentBrowserTab, string> = {
  exercises: 'Exercícios',
  curated: 'Base Curada',
  notation: 'Notação',
  chords: 'Acordes',
  repertoire: 'Repertório',
}

const TAB_ICONS: Record<ContentBrowserTab, ComponentType<{ size?: number; className?: string }>> = {
  exercises: BookmarkSimple,
  curated: Books,
  notation: MusicNotes,
  chords: Guitar,
  repertoire: TextAa,
}

const PREVIEW_ICONS: Record<ContentPreviewKind, ComponentType<{ size?: number; className?: string }>> = {
  text: TextT,
  notation: MusicNotes,
  chord: Guitar,
  tablature: ListNumbers,
  keyboard: PianoKeys,
  media: ImageSquare,
  layout: Columns,
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getContentText(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  const raw = record.html ?? record.text ?? record.description ?? ''
  return typeof raw === 'string' ? stripHtml(raw).slice(0, 140) : ''
}

function mapExercise(item: ExerciseLibraryItem): ContentBrowserItem {
  const blocks = adaptExerciseLibraryItem(item)
  return {
    id: item.id,
    title: item.title,
    subtitle: item.description ?? (getContentText(item.blocks?.[0]?.content) || `${item.block_count} bloco(s) reutilizáveis`),
    badge: getExerciseOptionLabel(EXERCISE_CATEGORIES, item.category),
    meta: `${getExerciseOptionLabel(EXERCISE_LEVELS, item.difficulty_level)} · ${item.block_count} bloco(s)`,
    blocks,
    preview: buildContentPreview(blocks),
  }
}

function mapCurated(item: CuratedContentBlock): ContentBrowserItem {
  const blocks = adaptContentBlockItem(item)
  return {
    id: item.id,
    title: item.title ?? 'Bloco curado',
    subtitle: getContentText(item.content) || 'Conteudo pedagogico curado',
    badge: String(item.block_type ?? 'text'),
    meta: item.similarity ? `${Math.round(item.similarity * 100)}% similar` : item.curation_status ?? undefined,
    blocks,
    preview: buildContentPreview(blocks),
  }
}

function mapNotation(item: NotationLibraryRow): ContentBrowserItem {
  const blocks = adaptNotationLibraryItem(item)
  return {
    id: item.id,
    title: item.name,
    subtitle: item.description ?? `${item.clef} · ${item.key_signature ?? 'C'}`,
    badge: item.category,
    meta: item.time_signature ?? undefined,
    blocks,
    preview: buildContentPreview(blocks),
  }
}

function mapChord(item: Chord): ContentBrowserItem {
  const blocks = adaptChordLibraryItem(item)
  return {
    id: item.id,
    title: item.name,
    subtitle: [item.instrument, item.family, item.quality].filter(Boolean).join(' · ') || 'Acorde da biblioteca',
    badge: item.root_note ?? 'Acorde',
    meta: item.difficulty ? `Nivel ${item.difficulty}` : undefined,
    blocks,
    preview: buildContentPreview(blocks),
  }
}

function mapRepertoire(item: RepertoireContentItem): ContentBrowserItem {
  const blocks = adaptRepertoireItem(item)
  const chords = item.chords?.filter(Boolean) ?? []
  const chordBlocks = chords.length ? adaptRepertoireItem(item, { includeChordGrid: true }) : null
  return {
    id: item.id,
    title: item.title,
    subtitle: item.artist ?? item.genre ?? 'Musica do repertorio',
    badge: item.key ?? 'Tom',
    meta: chords.length ? `${chords.length} acorde(s)` : item.genre ?? undefined,
    blocks,
    preview: buildContentPreview(blocks),
    actions: chordBlocks
      ? [{ id: 'with-chords', label: 'Com acordes', blocks: chordBlocks }]
      : undefined,
  }
}

export function ContentBrowser({ open, onClose, onSelect, insertingId = null }: ContentBrowserProps) {
  const [activeTab, setActiveTab] = useState<ContentBrowserTab>('exercises')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<ContentBrowserItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeIcon = useMemo(() => TAB_ICONS[activeTab], [activeTab])
  const ActiveIcon = activeIcon

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const query = search.trim()
        let nextItems: ContentBrowserItem[]

        if (activeTab === 'exercises') {
          const result = await searchExerciseLibraryForEditor(query)
          nextItems = result.data.map(mapExercise)
        } else if (activeTab === 'curated') {
          const result = await searchCuratedBlocksForEditor(query)
          nextItems = result.map(mapCurated)
        } else if (activeTab === 'notation') {
          const result = await searchNotationsForEditor(query)
          nextItems = result.map(mapNotation)
        } else if (activeTab === 'chords') {
          const result = await searchChordsForEditor(query)
          nextItems = result.map(mapChord)
        } else {
          const result = await searchRepertoireForEditor(query)
          nextItems = result.map(mapRepertoire)
        }

        if (!cancelled) setItems(nextItems)
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Erro ao buscar conteúdo')
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 450)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeTab, open, search])

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        className="max-h-[90vh] bg-surface border-border overflow-hidden"
        style={{
          width: 'min(980px, calc(100vw - 48px))',
          maxWidth: 'min(980px, calc(100vw - 48px))',
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px]">
            <ActiveIcon size={18} className="text-accent" />
            Adicionar <span className="text-accent">conteúdo</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentBrowserTab)} className="min-h-0">
          <TabsList className="grid !h-12 w-full grid-cols-5 rounded-xl bg-bg2/80 p-1">
            {(Object.keys(TAB_LABELS) as ContentBrowserTab[]).map((tab) => {
              const Icon = TAB_ICONS[tab]
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="!h-10 min-w-0 gap-2 rounded-lg px-3 text-[12px] font-semibold data-[state=active]:border-border data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Icon size={15} className="shrink-0" />
                  {TAB_LABELS[tab]}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  activeTab === 'curated'
                    ? 'Buscar por assunto: pentatônica, intervalos, leitura...'
                    : 'Buscar por título, descrição ou termo musical...'
                }
                className="h-10 pl-9 text-[13px]"
              />
            </div>
            <div className="flex items-center gap-2 text-[12px] text-text3">
              {loading ? <SpinnerGap size={14} className="animate-spin" /> : <FunnelSimple size={14} />}
              {loading ? 'Buscando...' : `${items.length} resultado(s)`}
            </div>
          </div>

          {(Object.keys(TAB_LABELS) as ContentBrowserTab[]).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                {error ? (
                  <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-[13px] text-text3">
                    {error}
                  </div>
                ) : !loading && items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-[13px] text-text3">
                    Nenhum conteúdo encontrado nessa fonte.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {items.map((item) => (
                      <article key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="text-[10px]">{item.badge}</Badge>
                              {item.meta && <Badge variant="outline" className="text-[10px]">{item.meta}</Badge>}
                            </div>
                            <div>
                              <h3 className="line-clamp-2 text-[14px] font-semibold text-text">{item.title}</h3>
                              <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-text2">{item.subtitle}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.preview.chips.map((chip) => {
                                const Icon = PREVIEW_ICONS[chip.kind]
                                return (
                                  <span
                                    key={chip.kind}
                                    className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-bg2/55 px-2 py-1 text-[11px] font-medium text-text2"
                                    title={chip.detail ? `${chip.label}: ${chip.detail}` : chip.label}
                                  >
                                    <Icon size={13} className="shrink-0 text-accent" />
                                    <span className="truncate">{chip.label}{chip.count > 1 ? ` ${chip.count}` : ''}</span>
                                    {chip.detail && <span className="max-w-[120px] truncate text-text3">· {chip.detail}</span>}
                                  </span>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => onSelect(item.blocks, item)}
                              disabled={insertingId === item.id || item.blocks.length === 0}
                              className="shrink-0"
                            >
                              <Plus size={14} />
                              {insertingId === item.id ? 'Inserindo...' : 'Inserir'}
                            </Button>
                            {item.actions?.map((action) => (
                              <Button
                                key={action.id}
                                size="sm"
                                variant="outline"
                                onClick={() => onSelect(action.blocks, { ...item, blocks: action.blocks })}
                                disabled={insertingId === item.id || action.blocks.length === 0}
                                className="shrink-0 gap-1.5 px-2 text-[11px]"
                              >
                                <Guitar size={13} />
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
