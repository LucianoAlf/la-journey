export interface TablatureProps {
  /** Tablatura no formato texto (6 linhas = 6 cordas) */
  tab: string
  /** Título opcional */
  title?: string
}

export function Tablature({ tab, title }: TablatureProps) {
  return (
    <div className="bg-bg2 rounded-[var(--radius-sm)] p-4 border border-border overflow-x-auto">
      {title && (
        <div className="text-[12px] font-bold text-text mb-2">{title}</div>
      )}
      <pre className="font-mono text-[12px] leading-[1.6] text-text2 whitespace-pre">
        {tab}
      </pre>
    </div>
  )
}
