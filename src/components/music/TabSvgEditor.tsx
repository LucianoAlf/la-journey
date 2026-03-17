import React, { useRef, useMemo, useCallback } from 'react'
import type { BeatDuration } from './TablatureEditor'

// ─── Tipos ──────────────────────────────────────────────────────────

type TabCell = number | null
type TabGrid = TabCell[][]

export interface TabSvgEditorProps {
  grid: TabGrid
  columns: number
  stringNames: string[]
  durations: BeatDuration[]
  selectedCol: number | null
  selectedString: number | null
  onCellClick: (stringIdx: number, colIdx: number) => void
  onCellDoubleClick: (stringIdx: number, colIdx: number) => void
  onDurationClick: (colIdx: number) => void
  hoverCell: { s: number; c: number } | null
  onHoverCell: (cell: { s: number; c: number } | null) => void
}

// ─── Layout ─────────────────────────────────────────────────────────

const STRING_SPACING = 18
/** Largura base de cada beat — varia por duração */
const BEAT_WIDTHS: Record<BeatDuration, number> = {
  w: 80, h: 60, q: 50, '8': 38, '16': 30,
}
/** Margem esquerda (nomes de corda) */
const LEFT_MARGIN = 30
/** Margem direita */
const RIGHT_MARGIN = 16
/** Margem superior */
const TOP_MARGIN = 14
/** Margem inferior */
const BOTTOM_MARGIN = 14

// ─── Fontes ─────────────────────────────────────────────────────────

const FONT_FRET = 'DM Mono, monospace'
const FONT_UI = 'DM Sans, sans-serif'

// ─── Cores ──────────────────────────────────────────────────────────

const C = {
  bg: 'var(--card, #FFFFFF)',
  line: '#C8CCD4',
  stringName: '#6B7280',
  fret: '#1E1E28',
  fretBg: 'var(--card, #FFFFFF)',
  cursor: '#F59E0B',
  hoverBg: 'rgba(99, 102, 241, 0.06)',
}

// ─── Componente Principal ───────────────────────────────────────────

