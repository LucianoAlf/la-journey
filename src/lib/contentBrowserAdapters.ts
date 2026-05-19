import { getRenderableGridChords } from './editorChordSelection'

export interface PreparedMaterialBlock {
  blockType: string
  title: string | null
  content: Record<string, unknown> | null
  renderData: Record<string, unknown> | null
}

function cloneRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  } catch {
    return { ...(value as Record<string, unknown>) }
  }
}

function normalizeBlockType(blockType: unknown) {
  const type = typeof blockType === 'string' ? blockType : 'text'
  if (type === 'example') return 'tip'
  if (type === 'keyboard_diagram') return 'keyboard'
  if (type === 'chord_chart') return 'chord_grid'
  if (type === 'scale_diagram' || type === 'rhythm_pattern') return 'text'
  return type
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function chordPositionsFromLibraryItem(item: Record<string, unknown>) {
  const positions = cloneRecord(item.positions)
  const fingersFromPositions = Array.isArray(positions?.fingers) ? positions.fingers : null
  const barresFromPositions = Array.isArray(positions?.barres) ? positions.barres : null
  const mutedFromPositions = Array.isArray(positions?.muted) ? positions.muted : null

  return {
    fingers: fingersFromPositions ?? (cloneRecord(item.fingers)?.fingers as unknown[] | undefined) ?? [],
    barres: barresFromPositions ?? (Array.isArray(item.barre) ? item.barre : []) ?? [],
    muted: mutedFromPositions ?? [],
  }
}

export function adaptContentBlockItem(item: {
  block_type?: unknown
  title?: string | null
  content?: unknown
  render_data?: unknown
}): PreparedMaterialBlock[] {
  const blockType = normalizeBlockType(item.block_type)
  const content = cloneRecord(item.content) ?? { text: '' }
  const renderData = cloneRecord(item.render_data)

  if (blockType === 'chord_grid') {
    const renderChords = Array.isArray(renderData?.chords) ? renderData.chords : []
    const contentChords = Array.isArray(content.chords) ? content.chords : []
    const chords = getRenderableGridChords(renderChords.length ? renderChords : contentChords)
    return [{
      blockType,
      title: item.title ?? null,
      content,
      renderData: {
        ...(renderData ?? {}),
        ...(chords.length ? { chords } : {}),
        columns: typeof renderData?.columns === 'number'
          ? renderData.columns
          : Math.min(Math.max(chords.length, 3), 5),
      },
    }]
  }

  return [{
    blockType,
    title: item.title ?? null,
    content,
    renderData,
  }]
}

export function adaptNotationLibraryItem(item: {
  name?: string | null
  description?: string | null
  clef?: string | null
  key_signature?: string | null
  time_signature?: string | null
  notation_data?: unknown
  render_data?: unknown
}): PreparedMaterialBlock[] {
  const renderData = cloneRecord(item.render_data) ?? {}
  const notationData = cloneRecord(item.notation_data)

  return [{
    blockType: 'notation',
    title: item.name ?? 'Notacao',
    content: { text: item.description ?? '' },
    renderData: {
      ...renderData,
      notation: notationData,
      notation_data: notationData,
      clef: item.clef ?? 'treble',
      key_signature: item.key_signature ?? 'C',
      time_signature: item.time_signature ?? null,
    },
  }]
}

export function adaptChordLibraryItem(item: {
  name?: string | null
  instrument?: string | null
  positions?: unknown
  fingers?: unknown
  barre?: unknown
  svg_config?: unknown
}): PreparedMaterialBlock[] {
  const name = item.name ?? 'Acorde'
  const positions = chordPositionsFromLibraryItem(item as Record<string, unknown>)

  return [{
    blockType: 'chord_diagram',
    title: name,
    content: { text: '' },
    renderData: {
      ...cloneRecord(item.svg_config),
      chord_name: name,
      instrument: item.instrument ?? 'guitar',
      ...positions,
    },
  }]
}

export function adaptRepertoireItem(item: {
  title?: string | null
  artist?: string | null
  key?: string | null
  chords?: string[] | null
  cifra_content?: string | null
}, options: { includeChordGrid?: boolean } = {}): PreparedMaterialBlock[] {
  const title = item.title ?? 'Repertorio'
  const artist = item.artist?.trim()
  const chords = item.chords?.filter(Boolean) ?? []
  const cifra = item.cifra_content?.trim() ?? ''
  const metaParts = [
    artist ? `<strong>Artista:</strong> ${escapeHtml(artist)}` : '',
    item.key ? `<strong>Tom:</strong> ${escapeHtml(item.key)}` : '',
    chords.length ? `<strong>Acordes:</strong> ${escapeHtml(chords.join(', '))}` : '',
  ].filter(Boolean)

  const html = [
    metaParts.length ? `<p>${metaParts.join(' &middot; ')}</p>` : '',
    cifra ? `<pre>${escapeHtml(cifra)}</pre>` : '<p>Repertorio selecionado.</p>',
  ].filter(Boolean).join('')

  const blocks: PreparedMaterialBlock[] = [{
    blockType: 'text',
    title,
    content: { html, text: stripHtml(html) },
    renderData: null,
  }]

  if (options.includeChordGrid && chords.length > 0) {
    blocks.push({
      blockType: 'chord_grid',
      title: `${title} — Acordes`,
      content: {
        text: `Acordes de ${title}`,
        key: item.key ?? null,
        chords,
      },
      renderData: {
        chords,
        columns: Math.min(Math.max(chords.length, 3), 5),
      },
    })
  }

  return blocks
}

export function adaptExerciseLibraryItem(item: {
  blocks?: Array<{
    block_type?: unknown
    title?: string | null
    content?: unknown
    render_data?: unknown
  }> | null
}): PreparedMaterialBlock[] {
  return (item.blocks ?? []).map(block => ({
    blockType: normalizeBlockType(block.block_type),
    title: block.title ?? null,
    content: cloneRecord(block.content) ?? null,
    renderData: cloneRecord(block.render_data),
  }))
}
