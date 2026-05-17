import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'

interface PageMinimapProps {
  totalPages: number
  currentPage: number
  onNavigate: (pageIndex: number) => void
}

export function PageMinimap({ totalPages, currentPage, onNavigate }: PageMinimapProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-2">
        <Label className="text-[10px] text-text3 uppercase tracking-wider">
          {totalPages} {totalPages === 1 ? 'página' : 'páginas'}
        </Label>

        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`relative aspect-[210/297] rounded-md border-2 overflow-hidden
                         transition-all hover:shadow-md bg-white ${
                currentPage === i
                  ? 'border-accent shadow-accent/20 shadow-md'
                  : 'border-border hover:border-accent/30'
              }`}
            >
              {/* Número da página */}
              <span className={`absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 
                               rounded z-10 ${
                currentPage === i
                  ? 'bg-accent text-white'
                  : 'bg-card/90 text-text3'
              }`}>
                {i + 1}
              </span>

              {/* Badge capa */}
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[7px] bg-roxo/80 text-white 
                                 px-1.5 py-0.5 rounded font-medium uppercase z-10">
                  Capa
                </span>
              )}

              {/* Mini preview — escala reduzida do conteúdo real */}
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
    // Capturar conteúdo da .a4-page correspondente com debounce
    const timer = setTimeout(() => {
      const pages = document.querySelectorAll('.a4-page')
      const page = pages[pageIndex] as HTMLElement
      if (page) setHtml(page.innerHTML)
    }, 500)
    return () => clearTimeout(timer)
  }, [pageIndex])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
