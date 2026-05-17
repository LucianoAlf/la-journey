interface PageRectLike {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

interface ViewportRectLike {
  top: number
  bottom: number
  height: number
}

interface Pointer {
  x: number
  y: number
}

interface CalculatePageDragInput {
  startPointer: Pointer
  currentPointer: Pointer
  startPageIndex: number
  startElementX: number
  startElementY: number
  startElementRect: PageRectLike
  pageRects: PageRectLike[]
}

export interface FloatingPagePlacement {
  pageIndex: number
  x: number
  y: number
}

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function visibleHeightWithinViewport(page: PageRectLike, viewport: ViewportRectLike): number {
  return Math.max(0, Math.min(page.bottom, viewport.bottom) - Math.max(page.top, viewport.top))
}

export function getVisiblePageIndexFromRects(
  viewport: ViewportRectLike,
  pageRects: PageRectLike[],
  fallback = 0,
): number {
  if (pageRects.length === 0) return fallback

  const centerY = viewport.top + viewport.height / 2
  const pageContainingCenter = pageRects.findIndex(page => page.top <= centerY && page.bottom >= centerY)
  if (pageContainingCenter >= 0) return pageContainingCenter

  let bestIndex = fallback
  let bestVisibleHeight = -1
  pageRects.forEach((page, index) => {
    const visibleHeight = visibleHeightWithinViewport(page, viewport)
    if (visibleHeight > bestVisibleHeight) {
      bestVisibleHeight = visibleHeight
      bestIndex = index
    }
  })

  return bestIndex
}

function getPageIndexForElementCenter(
  center: Pointer,
  pageRects: PageRectLike[],
  fallback: number,
): number {
  const containing = pageRects.findIndex(page =>
    center.x >= page.left &&
    center.x <= page.right &&
    center.y >= page.top &&
    center.y <= page.bottom,
  )
  if (containing >= 0) return containing

  let closestIndex = fallback
  let closestDistance = Infinity
  pageRects.forEach((page, index) => {
    const pageCenterY = page.top + page.height / 2
    const distance = Math.abs(center.y - pageCenterY)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })
  return closestIndex
}

export function calculateFloatingElementPageDrag({
  startPointer,
  currentPointer,
  startPageIndex,
  startElementX,
  startElementY,
  startElementRect,
  pageRects,
}: CalculatePageDragInput): FloatingPagePlacement {
  const startPageRect = pageRects[startPageIndex]
  if (!startPageRect) {
    return {
      pageIndex: startPageIndex,
      x: roundTenths(startElementX),
      y: roundTenths(startElementY),
    }
  }

  const deltaX = currentPointer.x - startPointer.x
  const deltaY = currentPointer.y - startPointer.y
  const startLeft = startPageRect.left + (startElementX / 100) * startPageRect.width
  const startTop = startPageRect.top + (startElementY / 100) * startPageRect.height
  const nextLeft = startLeft + deltaX
  const nextTop = startTop + deltaY
  const nextCenter = {
    x: nextLeft + startElementRect.width / 2,
    y: nextTop + startElementRect.height / 2,
  }
  const pageIndex = getPageIndexForElementCenter(nextCenter, pageRects, startPageIndex)
  const pageRect = pageRects[pageIndex] ?? startPageRect

  return {
    pageIndex,
    x: roundTenths(clampPercent(((nextLeft - pageRect.left) / pageRect.width) * 100)),
    y: roundTenths(clampPercent(((nextTop - pageRect.top) / pageRect.height) * 100)),
  }
}

export function shouldHydrateFloatingElementsFromPageConfig({
  alreadyHydrated,
  localElementCount,
  pageConfigElementCount,
}: {
  alreadyHydrated: boolean
  localElementCount: number
  pageConfigElementCount: number
}): boolean {
  return !alreadyHydrated && localElementCount === 0 && pageConfigElementCount > 0
}

export function shouldPersistFloatingElementsToPageConfig({
  initialLoadDone,
  alreadyHydrated,
  localElementCount,
  pageConfigElementCount,
}: {
  initialLoadDone: boolean
  alreadyHydrated: boolean
  localElementCount: number
  pageConfigElementCount: number
}): boolean {
  if (!initialLoadDone) return false
  if (!alreadyHydrated && localElementCount === 0 && pageConfigElementCount > 0) return false
  return true
}
