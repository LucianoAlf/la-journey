import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Rascunho',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
  review: {
    label: 'Em Revisao',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  approved: {
    label: 'Aprovado',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  published: {
    label: 'Publicado',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
}

interface StatusBadgeProps {
  status: string | null | undefined
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = statusConfig[status || 'draft'] || statusConfig.draft
  return (
    <Badge variant="outline" className={`text-[9px] ${c.className}`}>
      {c.label}
    </Badge>
  )
}
