import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, FloppyDisk, FilePdf, TextAa, Article,
  Guitar, MusicNotes, Lightbulb, PencilCircle, ListNumbers,
  TextHOne, LineSegment, Image as ImageIcon, Plus, Trash,
  SpinnerGap, DotsSixVertical, PencilSimple, ArrowCounterClockwise,
  Printer, Code, Eye, PencilLine, PianoKeys,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Tipos internos ---

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

const BLOCK_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; color: string }> = {
  text:           { label: 'Texto',     icon: Article,      bg: 'var(--azul-soft)',       color: 'var(--azul-claro)' },
  tip:            { label: 'Dica',      icon: Lightbulb,    bg: 'var(--dourado-soft)',     color: 'var(--dourado)' },
  exercise:       { label: 'Exercício', icon: PencilCircle, bg: 'var(--advance-soft)',     color: 'var(--advance)' },
  notation:       { label: 'Notação',   icon: MusicNotes,   bg: 'var(--master-soft)',      color: 'var(--master)' },
  chord_diagram:  { label: 'Acorde',    icon: Guitar,       bg: 'var(--grow-soft)',        color: 'var(--grow)' },
  tablature:      { label: 'Tablatura', icon: ListNumbers,  bg: 'var(--foundation-soft)',  color: 'var(--foundation)' },
  title:          { label: 'Título',    icon: TextHOne,     bg: 'var(--foundation-soft)',  color: 'var(--foundation)' },
  separator:      { label: 'Separador', icon: LineSegment,  bg: 'var(--border)',           color: 'var(--text3)' },
  image:          { label: 'Imagem',    icon: ImageIcon,    bg: 'var(--accent-soft)',      color: 'var(--accent)' },
  badge:          { label: 'Conquista', icon: PencilCircle, bg: 'var(--verde-soft)',       color: 'var(--verde)' },
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
      setMaterialTitle(material.title)
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
    try {
      const lastOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.sort_order)) : 0
      await addMaterialBlock({
        materialId,
        blockType,
        title: null,
        content: { text: '' },
        afterOrder: lastOrder,
      })
      toast.success('Bloco adicionado')
      refetch()
    } catch (e: any) {
      toast.error('Erro ao adicionar bloco: ' + (e?.message ?? ''))
    }
  }, [blocks, materialId, refetch])

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
  const handlePrint = () => window.print()
  const handleExportHTML = useCallback(() => {
    const canvasEl = document.querySelector('.editor-canvas')
    if (!canvasEl) return
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${materialTitle}</title>
<style>body{font-family:'DM Sans',sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#1E293B;line-height:1.7}
h1,h2,h3{font-family:'Playfair Display',serif}strong{font-weight:600}
.canvas-block{margin-bottom:16px;padding:16px 20px}
.block-selection-border{border:none!important}</style></head>
<body>${canvasEl.innerHTML}</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
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
              {['text', 'tip', 'exercise', 'title', 'notation', 'chord_diagram', 'tablature', 'separator'].map(type => {
                const cfg = getBlockConfig(type)
                const Icon = cfg.icon
                return (
                  <DropdownMenuItem key={type} onClick={() => handleAddBlock(type)} className="gap-2">
                    <Icon size={16} style={{ color: cfg.color }} />
                    {cfg.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Rodapé info */}
          <div className="mt-3 p-2.5 bg-azul-soft rounded-[var(--radius-sm)] text-[11px] text-text2">
            <strong>{blocks.length} blocos</strong> · v{materialMeta?.version ?? 1}
            {materialMeta?.updated_at && (
              <div className="text-text3 mt-0.5">
                Atualizado: {new Date(materialMeta.updated_at).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        </div>

        {/* Coluna 2 — Canvas (Preview) */}
        <div className="editor-canvas" onClick={() => { if (inlineEditingBlockId) setInlineEditingBlockId(null) }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            {blocks.map(block => {
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
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    if (block.block_type === 'chord_diagram') openChordEditorForBlock(block.id)
                    else if (block.block_type === 'notation' || blockHasNotation(block)) openNotationEditorForBlock(block.id)
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
                      />
                      <div className="text-[10px] text-text3 mt-2 text-right opacity-60">
                        Clique fora para sair da edição
                      </div>
                    </div>
                  ) : (
                    <MaterialPreview blocks={[editorBlockToPreview(block)]} />
                  )}
                </div>
              )
            })}

            {blocks.length === 0 && (
              <div className="text-center py-16 text-text3 text-sm">
                Material sem blocos. Adicione blocos usando o painel à esquerda.
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3 — Propriedades */}
        <div className="editor-properties">
          {!selectedBlock ? (
            <div className="text-center py-8 text-text3 text-sm">
              <PencilSimple size={24} className="mx-auto mb-2 text-text3/50" />
              Selecione um bloco para editar suas propriedades
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

              {/* Título */}
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

      {/* ChordEditor — edição de diagrama de acorde (wrapper Dialog) */}
      <Dialog open={chordEditorOpen} onOpenChange={(v) => { setChordEditorOpen(v); if (!v) setChordEditorBlockId(null) }}>
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
            <Button onClick={handleSaveChordToBlock}>
              <FloppyDisk size={16} /> Salvar Acorde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