export function TabSvgEditor({
  grid,
  columns,
  stringNames,
  durations,
  selectedCol,
  selectedString,
  onCellClick,
  onCellDoubleClick,
  onDurationClick,
  hoverCell,
  onHoverCell,
}: TabSvgEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const stringCount = stringNames.length

  // ── Mapa: coluna → posição X central (layout linear) ──
  const colXMap = useMemo(() => {
    const map: number[] = []
    let x = LEFT_MARGIN
    for (let c = 0; c < columns; c++) {
      const dur = durations[c] ?? 'q'
      const bw = BEAT_WIDTHS[dur]
      map[c] = x + bw / 2
      x += bw
    }
    return map
  }, [columns, durations])

  // ── Dimensões ──
  const contentEndX = useMemo(() => {
    let x = LEFT_MARGIN
    for (let c = 0; c < columns; c++) {
      x += BEAT_WIDTHS[durations[c] ?? 'q']
    }
    return x
  }, [columns, durations])
  const svgWidth = contentEndX + RIGHT_MARGIN
  const staffTop = TOP_MARGIN
  const staffBottom = staffTop + (stringCount - 1) * STRING_SPACING
  const svgHeight = staffBottom + BOTTOM_MARGIN

  // ── Y de cada corda ──
  const stringY = useCallback((s: number) => staffTop + s * STRING_SPACING, [staffTop])

  // ── Hit test: converter coords do mouse → célula ──
  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      const scaleX = svgWidth / rect.width
      const scaleY = svgHeight / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top) * scaleY

      // Encontrar coluna mais próxima pelo X
      let bestCol = -1
      let bestDist = Infinity
      for (let c = 0; c < columns; c++) {
        const cx = colXMap[c]
        if (cx === undefined) continue
        const dist = Math.abs(mx - cx)
        const dur = durations[c] ?? 'q'
        const halfW = BEAT_WIDTHS[dur] / 2
        if (dist < halfW && dist < bestDist) {
          bestDist = dist
          bestCol = c
        }
      }
      if (bestCol < 0) return null

      // Encontrar corda
      const relY = my - staffTop + STRING_SPACING / 2
      if (relY < 0) return null
      const str = Math.floor(relY / STRING_SPACING)
      if (str < 0 || str >= stringCount) return null

      return { s: str, c: bestCol }
    },
    [svgWidth, svgHeight, columns, colXMap, durations, staffTop, stringCount],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const cell = getCellFromEvent(e)
      if (cell) onCellClick(cell.s, cell.c)
    },
    [getCellFromEvent, onCellClick],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const cell = getCellFromEvent(e)
      if (cell) onCellDoubleClick(cell.s, cell.c)
    },
    [getCellFromEvent, onCellDoubleClick],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const cell = getCellFromEvent(e)
      onHoverCell(cell)
    },
    [getCellFromEvent, onHoverCell],
  )

  const handleMouseLeave = useCallback(() => onHoverCell(null), [onHoverCell])

  // ── SVG Elements ──

  // Nomes das cordas (à esquerda)
  const stringNameLabels = useMemo(
    () => stringNames.map((name, s) => (
      <text
        key={`sn-${s}`}
        x={14} y={stringY(s)}
        textAnchor="middle" dominantBaseline="central"
        fontSize={10} fontWeight="600" fontFamily={FONT_UI}
        fill={C.stringName} style={{ userSelect: 'none' }}
      >{name}</text>
    )),
    [stringNames, stringY],
  )

  // Linhas das cordas
  const stringLines = useMemo(
    () => Array.from({ length: stringCount }, (_, s) => {
      const y = stringY(s)
      return (
        <line
          key={`str-${s}`}
          x1={LEFT_MARGIN - 4} y1={y}
          x2={contentEndX + 4} y2={y}
          stroke={C.line} strokeWidth={0.8}
        />
      )
    }),
    [stringCount, stringY, contentEndX],
  )

  // Cursor / seleção — quadrado compacto, fundo branco, borda laranja
  const CURSOR_SIZE = 18
  const cursorHighlight = useMemo(() => {
    if (selectedCol === null || selectedString === null) return null
    const cx = colXMap[selectedCol]
    if (cx === undefined) return null
    const cy = stringY(selectedString)
    const half = CURSOR_SIZE / 2

    return (
      <rect
        x={cx - half} y={cy - half}
        width={CURSOR_SIZE} height={CURSOR_SIZE}
        fill={C.fretBg} rx={3}
        stroke={C.cursor} strokeWidth={2}
        style={{ pointerEvents: 'none' }}
      />
    )
  }, [selectedCol, selectedString, colXMap, stringY])

  // Hover — quadrado compacto sutil
  const hoverHighlight = useMemo(() => {
    if (!hoverCell) return null
    if (hoverCell.s === selectedString && hoverCell.c === selectedCol) return null
    const cx = colXMap[hoverCell.c]
    if (cx === undefined) return null
    const cy = stringY(hoverCell.s)
    const half = CURSOR_SIZE / 2
    return (
      <rect
        x={cx - half} y={cy - half} width={CURSOR_SIZE} height={CURSOR_SIZE}
        fill={C.hoverBg} rx={3}
        style={{ pointerEvents: 'none' }}
      />
    )
  }, [hoverCell, selectedCol, selectedString, colXMap, stringY])

  // Notas (números de traste)
  const beatContents = useMemo(() => {
    const els: React.ReactElement[] = []

    for (let c = 0; c < columns; c++) {
      const cx = colXMap[c]
      if (cx === undefined) continue

      for (let s = 0; s < stringCount; s++) {
        const val = grid[s]?.[c] ?? null
        if (val === null) continue
        const cy = stringY(s)
        const isSelected = selectedCol === c && selectedString === s
        const textW = String(val).length === 1 ? 12 : 18

        // Fundo branco atrás do número
        els.push(
          <rect
            key={`fbg-${s}-${c}`}
            x={cx - textW / 2 - 2} y={cy - 7}
            width={textW + 4} height={14}
            fill={C.fretBg} rx={2}
            style={{ pointerEvents: 'none' }}
          />,
        )

        // Número do traste
        els.push(
          <text
            key={`f-${s}-${c}`}
            x={cx} y={cy}
            textAnchor="middle" dominantBaseline="central"
            fontSize={12} fontWeight="bold" fontFamily={FONT_FRET}
            fill={isSelected ? C.cursor : C.fret}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >{val}</text>,
        )
      }
    }

    return els
  }, [grid, columns, stringCount, colXMap, stringY, selectedCol, selectedString])

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ display: 'block', minHeight: Math.max(svgHeight * 0.8, 140), cursor: 'default' }}
        role="img"
        aria-label="Editor de tablatura"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Fundo */}
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill={C.bg} />

        {/* Nomes das cordas */}
        {stringNameLabels}

        {/* Linhas das cordas */}
        {stringLines}

        {/* Cursor */}
        {cursorHighlight}

        {/* Hover */}
        {hoverHighlight}

        {/* Notas */}
        {beatContents}
      </svg>
    </div>
  )
}
