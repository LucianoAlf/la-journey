/** Largura útil da página A4 no canvas (794px) menos o padding lateral de 40px. */
export const A4_NOTATION_CONTENT_WIDTH = 794 - 80

export function resolveNotationPreviewWidth(
  renderData: { width?: unknown } | null | undefined,
): number {
  const width = renderData?.width
  if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
    return width
  }
  return A4_NOTATION_CONTENT_WIDTH
}
