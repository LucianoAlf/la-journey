import { mergeBlockStyle, type BlockStyle } from './blockStyles'

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
