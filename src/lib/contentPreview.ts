import type { PreparedMaterialBlock } from './contentBrowserAdapters'

export type ContentPreviewKind = 'text' | 'notation' | 'chord' | 'tablature' | 'keyboard' | 'media' | 'layout'

export interface ContentPreviewChip {
  kind: ContentPreviewKind
  label: string
  count: number
  detail?: string
}

export interface ContentPreviewSummary {
  chips: ContentPreviewChip[]
  summary: string
  primaryKind: ContentPreviewKind
}

const LABELS: Record<ContentPreviewKind, string> = {
  text: 'Texto',
  notation: 'Pauta',
  chord: 'Acordes',
  tablature: 'Tablatura',
  keyboard: 'Teclado',
  media: 'Midia',
  layout: 'Layout',
}

const KIND_ORDER: ContentPreviewKind[] = ['text', 'notation', 'chord', 'tablature', 'keyboard', 'media', 'layout']
const PRIMARY_ORDER: ContentPreviewKind[] = ['notation', 'tablature', 'chord', 'keyboard', 'text', 'media', 'layout']

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isTextLike(type: string) {
  return ['text', 'tip', 'exercise', 'title'].includes(type)
}

function getChordName(chord: unknown): string | null {
  if (typeof chord === 'string') return textValue(chord) || null
  const item = recordValue(chord)
  return textValue(item.chord_name) || textValue(item.name) || null
}

function collectChordNames(block: PreparedMaterialBlock) {
  const renderData = recordValue(block.renderData)
  const content = recordValue(block.content)
  const source = Array.isArray(renderData.chords)
    ? renderData.chords
    : Array.isArray(content.chords)
      ? content.chords
      : []

  const names: string[] = []
  for (const chord of source) {
    const name = getChordName(chord)
    if (name && !names.includes(name)) names.push(name)
  }
  return names.slice(0, 5)
}

function blockKinds(block: PreparedMaterialBlock): ContentPreviewKind[] {
  const type = block.blockType
  const renderData = recordValue(block.renderData)
  const content = recordValue(block.content)
  const kinds = new Set<ContentPreviewKind>()

  if (isTextLike(type)) kinds.add('text')
  if (type === 'notation' || type === 'rhythm') kinds.add('notation')
  if (type === 'tablature') kinds.add('tablature')
  if (type === 'chord_grid' || type === 'chord_diagram') kinds.add('chord')
  if (type === 'keyboard' || type === 'keyboard_grid') kinds.add('keyboard')
  if (['image', 'audio', 'video', 'qr_code'].includes(type)) kinds.add('media')
  if (['cover', 'columns', 'separator', 'page_break'].includes(type)) kinds.add('layout')

  if (renderData.notation || renderData.notation_data || (textValue(renderData.alphaTex) && type !== 'tablature')) {
    kinds.add('notation')
  }
  if (Array.isArray(renderData.chords) || Array.isArray(content.chords)) kinds.add('chord')
  if (Array.isArray(renderData.keyboards)) kinds.add('keyboard')

  return [...kinds]
}

export function buildContentPreview(blocks: PreparedMaterialBlock[]): ContentPreviewSummary {
  const counts = new Map<ContentPreviewKind, number>()
  const chordNames: string[] = []

  for (const block of blocks) {
    for (const kind of blockKinds(block)) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
    for (const name of collectChordNames(block)) {
      if (!chordNames.includes(name)) chordNames.push(name)
    }
  }

  const chips = KIND_ORDER
    .filter(kind => counts.has(kind))
    .map((kind): ContentPreviewChip => ({
      kind,
      label: LABELS[kind],
      count: counts.get(kind) ?? 0,
      ...(kind === 'chord' && chordNames.length ? { detail: chordNames.slice(0, 5).join(', ') } : {}),
    }))

  const summary = chips.length
    ? chips.map(chip => chip.label).join(' + ')
    : 'Sem blocos prontos'

  return {
    chips,
    summary,
    primaryKind: PRIMARY_ORDER.find(kind => counts.has(kind)) ?? 'text',
  }
}
