import { useMemo } from 'react'
import type { FretboardNote } from './GuitarFretboardDiagram'

// ── Tipos ──────────────────────────────────────────────────────────────

interface SimpleTablatureProps {
  /** Notas do fretboard para exibir como tablatura */
  notes: FretboardNote[]
  /** Número de casas no braço (default: 15) */
  fretCount?: number
  /** Número de cordas do instrumento (default: 6) */
  stringCount?: number
  /** Classe CSS adicional */
  className?: string
}

// ── Constantes de layout ───────────────────────────────────────────────

/** Espaçamento entre linhas (cordas) */
const LINE_SPACING = 14
/** Margem superior antes da primeira linha */
const TOP_MARGIN = 18
/** Largura reservada para o clef "TAB" à esquerda */
const TAB_CLEF_WIDTH = 28
/** Espaço entre o TAB clef e o início das notas */
const CLEF_GAP = 6
/** Margem inferior */
const BOTTOM_MARGIN = 8
/** Tamanho da fonte dos números */
const FONT_SIZE = 11
/** Tamanho da fonte do TAB clef */
const TAB_FONT_SIZE = 14

// ── Componente ─────────────────────────────────────────────────────────

/**
 * Tablatura SVG customizada — linhas horizontais com números de traste.
 * Componente leve, sem dependências externas (alphaTab, VexFlow).
 * Suporta número variável de cordas (4/5/6).
 */
export function SimpleTablature({
  notes,
  fretCount = 15,
  stringCount = 6,
  className = '',
}: SimpleTablatureProps) {
  // Ordenar notas: corda grave (6) → aguda (1), traste crescente
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.string !== b.string) return b.string - a.string
      return a.fret - b.fret
    })
  }, [notes])

  // Distribuir notas sequencialmente na área disponível
  const svgWidth = 940
  const startX = TAB_CLEF_WIDTH + CLEF_GAP
  const endX = svgWidth
  const availableWidth = endX - startX
  const totalNotes = sortedNotes.length
  const noteSpacing = totalNotes > 1 ? availableWidth / totalNotes : availableWidth

  // Mapear cada nota para posição X/Y
  const notePositions = useMemo(() => {
    return sortedNotes.map((n, idx) => {
      // Tablatura padrão: corda 1 (e aguda) = linha de cima, corda 6 (E grave) = linha de baixo
      const cordaIdx = n.string - 1
      const y = TOP_MARGIN + cordaIdx * LINE_SPACING
      const x = startX + (idx + 0.5) * noteSpacing
      return {
        x,
        y,
        fret: n.fret,
        isRoot: n.isRoot ?? false,
      }
    })
  }, [sortedNotes, noteSpacing, startX])

  // Dimensões do SVG
  const svgHeight = TOP_MARGIN + (stringCount - 1) * LINE_SPACING + BOTTOM_MARGIN

  // Cores (respeita tema)
  const lineColor = 'var(--border, #B4B9C3)'
  const textColor = 'var(--foreground, #1E1E28)'
  const rootColor = '#F97316' // laranja — padrão semântico de tônica

  if (notes.length === 0) return null

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={`w-full ${className}`}
      style={{ display: 'block' }}
      role="img"
      aria-label="Tablatura"
    >
      {/* ── Linhas horizontais (cordas) ── */}
      {Array.from({ length: stringCount }, (_, i) => {
        const y = TOP_MARGIN + i * LINE_SPACING
        return (
          <line
            key={`line-${i}`}
            x1={TAB_CLEF_WIDTH - 4}
            y1={y}
            x2={svgWidth}
            y2={y}
            stroke={lineColor}
            strokeWidth={0.8}
          />
        )
      })}

      {/* ── TAB clef (centralizado verticalmente) ── */}
      {['T', 'A', 'B'].map((letter, i) => {
        const totalHeight = (stringCount - 1) * LINE_SPACING
        const yPos = TOP_MARGIN + (i / 2) * totalHeight
        return (
          <text
            key={`tab-${letter}`}
            x={TAB_CLEF_WIDTH / 2}
            y={yPos}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={TAB_FONT_SIZE}
            fontWeight="bold"
            fontFamily="DM Sans, sans-serif"
            fill={textColor}
          >
            {letter}
          </text>
        )
      })}

      {/* ── Números dos trastes ── */}
      {notePositions.map((pos, i) => (
        <text
          key={`note-${i}`}
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={FONT_SIZE}
          fontWeight={pos.isRoot ? 'bold' : 'normal'}
          fontFamily="DM Mono, monospace"
          fill={pos.isRoot ? rootColor : textColor}
        >
          {pos.fret}
        </text>
      ))}
    </svg>
  )
}
