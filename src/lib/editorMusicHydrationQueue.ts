export interface HydrationQueueBlock {
  id: string
  block_type: string
  render_data?: Record<string, unknown> | null
}

export interface MusicHydrationPlanInput<TBlock extends HydrationQueueBlock> {
  pages: TBlock[][]
  activePageIndexes: Set<number>
  selectedBlockId: string | null
  maxPerPage?: number
}

export interface MusicHydrationPlan {
  allowedBlockIds: string[]
}

export interface MusicRendererMountDecisionInput {
  hasValidSnapshot: boolean
  canHydrateMusicRenderer: boolean
}

const ALPHATAB_BLOCK_TYPES = new Set(['notation', 'rhythm', 'tablature'])

export function blockUsesAlphaTab(block: HydrationQueueBlock): boolean {
  if (ALPHATAB_BLOCK_TYPES.has(block.block_type)) return true

  const renderData = block.render_data
  return Boolean(
    renderData?.notation ||
    renderData?.notation_data ||
    renderData?.notes,
  )
}

function getSelectedPageIndex<TBlock extends HydrationQueueBlock>(
  pages: TBlock[][],
  selectedBlockId: string | null,
): number | null {
  if (!selectedBlockId) return null

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    if (pages[pageIndex].some(block => block.id === selectedBlockId)) return pageIndex
  }
  return null
}

export function buildMusicHydrationPlan<TBlock extends HydrationQueueBlock>({
  pages,
  activePageIndexes,
  selectedBlockId,
  maxPerPage = 2,
}: MusicHydrationPlanInput<TBlock>): MusicHydrationPlan {
  const selectedPageIndex = getSelectedPageIndex(pages, selectedBlockId)
  const pageIndexes = new Set(activePageIndexes)
  if (typeof selectedPageIndex === 'number') pageIndexes.add(selectedPageIndex)

  const allowedBlockIds: string[] = []
  for (const pageIndex of Array.from(pageIndexes).sort((a, b) => a - b)) {
    const pageBlocks = pages[pageIndex] ?? []
    const candidates = pageBlocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => blockUsesAlphaTab(block))

    if (candidates.length === 0) continue

    const selectedIndex = candidates.find(item => item.block.id === selectedBlockId)?.index
    const ranked = [...candidates].sort((a, b) => {
      if (typeof selectedIndex === 'number') {
        const distanceDiff = Math.abs(a.index - selectedIndex) - Math.abs(b.index - selectedIndex)
        if (distanceDiff !== 0) return distanceDiff
      }
      return a.index - b.index
    })

    allowedBlockIds.push(...ranked.slice(0, maxPerPage).map(item => item.block.id))
  }

  return { allowedBlockIds }
}

export function shouldMountMusicRenderer({
  hasValidSnapshot,
  canHydrateMusicRenderer,
}: MusicRendererMountDecisionInput): boolean {
  return !hasValidSnapshot || canHydrateMusicRenderer
}
