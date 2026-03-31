import { BookOpen, ClipboardText, Eye, MusicNotes, Plus } from '@phosphor-icons/react'
import type { MaterialTemplateListItem } from '@/services/materialService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TemplateCardProps {
  template: MaterialTemplateListItem
  onPreview: (template: MaterialTemplateListItem) => void
  onUse: (template: MaterialTemplateListItem) => void
}

const LEVEL_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  grow: 'Grow',
  advance: 'Advance',
  master: 'Master',
}

export function TemplateCard({ template, onPreview, onUse }: TemplateCardProps) {
  return (
    <div className="rounded-[14px] bg-card border border-border p-4 hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-[15px] text-text line-clamp-2 flex items-center gap-2">
            <ClipboardText size={16} className="text-accent shrink-0" />
            <span>{template.title}</span>
          </h3>
          <p className="text-[11px] text-text3 mt-1">Template completo do banco para clonar no Editor.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/20">
          {template.template_instrument || 'Universal'}
        </Badge>
        <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/20">
          {template.template_level ? (LEVEL_LABELS[template.template_level] || template.template_level) : 'Sem nível'}
        </Badge>
        <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
          Template LA Journey
        </Badge>
      </div>

      <div className="min-h-[72px] rounded-lg bg-background/50 border border-border/50 px-3 py-2 mb-3">
        <p className="text-[12px] text-text2 line-clamp-3">
          {template.template_description?.trim() || 'Sem descrição cadastrada.'}
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] text-text3 flex items-center gap-1.5">
          <MusicNotes size={12} />
          {template.block_count} bloco{template.block_count !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-text3 flex items-center gap-1.5">
          <BookOpen size={12} />
          {template.type || 'full_module'}
        </span>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onPreview(template)}>
          <Eye size={14} />
          Visualizar
        </Button>
        <Button size="sm" className="flex-1" onClick={() => onUse(template)}>
          <Plus size={14} />
          Usar como Base
        </Button>
      </div>
    </div>
  )
}
