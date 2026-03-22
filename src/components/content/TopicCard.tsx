import { Badge } from '@/components/ui/badge'
import { FileText, BookOpen, Warning } from '@phosphor-icons/react'
import { StatusBadge } from './StatusBadge'
import type { ContentTopicWithCuration } from '@/services/contentService'

const dimensionLabels: Record<string, string> = {
  theory: 'Teoria',
  technique: 'Tecnica',
  rhythm: 'Ritmo',
  repertoire: 'Repertorio',
  auditory: 'Auditivo',
  evaluation: 'Avaliacao',
}

const levelLabels: Record<string, string> = {
  foundation: 'Foundation',
  grow: 'Grow',
  advance: 'Advance',
  master: 'Master',
}

interface TopicCardProps {
  topic: ContentTopicWithCuration
  onClick: () => void
}

export function TopicCard({ topic, onClick }: TopicCardProps) {
  // block_count and curation_status may not exist in schema - use optional chaining
  const blockCount = (topic as any).block_count || 0
  const curationStatus = (topic as any).curation_status || 'draft'

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border border-border hover:border-accent/30
                 hover:shadow-md transition-all cursor-pointer bg-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-text1 truncate">
            {topic.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {topic.instrument && (
              <Badge variant="outline" className="text-[9px]">
                {topic.instrument}
              </Badge>
            )}
            {topic.dimension && (
              <Badge variant="outline" className="text-[9px]">
                {dimensionLabels[topic.dimension] || topic.dimension}
              </Badge>
            )}
            {topic.difficulty_level && (
              <Badge variant="outline" className="text-[9px]">
                {levelLabels[topic.difficulty_level] || topic.difficulty_level}
              </Badge>
            )}
          </div>
        </div>
        <StatusBadge status={curationStatus} />
      </div>

      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-text3">
        <span className="flex items-center gap-1">
          <FileText size={12} />
          {blockCount} {blockCount === 1 ? 'bloco' : 'blocos'}
        </span>
        {topic.source_document && (
          <span className="flex items-center gap-1 truncate max-w-[180px]">
            <BookOpen size={12} />
            {topic.source_document}
          </span>
        )}
        {blockCount === 0 && (
          <span className="flex items-center gap-1 text-amber-500">
            <Warning size={12} weight="fill" />
            Sem conteudo
          </span>
        )}
      </div>
    </div>
  )
}
