import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  PencilSimple,
  Copy,
  Trash,
  FileText,
  MusicNotes,
  Guitar,
  PianoKeys,
  ArrowSquareOut,
  Star,
} from '@phosphor-icons/react'
import type { ExerciseLibraryItem } from '@/services/exerciseLibraryService'

interface ExerciseCardProps {
  exercise: ExerciseLibraryItem
  onPreview: (exercise: ExerciseLibraryItem) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

// Cores por categoria
const CATEGORY_COLORS: Record<string, string> = {
  technique: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  harmony: 'bg-green-500/15 text-green-400 border-green-500/20',
  reading: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  rhythm: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  scales: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  intervals: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  piece: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  progression: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

// Labels em português
const CATEGORY_LABELS: Record<string, string> = {
  technique: 'Técnica',
  harmony: 'Harmonia',
  reading: 'Leitura',
  rhythm: 'Ritmo',
  scales: 'Escalas',
  intervals: 'Intervalos',
  piece: 'Peça',
  progression: 'Progressão',
  other: 'Outro',
}

const LEVEL_COLORS: Record<string, string> = {
  foundation: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  grow: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  advance: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  master: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
}

const LEVEL_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  grow: 'Grow',
  advance: 'Advance',
  master: 'Master',
}

// Ícones por tipo de bloco
const BLOCK_ICONS: Record<string, { icon: typeof FileText; label: string }> = {
  text: { icon: FileText, label: '📝' },
  title: { icon: FileText, label: '📝' },
  tip: { icon: FileText, label: '💡' },
  exercise: { icon: FileText, label: '📝' },
  notation: { icon: MusicNotes, label: '🎵' },
  chord_diagram: { icon: Guitar, label: '🎸' },
  chord_grid: { icon: Guitar, label: '🎸' },
  tablature: { icon: Guitar, label: '🎸' },
  keyboard: { icon: PianoKeys, label: '⌨️' },
  keyboard_grid: { icon: PianoKeys, label: '⌨️' },
  image: { icon: FileText, label: '🖼️' },
  rhythm: { icon: MusicNotes, label: '🥁' },
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function getBlocksArray(blocks: unknown): any[] {
  if (Array.isArray(blocks)) return blocks
  if (typeof blocks === 'string') {
    try {
      const parsed = JSON.parse(blocks)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function ExerciseCard({ exercise, onPreview, onDuplicate, onDelete }: ExerciseCardProps) {
  const navigate = useNavigate()
  const blocks = useMemo(() => getBlocksArray(exercise.blocks), [exercise.blocks])

  // Contar blocos por tipo
  const blockCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    blocks.forEach((b: any) => {
      const type = b.block_type || 'text'
      counts[type] = (counts[type] || 0) + 1
    })
    return counts
  }, [blocks])

  // Gerar preview do primeiro bloco
  const previewContent = useMemo(() => {
    const firstBlock = blocks[0]
    if (!firstBlock) return null

    const type = firstBlock.block_type
    const content = firstBlock.content || ''
    const renderData = firstBlock.render_data || {}

    switch (type) {
      case 'text':
      case 'title':
      case 'tip':
      case 'exercise':
        const htmlText = typeof content === 'object' ? content.html : ''
        const plainText = typeof content === 'object' ? content.text : content
        const text = stripHtml(typeof htmlText === 'string' && htmlText.trim() ? htmlText : (plainText || ''))
        return text.slice(0, 80) + (text.length > 80 ? '...' : '')
      case 'notation':
        if (typeof renderData?.alphaTex === 'string' && renderData.alphaTex.trim()) {
          return '🎵 Notação musical (AlphaTex)'
        }
        return '🎵 Pauta musical'
      case 'chord_grid':
      case 'chord_diagram':
        if (Array.isArray(content?.chords)) {
          const names = content.chords.slice(0, 4).map((c: any) => c?.name || c).join(' · ')
          return names ? `🎸 ${names}` : '🎸 Grade de acordes'
        }
        if (Array.isArray(renderData?.chords)) {
          const names = renderData.chords.slice(0, 4).map((c: any) => c?.chord_name || c?.name || c).join(' · ')
          return `🎸 ${names}`
        }
        return '🎸 Diagrama de acorde'
      case 'tablature':
        if (typeof renderData?.alphaTex === 'string' && renderData.alphaTex.trim()) {
          return '🎸 Tablatura (AlphaTex)'
        }
        return '🎸 Tablatura'
      case 'keyboard':
      case 'keyboard_grid':
        return '🎹 Teclado'
      case 'image':
        return '🖼️ Imagem'
      case 'rhythm':
        return '🥁 Padrão rítmico'
      default:
        return null
    }
  }, [blocks])

  // Contadores formatados
  const blockCountsDisplay = useMemo(() => {
    const parts: string[] = []
    const order = ['text', 'title', 'tip', 'exercise', 'chord_grid', 'chord_diagram', 'notation', 'tablature', 'keyboard', 'keyboard_grid', 'image', 'rhythm']

    for (const type of order) {
      if (blockCounts[type]) {
        const info = BLOCK_ICONS[type] || { label: '📄' }
        parts.push(`${info.label}${blockCounts[type]}`)
      }
    }

    // Adicionar outros tipos não listados
    for (const [type, count] of Object.entries(blockCounts)) {
      if (!order.includes(type)) {
        parts.push(`📄${count}`)
      }
    }

    return parts.join(' · ')
  }, [blockCounts])

  const totalBlocks = exercise.block_count || blocks.length

  const handleUseInMaterial = () => {
    // v1 simples: navegar pro editor passando os blocos no state
    navigate('/editor', { state: { insertBlocks: blocks } })
  }

  const handleEdit = () => {
    // Navegar pro editor com os blocos para editar
    navigate('/editor', {
      state: {
        insertBlocks: blocks,
        editingExerciseId: exercise.id
      }
    })
  }

  const handleDuplicate = () => {
    onDuplicate(exercise.id)
  }

  const handleDelete = () => {
    if (confirm(`Excluir "${exercise.title}"?`)) {
      onDelete(exercise.id)
    }
  }

  return (
    <div
      data-testid="exercise-card"
      className="rounded-[14px] bg-card border border-border p-4 hover:border-accent/30 transition-colors group cursor-pointer"
      onClick={() => onPreview(exercise)}
    >
      {/* Header: badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {/* Tipo: Exercício ou Exemplo */}
        <Badge
          className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            exercise.content_type === 'exercise'
              ? 'bg-green-500/15 text-green-400 border-green-500/20'
              : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
          }`}
        >
          {exercise.content_type === 'exercise' ? 'Exercício' : 'Exemplo'}
        </Badge>

        {/* Categoria */}
        <Badge
          className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            CATEGORY_COLORS[exercise.category] || CATEGORY_COLORS.other
          }`}
        >
          {CATEGORY_LABELS[exercise.category] || exercise.category}
        </Badge>

        {/* Nível */}
        <Badge
          className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            LEVEL_COLORS[exercise.difficulty_level] || LEVEL_COLORS.foundation
          }`}
        >
          {LEVEL_LABELS[exercise.difficulty_level] || exercise.difficulty_level}
        </Badge>

        {/* Template LA */}
        {exercise.is_template && (
          <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/20 flex items-center gap-1">
            <Star size={10} weight="fill" />
            Template LA
          </Badge>
        )}
      </div>

      {/* Preview */}
      <div className="h-[60px] mb-3 rounded-lg bg-background/50 border border-border/50 flex items-center justify-center px-3 overflow-hidden">
        {previewContent ? (
          <p className="text-[12px] text-text2 text-center line-clamp-2">{previewContent}</p>
        ) : (
          <p className="text-[11px] text-text3 italic">Sem preview</p>
        )}
      </div>

      {/* Título */}
      <h3 className="font-semibold text-[14px] text-text mb-2 line-clamp-1" title={exercise.title}>
        {exercise.title}
      </h3>

      {/* Contadores */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-text3">
          {blockCountsDisplay || `${totalBlocks} bloco${totalBlocks !== 1 ? 's' : ''}`}
        </span>
        <span className="text-[10px] text-text3 uppercase">
          {exercise.instrument === 'universal' ? 'Universal' : exercise.instrument}
        </span>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          onClick={(e) => {
            e.stopPropagation()
            handleUseInMaterial()
          }}
          title="Usar no Material"
        >
          <ArrowSquareOut size={14} />
          Usar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          onClick={(e) => {
            e.stopPropagation()
            handleEdit()
          }}
          title="Editar"
        >
          <PencilSimple size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          onClick={(e) => {
            e.stopPropagation()
            handleDuplicate()
          }}
          title="Duplicar"
        >
          <Copy size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1 hover:text-red-400 hover:bg-red-500/10"
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          title="Excluir"
        >
          <Trash size={14} />
        </Button>
      </div>
    </div>
  )
}
