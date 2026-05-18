export interface EditorChordLibraryItem {
  id: string
  name: string
  canonical_name?: string | null
  instrument?: string | null
  caged_shape?: string | null
  positions?: unknown
  fingers?: unknown
  barre?: unknown
  svg_config?: unknown
}

export interface ChordEditableBlock {
  title?: string | null
  block_type?: string
  render_data?: Record<string, any> | null
}

function cloneRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, any>
  } catch {
    return { ...(value as Record<string, any>) }
  }
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : []
}

function inferChordPosition(positions: Record<string, any>) {
  if (typeof positions.position === 'number' && positions.position > 0) return positions.position

  const frets = [
    ...arrayValue(positions.fingers)
      .map((finger: any) => Array.isArray(finger) ? finger[1] : null)
      .filter((fret): fret is number => typeof fret === 'number' && fret > 0),
    ...arrayValue(positions.barres)
      .map((barre: any) => barre?.fret)
      .filter((fret): fret is number => typeof fret === 'number' && fret > 0),
  ]

  if (frets.length === 0) return 1
  return Math.min(...frets)
}

function getAutoChordGridColumns(currentColumns: unknown, chordCount: number) {
  const safeCurrentColumns = typeof currentColumns === 'number' && currentColumns > 0 ? currentColumns : 3
  return Math.min(5, Math.max(safeCurrentColumns, Math.min(chordCount, 5)))
}

export function chordLibraryItemToRenderData(item: EditorChordLibraryItem) {
  const positions = cloneRecord(item.positions)
  const svgConfig = cloneRecord(item.svg_config)

  return {
    ...svgConfig,
    chord_name: item.canonical_name ?? item.name,
    chord_library_id: item.id,
    instrument: item.instrument ?? 'guitar',
    caged_shape: item.caged_shape ?? undefined,
    fingers: arrayValue(positions.fingers).length > 0 ? positions.fingers : arrayValue((cloneRecord(item.fingers).fingers)),
    barres: arrayValue(positions.barres).length > 0 ? positions.barres : arrayValue(item.barre),
    muted: arrayValue(positions.muted),
    position: inferChordPosition(positions),
  }
}

export function applyLibraryChordToDiagramBlock<TBlock extends ChordEditableBlock>(
  block: TBlock,
  item: EditorChordLibraryItem,
): TBlock {
  const renderData = chordLibraryItemToRenderData(item)

  return {
    ...block,
    title: renderData.chord_name || block.title || item.name,
    render_data: {
      ...(block.render_data ?? {}),
      ...renderData,
    },
  }
}

export function applyLibraryChordToGridBlock<TBlock extends ChordEditableBlock>(
  block: TBlock,
  item: EditorChordLibraryItem,
  index?: number | null,
): TBlock {
  const renderData = chordLibraryItemToRenderData(item)
  const currentChords = Array.isArray(block.render_data?.chords) ? block.render_data.chords : []
  const nextChords = typeof index === 'number' && index >= 0
    ? currentChords.map((chord, chordIndex) => chordIndex === index ? { ...chord, ...renderData } : chord)
    : [...currentChords, renderData]
  const shouldAutoGrowColumns = !(typeof index === 'number' && index >= 0)

  return {
    ...block,
    render_data: {
      ...(block.render_data ?? {}),
      ...(shouldAutoGrowColumns ? { columns: getAutoChordGridColumns(block.render_data?.columns, nextChords.length) } : {}),
      chords: nextChords,
    },
  }
}

function diagramBlockToGridChord(block: ChordEditableBlock) {
  const renderData = block.render_data ?? {}
  const chordName = renderData.chord_name ?? block.title ?? 'Acorde'

  return {
    chord_name: chordName,
    chord_library_id: renderData.chord_library_id,
    instrument: renderData.instrument ?? 'guitar',
    fingers: arrayValue(renderData.fingers),
    barres: arrayValue(renderData.barres),
    muted: arrayValue(renderData.muted),
    position: typeof renderData.position === 'number' ? renderData.position : 1,
    strings: renderData.strings,
  }
}

export function appendLibraryChordToDiagramAsGridBlock<TBlock extends ChordEditableBlock>(
  block: TBlock,
  item: EditorChordLibraryItem,
): TBlock {
  const existingChord = diagramBlockToGridChord(block)
  const renderData = chordLibraryItemToRenderData(item)

  return {
    ...block,
    block_type: 'chord_grid',
    title: 'Grade de Acordes',
    render_data: {
      columns: getAutoChordGridColumns(block.render_data?.columns, 2),
      chords: [existingChord, renderData],
    },
  }
}
