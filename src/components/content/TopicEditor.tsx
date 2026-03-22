import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CaretLeft, FloppyDisk, Trash, Plus, PencilSimple,
  DotsSixVertical, FileText, BookOpen, Clock,
} from '@phosphor-icons/react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'

import { StatusBadge } from './StatusBadge'
import { BlockEditor, BLOCK_TYPE_CONFIG } from './BlockEditor'
import { useTopicWithBlocks } from '@/hooks/useContent'
import {
  updateTopic,
  updateTopicStatus,
  deleteTopic,
  deleteBlock,
  createBlock,
  updateBlock,
  reorderBlocks,
  type ContentBlockWithCuration,
  type CurationStatus,
} from '@/services/contentService'

interface TopicEditorProps {
  topicId: string
  open: boolean
  onClose: () => void
  onDeleted: () => void
  onUpdated: () => void
}

export function TopicEditor({ topicId, open, onClose, onDeleted, onUpdated }: TopicEditorProps) {
  const { data, loading, refetch } = useTopicWithBlocks(topicId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instrument, setInstrument] = useState('universal')
  const [dimension, setDimension] = useState('theory')
  const [level, setLevel] = useState('foundation')
  const [tags, setTags] = useState('')
  const [minutes, setMinutes] = useState(15)
  const [status, setStatus] = useState<CurationStatus>('draft')

  const [blocks, setBlocks] = useState<ContentBlockWithCuration[]>([])
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAddBlock, setShowAddBlock] = useState(false)

  // Load data when topic changes
  useEffect(() => {
    if (data?.topic) {
      setTitle(data.topic.title || '')
      setDescription(data.topic.description || '')
      setInstrument(data.topic.instrument || 'universal')
      setDimension(data.topic.dimension || 'theory')
      setLevel(data.topic.difficulty_level || 'foundation')
      setTags(data.topic.tags?.join(', ') || '')
      setMinutes(data.topic.estimated_minutes || 15)
      setStatus((data.topic.curation_status as CurationStatus) || 'draft')
    }
    if (data?.blocks) {
      setBlocks(data.blocks)
    }
  }, [data])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTopic(topicId, {
        title: title.trim(),
        description: description.trim() || null,
        instrument,
        dimension: dimension as any,
        difficulty_level: level as any,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        estimated_minutes: minutes,
      })
      toast.success('Topico salvo!')
      onUpdated()
    } catch (err) {
      toast.error('Erro ao salvar')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTopicStatus(topicId, newStatus as CurationStatus)
      setStatus(newStatus as CurationStatus)
      toast.success('Status atualizado!')
      onUpdated()
    } catch (err) {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Excluir "${title}" e todos os seus ${blocks.length} blocos?`)) return

    try {
      await deleteTopic(topicId)
      toast.success('Topico excluido')
      onDeleted()
      onClose()
    } catch (err) {
      toast.error('Erro ao excluir')
    }
  }

  const handleAddBlock = async (blockType: string) => {
    try {
      const newBlock = await createBlock({
        topic_id: topicId,
        block_type: blockType as any,
        title: null,
        content: { text: '' },
        sort_order: blocks.length + 1,
      })
      if (newBlock) {
        setBlocks([...blocks, newBlock as ContentBlockWithCuration])
        setEditingBlockId(newBlock.id)
        setShowAddBlock(false)
        toast.success('Bloco adicionado')
      }
    } catch (err) {
      toast.error('Erro ao adicionar bloco')
    }
  }

  const handleSaveBlock = async (blockId: string, blockData: { block_type: string; title: string; content: Record<string, any> }) => {
    try {
      await updateBlock(blockId, {
        block_type: blockData.block_type as any,
        title: blockData.title || null,
        content: blockData.content,
      })
      setBlocks(blocks.map(b =>
        b.id === blockId ? {
          ...b,
          block_type: blockData.block_type as ContentBlockWithCuration['block_type'],
          title: blockData.title,
          content: blockData.content,
        } : b
      ))
      setEditingBlockId(null)
      toast.success('Bloco salvo')
    } catch (err) {
      toast.error('Erro ao salvar bloco')
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Excluir este bloco?')) return

    try {
      await deleteBlock(blockId)
      setBlocks(blocks.filter(b => b.id !== blockId))
      toast.success('Bloco excluido')
    } catch (err) {
      toast.error('Erro ao excluir bloco')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = blocks.findIndex(b => b.id === active.id)
    const newIdx = blocks.findIndex(b => b.id === over.id)
    const reordered = arrayMove(blocks, oldIdx, newIdx)

    setBlocks(reordered)

    try {
      await reorderBlocks(topicId, reordered.map(b => b.id))
      toast.success('Ordem atualizada')
    } catch (err) {
      toast.error('Erro ao reordenar')
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-text3">Carregando...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
              <CaretLeft size={16} />
            </Button>
            <span className="text-sm font-semibold truncate max-w-[300px]">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[130px] h-7 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="review">Em Revisao</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-7 text-[10px] text-red-400" onClick={handleDelete}>
              <Trash size={12} className="mr-1" />
              Excluir
            </Button>
            <Button size="sm" className="h-7 text-[10px]" onClick={handleSave} disabled={saving}>
              <FloppyDisk size={12} className="mr-1" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Blocks */}
          <div className="flex-1 border-r border-border flex flex-col">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-medium text-text2">Blocos do Topico</span>
              <Popover open={showAddBlock} onOpenChange={setShowAddBlock}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[10px]">
                    <Plus size={12} className="mr-1" />
                    Adicionar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-2" align="end">
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(BLOCK_TYPE_CONFIG).map(([type, config]) => {
                      const Icon = config.icon
                      return (
                        <Button
                          key={type}
                          variant="ghost"
                          size="sm"
                          className="h-8 justify-start gap-1.5 text-[10px]"
                          onClick={() => handleAddBlock(type)}
                        >
                          <Icon size={12} className={config.color} />
                          {config.label}
                        </Button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <ScrollArea className="flex-1 p-4">
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-text3">
                  <FileText size={32} className="mb-2 opacity-30" />
                  <p className="text-[11px]">Nenhum bloco ainda</p>
                  <p className="text-[10px]">Clique em "Adicionar" para criar</p>
                </div>
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {blocks.map((block, idx) => (
                        <SortableBlockItem
                          key={block.id}
                          block={block}
                          index={idx}
                          isEditing={editingBlockId === block.id}
                          onEdit={() => setEditingBlockId(block.id)}
                          onDelete={() => handleDeleteBlock(block.id)}
                          onSave={(data) => handleSaveBlock(block.id, data)}
                          onCancel={() => setEditingBlockId(null)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </ScrollArea>
          </div>

          {/* Right: Properties */}
          <div className="w-[280px] p-4 overflow-y-auto">
            <span className="text-[11px] font-medium text-text2">Propriedades</span>

            <div className="space-y-3 mt-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Titulo</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-7 text-[11px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Descricao</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-[11px] min-h-[50px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Instrumento</Label>
                <Select value={instrument} onValueChange={setInstrument}>
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="universal">Universal</SelectItem>
                    <SelectItem value="Violao">Violao</SelectItem>
                    <SelectItem value="Guitarra">Guitarra</SelectItem>
                    <SelectItem value="Piano">Piano</SelectItem>
                    <SelectItem value="Teclado">Teclado</SelectItem>
                    <SelectItem value="Canto">Canto</SelectItem>
                    <SelectItem value="Bateria">Bateria</SelectItem>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                    <SelectItem value="Ukulele">Ukulele</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Dimensao</Label>
                <Select value={dimension} onValueChange={setDimension}>
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">Teoria</SelectItem>
                    <SelectItem value="technique">Tecnica</SelectItem>
                    <SelectItem value="rhythm">Ritmo</SelectItem>
                    <SelectItem value="repertoire">Repertorio</SelectItem>
                    <SelectItem value="auditory">Auditivo</SelectItem>
                    <SelectItem value="evaluation">Avaliacao</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Nivel</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="h-7 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foundation">Foundation</SelectItem>
                    <SelectItem value="grow">Grow</SelectItem>
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Tags</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tag1, tag2, ..."
                  className="h-7 text-[10px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Tempo (min)</Label>
                <Input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value) || 15)}
                  className="h-7 text-[10px] w-16"
                  min={1}
                  max={120}
                />
              </div>

              <Separator className="my-3" />

              <div className="space-y-2 text-[10px] text-text3">
                <div className="flex items-center gap-1.5">
                  <FileText size={12} />
                  <span>{blocks.length} blocos</span>
                </div>
                {data?.topic?.source_document && (
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={12} />
                    <span className="truncate">{data.topic.source_document}</span>
                  </div>
                )}
                {data?.topic?.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>Criado em {new Date(data.topic.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Sortable Block Item
interface SortableBlockItemProps {
  block: ContentBlockWithCuration
  index: number
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
  onSave: (data: { block_type: string; title: string; content: Record<string, any> }) => void
  onCancel: () => void
}

function SortableBlockItem({ block, index, isEditing, onEdit, onDelete, onSave, onCancel }: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const config = BLOCK_TYPE_CONFIG[block.block_type] || BLOCK_TYPE_CONFIG.text
  const Icon = config.icon
  // Safely extract text from content JSONB
  const contentObj = block.content as Record<string, unknown> | null
  const contentPreview = (contentObj?.text || contentObj?.html || '') as string
  const preview = typeof contentPreview === 'string'
    ? contentPreview.slice(0, 80) + (contentPreview.length > 80 ? '...' : '')
    : ''

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <BlockEditor block={block} onSave={onSave} onCancel={onCancel} />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-2.5 rounded-lg border border-border hover:border-accent/20 bg-card transition-all group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 rounded hover:bg-accent/10"
      >
        <DotsSixVertical size={14} className="text-text3" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text3 font-mono">{index + 1}.</span>
          <Icon size={12} className={config.color} />
          <span className="text-[11px] font-medium truncate">
            {block.title || config.label}
          </span>
        </div>
        {preview && (
          <p className="text-[10px] text-text3 mt-0.5 line-clamp-2">{preview}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onEdit}>
          <PencilSimple size={12} />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={onDelete}>
          <Trash size={12} />
        </Button>
      </div>
    </div>
  )
}
