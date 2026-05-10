export interface MusicSnapshotBlockLike {
  block_type: string
  content?: unknown
  render_data?: unknown
}

const ALPHATAB_TYPES = new Set(['notation', 'rhythm', 'tablature'])
const KEYBOARD_TYPES = new Set(['keyboard', 'keyboard_grid'])
const CHORD_TYPES = new Set(['chord_grid', 'chord_diagram'])

function resolveBlockType(blockOrType: MusicSnapshotBlockLike | string): string {
  return typeof blockOrType === 'string' ? blockOrType : blockOrType.block_type
}

function hasLoadingArtifacts(html: string) {
  return html.includes('animate-spin') ||
    html.includes('SpinnerGap') ||
    html.includes('data-editor-music-placeholder')
}

function countMatches(html: string, pattern: RegExp) {
  return html.match(pattern)?.length ?? 0
}

function hasAlphaTabNotehead(html: string) {
  const hasRoundNotehead = /<(?:circle|ellipse)\b/i.test(html)
  const pathCount = countMatches(html, /<path\b/gi)
  const textTabNumbers = countMatches(html, /<text\b[^>]*>\s*(?:[0-9]|x)\s*<\/text>/gi)

  return hasRoundNotehead || pathCount >= 2 || textTabNumbers > 0
}

function hasKeyboardKeys(html: string) {
  const keyLikeElements = countMatches(html, /<(?:polygon|rect)\b/gi)
  const blackKeyHints = countMatches(html, /(?:#0F172A|#1E293B|#111|#000|black)/gi)
  return keyLikeElements >= 7 && blackKeyHints >= 1
}

function hasChordDiagramMarks(html: string) {
  const filledCircles = /<circle\b[^>]*(?:fill="(?!none|transparent)[^"]+"|class="[^"]*(?:finger|dot)[^"]*")/i.test(html)
  const barreRects = /<rect\b[^>]*(?:rx|width="(?:[5-9][0-9]|[1-9][0-9]{2,}))/i.test(html)
  return filledCircles || barreRects
}

export function isUsableMusicSnapshotHtml(
  html: string,
  blockOrType: MusicSnapshotBlockLike | string,
): boolean {
  const normalized = html.trim()
  if (normalized.length < 80) return false
  if (hasLoadingArtifacts(normalized)) return false
  if (!normalized.includes('<svg')) return false

  const blockType = resolveBlockType(blockOrType)

  if (ALPHATAB_TYPES.has(blockType)) {
    return hasAlphaTabNotehead(normalized)
  }

  if (KEYBOARD_TYPES.has(blockType)) {
    return hasKeyboardKeys(normalized)
  }

  if (CHORD_TYPES.has(blockType)) {
    return hasChordDiagramMarks(normalized)
  }

  return true
}
