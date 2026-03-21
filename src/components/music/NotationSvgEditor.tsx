import React, { useRef, useMemo, useCallback } from 'react'

// ─── Tipos ──────────────────────────────────────────────────────────

export type BeatDuration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64'

export interface PitchData {
  pitch: string        // 'C/4', 'G/5', etc.
  accidental?: string  // '#', 'b', 'n', ou undefined
}

export interface Beat {
  pitches: PitchData[]
  duration: BeatDuration
  isRest: boolean
  dotted?: boolean
  doubleDotted?: boolean
  tieToNext?: boolean
  articulations?: string[]
  dynamics?: string
  lyric?: string
  staff?: 'treble' | 'bass'
  tuplet?: { numNotes: number; notesOccupied: number; groupId: string }
}

export interface NotationSvgEditorProps {
  beats: Beat[]
  selectedBeatIdx: number
  onSelectBeat: (idx: number) => void
  onInsertNote: (pitch: string, afterIdx: number) => void
  onReplaceNote: (pitch: string, atIdx: number) => void
  onDeleteBeat: (idx: number) => void
  onUpdateBeat: (idx: number, updates: Partial<Beat>) => void
  clef: string
  keySignature: string
  timeSignature: string | null
  currentDuration: BeatDuration
  isInputMode: boolean
  grandStaffMode?: boolean
  activeStaff?: 'treble' | 'bass'
  zoom?: number
  /** Índices dos beats APÓS os quais desenhar barra de compasso */
  barlines?: number[]
  /** Hidden input ref para captura de teclado */
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** Handler de teclado para o hidden input */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  /** Hover position callback */
  onHoverPosition?: (pos: { beatIdx: number; pitch: string } | null) => void
}

// ─── Layout ─────────────────────────────────────────────────────────

const LINE_SPACING = 10        // pixels entre linhas da pauta
const HALF_SPACING = LINE_SPACING / 2
const TOP_MARGIN = 40          // espaço acima da pauta (para linhas suplementares)
const BOTTOM_MARGIN = 40       // espaço abaixo da pauta
const LEFT_MARGIN = 30         // espaço à esquerda da pauta (brace + barra)
const TIME_SIG_WIDTH = 25      // espaço adicional para fórmula de compasso
const CLEF_WIDTH_INNER = 28    // largura da clave dentro da pauta
const STAFF_LEFT_X = LEFT_MARGIN       // onde as linhas da pauta começam
const BRACE_X = LEFT_MARGIN - 16       // chave de sistema à esquerda
const CLEF_TREBLE_X = LEFT_MARGIN + 16 // clave de Sol sobre as linhas
const CLEF_BASS_X = LEFT_MARGIN + 14   // clave de Fá sobre as linhas
const TS_OFFSET = CLEF_WIDTH_INNER + 4 // offset do compasso após a clave
const NOTES_START = LEFT_MARGIN + CLEF_WIDTH_INNER // início dos beats sem compasso
const NOTES_START_TS = NOTES_START + TIME_SIG_WIDTH // início dos beats com compasso
const RIGHT_MARGIN = 20
const CLEF_WIDTH = 30
const KEY_SIG_WIDTH = 20       // por acidente na armadura

const BEAT_WIDTHS: Record<BeatDuration, number> = {
  w: 60, h: 48, q: 36, '8': 28, '16': 22, '32': 18, '64': 14,
}

/** Largura fixa do viewBox */
const VB_WIDTH = 800
/** Largura disponível para beats em cada linha */
const USABLE_WIDTH = VB_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
/** Altura de uma pauta (5 linhas = 4 espaços) */
const STAFF_HEIGHT = 4 * LINE_SPACING
/** Altura total do SVG para uma pauta simples */
const SINGLE_STAFF_SVG_HEIGHT = TOP_MARGIN + STAFF_HEIGHT + BOTTOM_MARGIN
/** Gap entre linhas (sistemas) */
const LINE_GAP = 30
/** Gap entre pautas na Grande Pauta (Sol e Fá) */
const GRAND_STAFF_GAP = 30
/** Altura total de uma Grande Pauta (duas pautas + gap entre elas) */
const GRAND_STAFF_HEIGHT = STAFF_HEIGHT * 2 + GRAND_STAFF_GAP

