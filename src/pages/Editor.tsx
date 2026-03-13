import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, FloppyDisk, FilePdf, TextAa, Article,
  Guitar, MusicNotes, Lightbulb, PencilCircle, ListNumbers,
  TextHOne, LineSegment, Image as ImageIcon, Plus, Trash,
  SpinnerGap, DotsSixVertical, PencilSimple, ArrowCounterClockwise,
  Printer, Code, Eye, EyeSlash, PencilLine, PianoKeys,
  MagnifyingGlassPlus, MagnifyingGlassMinus, Gear, Hash,
  TextAlignLeft, TextAlignCenter, TextAlignRight,
  BookOpen, Rows, GridFour, Sparkle, SpeakerHigh, VideoCamera,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor, type AIActionType } from "@/components/editor/RichTextEditor";
import { ensureHtml, htmlToMarkdown } from "@/lib/markdownToHtml";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMaterials, useMaterialWithBlocks } from "@/hooks/useMaterials";
import { useSchool } from "@/hooks/useSchool";
import {
  updateMaterialBlockRpc, reorderMaterialBlocks, addMaterialBlock,
  deleteMaterialBlock, updateMaterial,
} from "@/services/materialService";
import type { MaterialWithBlocks, MaterialListItem } from "@/services/materialService";
import { MaterialPreview, type MaterialBlock } from "@/components/material/MaterialPreview";
import { NotationEditor, type NotationSaveData } from "@/components/music/NotationEditor";
import { ChordEditor, createEmptyState, positionsToState, stateToPositions, type ChordEditorState } from "@/components/music/ChordEditor";
import type { ChordPositions } from "@/components/music/ChordDiagram";
import { KeyboardEditor, type PianoChordData } from "@/components/music/KeyboardEditor";
import { generateImage, generateText } from "@/services/aiService";
import { supabase } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Tipos internos ---

interface PageConfig {
  header: {
    enabled: boolean
    leftText: string   // ex: título do material, nome da escola
    centerText: string
    rightText: string
    showOnFirstPage: boolean
  }
  footer: {
    enabled: boolean
    leftText: string
    centerText: string
    rightText: string  // ex: "Página {n} de {total}"
    showPageNumber: boolean
    pageNumberPosition: 'left' | 'center' | 'right'
  }
}

const DEFAULT_PAGE_CONFIG: PageConfig = {
  header: {
    enabled: true,
    leftText: '{titulo}',
    centerText: '',
    rightText: '',
    showOnFirstPage: true,
  },
  footer: {
    enabled: true,
    leftText: '',
    centerText: '',
    rightText: '',
    showPageNumber: true,
    pageNumberPosition: 'right',
  },
}

interface EditorBlock {
  id: string
  block_type: string
  title: string | null
  content: Record<string, unknown> | null
  render_data: Record<string, unknown> | null
  sort_order: number
  is_edited: boolean
  original_content: Record<string, unknown> | null
}

// --- Helpers ---

/** Resolve placeholders em textos de header/footer */
function resolvePageText(text: string, ctx: { titulo: string; pagina: number; total: number }): string {
  if (!text) return ''
  return text
    .replace(/\{titulo\}/g, ctx.titulo ?? '')
    .replace(/\{pagina\}/g, String(ctx.pagina ?? ''))
    .replace(/\{total\}/g, String(ctx.total ?? ''))
}

const BLOCK_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; color: string }> = {
  text:           { label: 'Texto',     icon: Article,      bg: 'var(--azul-soft)',       color: 'var(--azul-claro)' },
  tip:            { label: 'Dica',      icon: Lightbulb,    bg: 'var(--dourado-soft)',     color: 'var(--dourado)' },
  exercise:       { label: 'Exercício', icon: PencilCircle, bg: 'var(--advance-soft)',     color: 'var(--advance)' },
  notation:       { label: 'Notação',   icon: MusicNotes,   bg: 'var(--master-soft)',      color: 'var(--master)' },
  chord_diagram:  { label: 'Acorde',    icon: Guitar,       bg: 'var(--grow-soft)',        color: 'var(--grow)' },
  tablature:      { label: 'Tablatura', icon: ListNumbers,  bg: 'var(--foundation-soft)',  color: 'var(--foundation)' },
  title:          { label: 'Título',    icon: TextHOne,     bg: 'var(--foundation-soft)',  color: 'var(--foundation)' },
  separator:      { label: 'Separador', icon: LineSegment,  bg: 'var(--border)',           color: 'var(--text3)' },
  page_break:     { label: 'Quebra de Página', icon: LineSegment, bg: 'var(--border)',      color: 'var(--text3)' },
  image:          { label: 'Imagem',    icon: ImageIcon,    bg: 'var(--accent-soft)',      color: 'var(--accent)' },
  badge:          { label: 'Conquista', icon: PencilCircle, bg: 'var(--verde-soft)',       color: 'var(--verde)' },
  cover:          { label: 'Capa',      icon: BookOpen,     bg: 'var(--accent-soft)',      color: 'var(--accent)' },
  chord_grid:     { label: 'Grade Acordes', icon: GridFour, bg: 'var(--grow-soft)',        color: 'var(--grow)' },
  keyboard:       { label: 'Teclado',   icon: PianoKeys,    bg: 'var(--master-soft)',      color: 'var(--master)' },
  keyboard_grid:  { label: 'Grade Teclados', icon: GridFour, bg: 'var(--master-soft)',   color: 'var(--master)' },
  columns:         { label: 'Colunas',  icon: Rows,     bg: 'var(--azul-soft)',       color: 'var(--azul)' },
  audio:           { label: 'Áudio',   icon: SpeakerHigh, bg: 'var(--grow-soft)',    color: 'var(--grow)' },
  video:           { label: 'Vídeo',   icon: VideoCamera,  bg: 'var(--accent-soft)',  color: 'var(--accent)' },
}

function getBlockConfig(type: string) {
  return BLOCK_TYPE_CONFIG[type] ?? { label: type, icon: Article, bg: 'var(--azul-soft)', color: 'var(--azul-claro)' }
}

