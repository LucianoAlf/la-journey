const TIME_SIGNATURE_PATTERN = /^\d+\/\d+$/

export function normalizeTimeSignature(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().replace(/\s+/g, '')
  if (!normalized || normalized.toLowerCase() === 'free') return null

  return TIME_SIGNATURE_PATTERN.test(normalized) ? normalized : null
}

export function getEditorTimeSignature(...values: unknown[]): string {
  for (const value of values) {
    const normalized = normalizeTimeSignature(value)
    if (normalized) return normalized
  }

  return 'free'
}
