import { pageSize, type PageOrientation } from './a4Preview'

export type PaginationBehavior = 'unbreakable' | 'breakable'
export type PaginationBreakReason = 'overflow' | 'manual' | 'cover' | 'estimativa' | 'fim'

export interface SharedPaginationBlock {
  id: string
  block_type: string
  title?: string | null
  content?: { text?: string; [key: string]: any } | null
  render_data?: any
}

export interface BlockPaginationPolicy {
  behavior: PaginationBehavior
  keepWithNext: boolean
  startOnNewPage: boolean
  allowSplit: boolean
  source: 'default' | 'block'
}

export interface PaginationFragmentData {
  source_block_id: string
  index: number
  total: number
}

export interface SharedPaginationResult<TBlock extends SharedPaginationBlock> {
  pages: TBlock[][]
  breakReasons: Map<number, { reason: PaginationBreakReason; detail: string }>
}

interface PaginationGroup<TBlock extends SharedPaginationBlock> {
  blocks: TBlock[]
  height: number
  policy: BlockPaginationPolicy
}

export const A4_TOTAL_HEIGHT = 1123
export const HEADER_HEIGHT = 60
export const FOOTER_HEIGHT = 72
export const CONTENT_VERTICAL_PADDING = 40
export const PRINT_SAFE_AREA = 56
export function a4ContentHeight(orientation: PageOrientation = 'portrait'): number {
  const { height } = pageSize(orientation)
  return height - HEADER_HEIGHT - FOOTER_HEIGHT - CONTENT_VERTICAL_PADDING - PRINT_SAFE_AREA
}
export const A4_CONTENT_HEIGHT = a4ContentHeight('portrait')
export const ESTIMATED_BLOCK_HEIGHT_FACTOR = 1.15
export const TEXT_FRAGMENT_TARGET_HEIGHT_RATIO = 0.22
export const PRE_LINE_HEIGHT = 22
export const PAGINATION_FRAGMENT_ID_SEPARATOR = '__pagination_fragment_'

const BREAKABLE_TEXT_BLOCK_TYPES = new Set(['text', 'tip', 'exercise'])

export const BLOCK_HEIGHT_ESTIMATES: Record<string, number> = {
  cover: A4_TOTAL_HEIGHT,
  title: 60,
  text: 200,
  exercise: 220,
  tip: 120,
  notation: 340,
  rhythm: 260,
  keyboard: 340,
  keyboard_grid: 420,
  chord_grid: 440,
  chord_diagram: 240,
  tablature: 320,
  image: 350,
  page_break: 0,
  separator: 30,
  columns: 220,
  audio: 150,
  video: 150,
  qr_code: 150,
  badge: 140,
}

export function stripHtmlTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function countPreLines(html: string) {
  const pres = html.match(/<pre\b[\s\S]*?<\/pre>/gi) ?? ([] as string[])
  return (pres as string[]).reduce((sum: number, pre: string) => {
    const inner = pre.replace(/^<pre\b[^>]*>/i, '').replace(/<\/pre>$/i, '')
    return sum + Math.max(1, inner.replace(/\r\n/g, '\n').split('\n').length)
  }, 0)
}

function explodePreSegment(segment: string) {
  const match = segment.match(/^<pre\b[^>]*>([\s\S]*)<\/pre>$/i)
  if (!match) return [segment]

  const lines = match[1].replace(/\r\n/g, '\n').split('\n')
  const stanzas: string[][] = [[]]
  for (const line of lines) {
    if (line.trim() === '' && stanzas[stanzas.length - 1].length > 0) {
      stanzas.push([])
    } else {
      stanzas[stanzas.length - 1].push(line)
    }
  }

  const maxLines = Math.max(8, Math.floor(
    (A4_CONTENT_HEIGHT * TEXT_FRAGMENT_TARGET_HEIGHT_RATIO - 48) / PRE_LINE_HEIGHT,
  ))
  const exploded: string[] = []
  for (const stanza of stanzas) {
    if (!stanza.some((line) => line.trim())) continue
    for (let index = 0; index < stanza.length; index += maxLines) {
      exploded.push(`<pre>${stanza.slice(index, index + maxLines).join('\n')}</pre>`)
    }
  }
  return exploded.length > 0 ? exploded : [segment]
}

