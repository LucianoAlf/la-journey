import { Label } from '@/components/ui/label'
import type { SidebarPagePreviewItem } from '@/lib/editorSidebar'
import { cn } from '@/lib/utils'

interface PageMinimapProps {
  totalPages: number
  currentPage: number
  pages?: SidebarPagePreviewItem[]
  onNavigate: (pageIndex: number) => void
}

const PREVIEW_ACCENTS: Record<string, string> = {
  cover: 'border-accent bg-accent-soft/75 text-accent',
  title: 'border-foundation bg-foundation/10 text-foundation',
  text: 'border-azul-claro bg-azul-soft/65 text-text',
  tip: 'border-dourado bg-dourado/10 text-text',
  exercise: 'border-advance bg-advance/10 text-text',
  notation: 'border-master bg-master/10 text-text',
  rhythm: 'border-advance bg-advance/10 text-text',
  tablature: 'border-foundation bg-foundation/10 text-text',
  chord_diagram: 'border-grow bg-grow/10 text-text',
  chord_grid: 'border-grow bg-grow/10 text-text',
  keyboard: 'border-master bg-master/10 text-text',
  keyboard_grid: 'border-master bg-master/10 text-text',
  image: 'border-accent bg-accent-soft/50 text-text',
  columns: 'border-azul bg-azul-soft/50 text-text',
  separator: 'border-border bg-bg2 text-text3',
}

export function PageMinimap({ totalPages, currentPage, pages = [], onNavigate }: PageMinimapProps) {
  const previewPages = pages.length > 0
    ? pages
    : Array.from({ length: totalPages }, (_, pageIndex) => ({
      pageIndex,
      label: pageIndex === 0 ? 'Capa' : `Página ${pageIndex + 1}`,
      isCover: pageIndex === 0,
      blocks: [],
    }))

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-2">
        <Label className="text-[10px] text-text3 uppercase tracking-wider">
          {totalPages} {totalPages === 1 ? 'página' : 'páginas'}
        </Label>

        <div className="grid grid-cols-2 gap-2">
          {previewPages.map(page => (
            <button
              key={page.pageIndex}
              onClick={() => onNavigate(page.pageIndex)}
              aria-label={`Ir para ${page.label}`}
              className={cn(
                'relative aspect-[210/297] overflow-hidden rounded-md border-2 bg-white text-left transition-all hover:shadow-md',
                currentPage === page.pageIndex
                  ? 'border-accent shadow-accent/20 shadow-md'
                  : 'border-border hover:border-accent/30',
              )}
            >
              <PageThumbnail page={page} />

              <span className={cn(
                'absolute bottom-1 right-1 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold',
                currentPage === page.pageIndex
                  ? 'bg-accent text-white'
                  : 'bg-card/90 text-text3',
              )}>
                {page.pageIndex + 1}
              </span>

              {page.isCover && (
                <span className="absolute left-1 top-1 z-10 rounded bg-roxo/80 px-1.5 py-0.5 text-[7px] font-medium uppercase text-white">
                  Capa
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PageThumbnail({ page }: { page: SidebarPagePreviewItem }) {
  const visibleBlocks = page.blocks.slice(0, 5)

  if (page.isCover) {
    const coverBlock = visibleBlocks[0]

    return (
      <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#e66b2d] via-[#f09436] to-[#43126f]">
        <div className="absolute left-2 right-2 top-7 z-10 space-y-1 text-white drop-shadow-sm">
          <div className="line-clamp-2 text-[8px] font-black uppercase leading-tight">
            {coverBlock?.title || page.label}
          </div>
          {coverBlock?.previewText && (
            <div className="line-clamp-2 text-[6px] font-semibold leading-tight text-white/85">
              {coverBlock.previewText}
            </div>
          )}
        </div>
        <div className="absolute -left-5 bottom-6 h-8 w-28 rotate-[-35deg] rounded-full bg-[#211032]" />
        <div className="absolute left-6 bottom-10 h-6 w-24 rotate-[-35deg] rounded-full bg-[#f6c32e]" />
        <div className="absolute right-[-18px] top-20 h-6 w-28 rotate-[-42deg] rounded-full bg-[#42166f]" />
        <div className="absolute bottom-3 left-3 h-2 w-14 rounded bg-white/75" />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-white">
      <div className="absolute inset-x-0 top-0 h-2 bg-foundation" />
      <div className="absolute inset-x-0 bottom-0 h-2 bg-foundation" />
      <div className="flex h-full flex-col gap-1.5 px-2 pb-4 pt-4">
        {visibleBlocks.length === 0 ? (
          <div className="mt-10 space-y-1.5">
            <div className="h-1.5 rounded bg-bg2" />
            <div className="h-1.5 w-3/4 rounded bg-bg2" />
            <div className="mt-4 h-10 rounded border border-dashed border-border bg-bg2/40" />
          </div>
        ) : (
          visibleBlocks.map((block, index) => (
            <PagePreviewBlock key={`${block.id}-${index}`} block={block} />
          ))
        )}
      </div>
    </div>
  )
}

function PagePreviewBlock({ block }: { block: SidebarPagePreviewItem['blocks'][number] }) {
  const isTitle = block.type === 'title'
  const isMusic = ['notation', 'tablature', 'chord_grid', 'keyboard_grid', 'keyboard'].includes(block.type)

  return (
    <div
      className={cn(
        'min-h-0 rounded-[4px] border-l-2 px-1.5 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        PREVIEW_ACCENTS[block.type] ?? 'border-azul-claro bg-azul-soft/50 text-text',
      )}
    >
      <div
        className={cn(
          'overflow-hidden text-[7px] font-bold leading-[1.05]',
          isTitle && 'text-[8px] uppercase',
        )}
        style={{ display: '-webkit-box', WebkitLineClamp: isTitle ? 2 : 1, WebkitBoxOrient: 'vertical' }}
      >
        {block.title}
      </div>
      {block.previewText ? (
        <div
          className="mt-0.5 overflow-hidden text-[6px] leading-[1.08] text-text2"
          style={{ display: '-webkit-box', WebkitLineClamp: isTitle ? 1 : 2, WebkitBoxOrient: 'vertical' }}
        >
          {block.previewText}
        </div>
      ) : isMusic ? (
        <div className="mt-1 flex items-center gap-0.5">
          <span className="h-1 w-4 rounded-full bg-current opacity-30" />
          <span className="h-1 w-3 rounded-full bg-current opacity-20" />
          <span className="h-1 w-5 rounded-full bg-current opacity-25" />
        </div>
      ) : null}
    </div>
  )
}
