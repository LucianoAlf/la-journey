export const TAB_LINE_RE = /^[EBGDAe]\|[-\d\s|hpbr/\\~()xX.*^]+\|?\s*$/

const CHORD_TOKEN_RE = /^[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9])*(?:\/[A-G][#b]?)?$/

export type CifraBlock =
  | { type: 'section'; text: string }
  | { type: 'chord'; text: string }
  | { type: 'lyric'; text: string }
  | { type: 'empty' }
  | { type: 'tab'; lines: string[]; label?: string }

export function isCifraHtml(html: string | null | undefined): boolean {
  if (!html) return false
  return /<pre\b/i.test(html)
}

export function extractCifraPlainText(htmlOrText: string): string {
  const pre = htmlOrText.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i)
  const raw = pre ? pre[1] : htmlOrText
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n/g, '\n')
}

export function groupCifraUnits(blocks: CifraBlock[], showTab: boolean): CifraBlock[][] {
  const units: CifraBlock[][] = []
  let index = 0

  while (index < blocks.length) {
    const block = blocks[index]
    if (block.type === 'section' && !showTab && /^\[Tab\b/i.test(block.text.trim())) {
      index += 1
      continue
    }
    if (block.type === 'tab' && !showTab) {
      index += 1
      continue
    }
    if (block.type === 'chord' && blocks[index + 1]?.type === 'lyric') {
      units.push([block, blocks[index + 1]])
      index += 2
      continue
    }
    units.push([block])
    index += 1
  }

  return units
}

export function parseCifraBlocks(content: string): CifraBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: CifraBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (TAB_LINE_RE.test(line)) {
      const tabLines: string[] = []
      let label: string | undefined
      if (blocks.length > 0) {
        const prev = blocks[blocks.length - 1]
        if (prev.type === 'chord') {
          label = prev.text.trim()
          blocks.pop()
        }
      }
      while (i < lines.length && TAB_LINE_RE.test(lines[i])) {
        tabLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'tab', lines: tabLines, label })
      continue
    }

    if (/^\[.*\]/.test(trimmed)) {
      blocks.push({ type: 'section', text: trimmed })
      i++
      continue
    }

    if (!trimmed) {
      blocks.push({ type: 'empty' })
      i++
      continue
    }

    const tokens = trimmed.split(/\s+/)
    const chordRatio = tokens.filter(t => CHORD_TOKEN_RE.test(t) || t === '|').length / (tokens.length || 1)
    if (chordRatio > 0.5) {
      blocks.push({ type: 'chord', text: line })
      i++
      continue
    }

    blocks.push({ type: 'lyric', text: line })
    i++
  }

  return blocks
}

export function splitCifraPlainText(text: string, maxLines: number): { head: string; tail: string | null } {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  if (maxLines <= 0) return { head: '', tail: text }
  if (lines.length <= maxLines) return { head: text, tail: null }
  return {
    head: lines.slice(0, maxLines).join('\n'),
    tail: lines.slice(maxLines).join('\n'),
  }
}

export function stripCifraTablature(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const kept: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^\[Tab\b/i.test(trimmed)) continue
    if (TAB_LINE_RE.test(line)) continue
    kept.push(line)
  }

  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function wrapCifraPre(text: string): string {
  return `<pre>${escapeCifraHtml(text)}</pre>`
}

function escapeCifraHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
