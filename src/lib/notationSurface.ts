export type NotationSurface = 'alphatab' | 'svg'

export const NOTATION_SURFACE_DEFAULT: NotationSurface = 'alphatab'

export function resolveNotationSurface(
  search: string,
  fallback: NotationSurface = NOTATION_SURFACE_DEFAULT,
): NotationSurface {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const value = new URLSearchParams(raw).get('notationSurface')
  if (value === 'svg' || value === 'alphatab') return value
  return fallback
}

export function readNotationSurface(): NotationSurface {
  if (typeof window === 'undefined') return NOTATION_SURFACE_DEFAULT
  return resolveNotationSurface(window.location.search)
}
