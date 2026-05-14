import { findGoogleFont, getGoogleFontWeights, GOOGLE_FONTS, type GoogleFontDefinition } from '@/lib/googleFonts'

const loadedFonts = new Set<string>()

function normalizeFamilies(families: string[]) {
  return Array.from(new Set(families.map(font => font.trim()).filter(Boolean)))
}

export function buildGoogleFontHref(fonts: GoogleFontDefinition[]) {
  const families = fonts
    .filter(font => font.family.trim())
    .map(font => {
      const family = font.family.trim().replace(/\s+/g, '+')
      const weights = Array.from(new Set(font.weights.length ? font.weights : ['400'])).join(';')
      return `family=${family}:wght@${weights}`
    })

  if (!families.length) return ''
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

export function loadGoogleFont(family: string, weights = getGoogleFontWeights(family)) {
  if (typeof document === 'undefined') return

  const normalizedFamily = family.trim()
  if (!normalizedFamily || loadedFonts.has(normalizedFamily)) return

  const font = findGoogleFont(normalizedFamily) ?? { family: normalizedFamily, weights, style: '' }
  const href = buildGoogleFontHref([font])
  if (!href) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.laGoogleFont = normalizedFamily
  document.head.appendChild(link)
  loadedFonts.add(normalizedFamily)
}

export function loadGoogleFonts(families: string[]) {
  normalizeFamilies(families).forEach(family => loadGoogleFont(family))
}

export function preloadAllCuratedFonts() {
  if (typeof window === 'undefined') return

  const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void) => number }
  const run = () => {
    Object.values(GOOGLE_FONTS).flat().forEach(font => {
      loadGoogleFont(font.family, font.weights)
    })
  }

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(run)
  } else {
    window.setTimeout(run, 1200)
  }
}

function collectFontFamiliesFromValue(value: unknown, fonts = new Set<string>()) {
  if (typeof value === 'string') {
    Object.values(GOOGLE_FONTS).flat().forEach(font => {
      if (value.includes(font.family)) fonts.add(font.family)
    })
    return fonts
  }

  if (!value || typeof value !== 'object') return fonts

  if (Array.isArray(value)) {
    value.forEach(item => collectFontFamiliesFromValue(item, fonts))
    return fonts
  }

  const record = value as Record<string, unknown>
  const fontFamily = record.fontFamily
  if (typeof fontFamily === 'string' && findGoogleFont(fontFamily)) {
    fonts.add(fontFamily)
  }

  Object.values(record).forEach(item => collectFontFamiliesFromValue(item, fonts))
  return fonts
}

export function collectUsedGoogleFontFamilies(blocks: Array<{ render_data?: unknown }>) {
  const fonts = new Set<string>(['DM Sans'])
  blocks.forEach(block => collectFontFamiliesFromValue(block.render_data, fonts))
  return Array.from(fonts)
}

export function getGoogleFontDefinitions(families: string[]) {
  return normalizeFamilies(families)
    .map(family => findGoogleFont(family) ?? { family, weights: getGoogleFontWeights(family), style: '' })
}

export function getGoogleFontLinkTags(families: string[]) {
  const href = buildGoogleFontHref(getGoogleFontDefinitions(families))
  return href ? `<link href="${href}" rel="stylesheet">` : ''
}

export async function waitForGoogleFonts(families: string[]) {
  if (typeof document === 'undefined') return
  loadGoogleFonts(families)
  if ('fonts' in document) {
    await document.fonts.ready
  }
}