// ─── Cores ──────────────────────────────────────────────────────────

const C = {
  bg: 'var(--card, #FFFFFF)',
  line: '#94A3B8',
  notehead: '#1E293B',
  noteheadSelected: '#F59E0B',
  noteheadBass: '#6366F1',
  stem: '#1E293B',
  cursor: '#F59E0B',
  ghost: 'rgba(99, 102, 241, 0.3)',
  barline: '#64748B',
  clef: '#475569',
  ledgerLine: '#94A3B8',
}

// ─── Fontes ─────────────────────────────────────────────────────────

const FONT_MUSIC = "'Bravura', 'Noto Music', serif"
const FONT_UI = 'DM Sans, sans-serif'

// ─── Mapeamento de notas ────────────────────────────────────────────

// Posição na pauta: 0 = linha mais alta (F5 na clave de sol), aumenta para baixo
// Cada step = meio LINE_SPACING (linha ou espaço)

const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

// Referência: na clave de sol, E4 está na 1ª linha (a mais baixa das 5)
// Posição 0 = F5 (acima da 5ª linha)
// Posição 8 = E4 (1ª linha)

function getNoteIndex(noteName: string): number {
  const base = noteName.replace(/[#bn]/g, '').toUpperCase()
  return NOTE_NAMES.indexOf(base)
}

/**
 * Converte pitch (ex: 'C/4', 'G#/5') para posição Y no SVG
 * 
 * Pauta de 5 linhas (de cima para baixo, posições em half-spacings do topo):
 * - Posição 0 = linha 5 (topo) = F5
 * - Posição 1 = espaço = E5
 * - Posição 2 = linha 4 = D5
 * - Posição 3 = espaço = C5
 * - Posição 4 = linha 3 (meio) = B4
 * - Posição 5 = espaço = A4
 * - Posição 6 = linha 2 = G4 (onde a clave de sol se enrola)
 * - Posição 7 = espaço = F4
 * - Posição 8 = linha 1 (base) = E4
 * - Posição 9 = espaço abaixo = D4
 * - Posição 10 = linha suplementar = C4
 * 
 * Clave de Fá: F3 na linha 4 (posição 2)
 * - Posição 0 = linha 5 = A3
 * - Posição 2 = linha 4 = F3 (onde a clave de fá marca)
 * - Posição 4 = linha 3 = D3
 * - Posição 6 = linha 2 = B2
 * - Posição 8 = linha 1 = G2
 */
export function pitchToY(pitch: string, clef: string, topY: number): number {
  const [notePart, octStr] = pitch.split('/')
  const octave = parseInt(octStr, 10)
  const noteIdx = getNoteIndex(notePart)
  
  let referenceOctave: number
  let referenceNoteIdx: number
  let referencePosition: number
  
  if (clef === 'bass' || clef === 'F4') {
    // Clave de Fá: G2 na linha 1 (base) = posição 8
    referenceOctave = 2
    referenceNoteIdx = 4 // G
    referencePosition = 8
  } else {
    // Clave de Sol: E4 na linha 1 (base) = posição 8
    referenceOctave = 4
    referenceNoteIdx = 2 // E
    referencePosition = 8
  }
  
  // Calcular steps a partir da referência
  // Cada step = 1 nota diatônica (linha ou espaço)
  const octaveDiff = octave - referenceOctave
  const noteDiff = noteIdx - referenceNoteIdx
  const totalSteps = octaveDiff * 7 + noteDiff
  
  // Posição no SVG (menor Y = mais agudo, então subtraímos steps)
  const position = referencePosition - totalSteps
  
  return topY + position * HALF_SPACING
}

/**
 * Converte posição Y no SVG para pitch
 */
export function yToPitch(y: number, clef: string, topY: number): string {
  const position = Math.round((y - topY) / HALF_SPACING)
  
  let referenceOctave: number
  let referenceNoteIdx: number
  let referencePosition: number
  
  if (clef === 'bass' || clef === 'F4') {
    // Clave de Fá: G2 na linha 1 (base) = posição 8
    referenceOctave = 2
    referenceNoteIdx = 4 // G
    referencePosition = 8
  } else {
    // Clave de Sol: E4 na linha 1 (base) = posição 8
    referenceOctave = 4
    referenceNoteIdx = 2 // E
    referencePosition = 8
  }
  
  const totalSteps = referencePosition - position
  const octaveDiff = Math.floor(totalSteps / 7)
  let noteDiff = totalSteps % 7
  
  let octave = referenceOctave + octaveDiff
  let noteIdx = referenceNoteIdx + noteDiff
  
  // Normalizar
  while (noteIdx < 0) {
    noteIdx += 7
    octave--
  }
  while (noteIdx > 6) {
    noteIdx -= 7
    octave++
  }
  
  return `${NOTE_NAMES[noteIdx]}/${octave}`
}

/**
 * Snap Y para a posição de linha/espaço mais próxima
 */
function snapToStaffPosition(y: number, topY: number): number {
  const relY = y - topY
  const snappedRel = Math.round(relY / HALF_SPACING) * HALF_SPACING
  return topY + snappedRel
}

/**
 * Verifica se uma posição Y precisa de linhas suplementares
 * Retorna array de posições Y das linhas suplementares necessárias
 */
function getLedgerLines(y: number, topY: number): number[] {
  const lines: number[] = []
  const staffTop = topY
  const staffBottom = topY + STAFF_HEIGHT
  
  if (y < staffTop) {
    // Linhas suplementares acima
    let lineY = staffTop - LINE_SPACING
    while (lineY >= y - HALF_SPACING) {
      lines.push(lineY)
      lineY -= LINE_SPACING
    }
  } else if (y > staffBottom) {
    // Linhas suplementares abaixo
    let lineY = staffBottom + LINE_SPACING
    while (lineY <= y + HALF_SPACING) {
      lines.push(lineY)
      lineY += LINE_SPACING
    }
  }
  
  // Verificar se a nota está exatamente em uma linha suplementar
  const relY = y - topY
  const isOnLine = Math.abs(relY % LINE_SPACING) < 1
  if (isOnLine && (y < staffTop || y > staffBottom)) {
    if (!lines.includes(y)) {
      lines.push(y)
    }
  }
  
  return lines
}

// ─── Helper: distribuir beats em linhas ─────────────────────────────

interface RowLayout {
  startCol: number
  endCol: number // exclusive
  beatCenters: number[] // X de cada beat relativo ao inicio da linha
}

function buildRows(beats: Beat[], hasTimeSignature: boolean): RowLayout[] {
  const rows: RowLayout[] = []
  let col = 0
  const columns = beats.length
  // Início dos beats: após clave (e compasso se houver)
  const leftOffset = hasTimeSignature ? NOTES_START_TS : NOTES_START
  const usableWidth = VB_WIDTH - leftOffset - RIGHT_MARGIN

  while (col < columns) {
    let usedW = 0
    const startCol = col
    const centers: number[] = []

    while (col < columns) {
      const dur = beats[col]?.duration ?? 'q'
      const bw = BEAT_WIDTHS[dur]
      if (usedW + bw > usableWidth && col > startCol) break
      centers.push(leftOffset + usedW + bw / 2)
      usedW += bw
      col++
    }

    if (centers.length > 0) {
      rows.push({ startCol, endCol: col, beatCenters: centers })
    }
  }

  // Se não há beats, criar uma linha vazia para mostrar a pauta
  if (rows.length === 0) {
    rows.push({ startCol: 0, endCol: 0, beatCenters: [] })
  }

  return rows
}

// ─── Componente Principal ───────────────────────────────────────────

export function NotationSvgEditor({
  beats,
  selectedBeatIdx,
  onSelectBeat,
  onInsertNote,
  onReplaceNote,
  onDeleteBeat,
  onUpdateBeat,
  clef,
  keySignature,
  timeSignature,
  currentDuration,
  isInputMode,
  grandStaffMode = false,
  activeStaff = 'treble',
  zoom = 1,
  barlines = [],
  inputRef,
  onKeyDown,
  onHoverPosition,
}: NotationSvgEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverPos, setHoverPos] = React.useState<{ x: number; y: number } | null>(null)

  // ── Distribuir beats em linhas ──
  const hasTimeSignature = !!timeSignature
  const rows = useMemo(() => buildRows(beats, hasTimeSignature), [beats, hasTimeSignature])

  // ── Dimensões do SVG ──
  // Grande Pauta: duas pautas (Sol + Fá) com gap entre elas
  const rowH = grandStaffMode 
    ? TOP_MARGIN + GRAND_STAFF_HEIGHT + BOTTOM_MARGIN
    : TOP_MARGIN + STAFF_HEIGHT + BOTTOM_MARGIN
  const svgHeight = rows.length * rowH + (rows.length - 1) * LINE_GAP

  // ── Y base de cada linha ──
  const rowY = useCallback((rowIdx: number) => rowIdx * (rowH + LINE_GAP), [rowH])

  // ── Y do topo da pauta treble em cada linha ──
  const staffTopY = useCallback((rowIdx: number) => rowY(rowIdx) + TOP_MARGIN, [rowY])
  
  // ── Y do topo da pauta bass em cada linha (só para Grande Pauta) ──
  const bassStaffTopY = useCallback(
    (rowIdx: number) => staffTopY(rowIdx) + STAFF_HEIGHT + GRAND_STAFF_GAP,
    [staffTopY]
  )

  // ── Hit test: converter coords do mouse → posição ──
  const getPositionFromEvent = useCallback(
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
      const topY = staffTopY(hitRow)

      // Snap Y para posição de linha/espaço
      const snappedY = snapToStaffPosition(my, topY)
      const pitch = yToPitch(snappedY, clef, topY)

      // Encontrar coluna mais próxima pelo X (ou posição de inserção)
      let bestCol = -1
      let bestDist = Infinity
      for (let i = 0; i < row.beatCenters.length; i++) {
        const colIdx = row.startCol + i
        const cx = row.beatCenters[i]
        const dur = beats[colIdx]?.duration ?? 'q'
        const halfW = BEAT_WIDTHS[dur] / 2
        const dist = Math.abs(mx - cx)
        if (dist < halfW * 1.5 && dist < bestDist) {
          bestDist = dist
          bestCol = colIdx
        }
      }

      // Se não encontrou beat próximo, calcular posição de inserção
      let insertAfterIdx = row.startCol - 1
      if (bestCol < 0) {
        // Encontrar onde inserir baseado no X
        for (let i = 0; i < row.beatCenters.length; i++) {
          if (mx > row.beatCenters[i]) {
            insertAfterIdx = row.startCol + i
          }
        }
        if (row.beatCenters.length === 0) {
          insertAfterIdx = -1 // Inserir no início
        }
      }

      return {
        beatIdx: bestCol,
        insertAfterIdx,
        pitch,
        snappedY,
        rowIdx: hitRow,
        x: mx,
      }
    },
    [svgHeight, rows, rowY, rowH, staffTopY, clef, beats],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const pos = getPositionFromEvent(e)
      if (!pos) return

      if (pos.beatIdx >= 0) {
        // Clicou em um beat existente
        onSelectBeat(pos.beatIdx)
      } else if (isInputMode) {
        // Clicou em área vazia no modo input → inserir nota
        onInsertNote(pos.pitch, pos.insertAfterIdx)
      }
    },
    [getPositionFromEvent, onSelectBeat, onInsertNote, isInputMode],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const pos = getPositionFromEvent(e)
      if (pos && pos.beatIdx >= 0) {
        onDeleteBeat(pos.beatIdx)
      }
    },
    [getPositionFromEvent, onDeleteBeat],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const pos = getPositionFromEvent(e)
      if (pos) {
        setHoverPos({ x: pos.x, y: pos.snappedY })
        onHoverPosition?.({
          beatIdx: pos.beatIdx,
          pitch: pos.pitch,
        })
      } else {
        setHoverPos(null)
        onHoverPosition?.(null)
      }
    },
    [getPositionFromEvent, onHoverPosition],
  )

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null)
    onHoverPosition?.(null)
  }, [onHoverPosition])

  // ── Renderizar elementos do SVG ──
  const svgElements = useMemo(() => {
    const els: React.ReactElement[] = []

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      const topY = staffTopY(r)
      const topBarX = STAFF_LEFT_X

      // ── Pauta Treble (ou única se não for Grande Pauta) ──
      for (let i = 0; i < 5; i++) {
        const y = topY + i * LINE_SPACING
        els.push(
          <line
            key={`staff-treble-${r}-${i}`}
            x1={topBarX}
            y1={y}
            x2={VB_WIDTH - RIGHT_MARGIN}
            y2={y}
            stroke={C.line}
            strokeWidth={1}
          />,
        )
      }

      // ── Pauta Bass (só para Grande Pauta) ──
      if (grandStaffMode) {
        const bassTopY = bassStaffTopY(r)
        for (let i = 0; i < 5; i++) {
          const y = bassTopY + i * LINE_SPACING
          els.push(
            <line
              key={`staff-bass-${r}-${i}`}
              x1={topBarX}
              y1={y}
              x2={VB_WIDTH - RIGHT_MARGIN}
              y2={y}
              stroke={C.line}
              strokeWidth={1}
            />,
          )
        }

        // ── Brace (chave de sistema) conectando as duas pautas ──
        const braceTop = topY
        const braceBottom = bassTopY + STAFF_HEIGHT
        els.push(
          <text
            key={`brace-${r}`}
            x={BRACE_X}
            y={(braceTop + braceBottom) / 2}
            fontSize={braceBottom - braceTop - 8}
            fontFamily={FONT_MUSIC}
            fill={C.clef}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            {'{'}
          </text>,
        )

        // ── Linha vertical conectando as pautas ──
        els.push(
          <line
            key={`barline-start-${r}`}
            x1={topBarX}
            y1={topY}
            x2={topBarX}
            y2={bassTopY + STAFF_HEIGHT}
            stroke={C.line}
            strokeWidth={1.5}
          />,
        )
      }

      // ── Claves (dentro da pauta, sobre as linhas, como no AlphaTab) ──
      if (grandStaffMode) {
        // Grande Pauta: Clave de Sol na pauta superior, Clave de Fá na inferior
        const trebleClefY = topY + 3 * LINE_SPACING
        els.push(
          <text
            key={`clef-treble-${r}`}
            x={CLEF_TREBLE_X}
            y={trebleClefY}
            fontSize={36}
            fontFamily={FONT_MUSIC}
            fill={C.clef}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            𝄞
          </text>,
        )
        
        const bassTopY = bassStaffTopY(r)
        const bassClefY = bassTopY + LINE_SPACING
        els.push(
          <text
            key={`clef-bass-${r}`}
            x={CLEF_BASS_X}
            y={bassClefY}
            fontSize={28}
            fontFamily={FONT_MUSIC}
            fill={C.clef}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            𝄢
          </text>,
        )
      } else {
        // Pauta única: renderizar a clave selecionada
        const isBass = clef === 'bass'
        const clefY = isBass
          ? topY + LINE_SPACING  // Linha 4 para clave de Fá
          : topY + 3 * LINE_SPACING  // Linha 2 para clave de Sol
        els.push(
          <text
            key={`clef-${r}`}
            x={isBass ? CLEF_BASS_X : CLEF_TREBLE_X}
            y={clefY}
            fontSize={isBass ? 28 : 36}
            fontFamily={FONT_MUSIC}
            fill={C.clef}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            {isBass ? '𝄢' : '𝄞'}
          </text>,
        )
      }

      // ── Fórmula de compasso (se definida) ──
      if (timeSignature && r === 0) {
        const [num, den] = timeSignature.split('/')
        const tsX = LEFT_MARGIN + TS_OFFSET
        
        // Fórmula na pauta treble
        els.push(
          <text
            key={`ts-num-treble-${r}`}
            x={tsX}
            y={topY + 1.5 * LINE_SPACING}
            fontSize={16}
            fontFamily={FONT_UI}
            fontWeight="bold"
            fill={C.clef}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            {num}
          </text>,
        )
        els.push(
          <text
            key={`ts-den-treble-${r}`}
            x={tsX}
            y={topY + 2.5 * LINE_SPACING}
            fontSize={16}
            fontFamily={FONT_UI}
            fontWeight="bold"
            fill={C.clef}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            {den}
          </text>,
        )
        
        // Fórmula na pauta bass (só para Grande Pauta)
        if (grandStaffMode) {
          const bassTopY = bassStaffTopY(r)
          els.push(
            <text
              key={`ts-num-bass-${r}`}
              x={tsX}
              y={bassTopY + 1.5 * LINE_SPACING}
              fontSize={16}
              fontFamily={FONT_UI}
              fontWeight="bold"
              fill={C.clef}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              {num}
            </text>,
          )
          els.push(
            <text
              key={`ts-den-bass-${r}`}
              x={tsX}
              y={bassTopY + 2.5 * LINE_SPACING}
              fontSize={16}
              fontFamily={FONT_UI}
              fontWeight="bold"
              fill={C.clef}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              {den}
            </text>,
          )
        }
      }

      // ── Notas ──
      for (let i = 0; i < row.beatCenters.length; i++) {
        const colIdx = row.startCol + i
        const beat = beats[colIdx]
        if (!beat) continue

        const cx = row.beatCenters[i]
        const isSelected = selectedBeatIdx === colIdx

        // Determinar qual pauta usar para este beat
        const isBassStaff = grandStaffMode && beat.staff === 'bass'
        const noteStaffTopY = isBassStaff ? bassStaffTopY(r) : topY
        const noteClef = isBassStaff ? 'bass' : (grandStaffMode ? 'treble' : clef)

        if (beat.isRest) {
          // ── Pausa (símbolo simplificado) ──
          const restY = noteStaffTopY + 2 * LINE_SPACING
          const restSymbols: Record<BeatDuration, string> = {
            w: '𝄻', h: '𝄼', q: '𝄽', '8': '𝄾', '16': '𝄿', '32': '𝅀', '64': '𝅁',
          }
          els.push(
            <text
              key={`rest-${colIdx}`}
              x={cx}
              y={restY}
              fontSize={24}
              fontFamily={FONT_MUSIC}
              fill={isSelected ? C.noteheadSelected : C.notehead}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none', cursor: 'pointer' }}
            >
              {restSymbols[beat.duration] || '𝄽'}
            </text>,
          )
        } else {
          // ── Notas ──
          for (let n = 0; n < beat.pitches.length; n++) {
            const pd = beat.pitches[n]
            const y = pitchToY(pd.pitch, noteClef, noteStaffTopY)
            const isBassNote = isBassStaff

            // Linhas suplementares
            const ledgerLines = getLedgerLines(y, noteStaffTopY)
            for (const ly of ledgerLines) {
              els.push(
                <line
                  key={`ledger-${colIdx}-${n}-${ly}`}
                  x1={cx - 10}
                  y1={ly}
                  x2={cx + 10}
                  y2={ly}
                  stroke={C.ledgerLine}
                  strokeWidth={1}
                />,
              )
            }

            // Notehead (oval)
            const fillColor = isSelected
              ? C.noteheadSelected
              : isBassNote
                ? C.noteheadBass
                : C.notehead

            // Notas brancas (semibreve, mínima) têm preenchimento vazado
            const isHollow = beat.duration === 'w' || beat.duration === 'h'

            els.push(
              <ellipse
                key={`note-${colIdx}-${n}`}
                cx={cx}
                cy={y}
                rx={6}
                ry={4.5}
                transform={`rotate(-15, ${cx}, ${y})`}
                fill={isHollow ? C.bg : fillColor}
                stroke={fillColor}
                strokeWidth={isHollow ? 1.5 : 0}
                style={{ cursor: 'pointer' }}
              />,
            )

            // Stem (haste) - não para semibreve
            if (beat.duration !== 'w') {
              const stemUp = y > topY + 2 * LINE_SPACING
              const stemX = stemUp ? cx + 5.5 : cx - 5.5
              const stemY1 = y
              const stemY2 = stemUp ? y - 28 : y + 28

              els.push(
                <line
                  key={`stem-${colIdx}-${n}`}
                  x1={stemX}
                  y1={stemY1}
                  x2={stemX}
                  y2={stemY2}
                  stroke={isSelected ? C.noteheadSelected : C.stem}
                  strokeWidth={1.2}
                />,
              )

              // Flags para colcheias e menores
              const flagCount = { '8': 1, '16': 2, '32': 3, '64': 4 }[beat.duration] || 0
              if (flagCount > 0) {
                for (let f = 0; f < flagCount; f++) {
                  const flagY = stemUp ? stemY2 + f * 6 : stemY2 - f * 6
                  const flagDir = stemUp ? 1 : -1
                  els.push(
                    <path
                      key={`flag-${colIdx}-${n}-${f}`}
                      d={`M ${stemX} ${flagY} Q ${stemX + 8 * flagDir} ${flagY + 4 * flagDir} ${stemX + 6 * flagDir} ${flagY + 12 * flagDir}`}
                      fill="none"
                      stroke={isSelected ? C.noteheadSelected : C.stem}
                      strokeWidth={1.5}
                    />,
                  )
                }
              }
            }

            // Ponto de aumento
            if (beat.dotted || beat.doubleDotted) {
              const dotX = cx + 10
              els.push(
                <circle
                  key={`dot-${colIdx}-${n}`}
                  cx={dotX}
                  cy={y}
                  r={2}
                  fill={isSelected ? C.noteheadSelected : C.notehead}
                />,
              )
              if (beat.doubleDotted) {
                els.push(
                  <circle
                    key={`dot2-${colIdx}-${n}`}
                    cx={dotX + 5}
                    cy={y}
                    r={2}
                    fill={isSelected ? C.noteheadSelected : C.notehead}
                  />,
                )
              }
            }

            // Acidente
            if (pd.accidental) {
              const accX = cx - 14
              const accSymbols: Record<string, string> = {
                '#': '♯',
                'b': '♭',
                'n': '♮',
              }
              els.push(
                <text
                  key={`acc-${colIdx}-${n}`}
                  x={accX}
                  y={y}
                  fontSize={14}
                  fontFamily={FONT_MUSIC}
                  fill={isSelected ? C.noteheadSelected : C.notehead}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ userSelect: 'none' }}
                >
                  {accSymbols[pd.accidental] || ''}
                </text>,
              )
            }
          }
        }

        // ── Cursor de seleção (retângulo pulsante) ──
        if (isSelected) {
          const beat = beats[colIdx]
          let cursorY = topY + 2 * LINE_SPACING
          if (beat && !beat.isRest && beat.pitches.length > 0) {
            cursorY = pitchToY(beat.pitches[0].pitch, clef, topY)
          }
          els.push(
            <rect
              key={`cursor-${colIdx}`}
              x={cx - 12}
              y={cursorY - 10}
              width={24}
              height={20}
              fill="none"
              stroke={C.cursor}
              strokeWidth={2}
              rx={4}
              className="animate-pulse"
              style={{ pointerEvents: 'none' }}
            />,
          )
        }
      }

      // ── Barlines ──
      const barlineSet = new Set(barlines)
      for (let i = 0; i < row.beatCenters.length; i++) {
        const colIdx = row.startCol + i
        if (barlineSet.has(colIdx) && i < row.beatCenters.length - 1) {
          const cx = row.beatCenters[i]
          const nextCx = row.beatCenters[i + 1]
          const barX = (cx + nextCx) / 2
          els.push(
            <line
              key={`bar-${r}-${colIdx}`}
              x1={barX}
              y1={topY}
              x2={barX}
              y2={topY + STAFF_HEIGHT}
              stroke={C.barline}
              strokeWidth={1}
              style={{ pointerEvents: 'none' }}
            />,
          )
        }
      }

      // ── Barra final da linha ──
      els.push(
        <line
          key={`bar-end-${r}`}
          x1={VB_WIDTH - RIGHT_MARGIN}
          y1={topY}
          x2={VB_WIDTH - RIGHT_MARGIN}
          y2={topY + STAFF_HEIGHT}
          stroke={C.barline}
          strokeWidth={1}
          style={{ pointerEvents: 'none' }}
        />,
      )
    }

    return els
  }, [rows, staffTopY, clef, beats, selectedBeatIdx, barlines])

  // ── Ghost note ──
  const ghostNoteElement = useMemo(() => {
    if (!hoverPos || !isInputMode) return null

    // Encontrar qual linha
    let hitRow = -1
    for (let r = 0; r < rows.length; r++) {
      const ry = rowY(r)
      if (hoverPos.y >= ry - TOP_MARGIN && hoverPos.y < ry + rowH) {
        hitRow = r
        break
      }
    }
    if (hitRow < 0) return null

    const topY = staffTopY(hitRow)
    const snappedY = snapToStaffPosition(hoverPos.y, topY)

    return (
      <ellipse
        cx={hoverPos.x}
        cy={snappedY}
        rx={6}
        ry={4.5}
        transform={`rotate(-15, ${hoverPos.x}, ${snappedY})`}
        fill={C.ghost}
        style={{ pointerEvents: 'none' }}
      />
    )
  }, [hoverPos, isInputMode, rows, rowY, rowH, staffTopY])

  // ── Cursor de inserção (linha vertical) ──
  const insertionCursor = useMemo(() => {
    if (!isInputMode || selectedBeatIdx < 0) return null

    // Encontrar posição do cursor
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      for (let i = 0; i < row.beatCenters.length; i++) {
        if (row.startCol + i === selectedBeatIdx) {
          const cx = row.beatCenters[i]
          const topY = staffTopY(r)
          return (
            <line
              x1={cx + 15}
              y1={topY - 5}
              x2={cx + 15}
              y2={topY + STAFF_HEIGHT + 5}
              stroke={C.cursor}
              strokeWidth={2}
              className="animate-pulse"
              style={{ pointerEvents: 'none' }}
            />
          )
        }
      }
    }
    return null
  }, [isInputMode, selectedBeatIdx, rows, staffTopY])

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden">
      {/* Hidden input para captura de teclado */}
      {inputRef && onKeyDown && (
        <input
          ref={inputRef}
          type="text"
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            // Re-focar automaticamente se o blur não foi para outro elemento do editor
            if (!e.relatedTarget || !e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
              setTimeout(() => inputRef?.current?.focus(), 10)
            }
          }}
          aria-label="Editor de notação - captura de teclado"
          autoComplete="off"
          tabIndex={0}
          style={{
            position: 'absolute',
            opacity: 0,
            width: 1,
            height: 1,
            top: 0,
            left: 0,
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
        style={{ display: 'block', cursor: isInputMode ? 'crosshair' : 'default' }}
        role="img"
        aria-label="Editor de notação musical"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <rect x={0} y={0} width={VB_WIDTH} height={svgHeight} fill={C.bg} />
        {svgElements}
        {ghostNoteElement}
        {insertionCursor}
      </svg>
    </div>
  )
}
