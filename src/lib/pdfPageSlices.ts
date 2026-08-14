export interface PdfBreakPoint {
  top: number
  bottom: number
}

export interface PdfSlice {
  start: number
  end: number
}

export function computePdfSlices(input: {
  contentHeight: number
  pageBudget: number
  breaks: PdfBreakPoint[]
  origin?: number
  firstPageBudget?: number
}): PdfSlice[] {
  const { contentHeight, pageBudget } = input
  const origin = Math.max(0, input.origin ?? 0)
  const firstBudget = input.firstPageBudget ?? pageBudget
  if (contentHeight <= 0) return []
  if (contentHeight - origin <= firstBudget) return [{ start: origin, end: contentHeight }]

  const breaks = [...input.breaks]
    .filter((point) => point.bottom > point.top)
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom)

  const slices: PdfSlice[] = []
  let start = origin

  while (start < contentHeight) {
    const budget = slices.length === 0 ? firstBudget : pageBudget
    const limit = start + budget
    if (limit >= contentHeight) {
      slices.push({ start, end: contentHeight })
      break
    }

    const lastFit = [...breaks]
      .reverse()
      .find((point) => point.top >= start - 0.5 && point.bottom <= limit + 0.5 && point.bottom > start)

    let end = lastFit?.bottom ?? limit
    if (end <= start) end = Math.min(limit, contentHeight)
    slices.push({ start, end })
    start = end
  }

  return slices
}

export function collectPdfBreaks(root: HTMLElement, scale: number): PdfBreakPoint[] {
  const rootBox = root.getBoundingClientRect()
  return Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-break]')).map((node) => {
    const box = node.getBoundingClientRect()
    return {
      top: (box.top - rootBox.top) * scale,
      bottom: (box.bottom - rootBox.top) * scale,
    }
  })
}

export function collectPdfHeaderEnd(root: HTMLElement, scale: number): number {
  const header = root.querySelector<HTMLElement>('[data-pdf-break="header"]')
  if (!header) return 0
  const rootBox = root.getBoundingClientRect()
  return (header.getBoundingClientRect().bottom - rootBox.top) * scale
}
