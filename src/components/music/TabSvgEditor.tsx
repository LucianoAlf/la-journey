import React, { useRef, useMemo, useCallback } from 'react'
import type { BeatDuration, DotType, PickingDirection, TupletValue } from './TablatureEditor'

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
  /** Índices das colunas APÓS as quais desenhar barra de compasso */
  barlines?: number[]
  /** Mapa colIdx → número do compasso (exibido no topo) */
  barNumbers?: Map<number, number>
  /** Ligaduras: Set de strings "col-string" indicando tie da coluna col, corda string para a próxima */
  ties?: Set<string>
  /** Pontos de aumento por coluna */
  dots?: DotType[]
  /** Direção de palhetada por coluna */
  pickings?: PickingDirection[]
  /** Quiálteras por coluna */
  tuplets?: TupletValue[]
  /** Hidden input ref para captura de teclado (padrão CodeMirror) */
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** Handler de teclado para o hidden input */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

// ─── Layout ─────────────────────────────────────────────────────────

const STRING_SPACING = 14
const BEAT_WIDTHS: Record<BeatDuration, number> = {
  w: 52, h: 40, q: 32, '8': 24, '16': 18, '32': 14, '64': 12,
}
const LEFT_MARGIN = 26
const RIGHT_MARGIN = 6
const TOP_PAD = 4
const BOTTOM_PAD = 14
const LINE_GAP = 22
/** Largura fixa do viewBox (cabe sempre no container) */
const VB_WIDTH = 800
/** Largura disponível para beats em cada linha */
const USABLE_WIDTH = VB_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
const CURSOR_SIZE = 16
/** Altura extra no topo para números de compasso */
const BAR_NUM_H = 14
/** Quantas semínimas cabem em uma linha (para sincronizar com auto-expand) */
export const BEATS_PER_LINE = Math.floor(USABLE_WIDTH / BEAT_WIDTHS.q)

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
  barline: '#94A3B8',
  barNumber: '#6366F1',
}

// ─── Helper: distribuir beats em linhas ─────────────────────────────

interface RowLayout {
  startCol: number
  endCol: number // exclusive
  beatCenters: number[] // X de cada beat relativo ao inicio da linha
}

