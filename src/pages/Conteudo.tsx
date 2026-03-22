import { useState, useMemo } from 'react'
import { Plus, UploadSimple, MagnifyingGlass, SpinnerGap } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

import { TopicCard } from '@/components/content/TopicCard'
import { TopicEditor } from '@/components/content/TopicEditor'
import { NewTopicDialog } from '@/components/content/NewTopicDialog'
import { PdfImportDialog } from '@/components/content/PdfImportDialog'
import { useTopics } from '@/hooks/useContent'
import type { ContentTopicWithCuration } from '@/services/contentService'

export function Conteudo() {
  // Filter states
  const [search, setSearch] = useState('')
  const [instrument, setInstrument] = useState<string>('all')
  const [dimension, setDimension] = useState<string>('all')
  const [level, setLevel] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')

  // Dialog states
  const [newTopicOpen, setNewTopicOpen] = useState(false)
  const [pdfImportOpen, setPdfImportOpen] = useState(false)
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)

  // Fetch topics from database
  const { data: topics, loading, refetch } = useTopics({
    instrument: instrument !== 'all' ? instrument : undefined,
    dimension: dimension !== 'all' ? dimension as any : undefined,
    difficulty: level !== 'all' ? level as any : undefined,
  })

  // Filter topics by search and status (client-side)
  const filteredTopics = useMemo(() => {
    if (!topics) return []

    return topics.filter((topic) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesTitle = topic.title?.toLowerCase().includes(searchLower)
        const matchesDesc = topic.description?.toLowerCase().includes(searchLower)
        const matchesTags = topic.tags?.some(t => t.toLowerCase().includes(searchLower))
        if (!matchesTitle && !matchesDesc && !matchesTags) return false
      }

      // Status filter (check blocks' curation_status - for now show all)
      // Status is on blocks, not topics - would need a join query
      // For now, we skip this filter or implement later

      return true
    })
  }, [topics, search, status])

  // Count stats
  const topicCount = filteredTopics.length
  const topicsWithContent = filteredTopics.filter(t =>
    (t as any).block_count > 0 || t.description
  ).length

  // Handlers
  function handleTopicClick(topic: ContentTopicWithCuration) {
    setEditingTopicId(topic.id)
  }

  function handleTopicCreated() {
    refetch()
    toast.success('Topico criado com sucesso!')
  }

  function handleImportComplete() {
    refetch()
    toast.success('Importacao concluida!')
  }

  function handleTopicUpdated() {
    refetch()
  }

  function handleTopicDeleted() {
    setEditingTopicId(null)
    refetch()
    toast.success('Topico excluido')
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Base de Conteudo <em className="not-italic text-accent">Curado</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Repositorio pedagogico musical - Curadoria N4 - Versionamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPdfImportOpen(true)}>
            <UploadSimple size={16} className="mr-1" /> Importar
          </Button>
          <Button onClick={() => setNewTopicOpen(true)}>
            <Plus size={16} className="mr-1" /> Novo Topico
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-4">
          {/* Search */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">Buscar conteudo</Label>
            <div className="relative">
              <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3" />
              <Input
                placeholder="Titulo ou tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-[12px]"
              />
            </div>
          </div>

          {/* Instrument */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">Instrumento</Label>
            <Select value={instrument} onValueChange={setInstrument}>
              <SelectTrigger className="h-8 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
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

          {/* Dimension/Pillar */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">Dimensao</Label>
            <Select value={dimension} onValueChange={setDimension}>
              <SelectTrigger className="h-8 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="theory">Teoria</SelectItem>
                <SelectItem value="technique">Tecnica</SelectItem>
                <SelectItem value="rhythm">Ritmo</SelectItem>
                <SelectItem value="repertoire">Repertorio</SelectItem>
                <SelectItem value="auditory">Auditivo</SelectItem>
                <SelectItem value="evaluation">Avaliacao</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Level */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">Nivel</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-8 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="foundation">Foundation</SelectItem>
                <SelectItem value="grow">Grow</SelectItem>
                <SelectItem value="advance">Advance</SelectItem>
                <SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="review">Em revisao</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-[12px] text-text3">
        <span>Mostrando <strong className="text-text1">{topicCount}</strong> topicos</span>
        <span className="text-border">|</span>
        <span><strong className="text-text1">{topicsWithContent}</strong> com conteudo</span>
        {loading && (
          <>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-accent">
              <SpinnerGap size={12} className="animate-spin" /> Carregando...
            </span>
          </>
        )}
      </div>

      {/* Topics Grid */}
      {loading && !topics ? (
        <div className="flex items-center justify-center py-20">
          <SpinnerGap size={24} className="animate-spin text-accent" />
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text2 text-[14px]">Nenhum topico encontrado</p>
          <p className="text-text3 text-[12px] mt-1">
            {search || instrument !== 'all' || dimension !== 'all' || level !== 'all'
              ? 'Tente ajustar os filtros'
              : 'Clique em "Novo Topico" ou "Importar" para comecar'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic as ContentTopicWithCuration}
              onClick={() => handleTopicClick(topic as ContentTopicWithCuration)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <NewTopicDialog
        open={newTopicOpen}
        onOpenChange={setNewTopicOpen}
        onCreated={handleTopicCreated}
      />

      <PdfImportDialog
        open={pdfImportOpen}
        onClose={() => setPdfImportOpen(false)}
        onImportComplete={handleImportComplete}
      />

      {editingTopicId && (
        <TopicEditor
          topicId={editingTopicId}
          open={!!editingTopicId}
          onClose={() => setEditingTopicId(null)}
          onDeleted={handleTopicDeleted}
          onUpdated={handleTopicUpdated}
        />
      )}
    </div>
  )
}
