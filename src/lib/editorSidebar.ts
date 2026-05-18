export interface SidebarBlockSummary {
  id: string
  block_type: string
  title?: string | null
  content?: Record<string, unknown> | null
  render_data?: Record<string, unknown> | null
}

export interface SidebarBlockMeta {
  orderLabel: string
  pageLabel: string
}

export interface SidebarPageGroup<TBlock extends SidebarBlockSummary = SidebarBlockSummary> {
  pageIndex: number
  label: string
  isCover: boolean
  blocks: TBlock[]
}

export interface SidebarPagePreviewItem {
  pageIndex: number
  label: string
  isCover: boolean
  blocks: Array<{
    id: string
    type: string
    title: string
    previewText: string
  }>
}

export interface SidebarSortableBlock {
  id: string
  sort_order: number
}

export function getSidebarBlockTitle(block: SidebarBlockSummary, typeLabel: string) {
  const title = block.title?.trim()
  if (title) return title
  if (block.block_type === 'page_break') return typeLabel
  return '(sem titulo)'
}

export function reorderSidebarBlocks<TBlock extends SidebarSortableBlock>(
  blocks: TBlock[],
  activeId: string,
  overId: string,
): { changed: boolean; blocks: TBlock[] } {
  if (activeId === overId) return { changed: false, blocks }

  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order)
  const activeIndex = sortedBlocks.findIndex(block => block.id === activeId)
  const overIndex = sortedBlocks.findIndex(block => block.id === overId)

  if (activeIndex < 0 || overIndex < 0) return { changed: false, blocks }

  const reorderedBlocks = [...sortedBlocks]
  const [activeBlock] = reorderedBlocks.splice(activeIndex, 1)
  reorderedBlocks.splice(overIndex, 0, activeBlock)

  const normalizedBlocks = reorderedBlocks.map((block, index) => ({
    ...block,
    sort_order: index + 1,
  }))
  const changed = normalizedBlocks.some((block, index) => (
    block.id !== sortedBlocks[index]?.id || block.sort_order !== sortedBlocks[index]?.sort_order
  ))

  return { changed, blocks: changed ? normalizedBlocks : blocks }
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

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getRecordValue(record: Record<string, unknown> | null | undefined, key: string) {
  if (!record) return ''
  return getStringValue(record[key])
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function normalizePreviewText(value: string) {
  return decodeBasicEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstPreviewText(...values: string[]) {
  for (const value of values) {
    const text = normalizePreviewText(value)
    if (text) return text
  }
  return ''
}

function getBlockPreviewTitle(block: SidebarBlockSummary) {
  return firstPreviewText(
    block.title ?? '',
    getRecordValue(block.content, 'title'),
    getRecordValue(block.content, 'heading'),
    getRecordValue(block.content, 'title_html'),
    getRecordValue(block.render_data, 'title'),
    getRecordValue(block.render_data, 'titulo'),
    block.block_type,
  )
}

function getBlockPreviewText(block: SidebarBlockSummary) {
  const title = getBlockPreviewTitle(block)
  const text = firstPreviewText(
    getRecordValue(block.content, 'subtitle'),
    getRecordValue(block.content, 'subtitle_html'),
    getRecordValue(block.content, 'html'),
    getRecordValue(block.content, 'text'),
    getRecordValue(block.content, 'description'),
    getRecordValue(block.content, 'body'),
    getRecordValue(block.render_data, 'subtitle'),
    getRecordValue(block.render_data, 'description'),
  )

  if (!text || text === title) return ''
  return text
}

export function buildSidebarPageGroups<TBlock extends SidebarBlockSummary>(
  pages: TBlock[][],
  options: {
    getSourceBlockId?: (block: TBlock) => string
  } = {},
) {
  return pages.map<SidebarPageGroup<TBlock>>((pageBlocks, pageIndex) => {
    const seenSourceIds = new Set<string>()
    const blocks: TBlock[] = []

    for (const block of pageBlocks) {
      if (block.block_type === 'page_break') continue

      const sourceBlockId = options.getSourceBlockId?.(block) ?? block.id
      if (seenSourceIds.has(sourceBlockId)) continue

      seenSourceIds.add(sourceBlockId)
      blocks.push(block)
    }

    const isCover = pageIndex === 0 && blocks.some(block => block.block_type === 'cover')

    return {
      pageIndex,
      label: isCover ? 'Capa' : `Página ${pageIndex + 1}`,
      isCover,
      blocks,
    }
  })
}

export function buildSidebarPagePreviewItems<TBlock extends SidebarBlockSummary>(
  groups: SidebarPageGroup<TBlock>[],
): SidebarPagePreviewItem[] {
  return groups.map(group => ({
    pageIndex: group.pageIndex,
    label: group.label,
    isCover: group.isCover,
    blocks: group.blocks.map(block => ({
      id: block.id,
      type: block.block_type,
      title: getBlockPreviewTitle(block),
      previewText: getBlockPreviewText(block),
    })),
  }))
}
