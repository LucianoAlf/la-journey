import { A4_PAGE_WIDTH_PX } from './a4Preview'

/** Largura útil da página A4 no canvas (794px) menos o padding lateral de 40px. */
export const A4_NOTATION_CONTENT_WIDTH = A4_PAGE_WIDTH_PX - 80

/**
 * Largura em que o AlphaTab realmente pagina no bloco A4 do editor:
 * página, `.a4-page-content` 60+60, `.canvas-block` 16+16, borda 2+2.
 */
export function canvasNotationWidth(pageWidthPx: number = A4_PAGE_WIDTH_PX): number {
  return pageWidthPx - 120 - 32 - 4
}

export const A4_CANVAS_NOTATION_WIDTH = canvasNotationWidth()

export function resolveNotationPreviewWidth(
  renderData: { width?: unknown } | null | undefined,
): number {
  const width = renderData?.width
  if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
    return width
  }
  return A4_NOTATION_CONTENT_WIDTH
}
