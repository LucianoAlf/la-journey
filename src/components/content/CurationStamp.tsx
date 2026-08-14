const CURATION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Sem curadoria', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  review: { label: 'Em revisão', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  approved: { label: 'Curada', color: 'text-green-400', bg: 'bg-green-500/15' },
  published: { label: 'Publicada', color: 'text-[#FF2D78]', bg: 'bg-[#FF2D78]/15' },
}

export function CurationStamp({
  status,
  curatorName,
}: {
  status?: string | null
  curatorName?: string | null
}) {
  const key = status && CURATION_CONFIG[status] ? status : 'draft'
  const config = CURATION_CONFIG[key]
  const curated = key === 'approved' || key === 'published'

  return (
    <div className="min-w-0">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.5px] ${config.bg} ${config.color}`}>
        {config.label}
      </span>
      {curated && curatorName ? (
        <div className="mt-0.5 text-[10px] text-text3 truncate">{curatorName}</div>
      ) : null}
    </div>
  )
}