function buildRows(columns: number, durations: BeatDuration[]): RowLayout[] {
  const rows: RowLayout[] = []
  let col = 0

  while (col < columns) {
    let usedW = 0
    const startCol = col
    const centers: number[] = []

    while (col < columns) {
      const dur = durations[col] ?? 'q'
      const bw = BEAT_WIDTHS[dur]
      if (usedW + bw > USABLE_WIDTH && col > startCol) break
      centers.push(LEFT_MARGIN + usedW + bw / 2)
      usedW += bw
      col++
    }

    rows.push({ startCol, endCol: col, beatCenters: centers })
  }

  return rows
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
  barlines = [],
  barNumbers,
  ties,
  dots,
  pickings,
  tuplets,
  inputRef,
  onKeyDown,
}: TabSvgEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const stringCount = stringNames.length
  const staffH = (stringCount - 1) * STRING_SPACING
  const hasBarNums = barNumbers && barNumbers.size > 0
  const extraTop = hasBarNums ? BAR_NUM_H : 0
  const rowH = TOP_PAD + staffH + BOTTOM_PAD

  // ── Distribuir beats em linhas ──
  const rows = useMemo(() => buildRows(columns, durations), [columns, durations])

  // ── Dimensões do SVG ──
  const svgHeight = extraTop + rows.length * rowH + (rows.length - 1) * LINE_GAP + TOP_PAD + BOTTOM_PAD

  // ── Y base de cada linha (inclui offset para números de compasso) ──
  const rowY = useCallback((rowIdx: number) => extraTop + TOP_PAD + rowIdx * (rowH + LINE_GAP), [rowH, extraTop])

  // ── Y de cada corda dentro de uma linha ──
  const stringY = useCallback(
    (rowIdx: number, s: number) => rowY(rowIdx) + TOP_PAD + s * STRING_SPACING,
    [rowY],
  )

  // ── Hit test: converter coords do mouse → célula ──
  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      const scaleX = VB_WIDTH / rect.width
      const scaleY = svgHeight / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top) * scaleY

      // Encontrar qual linha (row) pelo Y
      let hitRow = -1
      for (let r = 0; r < rows.length; r++) {
        const ry = rowY(r)
        if (my >= ry && my < ry + rowH) { hitRow = r; break }
      }
      if (hitRow < 0) return null

      const row = rows[hitRow]

      // Encontrar coluna mais próxima pelo X
      let bestCol = -1
      let bestDist = Infinity
      for (let i = 0; i < row.beatCenters.length; i++) {
        const colIdx = row.startCol + i
        const cx = row.beatCenters[i]
        const dur = durations[colIdx] ?? 'q'
        const halfW = BEAT_WIDTHS[dur] / 2
        const dist = Math.abs(mx - cx)
        if (dist < halfW && dist < bestDist) {
          bestDist = dist
          bestCol = colIdx
        }
      }
      if (bestCol < 0) return null

      // Encontrar corda
      const rowTopY = rowY(hitRow) + TOP_PAD
      const relY = my - rowTopY + STRING_SPACING / 2
      if (relY < 0) return null
      const str = Math.floor(relY / STRING_SPACING)
      if (str < 0 || str >= stringCount) return null

      return { s: str, c: bestCol }
    },
    [svgHeight, rows, rowY, rowH, durations, stringCount],
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

  // ── Renderizar cada linha (sistema) ──
  const systemElements = useMemo(() => {
    const els: React.ReactElement[] = []

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]

      // Nomes das cordas (só na primeira linha)
      if (r === 0) {
        for (let s = 0; s < stringCount; s++) {
          els.push(
            <text
              key={`sn-${r}-${s}`}
              x={14} y={stringY(r, s)}
              textAnchor="middle" dominantBaseline="central"
              fontSize={10} fontWeight="600" fontFamily={FONT_UI}
              fill={C.stringName} style={{ userSelect: 'none' }}
            >{stringNames[s]}</text>,
          )
        }
      }

      // Linhas das cordas
      for (let s = 0; s < stringCount; s++) {
        const y = stringY(r, s)
        els.push(
          <line
            key={`line-${r}-${s}`}
            x1={LEFT_MARGIN - 4} y1={y}
            x2={VB_WIDTH - RIGHT_MARGIN} y2={y}
            stroke={C.line} strokeWidth={0.8}
          />,
        )
      }

      // Cursor / Hover / Notas para cada beat desta linha
      for (let i = 0; i < row.beatCenters.length; i++) {
        const colIdx = row.startCol + i
        const cx = row.beatCenters[i]

        // Cursor
        if (selectedCol === colIdx && selectedString !== null) {
          const cy = stringY(r, selectedString)
          const half = CURSOR_SIZE / 2
          els.push(
            <rect
              key={`cur-${colIdx}`}
              x={cx - half} y={cy - half}
              width={CURSOR_SIZE} height={CURSOR_SIZE}
              fill={C.fretBg} rx={3}
              stroke={C.cursor} strokeWidth={2}
              style={{ pointerEvents: 'none' }}
            />,
          )
        }

        // Hover
        if (hoverCell && hoverCell.c === colIdx &&
            !(hoverCell.s === selectedString && hoverCell.c === selectedCol)) {
          const cy = stringY(r, hoverCell.s)
          const half = CURSOR_SIZE / 2
          els.push(
            <rect
              key={`hov-${colIdx}`}
              x={cx - half} y={cy - half}
              width={CURSOR_SIZE} height={CURSOR_SIZE}
              fill={C.hoverBg} rx={3}
              style={{ pointerEvents: 'none' }}
            />,
          )
        }

        // Símbolo de palhetada (abaixo da última corda)
        const pick = pickings?.[colIdx]
        if (pick && pick !== 'none') {
          const pickY = stringY(r, stringCount - 1) + 12
          if (pick === 'down') {
            // П — downstroke: path em forma de "banquinho"
            els.push(
              <path
                key={`pick-${colIdx}`}
                d={`M${cx - 4} ${pickY - 2} L${cx - 4} ${pickY + 5} L${cx + 4} ${pickY + 5} L${cx + 4} ${pickY - 2}`}
                stroke="#6366F1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"
                style={{ pointerEvents: 'none' }}
              />,
            )
          } else {
            // V — upstroke
            els.push(
              <text
                key={`pick-${colIdx}`}
                x={cx} y={pickY + 2}
                textAnchor="middle" dominantBaseline="central"
                fontSize={10} fontWeight="bold" fontFamily={FONT_UI}
                fill="#6366F1"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >V</text>,
            )
          }
        }

        // Notas + pontos de aumento ao lado
        const dotCount = (dots?.[colIdx] ?? 0) as number
        for (let s = 0; s < stringCount; s++) {
          const val = grid[s]?.[colIdx] ?? null
          if (val === null) continue
          const cy = stringY(r, s)
          const isSelected = selectedCol === colIdx && selectedString === s
          const textW = String(val).length === 1 ? 12 : 18

          els.push(
            <rect
              key={`fbg-${s}-${colIdx}`}
              x={cx - textW / 2 - 2} y={cy - 7}
              width={textW + 4} height={14}
              fill={C.fretBg} rx={2}
              style={{ pointerEvents: 'none' }}
            />,
          )
          els.push(
            <text
              key={`f-${s}-${colIdx}`}
              x={cx} y={cy}
              textAnchor="middle" dominantBaseline="central"
              fontSize={12} fontWeight="bold" fontFamily={FONT_FRET}
              fill={isSelected ? C.cursor : C.fret}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >{val}</text>,
          )

          // Pontos de aumento à direita do número
          if (dotCount > 0) {
            const dotStartX = cx + textW / 2 + 5
            for (let d = 0; d < dotCount; d++) {
              els.push(
                <circle
                  key={`dot-${colIdx}-${s}-${d}`}
                  cx={dotStartX + d * 4}
                  cy={cy}
                  r={1.5}
                  fill={isSelected ? C.cursor : '#6366F1'}
                  style={{ pointerEvents: 'none' }}
                />,
              )
            }
          }
        }
      }

      // Barras de compasso nesta linha
      const barlineSet = new Set(barlines)
      for (let i = 0; i < row.beatCenters.length; i++) {
        const colIdx = row.startCol + i

        // Barra de compasso APÓS esta coluna + número do próximo compasso em cima da barra
        if (barlineSet.has(colIdx) && i < row.beatCenters.length - 1) {
          const cx = row.beatCenters[i]
          const nextCx = row.beatCenters[i + 1]
          const barX = (cx + nextCx) / 2
          const y1 = stringY(r, 0)
          const y2 = stringY(r, stringCount - 1)
          els.push(
            <line
              key={`bar-${r}-${colIdx}`}
              x1={barX} y1={y1 - 2}
              x2={barX} y2={y2 + 2}
              stroke={C.barline} strokeWidth={1.2}
              style={{ pointerEvents: 'none' }}
            />,
          )
          // Número do compasso seguinte — em cima da barline
          if (barNumbers) {
            const nextBarNum = barNumbers.get(colIdx + 1)
            if (nextBarNum !== undefined) {
              const topY = rowY(r) - 2
              els.push(
                <text
                  key={`bn-${r}-${colIdx}`}
                  x={barX} y={topY}
                  textAnchor="middle" dominantBaseline="auto"
                  fontSize={9} fontWeight="600" fontFamily={FONT_UI}
                  fill={C.barNumber}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{nextBarNum}</text>,
              )
            }
          }
        }

        // Número do primeiro compasso (coluna 0) — fica acima da primeira nota
        if (barNumbers && colIdx === row.startCol) {
          const barNum = barNumbers.get(colIdx)
          if (barNum !== undefined) {
            const cx = row.beatCenters[i]
            const topY = rowY(r) - 2
            els.push(
              <text
                key={`bn-first-${r}-${colIdx}`}
                x={cx} y={topY}
                textAnchor="middle" dominantBaseline="auto"
                fontSize={9} fontWeight="600" fontFamily={FONT_UI}
                fill={C.barNumber}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >{barNum}</text>,
            )
          }
        }
      }

      // Colchetes de quiáltera (tuplet brackets) acima das notas
      if (tuplets && tuplets.length > 0) {
        let i = 0
        while (i < row.beatCenters.length) {
          const colIdx = row.startCol + i
          const tv = tuplets[colIdx] ?? 0
          if (tv > 0) {
            // Encontrar grupo consecutivo com mesmo tuplet value
            let groupEnd = i
            let count = 0
            while (groupEnd < row.beatCenters.length) {
              const gColIdx = row.startCol + groupEnd
              if ((tuplets[gColIdx] ?? 0) === tv) {
                count++
                groupEnd++
                if (count >= tv) break
              } else {
                break
              }
            }
            // Renderizar colchete se temos pelo menos 2 notas no grupo
            if (count >= 2) {
              const x1 = row.beatCenters[i]
              const x2 = row.beatCenters[groupEnd - 1]
              const bracketY = stringY(r, 0) - 12
              const midX = (x1 + x2) / 2
              // Colchete: [ N ]
              els.push(
                <line key={`tub-l-${colIdx}`} x1={x1 - 2} y1={bracketY + 4} x2={x1 - 2} y2={bracketY}
                  stroke="#6366F1" strokeWidth={1} style={{ pointerEvents: 'none' }} />,
                <line key={`tub-t-${colIdx}`} x1={x1 - 2} y1={bracketY} x2={midX - 6} y2={bracketY}
                  stroke="#6366F1" strokeWidth={1} style={{ pointerEvents: 'none' }} />,
                <text key={`tun-${colIdx}`} x={midX} y={bracketY + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={8} fontWeight="bold" fontFamily={FONT_UI}
                  fill="#6366F1" style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{tv}</text>,
                <line key={`tub-t2-${colIdx}`} x1={midX + 6} y1={bracketY} x2={x2 + 2} y2={bracketY}
                  stroke="#6366F1" strokeWidth={1} style={{ pointerEvents: 'none' }} />,
                <line key={`tub-r-${colIdx}`} x1={x2 + 2} y1={bracketY} x2={x2 + 2} y2={bracketY + 4}
                  stroke="#6366F1" strokeWidth={1} style={{ pointerEvents: 'none' }} />,
              )
            }
            i = groupEnd
          } else {
            i++
          }
        }
      }

      // Ligaduras (arcos) nesta linha
      if (ties && ties.size > 0) {
        for (let i = 0; i < row.beatCenters.length; i++) {
          const colIdx = row.startCol + i
          for (let s = 0; s < stringCount; s++) {
            if (!ties.has(`${colIdx}-${s}`)) continue
            // Encontrar o centro X da próxima coluna
            const nextI = i + 1
            if (nextI < row.beatCenters.length) {
              // Mesma linha
              const x1 = row.beatCenters[i]
              const x2 = row.beatCenters[nextI]
              const cy = stringY(r, s)
              const midX = (x1 + x2) / 2
              const arcY = cy + 10
              els.push(
                <path
                  key={`tie-${colIdx}-${s}`}
                  d={`M ${x1 + 5} ${cy + 6} Q ${midX} ${arcY + 4} ${x2 - 5} ${cy + 6}`}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth={1.5}
                  style={{ pointerEvents: 'none' }}
                />,
              )
            }
            // Se a próxima coluna está na linha seguinte, não renderizar (simplificação)
          }
        }
      }
    }

    return els
  }, [rows, stringCount, stringNames, stringY, rowY, grid, selectedCol, selectedString, hoverCell, barlines, barNumbers, ties, dots, pickings, tuplets])

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden">
      {/* Hidden input para captura de teclado (padrão CodeMirror/Monaco) */}
      {inputRef && onKeyDown && (
        <input
          ref={inputRef}
          type="text"
          onKeyDown={onKeyDown}
          aria-label="Editor de tablatura - captura de teclado"
          autoComplete="off"
          tabIndex={-1}
          style={{
            position: 'absolute',
            opacity: 0,
            width: 1,
            height: 1,
            top: 0,
            left: 0,
            pointerEvents: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            outline: 'none',
          }}
        />
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_WIDTH} ${svgHeight}`}
        width="100%"
        style={{ display: 'block', cursor: 'default' }}
        role="img"
        aria-label="Editor de tablatura"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <rect x={0} y={0} width={VB_WIDTH} height={svgHeight} fill={C.bg} />
        {systemElements}
      </svg>
    </div>
  )
}