function splitHtmlIntoTopLevelSegments(html: string) {
  const matches = html.match(/<(p|h[1-6]|ul|ol|blockquote|table|pre)[\s\S]*?<\/\1>/gi)
  if (matches && matches.length >= 1) return matches.flatMap(explodePreSegment)

  const fallbackText = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim()

  if (fallbackText.length > 320) {
    return splitTextIntoSegments(fallbackText)
  }

  return html
    .split(/(?=<p\b|<h[1-6]\b|<ul\b|<ol\b|<blockquote\b|<table\b|<pre\b)/i)
    .map(segment => segment.trim())
    .filter(Boolean)
}

function splitLongPlainTextLine(line: string) {
  const trimmed = line.trim()
  if (trimmed.length <= 360) return [trimmed]

  const chunks: string[] = []
  let current = ''
  for (const part of trimmed.split(/(?<=[,.;:])\s+|\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç])/g)) {
    const candidate = current ? `${current} ${part}` : part
    if (candidate.length > 300 && current) {
      chunks.push(current)
      current = part
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)

  return chunks.length > 0 ? chunks : trimmed.match(/.{1,300}/g) ?? [trimmed]
}

function splitTextIntoSegments(text: string) {
  const paragraphSegments = text
    .split(/\n{2,}/)
    .map(segment => segment.trim())
    .filter(Boolean)

  const rawSegments = paragraphSegments.length > 1
    ? paragraphSegments
    : text
      .split(/\n/)
      .map(segment => segment.trim())
      .filter(Boolean)
      .flatMap(splitLongPlainTextLine)

  return rawSegments.map(segment => `<p>${segment.replace(/\n/g, '<br />')}</p>`)
}

function estimateTextFragmentHeight(block: SharedPaginationBlock, segments: string[], includeTitle: boolean) {
  const html = segments.join('')
  const preLines = countPreLines(html)
  const otherText = stripHtmlTags(html.replace(/<pre\b[\s\S]*?<\/pre>/gi, ' '))
  const otherLines = otherText ? Math.ceil(otherText.length / 78) : 0
  const lineCount = Math.max(1, preLines + otherLines)
  const titleHeight = includeTitle && block.title ? 28 : 0
  const shellHeight = block.block_type === 'exercise' ? 72 : block.block_type === 'tip' ? 56 : 20
  const lineHeight = preLines > 0 ? PRE_LINE_HEIGHT : 24
  return titleHeight + shellHeight + lineCount * lineHeight
}

export function getPaginationFragmentData(block: SharedPaginationBlock): PaginationFragmentData | null {
  const fragment = (block.render_data?.pagination_fragment ?? null) as Partial<PaginationFragmentData> | null
  if (!fragment?.source_block_id || typeof fragment.index !== 'number' || typeof fragment.total !== 'number') return null
  return {
    source_block_id: fragment.source_block_id,
    index: fragment.index,
    total: fragment.total,
  }
}

export function getPaginationSourceBlockId(block: SharedPaginationBlock) {
  return getPaginationFragmentData(block)?.source_block_id ?? block.id
}

export function getBlockPaginationPolicy(block: SharedPaginationBlock): BlockPaginationPolicy {
  const rawPolicy = (block.render_data?.pagination ?? {}) as Partial<BlockPaginationPolicy>
  const defaultBehavior: PaginationBehavior = ['text', 'tip', 'exercise', 'columns'].includes(block.block_type)
    ? 'breakable'
    : 'unbreakable'

  return {
    behavior: rawPolicy.behavior ?? defaultBehavior,
    keepWithNext: rawPolicy.keepWithNext ?? block.block_type === 'title',
    startOnNewPage: rawPolicy.startOnNewPage ?? false,
    allowSplit: rawPolicy.allowSplit ?? ['text', 'tip', 'exercise', 'columns'].includes(block.block_type),
    source: Object.keys(rawPolicy).length > 0 ? 'block' : 'default',
  }
}

