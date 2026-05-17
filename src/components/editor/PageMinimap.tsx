import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'

interface PageMinimapProps {
  totalPages: number
  currentPage: number
  pageBlockCounts?: number[]
  onNavigate: (pageIndex: number) => void
}

export function PageMinimap({ totalPages, currentPage, pageBlockCounts = [], onNavigate }: PageMinimapProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <Label className="text-[10px] uppercase tracking-wider text-text3">
          {totalPages} {totalPages === 1 ? 'pagina' : 'paginas'}
        </Label>
        <div className="mt-1 text-xs font-semibold text-text">
          Atual: pagina {Math.min(currentPage + 1, Math.max(totalPages, 1))}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              aria-current={currentPage === i ? 'page' : undefined}
              className={`group relative aspect-[210/297] overflow-hidden rounded-md border-2 bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                currentPage === i
                  ? 'border-accent shadow-accent/20 shadow-md ring-2 ring-accent/10'
                  : 'border-border hover:border-accent/30'
              }`}
            >
              <span className={`absolute bottom-1 right-1 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                currentPage === i
                  ? 'bg-accent text-white'
                  : 'bg-card/90 text-text3'
              }`}>
                {i + 1}
              </span>

              <span className="absolute bottom-1 left-1 z-10 rounded bg-card/90 px-1.5 py-0.5 text-[8px] font-semibold text-text3">
                {pageBlockCounts[i] ?? 0} bl.
              </span>

              {i === 0 && (
                <span className="absolute left-1 top-1 z-10 rounded bg-roxo/80 px-1.5 py-0.5 text-[7px] font-medium uppercase text-white">
                  Capa
                </span>
              )}

              <PageThumbnail pageIndex={i} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PageThumbnail({ pageIndex }: { pageIndex: number }) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      const pages = document.querySelectorAll('.a4-page')
      const page = pages[pageIndex] as HTMLElement
      if (page) setHtml(page.innerHTML)
    }, 500)
    return () => clearTimeout(timer)
  }, [pageIndex])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        style={{
          transform: 'scale(0.13)',
          transformOrigin: 'top left',
          width: '794px',
          height: '1123px',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
