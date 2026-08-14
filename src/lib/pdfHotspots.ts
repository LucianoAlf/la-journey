export interface PdfLinkHotspot {
  href: string
  left: number
  top: number
  width: number
  height: number
}

export interface PdfPageSliceLayout {
  start: number
  end: number
  contentTopMm: number
}

export interface PdfLinkRect {
  pageIndex: number
  x: number
  y: number
  w: number
  h: number
  href: string
}

export function isSafePdfHref(href: string) {
  try {
    const url = new URL(href)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function collectPdfHotspots(root: HTMLElement, scale: number): PdfLinkHotspot[] {
  const rootBox = root.getBoundingClientRect()
  return Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-hotspot][data-pdf-href]'))
    .map((node) => {
      const box = node.getBoundingClientRect()
      return {
        href: node.dataset.pdfHref?.trim() || '',
        left: (box.left - rootBox.left) * scale,
        top: (box.top - rootBox.top) * scale,
        width: box.width * scale,
        height: box.height * scale,
      }
    })
    .filter((hotspot) => hotspot.width > 0 && hotspot.height > 0 && isSafePdfHref(hotspot.href))
}

export function mapPdfLinkRects(input: {
  hotspots: PdfLinkHotspot[]
  pages: PdfPageSliceLayout[]
  marginMm: number
  imgWidth: number
  printableWidthMm: number
  ratio: number
  headerEnd?: number
}): PdfLinkRect[] {
  const headerEnd = input.headerEnd ?? 0
  const scaleX = input.imgWidth > 0 ? input.printableWidthMm / input.imgWidth : 0

  return input.hotspots.flatMap((hotspot) => {
    if (!isSafePdfHref(hotspot.href)) return []

    if (headerEnd > 0 && hotspot.top + hotspot.height <= headerEnd + 0.5) {
      return [{
        pageIndex: 0,
        x: input.marginMm + hotspot.left * scaleX,
        y: input.marginMm + hotspot.top * input.ratio,
        w: hotspot.width * scaleX,
        h: hotspot.height * input.ratio,
        href: hotspot.href,
      }]
    }

    const pageIndex = input.pages.findIndex((page) =>
      hotspot.top + hotspot.height / 2 >= page.start - 0.5
      && hotspot.top + hotspot.height / 2 < page.end + 0.5,
    )
    if (pageIndex < 0) return []

    const page = input.pages[pageIndex]
    return [{
      pageIndex,
      x: input.marginMm + hotspot.left * scaleX,
      y: page.contentTopMm + (hotspot.top - page.start) * input.ratio,
      w: hotspot.width * scaleX,
      h: hotspot.height * input.ratio,
      href: hotspot.href,
    }]
  })
}
