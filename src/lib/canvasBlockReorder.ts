import { arrayMove } from '@dnd-kit/sortable'

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

function applySequentialSortOrder<TBlock extends ReorderableBlock>(blocks: TBlock[]) {
  return blocks.map((block, index) => {
    const nextSortOrder = index + 1
    return block.sort_order === nextSortOrder
      ? block
      : { ...block, sort_order: nextSortOrder }
  })
}

export function reorderBlocksByDirection<TBlock extends ReorderableBlock>(
  blocks: TBlock[],
  activeId: string,
  direction: 'up' | 'down',
): BlockReorderResult<TBlock> {
  const fromIndex = blocks.findIndex(block => block.id === activeId)
  if (fromIndex < 0) {
    return { blocks, changed: false, patch: null }
  }

  const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
  if (toIndex < 0 || toIndex >= blocks.length) return { blocks, changed: false, patch: null }

  const moved = applySequentialSortOrder(arrayMove(blocks, fromIndex, toIndex))

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
