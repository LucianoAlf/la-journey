import { Books, Copy, MusicNotes, PencilSimple, Trash } from '@phosphor-icons/react'
import type { RepertoireCollection } from '@/services/repertoireCollectionService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface NotebookCardProps {
  notebook: RepertoireCollection & { songCount: number }
  onOpen: (notebook: RepertoireCollection) => void
  onEdit: (notebook: RepertoireCollection) => void
  onDelete: (notebook: RepertoireCollection) => void
}

const LEVEL_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  grow: 'Grow',
  advance: 'Advance',
  master: 'Master',
}

export function NotebookCard({ notebook, onOpen, onEdit, onDelete }: NotebookCardProps) {
  return (
    <div
      className="rounded-[14px] bg-card border border-border p-4 hover:border-accent/30 transition-colors group cursor-pointer"
      onClick={() => onOpen(notebook)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-[15px] text-text line-clamp-2 flex items-center gap-2">
            <Books size={16} className="text-accent shrink-0" />
            <span>{notebook.name}</span>
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/20">
          {notebook.instrument}
        </Badge>
        <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/20">
          {LEVEL_LABELS[notebook.difficulty_level] || notebook.difficulty_level}
        </Badge>
        {notebook.is_template && (
          <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
            Template LA
          </Badge>
        )}
      </div>

      <div className="min-h-[64px] rounded-lg bg-background/50 border border-border/50 px-3 py-2 mb-3">
        <p className="text-[12px] text-text2 line-clamp-3">
          {notebook.description?.trim() || 'Sem descrição cadastrada.'}
        </p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-text3 flex items-center gap-1.5">
          <MusicNotes size={12} />
          {notebook.songCount} música{notebook.songCount !== 1 ? 's' : ''}
          {notebook.genre ? ` · ${notebook.genre}` : ''}
        </span>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(notebook)
          }}
        >
          Abrir
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(notebook)
          }}
          title="Editar"
        >
          <PencilSimple size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          disabled
          title="Duplicar será implementado em próxima fase"
          onClick={(e) => e.stopPropagation()}
        >
          <Copy size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1 hover:text-red-400 hover:bg-red-500/10"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notebook)
          }}
          title="Excluir"
        >
          <Trash size={14} />
        </Button>
      </div>
    </div>
  )
}
