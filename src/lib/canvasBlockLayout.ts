import type { CSSProperties } from 'react'

export type CanvasNudgeDirection = 'up' | 'down' | 'left' | 'right'

export type CanvasBlockLayout = {
  offsetX: number
  offsetY: number
  pageOffset: number
}

export type LayoutEditableBlock = {
  id: string
  render_data?: Record<string, unknown> | null
}

export type CanvasLayoutNudgeResult<TBlock extends LayoutEditableBlock> = {
  blocks: TBlock[]
  changed: boolean
  renderData: Record<string, unknown> | null
}

export type CanvasPageLayerState = {
  hasShiftedBlock: boolean
  hasSelectedBlock: boolean
}

export type CanvasNudgeKeyLike = {
  altKey: boolean
  key: string
  repeat?: boolean
}

export type CanvasNudgeKeyTiming = {
  repeat?: boolean
  nowMs: number
  lastAppliedAtMs: number | null
  minRepeatIntervalMs?: number
}

export type CanvasPageBoundary = {
  blockTop: number
  blockBottom: number
  pageTop: number
  pageBottom: number
  safeInset?: number
}

const DEFAULT_LAYOUT: CanvasBlockLayout = {
  offsetX: 0,
  offsetY: 0,
  pageOffset: 0,
}

const MAX_CANVAS_BLOCK_OFFSET_X = 320
const MAX_CANVAS_BLOCK_OFFSET_Y = 320
const MAX_CANVAS_BLOCK_PAGE_OFFSET = 8
const DEFAULT_NUDGE_REPEAT_INTERVAL_MS = 48
const DEFAULT_PAGE_BOUNDARY_SAFE_INSET = 24

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizePageOffset(value: unknown) {
  if (!Number.isFinite(value)) return DEFAULT_LAYOUT.pageOffset
  return Math.trunc(Number(value))
}

function clampCanvasBlockLayout(layout: CanvasBlockLayout): CanvasBlockLayout {
  return {
    offsetX: clampNumber(layout.offsetX, -MAX_CANVAS_BLOCK_OFFSET_X, MAX_CANVAS_BLOCK_OFFSET_X),
    offsetY: clampNumber(layout.offsetY, -MAX_CANVAS_BLOCK_OFFSET_Y, MAX_CANVAS_BLOCK_OFFSET_Y),
    pageOffset: clampNumber(layout.pageOffset, -MAX_CANVAS_BLOCK_PAGE_OFFSET, MAX_CANVAS_BLOCK_PAGE_OFFSET),
  }
}

