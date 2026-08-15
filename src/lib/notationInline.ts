export type NotationInline = 'on' | 'off'

export const NOTATION_INLINE_DEFAULT: NotationInline = 'on'

export function resolveNotationInline(
  search: string,
  fallback: NotationInline = NOTATION_INLINE_DEFAULT,
): NotationInline {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const value = new URLSearchParams(raw).get('notationInline')
  if (value === 'on' || value === 'off') return value
  return fallback
}

export function readNotationInline(): NotationInline {
  if (typeof window === 'undefined') return NOTATION_INLINE_DEFAULT
  return resolveNotationInline(window.location.search)
}

export function isNotationInlineEnabled(search?: string): boolean {
  if (typeof search === 'string') return resolveNotationInline(search) === 'on'
  return readNotationInline() === 'on'
}
