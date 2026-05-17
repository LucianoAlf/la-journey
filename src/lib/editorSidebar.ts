export interface SidebarBlockSummary {
  id: string
  block_type: string
  title?: string | null
}

export interface SidebarBlockMeta {
  orderLabel: string
  pageLabel: string
}

export function getSidebarBlockTitle(block: SidebarBlockSummary, typeLabel: string) {
  const title = block.title?.trim()
  if (title) return title
  if (block.block_type === 'page_break') return typeLabel
  return '(sem titulo)'
}

export function buildBlockSidebarMeta(
  blocks: SidebarBlockSummary[],
  pageIndexByBlockId: Record<string, number>,
) {
  const width = Math.max(2, String(blocks.length).length)

  return blocks.reduce<Record<string, SidebarBlockMeta>>((acc, block, index) => {
    const pageIndex = pageIndexByBlockId[block.id]
    acc[block.id] = {
      orderLabel: String(index + 1).padStart(width, '0'),
      pageLabel: typeof pageIndex === 'number' ? `Pag. ${pageIndex + 1}` : 'Sem pag.',
    }
    return acc
  }, {})
}

export function countSidebarBlocksByPage(
  blocks: SidebarBlockSummary[],
  pageIndexByBlockId: Record<string, number>,
) {
  const counts: number[] = []
  let maxPageIndex = -1

  for (const block of blocks) {
    if (block.block_type === 'page_break') continue

    const pageIndex = pageIndexByBlockId[block.id]
    if (typeof pageIndex !== 'number' || pageIndex < 0) continue
    maxPageIndex = Math.max(maxPageIndex, pageIndex)
    counts[pageIndex] = (counts[pageIndex] ?? 0) + 1
  }

  return Array.from({ length: maxPageIndex + 1 }, (_, index) => counts[index] ?? 0)
}
