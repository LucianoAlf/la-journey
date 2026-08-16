export const A4_PAGE_WIDTH_PX = 794
export const A4_PAGE_HEIGHT_PX = 1123

export type PageOrientation = 'portrait' | 'landscape'

export function parsePageOrientation(value: unknown): PageOrientation {
  return value === 'landscape' ? 'landscape' : 'portrait'
}

export function pageSize(orientation: PageOrientation = 'portrait'): { width: number; height: number } {
  if (orientation === 'landscape') {
    return { width: A4_PAGE_HEIGHT_PX, height: A4_PAGE_WIDTH_PX }
  }
  return { width: A4_PAGE_WIDTH_PX, height: A4_PAGE_HEIGHT_PX }
}

export function jsPdfA4Orientation(orientation: PageOrientation): 'portrait' | 'landscape' {
  return orientation
}

/** Precisa de `sm:max-w-none` — o Dialog padrão aplica `sm:max-w-lg` e ganha do `max-w-4xl`. */
export const EXERCISE_PREVIEW_DIALOG_CLASS =
  'sm:max-w-none w-auto max-w-[calc(100vw-1.5rem)] max-h-[96vh] overflow-hidden border-0 bg-transparent p-0 shadow-none'

export function getA4PreviewScale(
  viewportWidth: number,
  viewportHeight: number,
  chromeHeight = 140,
  orientation: PageOrientation = 'portrait',
): number {
  const { width, height } = pageSize(orientation)
  const availableW = Math.max(320, viewportWidth - 48)
  const availableH = Math.max(400, viewportHeight - chromeHeight)
  return Math.min(1, availableW / width, availableH / height)
}