export function describePaginationPolicy(policy: BlockPaginationPolicy): string {
  const parts: string[] = [policy.behavior]
  if (policy.keepWithNext) parts.push('keep')
  if (policy.startOnNewPage) parts.push('new-page')
  if (policy.allowSplit) parts.push('split')
  return parts.join(' / ')
}

export function canSplitBlockForPagination(block: SharedPaginationBlock, policy: BlockPaginationPolicy) {
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

export function createPaginationFragments<TBlock extends SharedPaginationBlock>(block: TBlock): TBlock[] {
  const policy = getBlockPaginationPolicy(block)
  if (!canSplitBlockForPagination(block, policy)) return [block]

  const content = block.content ?? {}
  const html = typeof content.html === 'string' ? content.html.trim() : ''
  const text = typeof content.text === 'string' ? content.text.trim() : ''
  const segments = html ? splitHtmlIntoTopLevelSegments(html) : splitTextIntoSegments(text)
  if (segments.length <= 1) return [block]

  const targetHeight = Math.round(A4_CONTENT_HEIGHT * TEXT_FRAGMENT_TARGET_HEIGHT_RATIO)

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
    title: index === 0 ? block.title : null,
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
  })) as TBlock[]
}

export function estimateBlockHeight(block: SharedPaginationBlock): number {
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
      return BLOCK_HEIGHT_ESTIMATES.cover
    case 'title':
      return BLOCK_HEIGHT_ESTIMATES.title
    case 'text': {
      const html = typeof content.html === 'string' ? content.html : ''
      if (html && (html.includes('<pre') || block.title)) {
        return Math.max(96, estimateTextFragmentHeight(block, [html], Boolean(block.title)))
      }
      return Math.max(96, 42 + textLines * 20)
    }
    case 'tip':
      return Math.max(BLOCK_HEIGHT_ESTIMATES.tip, Math.min(260, 54 + textLines * 18))
    case 'exercise':
      return Math.max(BLOCK_HEIGHT_ESTIMATES.exercise, Math.min(620, 104 + textLines * 28))
    case 'notation':
    case 'rhythm':
      return block.block_type === 'rhythm' ? BLOCK_HEIGHT_ESTIMATES.rhythm : BLOCK_HEIGHT_ESTIMATES.notation
    case 'tablature':
      return BLOCK_HEIGHT_ESTIMATES.tablature
    case 'keyboard':
      return Array.isArray(renderData.chords) && renderData.chords.length > 0 ? 340 : BLOCK_HEIGHT_ESTIMATES.keyboard
    case 'keyboard_grid': {
      const count = Array.isArray(renderData.keyboards) ? renderData.keyboards.length : 1
      const columns = Math.max(1, Math.min(Number(renderData.columns ?? 2), 2))
      return 72 + Math.ceil(count / columns) * 190
    }
    case 'chord_grid': {
      const count = Array.isArray(renderData.chords) ? renderData.chords.length : 1
      const columns = Math.max(1, Math.min(Number(renderData.columns ?? 3), 7))
      return 48 + Math.ceil(count / columns) * 168
    }
    case 'chord_diagram':
      return BLOCK_HEIGHT_ESTIMATES.chord_diagram
    case 'image':
      return BLOCK_HEIGHT_ESTIMATES.image
    case 'audio':
    case 'video':
      return BLOCK_HEIGHT_ESTIMATES[block.block_type]
    case 'columns':
      return BLOCK_HEIGHT_ESTIMATES.columns
    case 'separator':
      return BLOCK_HEIGHT_ESTIMATES.separator
    default:
      return 120
  }
}

