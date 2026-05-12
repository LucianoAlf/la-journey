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
