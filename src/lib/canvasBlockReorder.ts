import { arrayMove } from '@dnd-kit/sortable'

export type CanvasDropPlacement = 'before' | 'after'
const CANVAS_DROP_ZONE_PREFIX = 'canvas-drop-zone:'

export type ReorderableBlock = {
  id: string
  sort_order: number
}

export type CanvasReorderPatch = {
  type: 'reorder'
  blockId: string
  fromIndex: number
  toIndex: number
}

export type BlockReorderResult<TBlock extends ReorderableBlock> = {
  blocks: TBlock[]
  changed: boolean
  patch: CanvasReorderPatch | null
}

export function createCanvasDropZoneId(blockId: string, placement: CanvasDropPlacement) {
  return `${CANVAS_DROP_ZONE_PREFIX}${placement}:${blockId}`
}

export function parseCanvasDropZoneId(id: string | null): { blockId: string; placement: CanvasDropPlacement } | null {
  if (!id?.startsWith(CANVAS_DROP_ZONE_PREFIX)) return null

  const rest = id.slice(CANVAS_DROP_ZONE_PREFIX.length)
  const separatorIndex = rest.indexOf(':')
  if (separatorIndex < 0) return null

  const placement = rest.slice(0, separatorIndex)
  const blockId = rest.slice(separatorIndex + 1)
  if ((placement !== 'before' && placement !== 'after') || !blockId) return null

  return { blockId, placement }
}

export function getDropInsertIndexFromDropZone(blockIds: string[], dropZoneId: string | null): number | null {
  const parsed = parseCanvasDropZoneId(dropZoneId)
  if (!parsed) return null

  const blockIndex = blockIds.indexOf(parsed.blockId)
  if (blockIndex < 0) return null

  return parsed.placement === 'before' ? blockIndex : blockIndex + 1
}

export type BlockDropTargetLayout = {
  id: string
  index?: number
  top: number
  bottom: number
}

export function getDropInsertIndexByPointerY(
  layouts: Array<BlockDropTargetLayout & { index: number }>,
  pointerY: number,
): number | null {
  if (layouts.length === 0) return null

  const ordered = [...layouts].sort((a, b) => a.top - b.top)
  for (const layout of ordered) {
    const center = (layout.top + layout.bottom) / 2
    if (pointerY < center) return layout.index
  }

  return ordered[ordered.length - 1].index + 1
}

export function reorderBlocksByInsertIndex<TBlock extends ReorderableBlock>(
  blocks: TBlock[],
  activeId: string,
  insertIndex: number | null,
): BlockReorderResult<TBlock> {
  if (insertIndex == null) {
    return { blocks, changed: false, patch: null }
  }

  const fromIndex = blocks.findIndex(block => block.id === activeId)
  if (fromIndex < 0) {
    return { blocks, changed: false, patch: null }
  }

  const clampedInsertIndex = Math.max(0, Math.min(insertIndex, blocks.length))
  const toIndex = Math.max(0, Math.min(
    fromIndex < clampedInsertIndex ? clampedInsertIndex - 1 : clampedInsertIndex,
    blocks.length - 1,
  ))

  if (fromIndex === toIndex) {
    return { blocks, changed: false, patch: null }
  }

  const moved = arrayMove(blocks, fromIndex, toIndex).map((block, index) => {
    const nextSortOrder = index + 1
    return block.sort_order === nextSortOrder
      ? block
      : { ...block, sort_order: nextSortOrder }
  })

  return {
    blocks: moved,
    changed: true,
    patch: {
      type: 'reorder',
      blockId: activeId,
      fromIndex,
      toIndex,
    },
  }
}

export function getClosestDropTargetByPointerY(
  layouts: BlockDropTargetLayout[],
  activeId: string,
  pointerY: number,
): string | null {
  const candidates = layouts.filter(layout => layout.id !== activeId)
  if (candidates.length === 0) return null

  let closest = candidates[0]
  let closestDistance = Number.POSITIVE_INFINITY

  for (const layout of candidates) {
    const center = (layout.top + layout.bottom) / 2
    const distance = Math.abs(pointerY - center)
    if (distance < closestDistance) {
      closest = layout
      closestDistance = distance
    }
  }

  return closest.id
}

export function reorderBlocksById<TBlock extends ReorderableBlock>(
  blocks: TBlock[],
  activeId: string,
  overId: string | null,
): BlockReorderResult<TBlock> {
  if (!overId || activeId === overId) {
    return { blocks, changed: false, patch: null }
  }

  const fromIndex = blocks.findIndex(block => block.id === activeId)
  const toIndex = blocks.findIndex(block => block.id === overId)

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return { blocks, changed: false, patch: null }
  }

  const moved = arrayMove(blocks, fromIndex, toIndex).map((block, index) => {
    const nextSortOrder = index + 1
    return block.sort_order === nextSortOrder
      ? block
      : { ...block, sort_order: nextSortOrder }
  })

  return {
    blocks: moved,
    changed: true,
    patch: {
      type: 'reorder',
      blockId: activeId,
      fromIndex,
      toIndex,
    },
  }
}
