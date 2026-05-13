import { DEFAULT_BLOCK_STYLE, mergeBlockStyle, type BlockStyle } from './blockStyles'
import type { BlockPaginationPolicy, PaginationBehavior } from './sharedPagination'

export const CANVAS_BLOCK_SPACING_MIN = 0
export const CANVAS_BLOCK_SPACING_MAX = 96

function clampSpacing(value: number) {
  if (!Number.isFinite(value)) return CANVAS_BLOCK_SPACING_MIN
  return Math.min(Math.max(Math.round(value), CANVAS_BLOCK_SPACING_MIN), CANVAS_BLOCK_SPACING_MAX)
}

export function createCanvasBlockMarginUpdate(
  currentStyle: Partial<BlockStyle> | null | undefined,
  edge: 'top' | 'bottom',
  value: number,
): Partial<BlockStyle> {
  const style = mergeBlockStyle(currentStyle, {})
  return {
    margin: {
      ...style.margin,
      [edge]: clampSpacing(value),
    },
  }
}

const BREAKABLE_BLOCK_TYPES = new Set(['text', 'tip', 'exercise', 'columns'])

function getDefaultPaginationForBlockType(blockType: string): Omit<BlockPaginationPolicy, 'source'> {
  const behavior: PaginationBehavior = BREAKABLE_BLOCK_TYPES.has(blockType) ? 'breakable' : 'unbreakable'
  return {
    behavior,
    keepWithNext: blockType === 'title',
    startOnNewPage: false,
    allowSplit: BREAKABLE_BLOCK_TYPES.has(blockType),
  }
}

export function hasCanvasBlockLayoutAdjustments(
  currentStyle: Partial<BlockStyle> | null | undefined,
  paginationPolicy: BlockPaginationPolicy | null | undefined,
): boolean {
  const style = mergeBlockStyle(currentStyle, {})
  return style.margin.top !== DEFAULT_BLOCK_STYLE.margin.top ||
    style.margin.bottom !== DEFAULT_BLOCK_STYLE.margin.bottom ||
    Boolean(paginationPolicy && paginationPolicy.source === 'block')
}

export function createCanvasBlockLayoutReset(blockType: string): {
  style: Partial<BlockStyle>
  pagination: Partial<BlockPaginationPolicy>
} {
  return {
    style: {
      margin: { ...DEFAULT_BLOCK_STYLE.margin },
    },
    pagination: getDefaultPaginationForBlockType(blockType),
  }
}
