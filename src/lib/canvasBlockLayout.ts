import type { CSSProperties } from 'react'

export type CanvasNudgeDirection = 'up' | 'down' | 'left' | 'right'

export type CanvasBlockLayout = {
  offsetX: number
  offsetY: number
}

export type LayoutEditableBlock = {
  id: string
  render_data: Record<string, unknown> | null
}

export type CanvasLayoutNudgeResult<TBlock extends LayoutEditableBlock> = {
  blocks: TBlock[]
  changed: boolean
  renderData: Record<string, unknown> | null
}

const DEFAULT_LAYOUT: CanvasBlockLayout = {
  offsetX: 0,
  offsetY: 0,
}

export function getCanvasBlockLayout(renderData: Record<string, unknown> | null | undefined): CanvasBlockLayout {
  const rawLayout = renderData?.layout
  const layout = rawLayout && typeof rawLayout === 'object' && !Array.isArray(rawLayout)
    ? rawLayout as Partial<CanvasBlockLayout>
    : {}

  return {
    offsetX: Number.isFinite(layout.offsetX) ? Number(layout.offsetX) : DEFAULT_LAYOUT.offsetX,
    offsetY: Number.isFinite(layout.offsetY) ? Number(layout.offsetY) : DEFAULT_LAYOUT.offsetY,
  }
}

export function nudgeCanvasBlockLayout<TBlock extends LayoutEditableBlock>(
  blocks: TBlock[],
  blockId: string,
  direction: CanvasNudgeDirection,
  step = 8,
): CanvasLayoutNudgeResult<TBlock> {
  const blockIndex = blocks.findIndex(block => block.id === blockId)
  if (blockIndex < 0) {
    return { blocks, changed: false, renderData: null }
  }

  const block = blocks[blockIndex]
  const currentRenderData = block.render_data ?? {}
  const currentLayout = getCanvasBlockLayout(currentRenderData)
  const nextLayout = { ...currentLayout }

  if (direction === 'up') nextLayout.offsetY -= step
  if (direction === 'down') nextLayout.offsetY += step
  if (direction === 'left') nextLayout.offsetX -= step
  if (direction === 'right') nextLayout.offsetX += step

  const nextRenderData = {
    ...currentRenderData,
    layout: nextLayout,
  }

  const nextBlock = {
    ...block,
    render_data: nextRenderData,
  }

  const nextBlocks = [...blocks]
  nextBlocks[blockIndex] = nextBlock

  return {
    blocks: nextBlocks,
    changed: true,
    renderData: nextRenderData,
  }
}

export function canvasBlockLayoutToCSS(renderData: Record<string, unknown> | null | undefined): CSSProperties {
  const layout = getCanvasBlockLayout(renderData)
  if (layout.offsetX === 0 && layout.offsetY === 0) return {}

  return {
    position: 'relative',
    transform: `translate(${layout.offsetX}px, ${layout.offsetY}px)`,
    zIndex: 1,
  }
}