export function getCanvasBlockLayout(renderData: Record<string, unknown> | null | undefined): CanvasBlockLayout {
  const rawLayout = renderData?.layout
  const layout = rawLayout && typeof rawLayout === 'object' && !Array.isArray(rawLayout)
    ? rawLayout as Partial<CanvasBlockLayout>
    : {}

  return clampCanvasBlockLayout({
    offsetX: Number.isFinite(layout.offsetX) ? Number(layout.offsetX) : DEFAULT_LAYOUT.offsetX,
    offsetY: Number.isFinite(layout.offsetY) ? Number(layout.offsetY) : DEFAULT_LAYOUT.offsetY,
    pageOffset: normalizePageOffset(layout.pageOffset),
  })
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

  const clampedLayout = clampCanvasBlockLayout(nextLayout)
  if (direction === 'down' && nextLayout.offsetY > MAX_CANVAS_BLOCK_OFFSET_Y) {
    clampedLayout.pageOffset = clampNumber(clampedLayout.pageOffset + 1, -MAX_CANVAS_BLOCK_PAGE_OFFSET, MAX_CANVAS_BLOCK_PAGE_OFFSET)
    clampedLayout.offsetY = 0
  }
  if (direction === 'up' && nextLayout.offsetY < -MAX_CANVAS_BLOCK_OFFSET_Y) {
    clampedLayout.pageOffset = clampNumber(clampedLayout.pageOffset - 1, -MAX_CANVAS_BLOCK_PAGE_OFFSET, MAX_CANVAS_BLOCK_PAGE_OFFSET)
    clampedLayout.offsetY = 0
  }

  const nextRenderData = {
    ...currentRenderData,
    layout: clampedLayout,
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

export function anchorCanvasBlockToPageOffset<TBlock extends LayoutEditableBlock>(
  blocks: TBlock[],
  blockId: string,
  pageDelta: -1 | 0 | 1,
): CanvasLayoutNudgeResult<TBlock> {
  if (pageDelta === 0) return { blocks, changed: false, renderData: null }

  const blockIndex = blocks.findIndex(block => block.id === blockId)
  if (blockIndex < 0) {
    return { blocks, changed: false, renderData: null }
  }

  const block = blocks[blockIndex]
  const currentRenderData = block.render_data ?? {}
  const currentLayout = getCanvasBlockLayout(currentRenderData)
  const nextLayout = clampCanvasBlockLayout({
    ...currentLayout,
    offsetY: 0,
    pageOffset: currentLayout.pageOffset + pageDelta,
  })

  if (
    nextLayout.offsetX === currentLayout.offsetX &&
    nextLayout.offsetY === currentLayout.offsetY &&
    nextLayout.pageOffset === currentLayout.pageOffset
  ) {
    return { blocks, changed: false, renderData: currentRenderData }
  }

  const nextRenderData = {
    ...currentRenderData,
    layout: nextLayout,
  }
  const nextBlocks = [...blocks]
  nextBlocks[blockIndex] = {
    ...block,
    render_data: nextRenderData,
  }

  return {
    blocks: nextBlocks,
    changed: true,
    renderData: nextRenderData,
  }
}

export function settleCanvasBlockOnPageAnchor<TBlock extends LayoutEditableBlock>(
  blocks: TBlock[],
  blockId: string,
): CanvasLayoutNudgeResult<TBlock> {
  const blockIndex = blocks.findIndex(block => block.id === blockId)
  if (blockIndex < 0) {
    return { blocks, changed: false, renderData: null }
  }

  const block = blocks[blockIndex]
  const currentRenderData = block.render_data ?? {}
  const currentLayout = getCanvasBlockLayout(currentRenderData)
  if (currentLayout.offsetY === 0) {
    return { blocks, changed: false, renderData: currentRenderData }
  }

  const nextRenderData = {
    ...currentRenderData,
    layout: {
      ...currentLayout,
      offsetY: 0,
    },
  }
  const nextBlocks = [...blocks]
  nextBlocks[blockIndex] = {
    ...block,
    render_data: nextRenderData,
  }

  return {
    blocks: nextBlocks,
    changed: true,
    renderData: nextRenderData,
  }
}

export function getCanvasPageBoundaryDelta(
  direction: CanvasNudgeDirection,
  bounds: CanvasPageBoundary,
): -1 | 0 | 1 {
  const safeInset = bounds.safeInset ?? DEFAULT_PAGE_BOUNDARY_SAFE_INSET
  if (direction === 'down' && bounds.blockBottom > bounds.pageBottom - safeInset) return 1
  if (direction === 'up' && bounds.blockTop < bounds.pageTop + safeInset) return -1
  return 0
}

export function resetCanvasBlockLayout<TBlock extends LayoutEditableBlock>(
  blocks: TBlock[],
  blockId: string,
): CanvasLayoutNudgeResult<TBlock> {
  const blockIndex = blocks.findIndex(block => block.id === blockId)
  if (blockIndex < 0) {
    return { blocks, changed: false, renderData: null }
  }

  const block = blocks[blockIndex]
  const currentRenderData = block.render_data ?? {}
  const currentLayout = getCanvasBlockLayout(currentRenderData)
  if (currentLayout.offsetX === 0 && currentLayout.offsetY === 0 && currentLayout.pageOffset === 0) {
    return { blocks, changed: false, renderData: currentRenderData }
  }

  const nextRenderData = {
    ...currentRenderData,
    layout: { ...currentLayout, offsetX: 0, offsetY: 0, pageOffset: 0 },
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

export function hasCanvasBlockLayoutOffset(renderData: Record<string, unknown> | null | undefined): boolean {
  const layout = getCanvasBlockLayout(renderData)
  return layout.offsetX !== 0 || layout.offsetY !== 0 || layout.pageOffset !== 0
}

export function canvasPageLayerToCSS(state: CanvasPageLayerState): CSSProperties {
  if (!state.hasShiftedBlock && !state.hasSelectedBlock) return {}

  return {
    overflow: 'visible',
    zIndex: state.hasSelectedBlock ? 30 : 10,
  }
}

export function isCanvasNudgeKey(event: CanvasNudgeKeyLike): boolean {
  return event.altKey && (
    event.key === 'ArrowUp' ||
    event.key === 'ArrowDown' ||
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowRight'
  )
}

export function shouldApplyCanvasNudgeKey({
  repeat,
  nowMs,
  lastAppliedAtMs,
  minRepeatIntervalMs = DEFAULT_NUDGE_REPEAT_INTERVAL_MS,
}: CanvasNudgeKeyTiming): boolean {
  if (!repeat || lastAppliedAtMs == null) return true
  return nowMs - lastAppliedAtMs >= minRepeatIntervalMs
}

export function applyCanvasLayoutPageOffsets<TBlock extends LayoutEditableBlock>(pages: TBlock[][]): TBlock[][] {
  const nextPages = pages.map(page => [...page])
  const movedToPageStart = new Map<number, TBlock[]>()
  const movedToPageEnd = new Map<number, TBlock[]>()

  pages.forEach((page, pageIndex) => {
    page.forEach(block => {
      const pageOffset = getCanvasBlockLayout(block.render_data).pageOffset
      if (pageOffset === 0) return

      const targetPageIndex = clampNumber(pageIndex + pageOffset, 0, pages.length - 1)
      if (targetPageIndex === pageIndex) return

      nextPages[pageIndex] = nextPages[pageIndex].filter(item => item.id !== block.id)
      const targetMap = pageOffset > 0 ? movedToPageStart : movedToPageEnd
      const targetBlocks = targetMap.get(targetPageIndex) ?? []
      targetBlocks.push(block)
      targetMap.set(targetPageIndex, targetBlocks)
    })
  })

  return nextPages.map((page, pageIndex) => [
    ...(movedToPageStart.get(pageIndex) ?? []),
    ...page,
    ...(movedToPageEnd.get(pageIndex) ?? []),
  ])
}
