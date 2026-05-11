import type { MaterialBlock } from '@/components/material/MaterialPreview'
import type { MaterialWithBlocks } from '@/services/materialService'

export interface PrintBlock extends MaterialBlock {
  id: string
  sort_order: number
  is_edited?: boolean
  original_content?: Record<string, unknown> | null
}

export interface PrintMaterial {
  id: string
  title: string
  schoolName: string | null
  pageConfig: Record<string, unknown>
}

type PaginationBehavior = 'unbreakable' | 'breakable'

interface BlockPaginationPolicy {
  behavior: PaginationBehavior
  keepWithNext: boolean
  startOnNewPage: boolean
  allowSplit: boolean
}

const A4_CONTENT_HEIGHT = 1029
const ESTIMATED_BLOCK_HEIGHT_FACTOR = 1.15
const TEXT_FRAGMENT_TARGET_HEIGHT_RATIO = 0.54
const PAGINATION_FRAGMENT_ID_SEPARATOR = '__pagination_fragment_'

const BREAKABLE_TEXT_BLOCK_TYPES = new Set(['text', 'tip', 'exercise'])

interface PaginationFragmentData {
  source_block_id: string
  index: number
  total: number
}

export function parsePrintMaterialRows(rows: MaterialWithBlocks[]): {
  material: PrintMaterial | null
  blocks: PrintBlock[]
} {
  const first = rows[0]
  if (!first) return { material: null, blocks: [] }

  const blocks = rows
    .filter(row => row.block_id != null)
    .map(row => ({
      id: row.block_id!,
      block_type: (row.block_type ?? 'text') as MaterialBlock['block_type'],
      title: row.block_title ?? undefined,
      content: row.block_content as MaterialBlock['content'],
      render_data: row.block_render_data,
      sort_order: row.block_sort_order ?? 0,
      is_edited: row.block_is_edited ?? false,
      original_content: row.block_original_content,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)

  return {
    material: {
      id: first.material_id,
      title: first.material_title,
      schoolName: first.school_name,
      pageConfig: first.page_config ?? {},
    },
    blocks,
  }
}

function stripHtmlTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function splitHtmlIntoTopLevelSegments(html: string) {
  const matches = html.match(/<(p|h[1-6]|ul|ol|blockquote|table|pre)[\s\S]*?<\/\1>/gi)
  if (matches && matches.length > 1) return matches
  return html
    .split(/(?=<p\b|<h[1-6]\b|<ul\b|<ol\b|<blockquote\b|<table\b|<pre\b)/i)
    .map(segment => segment.trim())
    .filter(Boolean)
}

function splitTextIntoSegments(text: string) {
  return text
    .split(/\n{2,}/)
    .map(segment => segment.trim())
    .filter(Boolean)
    .map(segment => `<p>${segment.replace(/\n/g, '<br />')}</p>`)
}

function estimateTextFragmentHeight(block: PrintBlock, segments: string[], includeTitle: boolean) {
  const textLength = stripHtmlTags(segments.join(' ')).length
  const lineCount = Math.max(1, Math.ceil(textLength / 95))
  const titleHeight = includeTitle && block.title ? 28 : 0
  const shellHeight = block.block_type === 'exercise' ? 72 : block.block_type === 'tip' ? 56 : 20
  return titleHeight + shellHeight + lineCount * 22
}

function getBlockPaginationPolicy(block: PrintBlock): BlockPaginationPolicy {
  const rawPolicy = (block.render_data?.pagination ?? {}) as Partial<BlockPaginationPolicy>
  const defaultBehavior: PaginationBehavior = ['text', 'tip', 'exercise', 'columns'].includes(block.block_type)
    ? 'breakable'
    : 'unbreakable'

  return {
    behavior: rawPolicy.behavior ?? defaultBehavior,
    keepWithNext: rawPolicy.keepWithNext ?? block.block_type === 'title',
    startOnNewPage: rawPolicy.startOnNewPage ?? false,
    allowSplit: rawPolicy.allowSplit ?? ['text', 'tip', 'exercise', 'columns'].includes(block.block_type),
  }
}

function canSplitBlockForPagination(block: PrintBlock, policy: BlockPaginationPolicy) {
  if (!BREAKABLE_TEXT_BLOCK_TYPES.has(block.block_type)) return false
  if (!policy.allowSplit || policy.behavior !== 'breakable') return false
  const renderData = block.render_data ?? {}
  return !(
    renderData.notation ||
    renderData.notation_data ||
    renderData.notes ||
    renderData.tab ||
    renderData.alphaTex
  )
}

function createPaginationFragments(block: PrintBlock): PrintBlock[] {
  const policy = getBlockPaginationPolicy(block)
  if (!canSplitBlockForPagination(block, policy)) return [block]

  const content = block.content ?? {}
  const html = typeof content.html === 'string' ? content.html.trim() : ''
  const text = typeof content.text === 'string' ? content.text.trim() : ''
  const segments = html ? splitHtmlIntoTopLevelSegments(html) : splitTextIntoSegments(text)
  if (segments.length <= 1) return [block]

  const estimatedHeight = getEstimatedBlockHeight(block)
  const targetHeight = Math.round(A4_CONTENT_HEIGHT * TEXT_FRAGMENT_TARGET_HEIGHT_RATIO)
  if (estimatedHeight <= targetHeight) return [block]

  const chunks: string[][] = []
  let current: string[] = []

  for (const segment of segments) {
    const candidate = [...current, segment]
    const includeTitle = chunks.length === 0
    if (
      current.length > 0 &&
      estimateTextFragmentHeight(block, candidate, includeTitle) > targetHeight
    ) {
      chunks.push(current)
      current = [segment]
    } else {
      current = candidate
    }
  }
  if (current.length > 0) chunks.push(current)

  if (chunks.length <= 1) return [block]

  return chunks.map((chunk, index) => ({
    ...block,
    id: `${block.id}${PAGINATION_FRAGMENT_ID_SEPARATOR}${index}`,
    title: index === 0 ? block.title : undefined,
    content: {
      ...(block.content ?? {}),
      html: chunk.join(''),
      text: stripHtmlTags(chunk.join(' ')),
    },
    render_data: {
      ...(block.render_data ?? {}),
      pagination_fragment: {
        source_block_id: block.id,
        index,
        total: chunks.length,
      } satisfies PaginationFragmentData,
    },
  }))
}

function estimateBlockHeight(block: PrintBlock): number {
  const content = block.content ?? {}
  const renderData = block.render_data ?? {}
  const text = [
    typeof content.text === 'string' ? content.text : '',
    typeof content.html === 'string' ? content.html : '',
    typeof content.title_html === 'string' ? content.title_html : '',
  ].join(' ')
  const textLines = Math.max(1, Math.ceil(text.replace(/<[^>]+>/g, ' ').length / 95))

  switch (block.block_type) {
    case 'cover':
      return A4_CONTENT_HEIGHT
    case 'title':
      return 56
    case 'text':
      return Math.max(90, Math.min(420, 42 + textLines * 22))
    case 'tip':
      return Math.max(86, Math.min(240, 54 + textLines * 18))
    case 'exercise':
      return Math.max(130, Math.min(360, 80 + textLines * 20))
    case 'notation':
    case 'rhythm':
    case 'tablature':
      return 200
    case 'keyboard':
      return Array.isArray(renderData.chords) && renderData.chords.length > 0 ? 260 : 160
    case 'keyboard_grid': {
      const count = Array.isArray(renderData.keyboards) ? renderData.keyboards.length : 1
      const columns = Math.max(1, Math.min(Number(renderData.columns ?? 3), 4))
      return 52 + Math.ceil(count / columns) * 150
    }
    case 'chord_grid': {
      const count = Array.isArray(renderData.chords) ? renderData.chords.length : 1
      const columns = Math.max(1, Math.min(Number(renderData.columns ?? 3), 4))
      return 56 + Math.ceil(count / columns) * 190
    }
    case 'chord_diagram':
      return 220
    case 'image':
      return 280
    case 'audio':
    case 'video':
      return 150
    case 'columns':
      return 220
    case 'separator':
      return 28
    default:
      return 120
  }
}

function getEstimatedBlockHeight(block: PrintBlock): number {
  const estimated = estimateBlockHeight(block)
  const style = block.render_data?.style as { margin?: { top?: number; bottom?: number } } | undefined
  const verticalMargin = Number(style?.margin?.top ?? 0) + Number(style?.margin?.bottom ?? 0)
  if (block.block_type === 'cover') return estimated + verticalMargin
  return Math.round(estimated * ESTIMATED_BLOCK_HEIGHT_FACTOR) + verticalMargin
}

function shouldKeepBlocksTogether(current: PrintBlock, next: PrintBlock | undefined) {
  if (!next || next.block_type === 'page_break' || next.block_type === 'cover') return false
  const policy = getBlockPaginationPolicy(current)
  if (policy.keepWithNext) return true
  return current.block_type === 'exercise' &&
    ['notation', 'rhythm', 'tablature', 'keyboard', 'keyboard_grid', 'chord_grid'].includes(next.block_type)
}

export function paginatePrintBlocks(blocks: PrintBlock[]) {
  const pages: PrintBlock[][] = [[]]
  let currentHeight = 0

  const pushPage = () => {
    pages.push([])
    currentHeight = 0
  }

  const paginationBlocks = blocks.flatMap(createPaginationFragments)

  for (let index = 0; index < paginationBlocks.length; index += 1) {
    const block = paginationBlocks[index]

    if (block.block_type === 'page_break') {
      if (pages[pages.length - 1].length > 0) pushPage()
      continue
    }

    const policy = getBlockPaginationPolicy(block)
    const groupBlocks = [block]
    let groupHeight = getEstimatedBlockHeight(block)
    const next = paginationBlocks[index + 1]

    if (shouldKeepBlocksTogether(block, next) && next) {
      const nextHeight = getEstimatedBlockHeight(next)
      if (groupHeight + nextHeight <= A4_CONTENT_HEIGHT) {
        groupBlocks.push(next)
        groupHeight += nextHeight
        index += 1
      }
    }

    if (block.block_type === 'cover') {
      if (pages[pages.length - 1].length > 0) pushPage()
      pages[pages.length - 1].push(block)
      pushPage()
      continue
    }

    if (policy.startOnNewPage && pages[pages.length - 1].length > 0) {
      pushPage()
    }

    if (currentHeight + groupHeight > A4_CONTENT_HEIGHT && pages[pages.length - 1].length > 0) {
      pushPage()
    }

    pages[pages.length - 1].push(...groupBlocks)
    currentHeight += groupHeight
  }

  return pages.filter((page, index) => page.length > 0 || index === 0)
}
