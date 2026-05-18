export interface InsertionBlockRef {
  id: string
  sort_order: number
}

export function resolveInsertionAnchorOrder<TBlock extends InsertionBlockRef>({
  blocks,
  selectedBlockId,
  pageBlockIds,
  previousPageBlockIds = [],
}: {
  blocks: TBlock[]
  selectedBlockId: string | null
  pageBlockIds: string[]
  previousPageBlockIds?: string[]
}) {
  const blockById = new Map(blocks.map(block => [block.id, block]))
  const selectedBlock = selectedBlockId ? blockById.get(selectedBlockId) : null
  if (selectedBlock) return selectedBlock.sort_order

  const currentPageOrders = pageBlockIds
    .map(id => blockById.get(id)?.sort_order)
    .filter((order): order is number => typeof order === 'number')

  if (currentPageOrders.length > 0) return Math.max(...currentPageOrders)

  const previousPageOrders = previousPageBlockIds
    .map(id => blockById.get(id)?.sort_order)
    .filter((order): order is number => typeof order === 'number')

  if (previousPageOrders.length > 0) return Math.max(...previousPageOrders)

  return 0
}

export function resolvePageInsertionAnchorOrder<TBlock extends InsertionBlockRef>({
  blocks,
  pageBlockIds,
  previousPageBlockIds = [],
}: {
  blocks: TBlock[]
  pageBlockIds: string[]
  previousPageBlockIds?: string[]
}) {
  return resolveInsertionAnchorOrder({
    blocks,
    selectedBlockId: null,
    pageBlockIds,
    previousPageBlockIds,
  })
}