export function getEstimatedBlockHeightForPagination(block: SharedPaginationBlock): number {
  const estimated = estimateBlockHeight(block)
  const style = block.render_data?.style as { margin?: { top?: number; bottom?: number } } | undefined
  const verticalMargin = Number(style?.margin?.top ?? 0) + Number(style?.margin?.bottom ?? 0)
  if (block.block_type === 'cover') return estimated + verticalMargin
  return Math.round(estimated * ESTIMATED_BLOCK_HEIGHT_FACTOR) + verticalMargin
}

export function shouldKeepBlocksTogether(current: SharedPaginationBlock, next: SharedPaginationBlock | undefined) {
  if (!next || next.block_type === 'page_break' || next.block_type === 'cover') return false
  const policy = getBlockPaginationPolicy(current)
  if (policy.keepWithNext) return true
  if (current.block_type === 'text' && ['chord_grid', 'chord_diagram'].includes(next.block_type)) return true
  return current.block_type === 'exercise' &&
    ['notation', 'rhythm', 'tablature', 'keyboard', 'keyboard_grid', 'chord_grid'].includes(next.block_type)
}

export function paginateBlocks<TBlock extends SharedPaginationBlock>(
  blocks: TBlock[],
  getHeight: (block: TBlock) => number = block => getEstimatedBlockHeightForPagination(block),
  contentHeight: number = A4_CONTENT_HEIGHT,
): SharedPaginationResult<TBlock> {
  const pages: TBlock[][] = [[]]
  const breakReasons = new Map<number, { reason: PaginationBreakReason; detail: string }>()
  let currentHeight = 0

  const pushPage = (reason: PaginationBreakReason, detail: string) => {
    breakReasons.set(pages.length - 1, { reason, detail })
    pages.push([])
    currentHeight = 0
  }

  const groups: PaginationGroup<TBlock>[] = []
  const paginationBlocks = blocks.flatMap(createPaginationFragments)
  for (let index = 0; index < paginationBlocks.length; index += 1) {
    const block = paginationBlocks[index]
    if (block.block_type === 'page_break') {
      groups.push({ blocks: [block], height: 0, policy: getBlockPaginationPolicy(block) })
      continue
    }

    const policy = getBlockPaginationPolicy(block)
    const groupBlocks = [block]
    let height = getHeight(block)

    if (shouldKeepBlocksTogether(block, paginationBlocks[index + 1]) && height + getHeight(paginationBlocks[index + 1]) <= contentHeight) {
      const next = paginationBlocks[index + 1]
      groupBlocks.push(next)
      height += getHeight(next)
      index += 1
    }

    groups.push({ blocks: groupBlocks, height, policy })
  }

  for (const group of groups) {
    const firstBlock = group.blocks[0]

    if (firstBlock.block_type === 'page_break') {
      if (pages[pages.length - 1].length > 0) {
        pushPage('manual', 'Quebra manual inserida pelo professor.')
      }
      continue
    }

    if (firstBlock.block_type === 'cover') {
      if (pages[pages.length - 1].length > 0) {
        pushPage('cover', 'A capa comeca em pagina propria.')
      }
      pages[pages.length - 1].push(...group.blocks)
      pushPage('cover', 'A capa ocupa uma pagina inteira.')
      continue
    }

    if (group.policy.startOnNewPage && pages[pages.length - 1].length > 0) {
      pushPage('manual', `${firstBlock.title || firstBlock.block_type} configurado para comecar em nova pagina.`)
    }

    if (currentHeight + group.height > contentHeight && pages[pages.length - 1].length > 0) {
      pushPage('overflow', `${firstBlock.title || firstBlock.block_type} nao coube no espaco restante.`)
    }

    pages[pages.length - 1].push(...group.blocks)
    currentHeight += group.height
  }

  return {
    pages: pages.filter((page, index) => page.length > 0 || index === 0),
    breakReasons,
  }
}
