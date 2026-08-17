import { forwardRef, type ReactNode } from 'react'
import { StudyTitleField } from '@/components/estudo/StudyTitleField'

export const StudySheetFrame = forwardRef<HTMLDivElement, {
  schoolName: string
  logoUrl: string | null
  title: string
  curatorName: string | null
  onTitleCommit: (next: string) => void
  children: ReactNode
}>(function StudySheetFrame({
  schoolName,
  logoUrl,
  title,
  curatorName,
  onTitleCommit,
  children,
}, ref) {
  return (
    <div ref={ref} className="estudo-sheet relative rounded-[var(--radius)] border border-border bg-surface p-4">
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          className="pointer-events-none absolute inset-0 m-auto h-[55%] w-auto opacity-10 print:opacity-[0.06]"
        />
      )}
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-[8rem] items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName} className="h-10 w-auto object-contain" />
          ) : (
            <div className="text-[12px] font-semibold text-text2">{schoolName}</div>
          )}
        </div>
        <StudyTitleField
          value={title}
          onCommit={onTitleCommit}
          className="min-w-[12rem] flex-1 bg-transparent text-center font-serif text-[22px] text-text outline-none"
        />
        <div className="min-w-[8rem] text-right text-[12px] text-text2">{curatorName ?? ''}</div>
      </div>
      <div className="relative">{children}</div>
      <div className="relative mt-4 flex items-center justify-between text-[11px] text-text3">
        <span className="font-serif text-[16px] text-accent">Alf</span>
        <a href="https://alphatab.net/" rel="noopener noreferrer" target="_blank">
          Pauta: alphaTab
        </a>
      </div>
    </div>
  )
})