function parseBlocks(rows: MaterialWithBlocks[]): { material: MaterialWithBlocks; blocks: EditorBlock[] } {
  const first = rows[0]
  const blocks: EditorBlock[] = rows
    .filter(r => r.block_id != null)
    .map(r => ({
      id: r.block_id!,
      block_type: r.block_type ?? 'text',
      title: r.block_title,
      content: r.block_content,
      render_data: r.block_render_data,
      sort_order: r.block_sort_order ?? 0,
      is_edited: r.block_is_edited ?? false,
      original_content: r.block_original_content,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)
  return { material: first, blocks }
}

function editorBlockToPreview(b: EditorBlock): MaterialBlock {
  return {
    block_type: b.block_type as MaterialBlock['block_type'],
    title: b.title ?? undefined,
    content: b.content as MaterialBlock['content'],
    render_data: b.render_data,
  }
}

// --- Componente Sortable para sidebar ---

function SortableBlockItem({
  block, isSelected, onSelect, onDelete,
}: {
  block: EditorBlock; isSelected: boolean; onSelect: () => void; onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const cfg = getBlockConfig(block.block_type)
  const Icon = cfg.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        <DotsSixVertical size={14} />
      </div>
      <div className="flex items-center gap-2 pl-3.5">
        <div className="block-type-icon" style={{ background: cfg.bg, color: cfg.color }}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs truncate">{cfg.label}</div>
          <div className="text-[11px] text-text3 truncate">{block.title ?? '(sem título)'}</div>
        </div>
      </div>
      <div className="block-actions">
        {block.is_edited && (
          <span className="text-[9px] text-dourado font-bold mr-1">editado</span>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button onClick={e => e.stopPropagation()} title="Remover">
              <Trash size={12} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover bloco?</AlertDialogTitle>
              <AlertDialogDescription>
                O bloco "{block.title ?? cfg.label}" será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-vermelho hover:bg-vermelho/80">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// =============================================
// PARTE 4: Listagem de Materiais
// =============================================

function MaterialList() {
  const navigate = useNavigate()
  const { data: school } = useSchool()
  const { data: materials, loading, error } = useMaterials(school?.id)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Editor de <em className="not-italic text-accent">Material</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Gerencie e edite materiais didáticos gerados
          </p>
        </div>
        <Button onClick={() => navigate('/gerador')}>
          <Plus size={16} /> Novo Material
        </Button>
      </div>

      <div className="card">
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-text2">
            <SpinnerGap size={20} className="animate-spin" /> Carregando materiais...
          </div>
        )}

        {error && (
          <div className="p-4 bg-vermelho-soft rounded-[var(--radius-sm)] text-sm text-vermelho">
            Erro ao carregar materiais: {error}
          </div>
        )}

        {!loading && !error && (!materials || materials.length === 0) && (
          <div className="text-center py-12 text-text3 text-sm">
            <Article size={32} className="mx-auto mb-3 text-text3/50" />
            Nenhum material gerado ainda.
            <div className="mt-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/gerador')}>
                Ir para o Gerador
              </Button>
            </div>
          </div>
        )}

        {materials && materials.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Título</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Jornada</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Estação</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Blocos</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Status</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Data</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m: MaterialListItem) => (
                  <tr
                    key={m.id}
                    className="border-b border-border hover:bg-azul-soft/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/editor/${m.id}`)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[13px] text-text">{m.title}</div>
                    </td>
                    <td className="py-3 px-4 text-[12px] text-text2">{m.journey_name ?? '—'}</td>
                    <td className="py-3 px-4 text-[12px] text-text2">{m.station_name ?? '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">{m.block_count}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      {m.is_draft
                        ? <Badge variant="gold" className="text-[9px]">Rascunho</Badge>
                        : <Badge variant="advance" className="text-[9px]">Publicado</Badge>
                      }
                    </td>
                    <td className="py-3 px-4 text-[11px] text-text3">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================
// PARTE 2: Editor de Material
// =============================================

function MaterialEditor({ materialId }: { materialId: string }) {
  const navigate = useNavigate()
  const { data: rawData, loading, error, refetch } = useMaterialWithBlocks(materialId)

  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const [materialTitle, setMaterialTitle] = useState('')
  const [materialMeta, setMaterialMeta] = useState<MaterialWithBlocks | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const canvasRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Edição inline no canvas
  const [inlineEditingBlockId, setInlineEditingBlockId] = useState<string | null>(null)
  const [coverTitleEditing, setCoverTitleEditing] = useState(false)

  // Zoom do canvas A4
  const [zoom, setZoom] = useState(0.75)
  const canvasScrollRef = useRef<HTMLDivElement>(null)

  // Configuração de cabeçalho/rodapé da página
  const [pageConfig, setPageConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG)

  // Estados dos editores visuais integrados
  const [notationEditorOpen, setNotationEditorOpen] = useState(false)
  const [notationEditorBlockId, setNotationEditorBlockId] = useState<string | null>(null)
  const [chordEditorOpen, setChordEditorOpen] = useState(false)
  const [chordEditorBlockId, setChordEditorBlockId] = useState<string | null>(null)
  const [chordEditorState, setChordEditorState] = useState<ChordEditorState>(createEmptyState())
  const [chordEditorName, setChordEditorName] = useState('')
  const [chordEditorStartFret, setChordEditorStartFret] = useState(1)

  // Parsear dados vindos da RPC
  useEffect(() => {
    if (rawData && rawData.length > 0) {
      const { material, blocks: parsed } = parseBlocks(rawData)
      setMaterialMeta(material)
      setMaterialTitle(material.material_title)
      setBlocks(parsed)
      if (!selectedBlockId && parsed.length > 0) {
        setSelectedBlockId(parsed[0].id)
      }
    }
  }, [rawData])

  const selectedBlock = useMemo(
    () => blocks.find(b => b.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  )

  /** Auto-paginação A4: mede blocos e distribui entre páginas */
  const A4_CONTENT_HEIGHT = 1029 // 1123 - 38(header) - 32(footer) - 24(content padding 12+12) px
  const [blockHeights, setBlockHeights] = useState<Record<string, number>>({})
  const measureContainerRef = useRef<HTMLDivElement>(null)

  // Medir blocos no container de medição oculto
  useEffect(() => {
    const container = measureContainerRef.current
    if (!container) return

    const measure = () => {
      const heights: Record<string, number> = {}
      const children = container.querySelectorAll<HTMLElement>('[data-block-id]')
      children.forEach(el => {
        const id = el.getAttribute('data-block-id')
        if (id) heights[id] = el.offsetHeight
      })
      setBlockHeights(prev => {
        if (Object.keys(heights).length === 0) return prev
        const same = Object.keys(heights).length === Object.keys(prev).length &&
          Object.entries(heights).every(([k, v]) => Math.abs((prev[k] ?? 0) - v) < 2)
        return same ? prev : heights
      })
    }

    const timer = setTimeout(measure, 150)
    const observer = new ResizeObserver(() => measure())
    observer.observe(container)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [blocks])

  /** Distribui blocos em páginas A4 respeitando alturas medidas */
  const pages = useMemo(() => {
    const result: EditorBlock[][] = [[]]
    let currentHeight = 0

    for (const block of blocks) {
      if (block.block_type === 'page_break') {
        result.push([])
        currentHeight = 0
        continue
      }

      // Bloco capa ocupa página inteira
      if (block.block_type === 'cover') {
        if (result[result.length - 1].length > 0) result.push([])
        result[result.length - 1].push(block)
        result.push([]) // próximos blocos na página seguinte
        currentHeight = 0
        continue
      }

      const h = blockHeights[block.id] ?? 120 // fallback estimado
      if (currentHeight + h > A4_CONTENT_HEIGHT && result[result.length - 1].length > 0) {
        result.push([])
        currentHeight = 0
      }

      result[result.length - 1].push(block)
      currentHeight += h
    }

    return result
  }, [blocks, blockHeights])

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = blocks.findIndex(b => b.id === active.id)
    const newIndex = blocks.findIndex(b => b.id === over.id)
    const newBlocks = arrayMove(blocks, oldIndex, newIndex)
    setBlocks(newBlocks)

    try {
      await reorderMaterialBlocks(materialId, newBlocks.map(b => b.id))
    } catch (e: any) {
      toast.error('Erro ao reordenar: ' + (e?.message ?? ''))
      refetch()
    }
  }, [blocks, materialId, refetch])

  // Selecionar bloco + scroll no canvas
  const selectBlock = useCallback((id: string) => {
    setSelectedBlockId(id)
    const el = canvasRefs.current[id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  // Adicionar bloco
  const handleAddBlock = useCallback(async (blockType: string) => {
    const lastOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.sort_order)) : 0
    const defaultTitle = blockType === 'cover' ? (materialTitle || 'Capa')
      : blockType === 'chord_grid' ? 'Grade de Acordes'
      : blockType === 'keyboard' ? 'Teclado'
      : blockType === 'keyboard_grid' ? 'Grade de Teclados'
      : blockType === 'columns' ? null
      : null
    const defaultRenderData = blockType === 'cover'
      ? { template: 'minimal', titulo: materialTitle || '', subtitulo: '', instrumento: '', nivel: '', professor: '', escola: '', data: '' }
      : blockType === 'chord_grid' ? { chords: [], columns: 3 }
      : blockType === 'keyboard' ? { keys: [], hand: 'rh' }
      : blockType === 'keyboard_grid' ? { keyboards: [], columns: 3 }
      : blockType === 'columns' ? { columns: [{ blocks: [] }, { blocks: [] }] }
      : null
    try {
      await addMaterialBlock({
        materialId,
        blockType,
        title: defaultTitle,
        content: { text: '' },
        renderData: defaultRenderData,
        afterOrder: lastOrder,
      })
      toast.success('Bloco adicionado')
      refetch()
    } catch (e: any) {
      // Fallback local: banco pode rejeitar block_types novos (CHECK constraint)
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      setBlocks(prev => [...prev, {
        id: tempId,
        block_type: blockType,
        title: defaultTitle,
        content: { text: '' },
        render_data: defaultRenderData,
        sort_order: lastOrder + 1,
        is_edited: false,
        original_content: null,
      }])
      toast.info('Bloco adicionado localmente (salvar no banco pendente)')
    }
  }, [blocks, materialId, materialTitle, refetch])

  // Deletar bloco
  const handleDeleteBlock = useCallback(async (blockId: string) => {
    try {
      await deleteMaterialBlock(blockId)
      setBlocks(prev => prev.filter(b => b.id !== blockId))
      if (selectedBlockId === blockId) setSelectedBlockId(null)
      toast.success('Bloco removido')
    } catch (e: any) {
      toast.error('Erro ao remover bloco: ' + (e?.message ?? ''))
    }
  }, [selectedBlockId])

  // Salvar alterações do bloco selecionado
  const handleSaveBlock = useCallback(async () => {
    if (!selectedBlock) return
    setSaving(true)
    try {
      await updateMaterialBlockRpc({
        blockId: selectedBlock.id,
        title: selectedBlock.title,
        content: selectedBlock.content,
        renderData: selectedBlock.render_data,
      })
      setBlocks(prev => prev.map(b =>
        b.id === selectedBlock.id ? { ...b, is_edited: true } : b,
      ))
      toast.success('Bloco salvo')
    } catch (e: any) {
      toast.error('Erro ao salvar bloco: ' + (e?.message ?? ''))
    } finally {
      setSaving(false)
    }
  }, [selectedBlock])

  // Reverter bloco ao original
  const handleRevertBlock = useCallback(async () => {
    if (!selectedBlock?.original_content) return
    const reverted = { ...selectedBlock, content: selectedBlock.original_content, is_edited: false }
    setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? reverted : b))
    try {
      await updateMaterialBlockRpc({
        blockId: selectedBlock.id,
        content: selectedBlock.original_content,
      })
      toast.success('Bloco revertido ao original')
    } catch (e: any) {
      toast.error('Erro ao reverter: ' + (e?.message ?? ''))
    }
  }, [selectedBlock])

  // Atualizar campo local do bloco selecionado
  const updateSelectedField = useCallback((field: 'title' | 'content', value: any) => {
    if (!selectedBlockId) return
    setBlocks(prev => prev.map(b => {
      if (b.id !== selectedBlockId) return b
      if (field === 'title') return { ...b, title: value }
      if (field === 'content') return { ...b, content: value }
      return b
    }))
  }, [selectedBlockId])

  // Atualizar render_data do bloco selecionado (para capa, grade de acordes, etc.)
  const updateSelectedRenderData = useCallback((field: string, value: any) => {
    if (!selectedBlockId) return
    setBlocks(prev => prev.map(b => {
      if (b.id !== selectedBlockId) return b
      return { ...b, render_data: { ...(b.render_data ?? {}), [field]: value } }
    }))
  }, [selectedBlockId])

  // Abrir KeyboardEditor para bloco tipo 'keyboard'
  const [keyboardEditorBlockId, setKeyboardEditorBlockId] = useState<string | null>(null)
  const [keyboardEditorOpen, setKeyboardEditorOpen] = useState(false)

  const openKeyboardEditorForBlock = useCallback((blockId: string) => {
    setKeyboardEditorBlockId(blockId)
    setKeyboardEditorOpen(true)
  }, [])

  // Grade de teclados — estado e handlers (antes do save genérico)
  const [keyboardGridTargetBlockId, setKeyboardGridTargetBlockId] = useState<string | null>(null)

  const openKeyboardEditorForGrid = useCallback((blockId: string) => {
    setKeyboardGridTargetBlockId(blockId)
    setKeyboardEditorBlockId(null)
    setKeyboardEditorOpen(true)
  }, [])

  const handleKeyboardGridSave = useCallback((data: PianoChordData) => {
    if (!keyboardGridTargetBlockId) return
    const newKeyboard = {
      chord_name: data.name || 'Acorde',
      keys: data.positions.keys,
      root: data.positions.root,
      octave: data.positions.octave,
      fingering_rh: data.positions.fingering_rh,
      fingering_lh: data.positions.fingering_lh,
      type: data.positions.type,
      quality: data.positions.quality,
      octave_start: data.positions.octave_start,
      octave_count: data.positions.octave_count,
      hand: 'rh',
    }
    setBlocks(prev => prev.map(b => {
      if (b.id !== keyboardGridTargetBlockId) return b
      const existingKbs = ((b.render_data as any)?.keyboards ?? []) as any[]
      return { ...b, render_data: { ...(b.render_data ?? {}), keyboards: [...existingKbs, newKeyboard] } }
    }))
    setKeyboardGridTargetBlockId(null)
    setKeyboardEditorOpen(false)
    toast.success(`Teclado "${data.name || 'Acorde'}" adicionado à grade`)
  }, [keyboardGridTargetBlockId])

  const handleKeyboardEditorSave = useCallback(async (data: PianoChordData) => {
    // Se estamos adicionando à grade de teclados, despacha para o handler da grade
    if (keyboardGridTargetBlockId) {
      handleKeyboardGridSave(data)
      return
    }
    if (!keyboardEditorBlockId) return
    const newRenderData = {
      chord_name: data.name,
      keys: data.positions.keys,
      root: data.positions.root,
      octave: data.positions.octave,
      fingering_rh: data.positions.fingering_rh,
      fingering_lh: data.positions.fingering_lh,
      type: data.positions.type,
      quality: data.positions.quality,
      octave_start: data.positions.octave_start,
      octave_count: data.positions.octave_count,
      hand: 'rh',
    }
    setBlocks(prev => prev.map(b =>
      b.id === keyboardEditorBlockId ? { ...b, title: data.name || b.title, render_data: newRenderData } : b,
    ))
    try {
      await updateMaterialBlockRpc({
        blockId: keyboardEditorBlockId,
        title: data.name,
        renderData: newRenderData,
      })
      toast.success('Teclado atualizado no bloco')
    } catch (e: any) {
      toast.error('Erro ao salvar teclado')
    }
    setKeyboardEditorOpen(false)
    setKeyboardEditorBlockId(null)
  }, [keyboardEditorBlockId, keyboardGridTargetBlockId, handleKeyboardGridSave])

  // Abrir ChordEditor para grade de acordes (adiciona acorde à grade)
  const [chordGridTargetBlockId, setChordGridTargetBlockId] = useState<string | null>(null)

  const openChordEditorForGrid = useCallback((blockId: string) => {
    setChordGridTargetBlockId(blockId)
    setChordEditorState(createEmptyState())
    setChordEditorName('')
    setChordEditorStartFret(1)
    setChordEditorBlockId(null) // não é edição de chord_diagram individual
    setChordEditorOpen(true)
  }, [])

  const handleChordGridSave = useCallback(() => {
    if (!chordGridTargetBlockId) return
    const positions = stateToPositions(chordEditorState)
    const newChord = {
      chord_name: chordEditorName || 'Acorde',
      fingers: positions.fingers,
      barres: positions.barres,
      muted: positions.muted,
      position: chordEditorStartFret,
    }
    setBlocks(prev => prev.map(b => {
      if (b.id !== chordGridTargetBlockId) return b
      const existingChords = ((b.render_data as any)?.chords ?? []) as any[]
      return { ...b, render_data: { ...(b.render_data ?? {}), chords: [...existingChords, newChord] } }
    }))
    setChordGridTargetBlockId(null)
    toast.success(`Acorde "${chordEditorName || 'Acorde'}" adicionado à grade`)
  }, [chordGridTargetBlockId, chordEditorState, chordEditorName, chordEditorStartFret])

  // Gerar imagem de capa com IA (Nano Banana 2)
  const [coverImageLoading, setCoverImageLoading] = useState(false)
  const [coverPromptLoading, setCoverPromptLoading] = useState(false)

  // Melhorar prompt do usuário com IA
  const handleEnhanceCoverPrompt = useCallback(async () => {
    if (!selectedBlock) return
    const rd = selectedBlock.render_data as any ?? {}
    const userPrompt = (rd.cover_prompt as string) ?? ''
    if (!userPrompt.trim()) {
      toast.error('Escreva uma descrição antes de melhorar')
      return
    }
    setCoverPromptLoading(true)
    try {
      const titulo = rd.titulo || selectedBlock.title || materialTitle || ''
      const instrumento = rd.instrumento || ''
      const systemPrompt = `Você é um especialista em design de capas de livros e material didático musical. Sua tarefa é melhorar o prompt do usuário para gerar uma imagem de capa impressionante. Responda APENAS com o prompt melhorado em inglês, sem explicações. O prompt deve ser para gerar uma imagem de capa profissional.`
      const enhancePrompt = `Melhore este prompt para gerar uma capa de livro didático musical:
Prompt do usuário: "${userPrompt}"
Contexto: Título="${titulo}", Instrumento="${instrumento}"
Responda APENAS com o prompt melhorado em inglês, otimizado para geração de imagem.`
      const result = await generateText(enhancePrompt, undefined, systemPrompt)
      updateSelectedRenderData('cover_prompt', result.text.trim())
      toast.success('Prompt melhorado!')
    } catch (e: any) {
      toast.error('Erro ao melhorar prompt: ' + (e?.message?.slice(0, 80) ?? ''))
    } finally {
      setCoverPromptLoading(false)
    }
  }, [selectedBlock, materialTitle, updateSelectedRenderData])

  const handleGenerateCoverImage = useCallback(async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    const rd = block.render_data as any ?? {}
    const titulo = rd.titulo || block.title || materialTitle || 'Material Didático Musical'
    const instrumento = rd.instrumento || ''
    const nivel = rd.nivel || ''
    const escola = rd.escola || ''
    const template = rd.template || 'minimal'
    const userPrompt = (rd.cover_prompt as string) ?? ''

    // Se o usuário escreveu um prompt personalizado, usar ele como base
    const prompt = userPrompt.trim()
      ? `${userPrompt.trim()} Portrait orientation (3:4 aspect ratio). No text in the image — only visual design elements. High quality, professional graphic design.`
      : [
        `Create a stunning, professional book cover design for a music education textbook.`,
        `Title: "${titulo}".`,
        instrumento && `Instrument: ${instrumento}.`,
        nivel && `Level: ${nivel}.`,
        escola && `School: ${escola}.`,
        `Style: modern, clean, visually striking with musical elements (instruments, notes, sound waves).`,
        `The design should be elegant and suitable for a professional music school.`,
        `Portrait orientation (3:4 aspect ratio). No text in the image — only visual design elements.`,
        `High quality, vibrant colors, professional graphic design aesthetics.`,
        template === 'geometric' && 'Use geometric shapes and bold angular compositions.',
        template === 'gradient' && 'Use smooth gradient backgrounds with depth.',
        template === 'musical' && 'Feature musical instruments and notation prominently.',
        template === 'bold' && 'Use high contrast, dramatic lighting, dark background.',
        template === 'elegant' && 'Use refined, minimal composition with warm tones.',
        template === 'vibrant' && 'Use bright, energetic colors and dynamic shapes.',
        template === 'colorful' && 'Use a vibrant gradient with abstract musical elements.',
      ].filter(Boolean).join(' ')

    setCoverImageLoading(true)
    try {
      const result = await generateImage(prompt, true)

      // Upload para Supabase Storage (content-images bucket)
      const ext = result.mimeType === 'image/jpeg' ? 'jpg' : 'png'
      const filePath = `covers/${materialId}/${blockId}_${Date.now()}.${ext}`
      const binaryStr = atob(result.imageBase64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
      const file = new Blob([bytes], { type: result.mimeType })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, file, { contentType: result.mimeType, upsert: true })

      if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

      const { data: urlData } = supabase.storage
        .from('content-images')
        .getPublicUrl(uploadData.path)

      const publicUrl = urlData.publicUrl

      // Atualizar o render_data do bloco com a URL pública
      setBlocks(prev => prev.map(b =>
        b.id === blockId
          ? { ...b, render_data: { ...(b.render_data ?? {}), cover_image_url: publicUrl } }
          : b,
      ))
      toast.success(`Capa gerada em ${(result.latencyMs / 1000).toFixed(1)}s`)
    } catch (e: any) {
      console.error('Erro ao gerar capa:', e)
      toast.error(e?.message?.slice(0, 100) || 'Erro ao gerar imagem da capa')
    } finally {
      setCoverImageLoading(false)
    }
  }, [blocks, materialTitle, materialId])

  // Upload de logomarca para a capa
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  const handleLogoUpload = useCallback(async (file: File) => {
    if (!selectedBlockId) return
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) { toast.error('Logomarca deve ter no máximo 2MB'); return }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG, WebP ou SVG'); return
    }
    setLogoUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      const filePath = `logos/${materialId}/${selectedBlockId}_${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, file, { contentType: file.type, upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(uploadData.path)
      updateSelectedRenderData('logo_url', urlData.publicUrl)
      if (!(selectedBlock?.render_data as any)?.logo_pos) {
        updateSelectedRenderData('logo_pos', { x: 50, y: 8 })
      }
      if (!(selectedBlock?.render_data as any)?.logo_size) {
        updateSelectedRenderData('logo_size', 80)
      }
      toast.success('Logomarca enviada!')
    } catch (e: any) {
      toast.error('Erro ao enviar logomarca: ' + (e?.message?.slice(0, 60) ?? ''))
    } finally {
      setLogoUploading(false)
    }
  }, [selectedBlockId, materialId, selectedBlock, updateSelectedRenderData])

  // Upload de imagem para bloco 'image'
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback(async (file: File) => {
    if (!selectedBlockId) return
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WebP.')
      return
    }
    if (file.size > maxSize) {
      toast.error('Imagem muito grande. Máximo 5MB.')
      return
    }

    setImageUploading(true)
    try {
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png'
      const filePath = `images/${materialId}/${selectedBlockId}_${Date.now()}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, file, { contentType: file.type, upsert: true })

      if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

      const { data: urlData } = supabase.storage
        .from('content-images')
        .getPublicUrl(uploadData.path)

      updateSelectedRenderData('url', urlData.publicUrl)
      toast.success('Imagem enviada!')
    } catch (e: any) {
      console.error('Erro ao enviar imagem:', e)
      toast.error(e?.message?.slice(0, 100) || 'Erro ao enviar imagem')
    } finally {
      setImageUploading(false)
    }
  }, [selectedBlockId, materialId, updateSelectedRenderData])

  // Handler de IA contextual para o RichTextEditor
  const handleAITextAction = useCallback(async (selectedText: string, action: AIActionType): Promise<string | null> => {
    const prompts: Record<AIActionType, { system: string; user: string }> = {
      rewrite: {
        system: 'Você é um professor de música reescrevendo material didático. Mantenha o mesmo significado mas melhore a clareza e fluidez. Responda APENAS com o texto reescrito, sem explicações.',
        user: `Reescreva este trecho de material didático musical:\n\n"${selectedText}"`,
      },
      simplify: {
        system: 'Você é um professor de música simplificando material para alunos iniciantes. Use linguagem simples e direta. Responda APENAS com o texto simplificado, sem explicações.',
        user: `Simplifique este trecho para um aluno iniciante:\n\n"${selectedText}"`,
      },
      expand: {
        system: 'Você é um professor de música expandindo material didático. Adicione exemplos, analogias e explicações mais detalhadas. Responda APENAS com o texto expandido, sem explicações.',
        user: `Expanda este trecho com mais detalhes e exemplos:\n\n"${selectedText}"`,
      },
      correct: {
        system: 'Você é um revisor de português brasileiro. Corrija erros de ortografia, gramática e pontuação. Mantenha o conteúdo idêntico. Responda APENAS com o texto corrigido, sem explicações.',
        user: `Corrija a ortografia e gramática deste texto:\n\n"${selectedText}"`,
      },
      translate: {
        system: 'Você é um tradutor especializado em música. Se o texto está em português, traduza para inglês. Se está em inglês, traduza para português brasileiro. Responda APENAS com a tradução, sem explicações.',
        user: `Traduza este texto:\n\n"${selectedText}"`,
      },
    }

    const { system, user } = prompts[action]
    try {
      const result = await generateText(user, undefined, system)
      toast.success(`IA: ${action === 'rewrite' ? 'Reescrito' : action === 'simplify' ? 'Simplificado' : action === 'expand' ? 'Expandido' : action === 'correct' ? 'Corrigido' : 'Traduzido'} (${(result.latencyMs / 1000).toFixed(1)}s)`)
      return result.text.trim()
    } catch (e: any) {
      toast.error('Erro da IA: ' + (e?.message?.slice(0, 80) ?? ''))
      return null
    }
  }, [])

  // Geração de bloco por IA
  const [aiBlockDialogOpen, setAiBlockDialogOpen] = useState(false)
  const [aiBlockPrompt, setAiBlockPrompt] = useState('')
  const [aiBlockLoading, setAiBlockLoading] = useState(false)

  const handleGenerateAIBlock = useCallback(async () => {
    if (!aiBlockPrompt.trim()) return
    setAiBlockLoading(true)
    try {
      const systemPrompt = `Você é um professor de música criando blocos de material didático para a plataforma LA Journey.
Retorne APENAS um objeto JSON válido (não array) com esta estrutura:
{
  "block_type": "text" | "tip" | "exercise",
  "title": "título do bloco",
  "content": { "text": "conteúdo em HTML com <strong> para termos técnicos, <p> para parágrafos" }
}

Para exercícios: inclua instruções passo-a-passo detalhadas.
Para dicas: seja conciso e prático.
Para texto: use linguagem didática e acessível, 2-3 parágrafos.
Use APENAS HTML básico: <p>, <strong>, <em>, <br>, <ul>, <li>, <ol>.`

      const prompt = `Gere um bloco de material didático musical baseado nesta descrição:
"${aiBlockPrompt}"

Contexto do material: "${materialTitle}"

Retorne APENAS o JSON do bloco, sem markdown ou explicações.`

      const result = await generateText(prompt, undefined, systemPrompt)
      let jsonStr = result.text.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const blockData = JSON.parse(jsonStr)
      const blockType = ['text', 'tip', 'exercise'].includes(blockData.block_type) ? blockData.block_type : 'text'

      const lastOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.sort_order)) : 0
      const contentHtml = blockData.content?.text ?? ''
      const contentPlain = contentHtml.replace(/<[^>]+>/g, '')
      const newBlockId = await addMaterialBlock({
        materialId,
        blockType,
        title: blockData.title ?? 'Bloco gerado',
        content: { html: contentHtml, text: contentPlain },
        renderData: blockData.render_data ?? null,
        afterOrder: lastOrder,
      })

      setBlocks(prev => [...prev, {
        id: newBlockId,
        block_type: blockType,
        title: blockData.title ?? 'Bloco gerado',
        content: { html: blockData.content?.text ?? '', text: blockData.content?.text?.replace(/<[^>]+>/g, '') ?? '' },
        render_data: blockData.render_data ?? null,
        sort_order: lastOrder + 1,
        is_edited: false,
        original_content: null,
      }])

      toast.success(`Bloco "${blockData.title}" gerado em ${(result.latencyMs / 1000).toFixed(1)}s`)
      setAiBlockDialogOpen(false)
      setAiBlockPrompt('')
    } catch (e: any) {
      console.error('Erro ao gerar bloco:', e)
      toast.error('Erro ao gerar bloco: ' + (e?.message?.slice(0, 80) ?? ''))
    } finally {
      setAiBlockLoading(false)
    }
  }, [aiBlockPrompt, blocks, materialId, materialTitle])

  // Sugestão automática de próximo bloco
  const [aiSuggestion, setAiSuggestion] = useState<{ block_type: string; title: string; content: { text: string } } | null>(null)
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false)

  const handleSuggestNextBlock = useCallback(async () => {
    if (blocks.length === 0) return
    setAiSuggestLoading(true)
    setAiSuggestion(null)
    try {
      const ctx = blocks.slice(-3).map(b => `[${b.block_type}] ${b.title}: ${((b.content as any)?.text ?? '').slice(0, 150)}`).join('\n')
      const sys = 'Você é professor de música. Sugira o próximo bloco pedagógico. Retorne APENAS JSON: {"block_type":"text"|"tip"|"exercise","title":"...","content":{"text":"HTML"}}'
      const result = await generateText(`Material: "${materialTitle}"\nÚltimos blocos:\n${ctx}\n\nSugira o próximo bloco.`, undefined, sys)
      let json = result.text.trim()
      if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      setAiSuggestion(JSON.parse(json))
      toast.success(`Sugestão gerada em ${(result.latencyMs / 1000).toFixed(1)}s`)
    } catch (e: any) {
      toast.error('Erro ao sugerir: ' + (e?.message?.slice(0, 60) ?? ''))
    } finally {
      setAiSuggestLoading(false)
    }
  }, [blocks, materialTitle])

  const handleAcceptSuggestion = useCallback(async () => {
    if (!aiSuggestion) return
    const lastOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.sort_order)) : 0
    const html = aiSuggestion.content?.text ?? ''
    const plain = html.replace(/<[^>]+>/g, '')
    try {
      const id = await addMaterialBlock({ materialId, blockType: aiSuggestion.block_type, title: aiSuggestion.title, content: { html, text: plain }, afterOrder: lastOrder })
      setBlocks(prev => [...prev, { id, block_type: aiSuggestion.block_type, title: aiSuggestion.title, content: { html, text: plain }, render_data: null, sort_order: lastOrder + 1, is_edited: false, original_content: null }])
      toast.success(`Bloco "${aiSuggestion.title}" aceito!`)
      setAiSuggestion(null)
    } catch (e: any) {
      toast.error('Erro ao salvar sugestão')
    }
  }, [aiSuggestion, blocks, materialId])

  // Salvar título do material
  const handleSaveTitle = useCallback(async () => {
    setEditingTitle(false)
    if (!materialTitle.trim()) return
    try {
      await updateMaterial(materialId, { title: materialTitle.trim() })
      toast.success('Título atualizado')
    } catch (e: any) {
      toast.error('Erro ao atualizar título')
    }
  }, [materialId, materialTitle])

  // ── Editores visuais integrados ──────────────────────────────────────

  // Helper: converter render_data.notation.staves[].notes (formato VexFlow) → notation_data.beats
  // Preserva separação entre staves com barAfter + salva stave_boundaries para reconstrução
  const vexNotesToBeats = useCallback((staves: any[]): any => {
    if (!staves || staves.length === 0) return null
    const beats: any[] = []
    const staveBoundaries: number[] = [] // índices onde cada stave termina
    for (let s = 0; s < staves.length; s++) {
      const stave = staves[s]
      const notes = (stave.notes ?? []) as string[]
      const accs = (stave.accidentals ?? []) as (string | null)[]
      for (let i = 0; i < notes.length; i++) {
        const isLastNoteOfStave = i === notes.length - 1
        const isLastStave = s === staves.length - 1
        beats.push({
          notes: [notes[i]],
          accidentals: [accs[i] ?? null],
          // Colocar barra de compasso entre staves para separação visual
          ...(isLastNoteOfStave && !isLastStave ? { barAfter: true } : {}),
        })
      }
      staveBoundaries.push(beats.length)
    }
    if (beats.length === 0) return null
    return { beats, _stave_boundaries: staveBoundaries }
  }, [])

  // Helper: converter render_data de um bloco para um NotationLibraryRow fake para o NotationEditor
  const blockToNotationRow = useCallback((block: EditorBlock) => {
    const rd = (block.render_data ?? {}) as any
    // Primeiro tenta notation_data salvo (com beats completos do editor)
    // Se não existir, converte notas VexFlow → beats
    const nd = (block.content as any)?.notation_data
      ?? rd.notation_data
      ?? vexNotesToBeats(rd.notation?.staves)
      ?? null
    return {
      id: block.id,
      name: block.title ?? '',
      category: 'exercicio',
      clef: (rd.notation?.staves?.[0]?.clef ?? rd.clef ?? 'treble') as string,
      key_signature: (rd.notation?.staves?.[0]?.key_signature ?? rd.key_signature ?? 'C') as string,
      time_signature: (rd.notation?.staves?.[0]?.time_signature ?? rd.time_signature ?? null) as string | null,
      notation_data: nd,
      difficulty: 1,
      tags: [],
      description: null,
    }
  }, [vexNotesToBeats])

  // Abrir editor de notação para um bloco
  const openNotationEditorForBlock = useCallback((blockId: string) => {
    setNotationEditorBlockId(blockId)
    setNotationEditorOpen(true)
  }, [])

  // Salvar notação de volta no bloco
  const handleNotationEditorSave = useCallback(async (data: NotationSaveData) => {
    if (!notationEditorBlockId) return
    const block = blocks.find(b => b.id === notationEditorBlockId)
    if (!block) return

    const rd = (block.render_data ?? {}) as any
    const originalStaves = rd.notation?.staves ?? []
    const beats = data.notation_data?.beats ?? []

    // Reconstruir múltiplos staves usando barAfter como separador
    // Cada grupo de beats entre barras vira um stave separado
    const staveGroups: any[][] = []
    let currentGroup: any[] = []
    for (const b of beats) {
      currentGroup.push(b)
      if (b.barAfter) {
        staveGroups.push(currentGroup)
        currentGroup = []
      }
    }
    if (currentGroup.length > 0) staveGroups.push(currentGroup)

    // Construir staves preservando labels originais
    const clefVal = data.clef as 'treble' | 'bass' | 'alto' | 'percussion'
    const keySigVal = data.clef === 'percussion' ? undefined : (data.key_signature !== 'C' ? data.key_signature : undefined)
    const timeSigVal = data.time_signature ?? undefined

    const newStaves = staveGroups.map((group, idx) => {
      const notes: string[] = []
      const accidentals: (string | null)[] = []
      for (const b of group) {
        for (const n of (b.notes ?? [])) notes.push(n)
        for (const a of (b.accidentals ?? [])) accidentals.push(a)
      }
      return {
        clef: clefVal,
        key_signature: keySigVal,
        time_signature: timeSigVal,
        notes,
        accidentals,
        label: originalStaves[idx]?.label ?? '',
      }
    })

    const staveNotation = {
      type: 'staff' as const,
      staves: newStaves,
      width: rd.notation?.width ?? 500,
      height: newStaves.length > 1 ? 140 * newStaves.length : 150,
    }

    const newRenderData = {
      ...(block.render_data ?? {}),
      notation: staveNotation,
      notation_data: data.notation_data,
      clef: data.clef,
      key_signature: data.key_signature,
      time_signature: data.time_signature,
    }

    // Atualizar localmente
    setBlocks(prev => prev.map(b =>
      b.id === notationEditorBlockId ? { ...b, title: data.name || b.title, render_data: newRenderData } : b,
    ))

    // Persistir no banco
    try {
      await updateMaterialBlockRpc({
        blockId: notationEditorBlockId,
        title: data.name || block.title,
        renderData: newRenderData,
      })
      toast.success('Notação atualizada no bloco')
    } catch (e: any) {
      toast.error('Erro ao salvar notação: ' + (e?.message ?? ''))
    }
  }, [notationEditorBlockId, blocks])

  // Abrir editor de acorde para um bloco
  const openChordEditorForBlock = useCallback((blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    const rd = block.render_data ?? {}
    const positions: ChordPositions = {
      fingers: (rd.fingers ?? []) as any[],
      barres: (rd.barres ?? []) as any[],
      muted: (rd.muted ?? []) as number[],
    }
    const startFret = (rd.position ?? 1) as number
    setChordEditorState(positionsToState(positions, startFret))
    setChordEditorName((rd.chord_name ?? block.title ?? '') as string)
    setChordEditorStartFret(startFret)
    setChordEditorBlockId(blockId)
    setChordEditorOpen(true)
  }, [blocks])

  // Salvar acorde de volta no bloco
  const handleSaveChordToBlock = useCallback(async () => {
    if (!chordEditorBlockId) return
    const block = blocks.find(b => b.id === chordEditorBlockId)
    if (!block) return

    const positions = stateToPositions(chordEditorState, chordEditorStartFret)
    const newRenderData = {
      ...(block.render_data ?? {}),
      chord_name: chordEditorName,
      fingers: positions.fingers,
      barres: positions.barres,
      muted: positions.muted,
      position: chordEditorStartFret,
    }

    setBlocks(prev => prev.map(b =>
      b.id === chordEditorBlockId ? { ...b, title: chordEditorName || b.title, render_data: newRenderData } : b,
    ))

    try {
      await updateMaterialBlockRpc({
        blockId: chordEditorBlockId,
        title: chordEditorName || block.title,
        renderData: newRenderData,
      })
      toast.success('Acorde atualizado no bloco')
      setChordEditorOpen(false)
    } catch (e: any) {
      toast.error('Erro ao salvar acorde: ' + (e?.message ?? ''))
    }
  }, [chordEditorBlockId, chordEditorState, chordEditorName, chordEditorStartFret, blocks])

  // Helper: bloco tem notação editável?
  const blockHasNotation = useCallback((block: EditorBlock) => {
    return block.render_data?.notation || block.render_data?.notation_data || block.render_data?.notes
  }, [])

  // Exportação
  const handlePrint = useCallback(() => {
    // Estratégia: criar container temporário com APENAS as páginas A4,
    // esconder todo o resto, imprimir, e restaurar.
    // Isso elimina qualquer elemento fantasma que gere página em branco.

    // 1. Salvar tema atual e forçar light para notation SVGs
    const currentTheme = document.documentElement.getAttribute('data-theme')
    document.documentElement.setAttribute('data-theme', 'light')

    // 2. Clonar páginas A4 para container temporário
    const pages = document.querySelectorAll('.a4-page')
    if (!pages.length) { toast.error('Nenhuma página encontrada'); return }

    const printContainer = document.createElement('div')
    printContainer.id = 'print-container'
    pages.forEach(page => {
      const clone = page.cloneNode(true) as HTMLElement
      // Limpar UI de edição
      clone.querySelectorAll('.block-selection-border, .cover-snap-guide, .add-block-btn, button').forEach(el => {
        if (el.tagName === 'BUTTON') el.remove()
        if (el.classList?.contains('block-selection-border') || el.classList?.contains('cover-snap-guide')) el.remove()
      })
      clone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'))
      clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'))
      printContainer.appendChild(clone)
    })

    // 3. Esconder tudo e mostrar apenas o container de print
    const appRoot = document.getElementById('root') || document.body.children[0] as HTMLElement
    if (appRoot) (appRoot as HTMLElement).style.display = 'none'
    document.body.appendChild(printContainer)
    document.body.classList.add('printing')

    // 4. Imprimir e restaurar
    requestAnimationFrame(() => {
      window.print()
      // Restaurar
      document.body.classList.remove('printing')
      printContainer.remove()
      if (appRoot) (appRoot as HTMLElement).style.display = ''
      if (currentTheme) document.documentElement.setAttribute('data-theme', currentTheme)
      else document.documentElement.removeAttribute('data-theme')
    })
  }, [])

  const handleExportHTML = useCallback(async () => {
    const pagesEl = document.querySelectorAll('.a4-page')
    if (!pagesEl.length) { toast.error('Nenhuma página encontrada'); return }

    // Converter SVG para PNG base64 (captura visual correto independente de dark/light mode)
    const svgToDataUrl = async (svgEl: SVGSVGElement): Promise<string> => {
      return new Promise((resolve) => {
        try {
          const clone = svgEl.cloneNode(true) as SVGSVGElement
          // Forçar fills pretos (VexFlow padrão) — remover qualquer filter
          clone.style.filter = 'none'
          clone.querySelectorAll('path').forEach(p => {
            const f = p.getAttribute('fill')
            if (!f || f === 'none') p.setAttribute('fill', 'black')
          })
          clone.querySelectorAll('rect').forEach(r => {
            if (!r.getAttribute('fill') || r.getAttribute('fill') === 'none') r.setAttribute('fill', 'black')
            if (r.getAttribute('stroke')) r.setAttribute('stroke', 'black')
          })
          clone.querySelectorAll('line').forEach(l => {
            if (!l.getAttribute('stroke') || l.getAttribute('stroke') === 'none') l.setAttribute('stroke', 'black')
          })
          clone.querySelectorAll('text').forEach(t => {
            const f = t.getAttribute('fill')
            if (!f || f === 'none') t.setAttribute('fill', '#333')
          })
          const w = parseInt(clone.getAttribute('width') || '500')
          const h = parseInt(clone.getAttribute('height') || '200')
          const svgData = new XMLSerializer().serializeToString(clone)
          const img = new Image()
          const canvas = document.createElement('canvas')
          canvas.width = w * 2
          canvas.height = h * 2
          const ctx = canvas.getContext('2d')!
          ctx.scale(2, 2)
          img.onload = () => {
            ctx.fillStyle = '#fff'
            ctx.fillRect(0, 0, w, h)
            ctx.drawImage(img, 0, 0, w, h)
            resolve(canvas.toDataURL('image/png'))
          }
          img.onerror = () => resolve('')
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)
        } catch { resolve('') }
      })
    }

    // Clonar conteúdo das páginas A4 e limpar elementos de edição
    const pagesHtmlParts: string[] = []
    for (let i = 0; i < pagesEl.length; i++) {
      const page = pagesEl[i]
      const clone = page.cloneNode(true) as HTMLElement
      // Remover bordas de seleção, botões de edição, snap guides
      clone.querySelectorAll('.block-selection-border, .cover-snap-guide, .add-block-btn, button, [contenteditable]').forEach(el => {
        if (el.tagName === 'BUTTON') el.remove()
        if (el.classList?.contains('block-selection-border')) {
          (el as HTMLElement).style.border = 'none'
          ;(el as HTMLElement).style.outline = 'none'
          ;(el as HTMLElement).style.boxShadow = 'none'
        }
        if (el.classList?.contains('cover-snap-guide')) el.remove()
        el.removeAttribute('contenteditable')
      })
      // Remover classes de edição
      clone.querySelectorAll('.cover-draggable').forEach(el => el.classList.remove('cover-draggable'))
      clone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'))

      // Notação musical: converter SVGs para imagens PNG (garante renderização correta)
      const notationContainers = clone.querySelectorAll('.notation-container')
      for (const container of Array.from(notationContainers)) {
        const origContainer = page.querySelector(`.notation-container:nth-of-type(${Array.from(clone.querySelectorAll('.notation-container')).indexOf(container) + 1})`)
        // Buscar o SVG original na página (não no clone) para capturar visual correto
        const svgEl = container.querySelector('svg')
        // Também buscar na página original pelo data-block ou pela posição
        if (svgEl) {
          // Encontrar o SVG original correspondente na página real
          const allOrigSvgs = page.querySelectorAll('.notation-container svg')
          const allCloneSvgs = clone.querySelectorAll('.notation-container svg')
          const svgIndex = Array.from(allCloneSvgs).indexOf(svgEl)
          const origSvg = allOrigSvgs[svgIndex] as SVGSVGElement | undefined
          if (origSvg) {
            const dataUrl = await svgToDataUrl(origSvg)
            if (dataUrl) {
              const w = origSvg.getAttribute('width') || '500'
              const h = origSvg.getAttribute('height') || '200'
              const imgEl = document.createElement('img')
              imgEl.src = dataUrl
              imgEl.style.width = w + 'px'
              imgEl.style.maxWidth = '100%'
              imgEl.style.height = 'auto'
              imgEl.alt = 'Notação musical'
              svgEl.replaceWith(imgEl)
            }
          }
        }
        ;(container as HTMLElement).style.background = '#fff'
      }

      // Page break entre páginas (exceto a última)
      const pageBreak = i < pagesEl.length - 1 ? 'page-break-after:always;' : ''
      pagesHtmlParts.push(`<div style="margin-bottom:40px;${pageBreak}">${clone.innerHTML}</div>`)
    }
    const pagesHtml = pagesHtmlParts.join('\n')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${materialTitle || 'Material Didático'}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=DM+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#f8fafc;color:#1E293B;line-height:1.7}
h1,h2,h3{font-family:'DM Sans',sans-serif;font-weight:700;margin:0 0 12px}
h1{font-size:28px} h2{font-size:22px} h3{font-size:18px}
strong{font-weight:600}
p{margin:0 0 12px}
.a4-page{max-width:794px;margin:0 auto 24px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08);border-radius:4px;overflow:hidden;min-height:1123px}
.a4-page--cover{background:#0f172a;min-height:1123px}
.a4-page-header{padding:20px 60px 8px;font-size:11px;color:#94a3b8;border-bottom:1px solid #e2e8f0}
.a4-page-content{padding:12px 60px;flex:1}
.a4-page-footer{padding:8px 60px 16px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between}
.canvas-block{padding:10px 16px;margin-bottom:4px}
.block-cover{position:relative;width:100%;min-height:1123px;display:flex;align-items:center;justify-content:center}
.block-cover--with-image{background-size:cover!important;background-position:center!important;color:#fff}
.cover-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45)}
.cover-content,.cover-footer,.cover-logo{position:absolute;z-index:1}
.cover-title{font-size:36px;font-weight:700;line-height:1.2}
.cover-subtitle{font-size:16px;opacity:.8}
.cover-instrument{font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px;font-weight:600}
.cover-footer{font-size:12px;opacity:.7}
.cover-professor{font-weight:600}
img{max-width:100%}
.notation-container{background:#fff;border-radius:4px;overflow:hidden;margin:8px 0}
.notation-container svg{filter:none!important;display:block;max-width:100%}
svg{max-width:100%}
.block-columns{display:grid;gap:16px;align-items:start}
.block-column{min-width:0}
@media print{
  body{background:#fff}
  .a4-page{box-shadow:none;page-break-after:always;break-after:page;margin:0}
  .a4-page:last-child{page-break-after:auto}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  @page{size:A4 portrait;margin:0}
}
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    toast.success('HTML exportado em nova aba')
  }, [materialTitle])

  // --- Loading/Error ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-2 text-text2">
        <SpinnerGap size={24} className="animate-spin" /> Carregando material...
      </div>
    )
  }

  if (error || !rawData || rawData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-vermelho mb-4">{error ?? 'Material não encontrado'}</div>
        <Button variant="ghost" onClick={() => navigate('/editor')}>
          <ArrowLeft size={16} /> Voltar para lista
        </Button>
      </div>
    )
  }

  const previewBlocks: MaterialBlock[] = blocks.map(editorBlockToPreview)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header do Editor */}
      <div className="editor-header flex items-center justify-between mb-0 -mt-4 -mx-7 px-5 py-3 border-b border-border bg-surface sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/editor')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            {editingTitle ? (
              <Input
                value={materialTitle}
                onChange={e => setMaterialTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                className="font-serif text-lg h-8 w-[300px]"
                autoFocus
              />
            ) : (
              <h1
                className="font-serif text-lg text-text cursor-pointer hover:text-accent transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {materialTitle}
              </h1>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {materialMeta?.is_draft !== false
                ? <Badge variant="gold" className="text-[9px]">Rascunho</Badge>
                : <Badge variant="advance" className="text-[9px]">Publicado</Badge>
              }
              <span className="text-[11px] text-text3">v{materialMeta?.version ?? 1} · {blocks.length} blocos</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-bg2 rounded-md">
            <Button
              variant="ghost" size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}
              title="Diminuir zoom"
            >
              <MagnifyingGlassMinus size={14} />
            </Button>
            <input
              type="range"
              min={0.5} max={1.5} step={0.05}
              value={zoom}
              onChange={e => setZoom(+e.target.value)}
              className="w-20 h-1 accent-accent cursor-pointer"
              title={`Zoom: ${Math.round(zoom * 100)}%`}
            />
            <Button
              variant="ghost" size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(2)))}
              title="Aumentar zoom"
            >
              <MagnifyingGlassPlus size={14} />
            </Button>
            <span className="text-[10px] text-text3 w-8 text-center font-mono">{Math.round(zoom * 100)}%</span>
          </div>

          <Button variant="ghost" size="sm" onClick={handlePrint} title="Imprimir / PDF">
            <Printer size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportHTML} title="Exportar HTML">
            <Code size={16} />
          </Button>
        </div>
      </div>

      {/* Layout 3 colunas */}
      <div className="editor-layout" style={{ marginTop: 0 }}>
        {/* Coluna 1 — Sidebar: Lista de Blocos */}
        <div className="editor-sidebar">
          <div className="flex items-center justify-between mb-3">
            <div className="prop-label" style={{ marginBottom: 0 }}>Blocos ({blocks.length})</div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col">
                {blocks.map(block => (
                  <SortableBlockItem
                    key={block.id}
                    block={block}
                    isSelected={block.id === selectedBlockId}
                    onSelect={() => selectBlock(block.id)}
                    onDelete={() => handleDeleteBlock(block.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Botão Adicionar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="add-block-btn mt-2">
                <Plus size={16} className="inline-block mb-0.5" /> Adicionar bloco
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {['text', 'tip', 'exercise', 'title', 'image', 'audio', 'video', 'cover', 'columns', 'notation', 'chord_diagram', 'chord_grid', 'keyboard', 'keyboard_grid', 'tablature', 'separator', 'page_break'].map(type => {
                const cfg = getBlockConfig(type)
                const Icon = cfg.icon
                return (
                  <DropdownMenuItem key={type} onClick={() => handleAddBlock(type)} className="gap-2">
                    <Icon size={16} style={{ color: cfg.color }} />
                    {cfg.label}
                  </DropdownMenuItem>
                )
              })}
              <div className="h-px bg-border my-1" />
              <DropdownMenuItem onClick={() => setAiBlockDialogOpen(true)} className="gap-2 text-accent font-medium">
                <Sparkle size={16} weight="fill" className="text-accent" />
                Gerar com IA
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Ghost block — sugestão automática */}
          {aiSuggestion && (
            <div className="mt-2 border border-dashed border-accent/40 rounded-[var(--radius-sm)] p-2.5 bg-accent/5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkle size={12} weight="fill" className="text-accent" />
                <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">Sugestão IA</span>
              </div>
              <div className="text-[11px] font-medium text-text1 mb-0.5">{aiSuggestion.title}</div>
              <div className="text-[10px] text-text3 line-clamp-3 mb-2" dangerouslySetInnerHTML={{ __html: aiSuggestion.content?.text?.slice(0, 200) + '...' }} />
              <div className="flex gap-1.5">
                <Button size="sm" onClick={handleAcceptSuggestion} className="h-6 text-[10px] px-2 gap-1">
                  <Plus size={10} /> Aceitar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAiSuggestion(null)} className="h-6 text-[10px] px-2">
                  Descartar
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSuggestNextBlock} className="h-6 text-[10px] px-2" disabled={aiSuggestLoading}>
                  Outra
                </Button>
              </div>
            </div>
          )}

          {/* Botão sugerir próximo */}
          {!aiSuggestion && blocks.length >= 2 && (
            <button
              onClick={handleSuggestNextBlock}
              disabled={aiSuggestLoading}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-accent/70 hover:text-accent hover:bg-accent/5 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
            >
              {aiSuggestLoading ? (
                <><SpinnerGap size={12} className="animate-spin" /> Gerando sugestão...</>
              ) : (
                <><Sparkle size={12} /> Sugerir próximo bloco</>
              )}
            </button>
          )}

          {/* Rodapé info */}
          <div className="mt-3 p-2.5 bg-azul-soft rounded-[var(--radius-sm)] text-[11px] text-text2">
            <strong>{blocks.length} blocos</strong> · v{materialMeta?.version ?? 1}
            {materialMeta?.generated_at && (
              <div className="text-text3 mt-0.5">
                Gerado em: {new Date(materialMeta.generated_at).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        </div>

        {/* Container de medição oculto — mede alturas reais dos blocos */}
        <div
          ref={measureContainerRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '674px', // 794 - 60*2 (padding A4 content)
            overflow: 'visible',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {blocks.filter(b => b.block_type !== 'page_break').map(block => (
            <div key={block.id} data-block-id={block.id} style={{ padding: '10px 16px', marginBottom: '4px' }}>
              <MaterialPreview blocks={[editorBlockToPreview(block)]} />
            </div>
          ))}
        </div>

        {/* Coluna 2 — Canvas A4 (Preview) */}
        <div
          ref={canvasScrollRef}
          className="editor-canvas"
          onClick={() => { setSelectedBlockId(null); if (inlineEditingBlockId) setInlineEditingBlockId(null) }}
          onWheel={(e) => {
            if (e.ctrlKey) {
              e.preventDefault()
              setZoom(z => Math.max(0.5, Math.min(1.5, +(z + (e.deltaY > 0 ? -0.05 : 0.05)).toFixed(2))))
            }
          }}
        >
          <div
            className="a4-canvas-wrapper"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            {pages.map((pageBlocks, pageIdx) => {
              const pageCtx = { titulo: materialTitle, pagina: pageIdx + 1, total: pages.length }
              const isCoverPage = pageBlocks.some(b => b.block_type === 'cover')
              const showHeader = !isCoverPage && pageConfig.header.enabled && (pageConfig.header.showOnFirstPage || pageIdx > 0)
              const showFooter = !isCoverPage && pageConfig.footer.enabled

              return (
              <div key={pageIdx} className={`a4-page ${isCoverPage ? 'a4-page--cover' : ''}`}>
                {/* Cabeçalho */}
                {showHeader ? (
                  <div className="a4-page-header">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#94a3b8] font-medium tracking-wide flex-1 text-left truncate">
                        {resolvePageText(pageConfig.header.leftText, pageCtx)}
                      </span>
                      {pageConfig.header.centerText && (
                        <span className="text-[10px] text-[#94a3b8] font-medium tracking-wide flex-1 text-center truncate">
                          {resolvePageText(pageConfig.header.centerText, pageCtx)}
                        </span>
                      )}
                      {pageConfig.header.rightText && (
                        <span className="text-[10px] text-[#94a3b8] font-medium tracking-wide flex-1 text-right truncate">
                          {resolvePageText(pageConfig.header.rightText, pageCtx)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : !isCoverPage ? (
                  <div className="a4-page-header" style={{ borderBottom: 'none', padding: '8px 60px 0' }} />
                ) : null}

                {/* Conteúdo dos blocos */}
                <div className="a4-page-content">
                  {pageBlocks.map(block => {
                    const isTextBlock = ['text', 'tip', 'exercise', 'title'].includes(block.block_type)
                    const isInlineEditing = inlineEditingBlockId === block.id

                    return (
                      <div
                        key={block.id}
                        ref={el => { canvasRefs.current[block.id] = el }}
                        className={`canvas-block ${block.id === selectedBlockId ? 'selected' : ''} ${isInlineEditing ? 'inline-editing' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          selectBlock(block.id)
                          if (block.block_type !== 'cover') setCoverTitleEditing(false)
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          if (block.block_type === 'chord_diagram') openChordEditorForBlock(block.id)
                          else if (block.block_type === 'notation' || blockHasNotation(block)) openNotationEditorForBlock(block.id)
                          else if (block.block_type === 'cover') setCoverTitleEditing(true)
                          else if (isTextBlock && !isInlineEditing) setInlineEditingBlockId(block.id)
                        }}
                      >
                        {isInlineEditing && isTextBlock ? (
                          <div onClick={e => e.stopPropagation()}>
                            {block.title && (
                              <Input
                                value={block.title ?? ''}
                                onChange={e => updateSelectedField('title', e.target.value)}
                                className="font-bold text-[14px] text-text mb-2 border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                placeholder="Título do bloco"
                              />
                            )}
                            <RichTextEditor
                              key={`inline-${block.id}`}
                              content={ensureHtml((block.content as any)?.html ?? (block.content as any)?.text ?? '')}
                              onChange={(html) => {
                                setBlocks(prev => prev.map(b => {
                                  if (b.id !== block.id) return b
                                  return {
                                    ...b,
                                    content: { ...(b.content ?? {}), html, text: htmlToMarkdown(html) },
                                  }
                                }))
                              }}
                              placeholder="Clique para editar..."
                              inline
                              onAIAction={handleAITextAction}
                            />
                            <div className="text-[10px] text-text3 mt-2 text-right opacity-60">
                              Clique fora para sair da edição
                            </div>
                          </div>
                        ) : (
                          <MaterialPreview
                            blocks={[editorBlockToPreview(block)]}
                            coverEditable={block.block_type === 'cover' && block.id === selectedBlockId}
                            onCoverPositionChange={block.block_type === 'cover' ? (field, pos) => {
                              setBlocks(prev => prev.map(b =>
                                b.id === block.id
                                  ? { ...b, render_data: { ...(b.render_data ?? {}), [field]: pos } }
                                  : b,
                              ))
                            } : undefined}
                            coverTitleEditing={block.block_type === 'cover' && coverTitleEditing}
                            onCoverTitleChange={block.block_type === 'cover' ? (value) => {
                              updateSelectedRenderData('titulo', value)
                            } : undefined}
                          />
                        )}
                      </div>
                    )
                  })}

                  {pageBlocks.length === 0 && pageIdx === 0 && (
                    <div className="text-center py-16 text-[#94a3b8] text-sm">
                      Material sem blocos. Adicione blocos usando o painel à esquerda.
                    </div>
                  )}
                </div>

                {/* Rodapé */}
                {showFooter ? (
                  <div className="a4-page-footer">
                    <div className="flex items-center justify-between gap-2">
                      {/* Lado esquerdo */}
                      <span className="text-[9px] text-[#94a3b8] flex-1 text-left truncate">
                        {pageConfig.footer.showPageNumber && pageConfig.footer.pageNumberPosition === 'left'
                          ? `Página ${pageIdx + 1}`
                          : (pageConfig.footer.pageNumberPosition !== 'left' && pageConfig.footer.leftText
                              ? resolvePageText(pageConfig.footer.leftText, pageCtx)
                              : '')}
                      </span>
                      {/* Centro */}
                      <span className="text-[9px] text-[#94a3b8] flex-1 text-center truncate">
                        {pageConfig.footer.showPageNumber && pageConfig.footer.pageNumberPosition === 'center'
                          ? `Página ${pageIdx + 1}`
                          : ''}
                      </span>
                      {/* Lado direito */}
                      <span className="text-[9px] text-[#94a3b8] flex-1 text-right truncate">
                        {pageConfig.footer.showPageNumber && pageConfig.footer.pageNumberPosition === 'right'
                          ? `Página ${pageIdx + 1}`
                          : (pageConfig.footer.pageNumberPosition !== 'right' && pageConfig.footer.leftText
                              ? resolvePageText(pageConfig.footer.leftText, pageCtx)
                              : '')}
                      </span>
                    </div>
                  </div>
                ) : !isCoverPage ? (
                  <div className="a4-page-footer" style={{ borderTop: 'none', padding: '0 60px 8px' }} />
                ) : null}
              </div>
              )
            })}
          </div>
        </div>

        {/* Coluna 3 — Propriedades */}
        <div className="editor-properties">
          {!selectedBlock ? (
            <div className="space-y-4 pb-4">
              <div className="prop-label mb-1" style={{ color: 'var(--accent)' }}>
                <Gear size={12} className="inline-block mr-1 mb-0.5" />
                Configuração da Página
              </div>
              <p className="text-[10px] text-text3 -mt-2 mb-3">
                As alterações aparecem na folha em tempo real.
              </p>

              {/* === CABEÇALHO === */}
              <div className="prop-section">
                <div className="flex items-center justify-between mb-2">
                  <div className="prop-label mb-0">Cabeçalho</div>
                  <button
                    className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                      pageConfig.header.enabled
                        ? 'bg-accent/10 text-accent'
                        : 'bg-bg2 text-text3 hover:text-text'
                    }`}
                    onClick={() => setPageConfig(prev => ({
                      ...prev,
                      header: { ...prev.header, enabled: !prev.header.enabled },
                    }))}
                  >
                    {pageConfig.header.enabled
                      ? <><Eye size={12} /> Visível</>
                      : <><EyeSlash size={12} /> Oculto</>}
                  </button>
                </div>

                {pageConfig.header.enabled && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-text3 block mb-1">Texto do cabeçalho</label>
                      <Input
                        value={pageConfig.header.leftText}
                        onChange={e => setPageConfig(prev => ({
                          ...prev,
                          header: { ...prev.header, leftText: e.target.value },
                        }))}
                        placeholder="Ex: {titulo} ou Nome da Escola"
                        className="h-8 text-[12px]"
                      />
                      <p className="text-[9px] text-text3 mt-1">
                        Use <code className="font-mono text-accent bg-azul-soft px-1 rounded">{'{titulo}'}</code> para inserir o nome do material automaticamente
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-text2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pageConfig.header.showOnFirstPage}
                        onChange={e => setPageConfig(prev => ({
                          ...prev,
                          header: { ...prev.header, showOnFirstPage: e.target.checked },
                        }))}
                        className="rounded border-border accent-accent"
                      />
                      Mostrar na primeira página
                    </label>
                  </div>
                )}
              </div>

              <hr className="border-border" />

              {/* === RODAPÉ === */}
              <div className="prop-section">
                <div className="flex items-center justify-between mb-2">
                  <div className="prop-label mb-0">Rodapé</div>
                  <button
                    className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                      pageConfig.footer.enabled
                        ? 'bg-accent/10 text-accent'
                        : 'bg-bg2 text-text3 hover:text-text'
                    }`}
                    onClick={() => setPageConfig(prev => ({
                      ...prev,
                      footer: { ...prev.footer, enabled: !prev.footer.enabled },
                    }))}
                  >
                    {pageConfig.footer.enabled
                      ? <><Eye size={12} /> Visível</>
                      : <><EyeSlash size={12} /> Oculto</>}
                  </button>
                </div>

                {pageConfig.footer.enabled && (
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2 text-[11px] text-text2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pageConfig.footer.showPageNumber}
                        onChange={e => setPageConfig(prev => ({
                          ...prev,
                          footer: { ...prev.footer, showPageNumber: e.target.checked },
                        }))}
                        className="rounded border-border accent-accent"
                      />
                      Mostrar número da página
                    </label>

                    {pageConfig.footer.showPageNumber && (
                      <div>
                        <label className="text-[10px] text-text3 block mb-1">Posição do número</label>
                        <div className="flex gap-1">
                          {([
                            { pos: 'left' as const, label: 'Esquerda', icon: TextAlignLeft },
                            { pos: 'center' as const, label: 'Centro', icon: TextAlignCenter },
                            { pos: 'right' as const, label: 'Direita', icon: TextAlignRight },
                          ]).map(({ pos, label, icon: Icon }) => (
                            <button
                              key={pos}
                              title={label}
                              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] border transition-colors ${
                                pageConfig.footer.pageNumberPosition === pos
                                  ? 'border-accent bg-accent/10 text-accent font-medium'
                                  : 'border-border text-text3 hover:bg-azul-soft'
                              }`}
                              onClick={() => setPageConfig(prev => ({
                                ...prev,
                                footer: { ...prev.footer, pageNumberPosition: pos },
                              }))}
                            >
                              <Icon size={12} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] text-text3 block mb-1">Texto adicional no rodapé</label>
                      <Input
                        value={pageConfig.footer.leftText}
                        onChange={e => setPageConfig(prev => ({
                          ...prev,
                          footer: { ...prev.footer, leftText: e.target.value },
                        }))}
                        placeholder="Ex: LA Music School"
                        className="h-8 text-[12px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-border" />

              {/* Preview ao vivo */}
              <div className="prop-section">
                <div className="prop-label mb-2">Preview</div>
                <div className="border border-border rounded-md bg-white p-3 text-[9px] text-[#94a3b8] space-y-1">
                  {pageConfig.header.enabled && (
                    <div className="border-b border-border/50 pb-1 truncate">
                      {resolvePageText(pageConfig.header.leftText, { titulo: materialTitle || 'Título do Material', pagina: 1, total: pages.length })}
                    </div>
                  )}
                  <div className="text-center text-[8px] text-text3/40 py-2">conteúdo</div>
                  {pageConfig.footer.enabled && (
                    <div className="border-t border-border/50 pt-1 flex justify-between">
                      <span className="truncate">
                        {pageConfig.footer.leftText
                          ? resolvePageText(pageConfig.footer.leftText, { titulo: materialTitle || 'Título', pagina: 1, total: pages.length })
                          : ''}
                      </span>
                      <span>
                        {pageConfig.footer.showPageNumber ? 'Página 1' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-text3 text-center mt-2">
                Clique em um bloco para editar suas propriedades
              </div>
            </div>
          ) : (
            <>
              <div className="prop-label mb-3" style={{ color: 'var(--accent)' }}>
                Propriedades do Bloco
              </div>

              {/* Tipo */}
              <div className="prop-section">
                <div className="prop-label">Tipo</div>
                <div className="flex items-center gap-2 px-3 py-2 bg-azul-soft rounded-md">
                  {(() => {
                    const cfg = getBlockConfig(selectedBlock.block_type)
                    const Icon = cfg.icon
                    return (
                      <>
                        <Icon size={16} style={{ color: cfg.color }} />
                        <span className="text-[12px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      </>
                    )
                  })()}
                  {selectedBlock.is_edited && (
                    <Badge variant="gold" className="text-[8px] ml-auto">editado</Badge>
                  )}
                </div>
              </div>

              {/* Título (esconde para capa — usa campo próprio nos dados da capa) */}
              {selectedBlock.block_type !== 'cover' && (
              <div className="prop-section">
                <div className="prop-label">Título</div>
                <div className="title-editor-compact">
                  <RichTextEditor
                    key={`title-${selectedBlock.id}`}
                    content={
                      (selectedBlock.content as any)?.title_html
                      ?? `<p>${selectedBlock.title ?? ''}</p>`
                    }
                    onChange={(html) => {
                      const plainText = html.replace(/<[^>]+>/g, '').trim()
                      setBlocks(prev => prev.map(b => {
                        if (b.id !== selectedBlockId) return b
                        return {
                          ...b,
                          title: plainText,
                          content: { ...(b.content ?? {}), title_html: html },
                        }
                      }))
                    }}
                    placeholder="Título do bloco"
                    variant="title"
                    className="[&_.tiptap]:font-bold [&_.tiptap_p]:mb-0 [&_.tiptap_h1]:mb-0 [&_.tiptap_h2]:mb-0 [&_.tiptap_h3]:mb-0"
                  />
                </div>
              </div>
              )}

              {/* Conteúdo (para text/tip/exercise) */}
              {['text', 'tip', 'exercise', 'title'].includes(selectedBlock.block_type) && (
                <div className="prop-section">
                  <div className="prop-label">Conteúdo</div>
                  <RichTextEditor
                    key={selectedBlock.id}
                    content={ensureHtml((selectedBlock.content as any)?.html ?? (selectedBlock.content as any)?.text ?? '')}
                    onChange={(html) => {
                      setBlocks(prev => prev.map(b => {
                        if (b.id !== selectedBlockId) return b
                        return {
                          ...b,
                          content: { ...(b.content ?? {}), html, text: htmlToMarkdown(html) },
                        }
                      }))
                    }}
                    placeholder="Conteúdo do bloco"
                    compact
                    onAIAction={handleAITextAction}
                  />
                </div>
              )}

              {/* Notação — botão para abrir editor visual */}
              {(selectedBlock.block_type === 'notation' || blockHasNotation(selectedBlock)) && (
                <div className="prop-section">
                  <div className="prop-label">
                    {selectedBlock.block_type === 'notation' ? 'Notação' : 'Notação do bloco'}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-master/30 text-master hover:bg-master/10"
                    onClick={() => openNotationEditorForBlock(selectedBlock.id)}
                  >
                    <MusicNotes size={14} weight="bold" />
                    {selectedBlock.block_type === 'notation' ? 'Editar Notação' : 'Editar Pauta'}
                  </Button>
                  {blockHasNotation(selectedBlock) && (
                    <div className="text-[10px] text-text3 mt-1 text-center">
                      {(selectedBlock.render_data as any)?.notation?.staves?.[0]?.notes?.length ?? 0} notas · clave {(selectedBlock.render_data as any)?.clef ?? 'Sol'}
                    </div>
                  )}
                </div>
              )}

              {/* Acorde — botão para abrir editor visual */}
              {selectedBlock.block_type === 'chord_diagram' && (
                <div className="prop-section">
                  <div className="prop-label">Diagrama</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-grow/30 text-grow hover:bg-grow/10"
                    onClick={() => openChordEditorForBlock(selectedBlock.id)}
                  >
                    <Guitar size={14} weight="bold" /> Editar Acorde
                  </Button>
                  {(selectedBlock.render_data as any)?.chord_name && (
                    <div className="text-[10px] text-text3 mt-1 text-center">
                      Acorde: {(selectedBlock.render_data as any).chord_name}
                    </div>
                  )}
                </div>
              )}

              {/* Capa — formulário de campos */}
              {selectedBlock.block_type === 'cover' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Dados da Capa</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Template</label>
                    <Select
                      value={(selectedBlock.render_data as any)?.template ?? 'minimal'}
                      onValueChange={v => updateSelectedRenderData('template', v)}
                    >
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimalista</SelectItem>
                        <SelectItem value="colorful">Colorido</SelectItem>
                        <SelectItem value="classic">Clássico</SelectItem>
                        <SelectItem value="modern">Moderno</SelectItem>
                        <SelectItem value="geometric">Geométrico</SelectItem>
                        <SelectItem value="gradient">Gradiente</SelectItem>
                        <SelectItem value="musical">Musical</SelectItem>
                        <SelectItem value="bold">Impactante</SelectItem>
                        <SelectItem value="elegant">Elegante</SelectItem>
                        <SelectItem value="vibrant">Vibrante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Imagem de fundo IA */}
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Imagem de Fundo (IA)</label>
                    {(selectedBlock.render_data as any)?.cover_image_url ? (
                      <div className="space-y-1.5">
                        <div className="relative rounded overflow-hidden border border-border">
                          <img
                            src={(selectedBlock.render_data as any).cover_image_url}
                            alt="Capa gerada"
                            className="w-full h-24 object-cover"
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-[10px] gap-1 border-accent/30 text-accent hover:bg-accent/10"
                            onClick={() => handleGenerateCoverImage(selectedBlock.id)}
                            disabled={coverImageLoading}
                          >
                            <Sparkle size={12} weight="bold" /> Regenerar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] border-vermelho/30 text-vermelho hover:bg-vermelho/10"
                            onClick={() => updateSelectedRenderData('cover_image_url', null)}
                          >
                            <Trash size={12} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-center gap-2 border-accent/30 text-accent hover:bg-accent/10"
                        onClick={() => handleGenerateCoverImage(selectedBlock.id)}
                        disabled={coverImageLoading}
                      >
                        {coverImageLoading ? (
                          <><SpinnerGap size={14} className="animate-spin" /> Gerando...</>
                        ) : (
                          <><Sparkle size={14} weight="bold" /> Gerar Capa com IA</>
                        )}
                      </Button>
                    )}
                  </div>
                  {/* Prompt personalizado para IA */}
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Prompt da Capa (IA)</label>
                    <Textarea
                      value={(selectedBlock.render_data as any)?.cover_prompt ?? ''}
                      onChange={e => updateSelectedRenderData('cover_prompt', e.target.value)}
                      placeholder="Ex: Capa minimalista com violão acústico, tons azuis e dourados, estilo profissional..."
                      className="text-[11px] min-h-[60px] resize-none"
                      rows={3}
                    />
                    <div className="flex gap-1 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-[10px] gap-1 border-azul-claro/30 text-azul-claro hover:bg-azul-claro/10"
                        onClick={handleEnhanceCoverPrompt}
                        disabled={coverPromptLoading}
                      >
                        {coverPromptLoading ? (
                          <><SpinnerGap size={12} className="animate-spin" /> Melhorando...</>
                        ) : (
                          <><Sparkle size={12} weight="bold" /> Melhorar Prompt</>
                        )}
                      </Button>
                    </div>
                    <p className="text-[9px] text-text3 mt-1 opacity-60">
                      Descreva como quer a capa. Se vazio, a IA gera automaticamente com base nos dados.
                    </p>
                  </div>
                  {/* Logomarca */}
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Logomarca</label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = '' }}
                    />
                    {(selectedBlock.render_data as any)?.logo_url ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 p-1.5 rounded border border-border bg-bg2">
                          <img
                            src={(selectedBlock.render_data as any).logo_url}
                            alt="Logomarca"
                            className="h-10 w-auto max-w-[80px] object-contain rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] text-text3 truncate">Logomarca carregada</div>
                            <div className="text-[9px] text-text3 opacity-60">Arraste na capa para posicionar</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[9px] text-text3 shrink-0">Tamanho:</label>
                          <input
                            type="range"
                            min={30}
                            max={200}
                            value={(selectedBlock.render_data as any)?.logo_size ?? 80}
                            onChange={e => updateSelectedRenderData('logo_size', Number(e.target.value))}
                            className="flex-1 h-1 accent-accent"
                          />
                          <span className="text-[9px] text-text3 w-8 text-right">{(selectedBlock.render_data as any)?.logo_size ?? 80}px</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-6 text-[9px] gap-1"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            Trocar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[9px] border-vermelho/30 text-vermelho hover:bg-vermelho/10"
                            onClick={() => { updateSelectedRenderData('logo_url', null); updateSelectedRenderData('logo_pos', null); updateSelectedRenderData('logo_size', null) }}
                          >
                            <Trash size={10} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-center gap-2 h-7 text-[10px]"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                      >
                        {logoUploading ? (
                          <><SpinnerGap size={12} className="animate-spin" /> Enviando...</>
                        ) : (
                          <><ImageIcon size={12} /> Enviar Logomarca</>
                        )}
                      </Button>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Título da capa</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.titulo ?? ''}
                      onChange={e => updateSelectedRenderData('titulo', e.target.value)}
                      placeholder={materialTitle || 'Título do material'}
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Subtítulo</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.subtitulo ?? ''}
                      onChange={e => updateSelectedRenderData('subtitulo', e.target.value)}
                      placeholder="Descrição ou complemento"
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-text3 block mb-1">Instrumento</label>
                      <Input
                        value={(selectedBlock.render_data as any)?.instrumento ?? ''}
                        onChange={e => updateSelectedRenderData('instrumento', e.target.value)}
                        placeholder="Violão, Piano..."
                        className="h-8 text-[12px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text3 block mb-1">Nível</label>
                      <Input
                        value={(selectedBlock.render_data as any)?.nivel ?? ''}
                        onChange={e => updateSelectedRenderData('nivel', e.target.value)}
                        placeholder="Iniciante..."
                        className="h-8 text-[12px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Professor</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.professor ?? ''}
                      onChange={e => updateSelectedRenderData('professor', e.target.value)}
                      placeholder="Nome do professor"
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Escola</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.escola ?? ''}
                      onChange={e => updateSelectedRenderData('escola', e.target.value)}
                      placeholder="Nome da escola"
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Data</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.data ?? ''}
                      onChange={e => updateSelectedRenderData('data', e.target.value)}
                      placeholder="Março 2026"
                      className="h-8 text-[12px]"
                    />
                  </div>
                </div>
              )}

              {/* Teclado — botão para abrir KeyboardEditor */}
              {selectedBlock.block_type === 'keyboard' && (
                <div className="prop-section">
                  <div className="prop-label">Teclado</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-master/30 text-master hover:bg-master/10"
                    onClick={() => openKeyboardEditorForBlock(selectedBlock.id)}
                  >
                    <PianoKeys size={14} weight="bold" /> Editar Teclado
                  </Button>
                  {(selectedBlock.render_data as any)?.chord_name && (
                    <div className="text-[10px] text-text3 mt-1 text-center">
                      {(selectedBlock.render_data as any).chord_name}
                      {' · '}
                      {((selectedBlock.render_data as any)?.keys as string[])?.length ?? 0} teclas
                    </div>
                  )}
                </div>
              )}

              {/* Grade de Acordes — lista de acordes + controle de colunas */}
              {selectedBlock.block_type === 'chord_grid' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Grade de Acordes</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Colunas</label>
                    <div className="flex gap-1">
                      {[2, 3, 4, 6].map(n => (
                        <button
                          key={n}
                          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${
                            ((selectedBlock.render_data as any)?.columns ?? 3) === n
                              ? 'border-grow bg-grow/10 text-grow font-semibold'
                              : 'border-border text-text3 hover:bg-azul-soft'
                          }`}
                          onClick={() => updateSelectedRenderData('columns', n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-text3">
                    {((selectedBlock.render_data as any)?.chords as any[])?.length ?? 0} acordes na grade
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-grow/30 text-grow hover:bg-grow/10"
                    onClick={() => openChordEditorForGrid(selectedBlock.id)}
                  >
                    <Guitar size={14} weight="bold" /> Adicionar Acorde
                  </Button>
                  {/* Lista dos acordes existentes */}
                  {((selectedBlock.render_data as any)?.chords as any[])?.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {((selectedBlock.render_data as any).chords as any[]).map((chord: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between px-2 py-1 bg-bg2 rounded text-[11px]">
                          <span className="font-medium text-text">{chord.chord_name ?? chord.name ?? `Acorde ${idx + 1}`}</span>
                          <button
                            className="text-text3 hover:text-vermelho transition-colors"
                            onClick={() => {
                              const chords = [...((selectedBlock.render_data as any)?.chords ?? [])]
                              chords.splice(idx, 1)
                              updateSelectedRenderData('chords', chords)
                            }}
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Grade de Teclados — lista de teclados + controle de colunas */}
              {selectedBlock.block_type === 'keyboard_grid' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Grade de Teclados</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Colunas</label>
                    <div className="flex gap-1">
                      {[2, 3, 4, 6].map(n => (
                        <button
                          key={n}
                          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${
                            ((selectedBlock.render_data as any)?.columns ?? 3) === n
                              ? 'border-master bg-master/10 text-master font-semibold'
                              : 'border-border text-text3 hover:bg-azul-soft'
                          }`}
                          onClick={() => updateSelectedRenderData('columns', n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-text3">
                    {((selectedBlock.render_data as any)?.keyboards as any[])?.length ?? 0} teclados na grade
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-master/30 text-master hover:bg-master/10"
                    onClick={() => openKeyboardEditorForGrid(selectedBlock.id)}
                  >
                    <PianoKeys size={14} weight="bold" /> Adicionar Teclado
                  </Button>
                  {/* Lista dos teclados existentes */}
                  {((selectedBlock.render_data as any)?.keyboards as any[])?.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {((selectedBlock.render_data as any).keyboards as any[]).map((kb: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between px-2 py-1 bg-bg2 rounded text-[11px]">
                          <span className="font-medium text-text">{kb.chord_name ?? `Teclado ${idx + 1}`}</span>
                          <button
                            className="text-text3 hover:text-vermelho transition-colors"
                            onClick={() => {
                              const keyboards = [...((selectedBlock.render_data as any)?.keyboards ?? [])]
                              keyboards.splice(idx, 1)
                              updateSelectedRenderData('keyboards', keyboards)
                            }}
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bloco Áudio — URL + legenda */}
              {selectedBlock.block_type === 'audio' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Áudio</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">URL do áudio</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.url ?? ''}
                      onChange={e => updateSelectedRenderData('url', e.target.value)}
                      placeholder="https://... (.mp3, .ogg, .wav)"
                      className="h-7 text-[11px]"
                    />
                    <span className="text-[9px] text-text3/60 mt-0.5 block">
                      Cole a URL de um arquivo de áudio ou do Supabase Storage
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Legenda</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.caption ?? ''}
                      onChange={e => updateSelectedRenderData('caption', e.target.value)}
                      placeholder="Ex: Como soa o acorde de Dó Maior"
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
              )}

              {/* Bloco Vídeo — URL YouTube/Vimeo + legenda */}
              {selectedBlock.block_type === 'video' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Vídeo</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">URL do vídeo</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.url ?? ''}
                      onChange={e => updateSelectedRenderData('url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=... ou vimeo.com/..."
                      className="h-7 text-[11px]"
                    />
                    <span className="text-[9px] text-text3/60 mt-0.5 block">
                      YouTube ou Vimeo · No PDF será exibido como QR code
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Legenda</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.caption ?? ''}
                      onChange={e => updateSelectedRenderData('caption', e.target.value)}
                      placeholder="Descrição do vídeo"
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
              )}

              {/* Bloco Imagem — upload, URL, legenda, tamanho */}
              {selectedBlock.block_type === 'image' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Imagem</div>

                  {/* Preview da imagem atual */}
                  {(selectedBlock.render_data as any)?.url ? (
                    <div className="space-y-1.5">
                      <img
                        src={(selectedBlock.render_data as any).url}
                        alt={selectedBlock.title ?? 'Imagem'}
                        className="w-full rounded-md border border-border object-cover max-h-32"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-[10px] border-accent/30 text-accent hover:bg-accent/10"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={imageUploading}
                        >
                          {imageUploading ? <SpinnerGap size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                          Trocar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] border-vermelho/30 text-vermelho hover:bg-vermelho/10"
                          onClick={() => updateSelectedRenderData('url', null)}
                        >
                          <Trash size={12} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Zona de upload drag-and-drop */
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors"
                      onClick={() => imageInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-accent', 'bg-accent/5') }}
                      onDragLeave={e => { e.currentTarget.classList.remove('border-accent', 'bg-accent/5') }}
                      onDrop={e => {
                        e.preventDefault()
                        e.currentTarget.classList.remove('border-accent', 'bg-accent/5')
                        const file = e.dataTransfer.files?.[0]
                        if (file) handleImageUpload(file)
                      }}
                    >
                      {imageUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <SpinnerGap size={24} className="animate-spin text-accent" />
                          <span className="text-[11px] text-text3">Enviando...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <ImageIcon size={24} className="text-text3" />
                          <span className="text-[11px] text-text3">Arraste uma imagem ou clique para selecionar</span>
                          <span className="text-[9px] text-text3/60">JPG, PNG ou WebP · máx. 5MB</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Input hidden para file */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                      e.target.value = ''
                    }}
                  />

                  {/* URL manual */}
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">ou URL externa</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.url ?? ''}
                      onChange={e => updateSelectedRenderData('url', e.target.value)}
                      placeholder="https://..."
                      className="h-7 text-[11px]"
                    />
                  </div>

                  {/* Legenda */}
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Legenda</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.caption ?? ''}
                      onChange={e => updateSelectedRenderData('caption', e.target.value)}
                      placeholder="Descrição da imagem"
                      className="h-7 text-[11px]"
                    />
                  </div>

                  {/* Tamanho */}
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Tamanho</label>
                    <div className="flex gap-1">
                      {[
                        { value: 'small', label: 'P' },
                        { value: 'medium', label: 'M' },
                        { value: 'large', label: 'G' },
                        { value: 'full', label: 'Total' },
                      ].map(s => (
                        <button
                          key={s.value}
                          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${
                            ((selectedBlock.render_data as any)?.size ?? 'medium') === s.value
                              ? 'border-accent bg-accent/10 text-accent font-semibold'
                              : 'border-border text-text3 hover:bg-accent-soft'
                          }`}
                          onClick={() => updateSelectedRenderData('size', s.value)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco Colunas — controle de layout + conteúdo das colunas */}
              {selectedBlock.block_type === 'columns' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Layout de Colunas</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Número de colunas</label>
                    <div className="flex gap-1">
                      {[2, 3].map(n => (
                        <button
                          key={n}
                          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${
                            ((selectedBlock.render_data as any)?.columns as any[])?.length === n
                              ? 'border-azul bg-azul/10 text-azul font-semibold'
                              : 'border-border text-text3 hover:bg-azul-soft'
                          }`}
                          onClick={() => {
                            const current = ((selectedBlock.render_data as any)?.columns as any[]) ?? []
                            let newCols: any[]
                            if (n > current.length) {
                              newCols = [...current, ...Array.from({ length: n - current.length }, () => ({ blocks: [] }))]
                            } else {
                              newCols = current.slice(0, n)
                            }
                            updateSelectedRenderData('columns', newCols)
                          }}
                        >
                          {n} col
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conteúdo de cada coluna */}
                  {((selectedBlock.render_data as any)?.columns as any[])?.map((col: any, ci: number) => (
                    <div key={ci} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-text2">Coluna {ci + 1}</span>
                        <span className="text-[9px] text-text3">{(col.blocks?.length ?? 0)} itens</span>
                      </div>

                      {/* Lista dos sub-blocos */}
                      {(col.blocks ?? []).length > 0 && (
                        <div className="space-y-0.5">
                          {(col.blocks as any[]).map((sb: any, si: number) => {
                            const cfg = getBlockConfig(sb.block_type)
                            return (
                              <div key={si} className="flex items-center justify-between px-2 py-1 bg-bg2 rounded text-[10px]">
                                <span className="font-medium text-text truncate flex-1">{sb.title || cfg.label}</span>
                                <button
                                  className="text-text3 hover:text-vermelho transition-colors ml-1 shrink-0"
                                  onClick={() => {
                                    const cols = [...((selectedBlock.render_data as any)?.columns ?? [])]
                                    const newBlocks = [...(cols[ci]?.blocks ?? [])]
                                    newBlocks.splice(si, 1)
                                    cols[ci] = { ...cols[ci], blocks: newBlocks }
                                    updateSelectedRenderData('columns', cols)
                                  }}
                                >
                                  <Trash size={11} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Adicionar sub-bloco */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="w-full justify-center gap-1 text-[10px] h-7 border-azul/30 text-azul hover:bg-azul/10">
                            <Plus size={12} /> Adicionar na coluna {ci + 1}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          {['text', 'tip', 'exercise', 'chord_diagram', 'chord_grid', 'notation', 'keyboard', 'image'].map(subType => {
                            const cfg = getBlockConfig(subType)
                            const Icon = cfg.icon
                            return (
                              <DropdownMenuItem
                                key={subType}
                                className="gap-2 text-[11px]"
                                onClick={() => {
                                  const cols = [...((selectedBlock.render_data as any)?.columns ?? [])]
                                  const newBlock = {
                                    block_type: subType,
                                    title: subType === 'text' ? 'Texto' : subType === 'tip' ? 'Dica' : subType === 'exercise' ? 'Exercício' : null,
                                    content: { text: '' },
                                    render_data: subType === 'chord_grid' ? { chords: [], columns: 2 } : null,
                                  }
                                  const newBlocks = [...(cols[ci]?.blocks ?? []), newBlock]
                                  cols[ci] = { ...cols[ci], blocks: newBlocks }
                                  updateSelectedRenderData('columns', cols)
                                }}
                              >
                                <Icon size={14} style={{ color: cfg.color }} />
                                {cfg.label}
                              </DropdownMenuItem>
                            )
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}

              <hr className="border-border my-4" />

              {/* Ações */}
              <div className="prop-section">
                <div className="prop-label">Ações</div>
                <div className="flex flex-col gap-1.5">
                  <Button
                    size="sm"
                    className="w-full justify-center bg-azul-escuro hover:bg-azul"
                    onClick={handleSaveBlock}
                    disabled={saving}
                  >
                    {saving ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                    Salvar Alterações
                  </Button>

                  {selectedBlock.original_content && selectedBlock.is_edited && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={handleRevertBlock}
                    >
                      <ArrowCounterClockwise size={14} /> Reverter Original
                    </Button>
                  )}
                </div>
              </div>

              <hr className="border-border my-4" />

              {/* Exportar */}
              <div className="prop-section">
                <div className="prop-label">Exportar material</div>
                <div className="flex flex-col gap-1.5">
                  <Button variant="ghost" size="sm" className="w-full justify-center" onClick={handlePrint}>
                    <FilePdf size={14} /> Imprimir / PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-center" onClick={handleExportHTML}>
                    <Code size={14} /> Ver HTML
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modais dos editores visuais integrados ── */}

      {/* NotationEditor — edição de partitura */}
      <NotationEditor
        open={notationEditorOpen}
        onOpenChange={(v) => { setNotationEditorOpen(v); if (!v) setNotationEditorBlockId(null) }}
        notation={notationEditorBlockId ? blockToNotationRow(blocks.find(b => b.id === notationEditorBlockId)!) as any : null}
        onSave={handleNotationEditorSave}
      />

      {/* Dialog — Gerar bloco com IA */}
      <Dialog open={aiBlockDialogOpen} onOpenChange={setAiBlockDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[20px] flex items-center gap-2">
              <Sparkle size={20} weight="fill" className="text-accent" />
              Gerar bloco com <span className="text-accent">IA</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-[11px] text-text3 block mb-1">Descreva o bloco que deseja gerar</label>
              <Textarea
                value={aiBlockPrompt}
                onChange={e => setAiBlockPrompt(e.target.value)}
                placeholder="Ex: Exercício de escala pentatônica menor no violão, com tablatura e dica de dedilhado"
                className="min-h-[100px] text-[13px]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleGenerateAIBlock()
                  }
                }}
              />
              <span className="text-[9px] text-text3/60 mt-0.5 block">
                Ctrl+Enter para gerar · A IA criará um bloco de texto, dica ou exercício
              </span>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setAiBlockDialogOpen(false)} disabled={aiBlockLoading}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateAIBlock} disabled={aiBlockLoading || !aiBlockPrompt.trim()} className="gap-2">
              {aiBlockLoading ? (
                <>
                  <SpinnerGap size={14} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkle size={14} weight="fill" />
                  Gerar bloco
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ChordEditor — edição de diagrama de acorde (wrapper Dialog) */}
      <Dialog open={chordEditorOpen} onOpenChange={(v) => { setChordEditorOpen(v); if (!v) { setChordEditorBlockId(null); setChordGridTargetBlockId(null) } }}>
        <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto bg-surface border-border" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">
              Editar <span className="text-accent">Acorde</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_200px] gap-6 mt-2">
            <ChordEditor
              state={chordEditorState}
              onChange={setChordEditorState}
              chordName={chordEditorName}
              startFret={chordEditorStartFret}
            />
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] text-text3 uppercase tracking-wider mb-1 block">Nome</label>
                <Input
                  value={chordEditorName}
                  onChange={e => setChordEditorName(e.target.value)}
                  placeholder="Ex: Am7"
                  className="text-[13px] h-9"
                />
              </div>
              <div>
                <label className="text-[11px] text-text3 uppercase tracking-wider mb-1 block">Traste inicial</label>
                <Select value={String(chordEditorStartFret)} onValueChange={v => setChordEditorStartFret(Number(v))}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}ª casa</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setChordEditorOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (chordGridTargetBlockId) {
                handleChordGridSave()
                setChordEditorOpen(false)
              } else {
                handleSaveChordToBlock()
              }
            }}>
              <FloppyDisk size={16} /> {chordGridTargetBlockId ? 'Adicionar à Grade' : 'Salvar Acorde'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KeyboardEditor — edição de teclado/piano */}
      <KeyboardEditor
        open={keyboardEditorOpen}
        onOpenChange={(v) => { setKeyboardEditorOpen(v); if (!v) { setKeyboardEditorBlockId(null); setKeyboardGridTargetBlockId(null) } }}
        chord={keyboardEditorBlockId ? (() => {
          const block = blocks.find(b => b.id === keyboardEditorBlockId)
          if (!block?.render_data?.keys) return null
          const rd = block.render_data as any
          return {
            id: block.id,
            name: rd.chord_name ?? block.title ?? '',
            instrument: 'piano' as const,
            positions: {
              keys: rd.keys ?? [],
              root: rd.root ?? 'C',
              octave: rd.octave ?? 4,
              fingering_rh: rd.fingering_rh ?? [],
              fingering_lh: rd.fingering_lh ?? [],
              type: rd.type ?? 'major',
              quality: rd.quality ?? 'Maior',
              octave_start: rd.octave_start ?? 3,
              octave_count: rd.octave_count ?? 2,
            },
            difficulty: 1,
            tags: [],
          }
        })() : null}
        onSave={handleKeyboardEditorSave}
      />
    </div>
  )
}

// =============================================
// Componente exportado — detecta se tem :id
// =============================================

export function Editor() {
  const { id } = useParams<{ id: string }>()

  if (id) {
    return <MaterialEditor materialId={id} />
  }

  return <MaterialList />
}
