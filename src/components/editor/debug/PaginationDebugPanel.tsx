import { CheckCircle, Gauge, Warning, X } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export type PaginationBreakReason = 'overflow' | 'manual' | 'cover' | 'estimativa' | 'fim'

export interface PaginationDebugBlock {
  id: string
  type: string
  title: string
  estimatedHeight: number
  measuredHeight: number | null
  heightSource: 'estimated' | 'calibrated' | 'measured'
  usedHeight: number
}

export interface PaginationDebugPage {
  pageNumber: number
  totalHeight: number
  usedHeight: number
  freeHeight: number
  freePercent: number
  breakReason: PaginationBreakReason
  breakDetail: string
  blocks: PaginationDebugBlock[]
}

interface PaginationDebugPanelProps {
  open: boolean
  pages: PaginationDebugPage[]
  onOpenChange: (open: boolean) => void
}

const reasonLabels: Record<PaginationBreakReason, string> = {
  overflow: 'Overflow',
  manual: 'Manual',
  cover: 'Capa',
  estimativa: 'Estimativa',
  fim: 'Fim',
}

const reasonClasses: Record<PaginationBreakReason, string> = {
  overflow: 'bg-dourado/10 text-dourado border-dourado/20',
  manual: 'bg-azul/10 text-azul border-azul/20',
  cover: 'bg-accent/10 text-accent border-accent/20',
  estimativa: 'bg-vermelho/10 text-vermelho border-vermelho/20',
  fim: 'bg-verde/10 text-verde border-verde/20',
}

function formatHeight(value: number) {
  return `${Math.round(value)}px`
}

function isActionableUnderfilledPage(page: PaginationDebugPage) {
  return page.freePercent > 30 && !['manual', 'cover', 'fim'].includes(page.breakReason)
}

export function PaginationDebugPanel({ open, pages, onOpenChange }: PaginationDebugPanelProps) {
  if (!open) return null

  const underfilledPages = pages.filter(page => page.freePercent > 30)
  const actionableUnderfilledPages = pages.filter(isActionableUnderfilledPage)

  return (
    <div className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="absolute right-4 top-4 bottom-4 w-[min(720px,calc(100vw-32px))] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Gauge size={18} className="text-accent" />
              <h2 className="text-sm font-semibold text-text">Mapa de Paginação</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-text3">
              {pages.length} páginas · {actionableUnderfilledPages.length} problemas de paginação · {underfilledPages.length} páginas com mais de 30% livre no total
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onOpenChange(false)} aria-label="Fechar mapa">
            <X size={16} />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100%-64px)]">
          <div className="space-y-3 p-4">
            {pages.map(page => {
              const isUnderfilled = page.freePercent > 30
              const isActionableUnderfilled = isActionableUnderfilledPage(page)
              return (
                <section
                  key={page.pageNumber}
                  className={`rounded-lg border bg-bg p-3 ${isActionableUnderfilled ? 'border-dourado/40' : 'border-border'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {isActionableUnderfilled ? (
                          <Warning size={15} className="text-dourado" />
                        ) : (
                          <CheckCircle size={15} className="text-verde" />
                        )}
                        <h3 className="text-sm font-semibold text-text">Página {page.pageNumber}</h3>
                      </div>
                      <p className="mt-1 text-[11px] text-text3">
                        Útil {formatHeight(page.totalHeight)} · usado {formatHeight(page.usedHeight)} · livre {formatHeight(page.freeHeight)} ({page.freePercent.toFixed(1)}%)
                      </p>
                    </div>
                    <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${reasonClasses[page.breakReason]}`}>
                      {reasonLabels[page.breakReason]}
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg2">
                    <div
                      className={isActionableUnderfilled ? 'h-full bg-dourado' : 'h-full bg-verde'}
                      style={{ width: `${Math.min(100, Math.max(0, (page.usedHeight / page.totalHeight) * 100))}%` }}
                    />
                  </div>

                  <p className="mt-2 text-[11px] text-text3">{page.breakDetail}</p>

                  <div className="mt-3 overflow-hidden rounded-md border border-border">
                    <table className="w-full border-collapse text-left text-[11px]">
                      <thead className="bg-bg2 text-[10px] uppercase tracking-wide text-text3">
                        <tr>
                          <th className="px-2 py-1.5 font-medium">Bloco</th>
                          <th className="px-2 py-1.5 font-medium">Tipo</th>
                          <th className="px-2 py-1.5 text-right font-medium">Estim.</th>
                          <th className="px-2 py-1.5 text-right font-medium">Real</th>
                          <th className="px-2 py-1.5 font-medium">Fonte</th>
                          <th className="px-2 py-1.5 text-right font-medium">Usada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {page.blocks.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-2 py-3 text-center text-text3">Página vazia</td>
                          </tr>
                        ) : page.blocks.map(block => (
                          <tr key={block.id} className="border-t border-border/70">
                            <td className="max-w-[230px] truncate px-2 py-1.5 text-text" title={block.title}>{block.title}</td>
                            <td className="px-2 py-1.5 font-mono text-[10px] text-text3">{block.type}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-text3">{formatHeight(block.estimatedHeight)}</td>
                            <td className="px-2 py-1.5 text-right font-mono">
                              {block.measuredHeight == null ? (
                                <span className="text-dourado">não medida</span>
                              ) : (
                                <span className="text-text">{formatHeight(block.measuredHeight)}</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className={
                                block.heightSource === 'measured'
                                  ? 'text-verde'
                                  : block.heightSource === 'calibrated'
                                    ? 'text-azul'
                                    : 'text-dourado'
                              }>
                                {block.heightSource === 'measured' ? 'medida' : block.heightSource === 'calibrated' ? 'calibrada' : 'estimada'}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono text-text">{formatHeight(block.usedHeight)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
