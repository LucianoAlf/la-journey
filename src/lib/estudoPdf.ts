export function estudoPdfFilename(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned || 'estudo'
}

export function isLocalEstudoHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export function estudoPrintPath(materialId: string, autoprint = false): string {
  return autoprint ? `/print/${materialId}?autoprint=1` : `/print/${materialId}`
}

/** Folha da sala no diálogo de imprimir: A4 deitada. */
export const ESTUDO_PRINT_PAGE_CSS = [
  '@page { size: A4 landscape; margin: 12mm; }',
  '@media print { @page { size: A4 landscape; margin: 12mm; } }',
].join(' ')

/** PrintView / Browserless: mesmo papel do editor (A4 landscape, margin 0). */
export const ESTUDO_PRINTVIEW_PAGE_CSS = `
@page { size: A4 landscape; margin: 0; }
@media print {
  @page { size: A4 landscape; margin: 0; }
  .estudo-print-view.print-view {
    min-height: 0 !important;
    height: auto !important;
  }
  .estudo-print-page.a4-page,
  .estudo-print-page.print-page,
  .estudo-print-page.a4-page--landscape {
    width: 297mm !important;
    height: auto !important;
    min-height: 210mm !important;
    max-height: none !important;
    overflow: visible !important;
  }
  .estudo-print-page .a4-page-content,
  .estudo-print-page .print-page-content {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    flex: none !important;
  }
}
.estudo-print-view {
  width: 297mm;
  min-height: 210mm;
  margin: 0 auto;
  background: #fff;
}
.estudo-print-page.a4-page,
.estudo-print-page.print-page {
  width: 297mm !important;
  height: auto !important;
  min-height: 210mm !important;
  max-height: none !important;
  overflow: visible !important;
}
`.trim()

export function estudoPdfUsesLandscape(pageConfig: Record<string, unknown> | null | undefined): boolean {
  if (!pageConfig) return true
  if (pageConfig.estudo != null && typeof pageConfig.estudo === 'object') return true
  return pageConfig.orientation === 'landscape'
}

export type EstudoPdfChrome = {
  title: string
  schoolName: string
  logoUrl: string | null
  curatorName: string | null
}

export function printEstudoSheet() {
  const root = document.documentElement
  const previousTheme = root.getAttribute('data-theme')
  root.setAttribute('data-theme', 'light')
  const printStyle = document.createElement('style')
  printStyle.setAttribute('data-estudo-print', 'true')
  printStyle.textContent = ESTUDO_PRINT_PAGE_CSS
  document.head.appendChild(printStyle)
  window.setTimeout(() => {
    window.print()
    printStyle.remove()
    if (previousTheme) root.setAttribute('data-theme', previousTheme)
    else root.removeAttribute('data-theme')
  }, 150)
}
