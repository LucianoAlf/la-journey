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
  cifra?: string | null
  staff?: 'treble' | 'bass'
  tuplet?: { numNotes: number; notesOccupied: number; groupId: string }
  timeSlot?: number // Posição temporal para sincronização entre pautas na Grande Pauta
  barAfter?: boolean
}

export interface NotationSvgEditorProps {
  beats: Beat[]
  selectedBeatIdx: number
  onSelectBeat: (idx: number) => void
  onInsertNote: (pitch: string, afterIdx: number, staff?: 'treble' | 'bass', timeSlot?: number) => void
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
const BOTTOM_MARGIN = 56       // espaço abaixo da pauta (mais folga para notas graves)
const LEFT_MARGIN = 30         // espaço à esquerda da pauta (brace + barra)
const TIME_SIG_WIDTH = 25      // espaço adicional para fórmula de compasso
const CLEF_WIDTH_INNER = 28    // largura da clave dentro da pauta
const STAFF_LEFT_X = LEFT_MARGIN       // onde as linhas da pauta começam
const BRACE_X = LEFT_MARGIN - 16       // chave de sistema à esquerda
const CLEF_TREBLE_X = LEFT_MARGIN + 16 // clave de Sol sobre as linhas
const CLEF_BASS_X = LEFT_MARGIN + 14   // clave de Fá sobre as linhas
const TS_OFFSET = CLEF_WIDTH_INNER + 10 // offset do compasso após a clave
const NOTES_START = LEFT_MARGIN + CLEF_WIDTH_INNER // início dos beats sem compasso
const NOTES_START_TS = NOTES_START + TIME_SIG_WIDTH // início dos beats com compasso
const RIGHT_MARGIN = 20
const CLEF_WIDTH = 30
const KEY_SIG_WIDTH = 20       // por acidente na armadura
const SVG_OCTAVE_SHIFT = 0

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
  const base = noteName.charAt(0).toUpperCase()
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
export function pitchToY(pitch: string, clef: string, topY: number, octaveShift = 0): number {
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
  const octaveDiff = octave - referenceOctave + octaveShift
  const noteDiff = noteIdx - referenceNoteIdx
  const totalSteps = octaveDiff * 7 + noteDiff
  
  // Posição no SVG (menor Y = mais agudo, então subtraímos steps)
  const position = referencePosition - totalSteps
  
  return topY + position * HALF_SPACING
}

/**
 * Converte posição Y no SVG para pitch
 */
export function yToPitch(y: number, clef: string, topY: number, octaveShift = 0): string {
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
  
  let octave = referenceOctave + octaveDiff + octaveShift
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
export function getLedgerLines(y: number, topY: number): number[] {
  const lines: number[] = []
  const staffTop = topY
  const staffBottom = topY + STAFF_HEIGHT
  const epsilon = 0.5
  
  if (y < staffTop) {
    // Linhas suplementares acima
    let lineY = staffTop - LINE_SPACING
    while (lineY >= y - epsilon) {
      lines.push(lineY)
      lineY -= LINE_SPACING
    }
  } else if (y > staffBottom) {
    // Linhas suplementares abaixo
    let lineY = staffBottom + LINE_SPACING
    while (lineY <= y + epsilon) {
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
  timeSlots: number[]
  x: number // X inicial da linha
  beats: { idx: number; xOffset: number; duration: BeatDuration; pitches: PitchData[]; staff?: 'treble' | 'bass'; timeSlot?: number }[]
}

function stretchRowLayout(row: RowLayout, stretchFactor: number): RowLayout {
  if (stretchFactor <= 1 || row.beatCenters.length === 0) return row

  return {
    ...row,
    beatCenters: row.beatCenters.map(cx => row.x + (cx - row.x) * stretchFactor),
    beats: row.beats.map(beat => ({
      ...beat,
      xOffset: beat.xOffset * stretchFactor,
    })),
  }
}

function buildRows(beats: Beat[], hasTimeSignature: boolean, grandStaffMode?: boolean): RowLayout[] {
  const rows: RowLayout[] = []
  const leftOffset = hasTimeSignature ? NOTES_START_TS : NOTES_START
  const usableWidth = VB_WIDTH - leftOffset - RIGHT_MARGIN

  if (grandStaffMode && beats.length > 0) {
    // Na Grande Pauta, agrupar por timeSlot para alinhamento vertical
    // Primeiro, identificar todos os timeSlots únicos
    const timeSlots = new Map<number, { treble?: number; bass?: number }>()
    
    beats.forEach((beat, idx) => {
      const slot = beat.timeSlot ?? idx
      if (!timeSlots.has(slot)) {
        timeSlots.set(slot, {})
      }
      const entry = timeSlots.get(slot)!
      if (beat.staff === 'bass') {
        entry.bass = idx
      } else {
        entry.treble = idx
      }
    })
    
    // Ordenar timeSlots
    const sortedSlots = Array.from(timeSlots.keys()).sort((a, b) => a - b)
    
    // Construir layout baseado em timeSlots
    let usedW = 0
    const rowBeats: RowLayout['beats'] = []
    const centers: number[] = []
    
    for (const slot of sortedSlots) {
      const entry = timeSlots.get(slot)!
      // Usar a maior duração entre treble e bass para o slot
      let maxDur: BeatDuration = 'q'
      if (entry.treble !== undefined) {
        maxDur = beats[entry.treble].duration
      }
      if (entry.bass !== undefined) {
        const bassDur = beats[entry.bass].duration
        if (BEAT_WIDTHS[bassDur] > BEAT_WIDTHS[maxDur]) {
          maxDur = bassDur
        }
      }
      
      const bw = BEAT_WIDTHS[maxDur]
      const xOffset = usedW + bw / 2
      
      // Adicionar beat treble se existir
      if (entry.treble !== undefined) {
        const b = beats[entry.treble]
        rowBeats.push({
          idx: entry.treble,
          xOffset,
          duration: b.duration,
          pitches: b.pitches,
          staff: 'treble',
          timeSlot: slot,
        })
      }
      
      // Adicionar beat bass se existir
      if (entry.bass !== undefined) {
        const b = beats[entry.bass]
        rowBeats.push({
          idx: entry.bass,
          xOffset,
          duration: b.duration,
          pitches: b.pitches,
          staff: 'bass',
          timeSlot: slot,
        })
      }
      
      centers.push(leftOffset + xOffset)
      usedW += bw
    }

    const stretchFactor = !hasTimeSignature && usedW > 0
      ? usableWidth / usedW
      : 1
    const rowLayout = stretchRowLayout({
      startCol: 0,
      endCol: beats.length,
      beatCenters: centers,
      timeSlots: sortedSlots,
      x: leftOffset,
      beats: rowBeats,
    }, stretchFactor)
    
    rows.push({
      ...rowLayout,
    })
  } else {
    // Modo normal: sequencial
    let col = 0
    const columns = beats.length

    while (col < columns) {
      let usedW = 0
      const startCol = col
      const centers: number[] = []
      const rowBeats: RowLayout['beats'] = []

      while (col < columns) {
        const beat = beats[col]
        const dur = beat?.duration ?? 'q'
        const bw = BEAT_WIDTHS[dur]
        if (usedW + bw > usableWidth && col > startCol) break
        const xOffset = usedW + bw / 2
        centers.push(leftOffset + xOffset)
        rowBeats.push({
          idx: col,
          xOffset,
          duration: dur,
          pitches: beat.pitches,
          staff: beat.staff,
          timeSlot: beat.timeSlot,
        })
        usedW += bw
        col++
      }

      if (centers.length > 0) {
        const stretchFactor = !hasTimeSignature && usedW > 0
          ? usableWidth / usedW
          : 1
        const rowLayout = stretchRowLayout({
          startCol,
          endCol: col,
          beatCenters: centers,
          timeSlots: Array.from({ length: col - startCol }, (_, idx) => startCol + idx),
          x: leftOffset,
          beats: rowBeats,
        }, stretchFactor)
        rows.push(rowLayout)
      }
    }
  }

  // Se não há beats, criar uma linha vazia para mostrar a pauta
  if (rows.length === 0) {
    rows.push({ startCol: 0, endCol: 0, beatCenters: [], timeSlots: [], x: leftOffset, beats: [] })
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
  const rows = useMemo(() => buildRows(beats, hasTimeSignature, grandStaffMode), [beats, hasTimeSignature, grandStaffMode])

  // ── Dimensões do SVG ──
  // Grande Pauta: duas pautas (Sol + Fá) com gap entre elas
  const rowH = grandStaffMode 
    ? TOP_MARGIN + GRAND_STAFF_HEIGHT + BOTTOM_MARGIN
    : TOP_MARGIN + STAFF_HEIGHT + BOTTOM_MARGIN
  const svgHeight = rows.length * rowH + (rows.length - 1) * LINE_GAP
  const svgRenderWidth = VB_WIDTH * zoom

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

      // Detectar qual pauta foi clicada (treble ou bass) na Grande Pauta
      let clickedStaff: 'treble' | 'bass' = 'treble'
      let effectiveTopY = topY
      let effectiveClef = clef
      
      if (grandStaffMode) {
        const bassTop = bassStaffTopY(hitRow)
        // Ponto médio entre o fim da pauta treble e o início da pauta bass
        const midPoint = topY + STAFF_HEIGHT + GRAND_STAFF_GAP / 2
        if (my >= midPoint) {
          clickedStaff = 'bass'
          effectiveTopY = bassTop
          effectiveClef = 'bass'
        }
      }

      // Snap Y para posição de linha/espaço
      const snappedY = snapToStaffPosition(my, effectiveTopY)
      const pitch = yToPitch(snappedY, effectiveClef, effectiveTopY, SVG_OCTAVE_SHIFT)

      // Encontrar coluna/timeSlot mais próximo pelo X (ou posição de inserção)
      let bestCol = -1
      let bestSlotIdx = -1
      let bestDist = Infinity
      for (let i = 0; i < row.beatCenters.length; i++) {
        const cx = row.beatCenters[i]
        const slot = row.timeSlots[i] ?? (row.startCol + i)
        const slotBeats = row.beats.filter(beat => (beat.timeSlot ?? beat.idx) === slot)
        const widestBeat = slotBeats.reduce<BeatDuration>((current, beat) => {
          return BEAT_WIDTHS[beat.duration] > BEAT_WIDTHS[current] ? beat.duration : current
        }, 'q')
        const halfW = BEAT_WIDTHS[widestBeat] / 2
        const dist = Math.abs(mx - cx)
        // Na Grande Pauta, a coluna visual precisa de uma tolerância maior,
        // especialmente na pauta de Fá, para não exigir clique deslocado à direita.
        const hitTolerance = grandStaffMode
          ? Math.max(28, halfW * 2)
          : halfW * 1.5
        if (dist < hitTolerance && dist < bestDist) {
          bestDist = dist
          bestSlotIdx = i
        }
      }

      if (bestSlotIdx >= 0) {
        const slot = row.timeSlots[bestSlotIdx] ?? (row.startCol + bestSlotIdx)
        const slotBeats = row.beats.filter(beat => (beat.timeSlot ?? beat.idx) === slot)
        const matchingBeat = slotBeats.find(beat => (beat.staff ?? 'treble') === clickedStaff)
        bestCol = matchingBeat?.idx ?? slotBeats[0]?.idx ?? -1
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

      // Se encontrou um beat, pegar o timeSlot dele para referência
      const referenceTimeSlot = bestSlotIdx >= 0
        ? (row.timeSlots[bestSlotIdx] ?? (beats[bestCol]?.timeSlot ?? bestCol))
        : undefined

      return {
        beatIdx: bestCol,
        insertAfterIdx,
        pitch,
        snappedY,
        rowIdx: hitRow,
        x: mx,
        staff: clickedStaff,
        timeSlot: referenceTimeSlot,
      }
    },
    [svgHeight, rows, rowY, rowH, staffTopY, bassStaffTopY, clef, beats, grandStaffMode],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const pos = getPositionFromEvent(e)
      if (!pos) return

      if (pos.beatIdx >= 0) {
        const clickedBeat = beats[pos.beatIdx]
        const clickedBeatStaff = clickedBeat?.staff ?? 'treble'
        
        // Na Grande Pauta: se clicou em uma pauta diferente da nota existente, inserir nova nota
        if (grandStaffMode && clickedBeatStaff !== pos.staff && isInputMode) {
          // Inserir nota na outra pauta, usando o timeSlot da nota de referência
          onInsertNote(pos.pitch, pos.beatIdx, pos.staff, pos.timeSlot)
        } else {
          // Clicou na mesma pauta da nota existente → selecionar
          onSelectBeat(pos.beatIdx)
        }
      } else if (isInputMode) {
        // Clicou em área vazia no modo input → inserir nota
        // Passa a pauta detectada automaticamente (treble ou bass)
        onInsertNote(pos.pitch, pos.insertAfterIdx, pos.staff, pos.timeSlot)
      }
    },
    [getPositionFromEvent, onSelectBeat, onInsertNote, isInputMode, beats, grandStaffMode],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      const pos = getPositionFromEvent(e)
      if (pos && pos.beatIdx >= 0) {
        onDeleteBeat(pos.beatIdx)
      } else if (selectedBeatIdx >= 0) {
        onDeleteBeat(selectedBeatIdx)
      }
    },
    [getPositionFromEvent, onDeleteBeat, selectedBeatIdx],
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

        // ── Brace (chave de sistema) — estilo AlphaTab (curva elegante) ──
        const braceTop = topY                      // topo da pauta treble
        const braceBottom = bassTopY + STAFF_HEIGHT // fundo da pauta bass
        const braceMidY = (braceTop + braceBottom) / 2
        const bx = BRACE_X + 4
        // Brace estilo AlphaTab: curva S com ponta no centro
        els.push(
          <path
            key={`brace-${r}`}
            d={`
              M ${bx + 3} ${braceTop - 1}
              C ${bx + 1} ${braceTop + 3},
                ${bx - 1} ${braceTop + 10},
                ${bx - 1} ${braceTop + 25}
              L ${bx - 1} ${braceMidY - 8}
              C ${bx - 1} ${braceMidY - 3},
                ${bx - 4} ${braceMidY},
                ${bx - 6} ${braceMidY}
              C ${bx - 4} ${braceMidY},
                ${bx - 1} ${braceMidY + 3},
                ${bx - 1} ${braceMidY + 8}
              L ${bx - 1} ${braceBottom - 25}
              C ${bx - 1} ${braceBottom - 10},
                ${bx + 1} ${braceBottom - 3},
                ${bx + 3} ${braceBottom + 1}
            `}
            fill="none"
            stroke={C.clef}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />,
        )
      }

      // ── Claves (dentro da pauta, sobre as linhas, como no AlphaTab) ──
      if (grandStaffMode) {
        // Grande Pauta: Clave de Sol na pauta superior, Clave de Fá na inferior
        const trebleClefY = topY + 3 * LINE_SPACING - 3
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
        const bassClefY = bassTopY + LINE_SPACING - 4
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
          ? topY + LINE_SPACING - 4  // Centralizar os dois pontos na 4ª linha
          : topY + 3 * LINE_SPACING - 3  // Ajuste fino da clave de Sol
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
            fontSize={20}
            fontFamily={FONT_MUSIC}
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
            fontSize={20}
            fontFamily={FONT_MUSIC}
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
              fontSize={20}
              fontFamily={FONT_MUSIC}
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
              fontSize={20}
              fontFamily={FONT_MUSIC}
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
      for (const rowBeat of row.beats) {
        const colIdx = rowBeat.idx
        const beat = beats[colIdx]
        if (!beat) continue

        const cx = row.x + rowBeat.xOffset
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
            const y = pitchToY(pd.pitch, noteClef, noteStaffTopY, SVG_OCTAVE_SHIFT)
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
                fill={isHollow ? 'none' : fillColor}
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
          let cursorY = noteStaffTopY + 2 * LINE_SPACING
          if (!beat.isRest && beat.pitches.length > 0) {
            cursorY = pitchToY(beat.pitches[0].pitch, noteClef, noteStaffTopY, SVG_OCTAVE_SHIFT)
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
      const barlineSet = grandStaffMode
        ? new Set(barlines.map(idx => beats[idx]?.timeSlot ?? idx))
        : new Set(barlines)
      const barlineBottomY = grandStaffMode ? bassStaffTopY(r) + STAFF_HEIGHT : topY + STAFF_HEIGHT
      for (let i = 0; i < row.beatCenters.length; i++) {
        const slot = row.timeSlots[i] ?? (row.startCol + i)
        if (barlineSet.has(slot) && i < row.beatCenters.length - 1) {
          const cx = row.beatCenters[i]
          const nextCx = row.beatCenters[i + 1]
          const barX = (cx + nextCx) / 2
          els.push(
            <line
              key={`bar-${r}-${slot}`}
              x1={barX}
              y1={topY}
              x2={barX}
              y2={barlineBottomY}
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
          y2={barlineBottomY}
          stroke={C.barline}
          strokeWidth={1}
          style={{ pointerEvents: 'none' }}
        />,
      )
    }

    return els
  }, [rows, staffTopY, bassStaffTopY, clef, beats, selectedBeatIdx, barlines, grandStaffMode])

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
    const effectiveTopY = grandStaffMode && hoverPos.y >= topY + STAFF_HEIGHT + GRAND_STAFF_GAP / 2
      ? bassStaffTopY(hitRow)
      : topY
    const snappedY = snapToStaffPosition(hoverPos.y, effectiveTopY)

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
  }, [hoverPos, isInputMode, rows, rowY, rowH, staffTopY, bassStaffTopY, grandStaffMode])

  // ── Cursor de inserção (linha vertical) ──
  const insertionCursor = useMemo(() => {
    if (!isInputMode || selectedBeatIdx < 0) return null

    // Encontrar posição do cursor
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      const selectedBeat = row.beats.find(beat => beat.idx === selectedBeatIdx)
      if (selectedBeat) {
        const selectedTopY = grandStaffMode && selectedBeat.staff === 'bass'
          ? bassStaffTopY(r)
          : staffTopY(r)
        const selectedBottomY = selectedTopY + STAFF_HEIGHT
        const cx = row.x + selectedBeat.xOffset

        return (
          <line
            x1={cx + 15}
            y1={selectedTopY - 5}
            x2={cx + 15}
            y2={selectedBottomY + 5}
            stroke={C.cursor}
            strokeWidth={2}
            className="animate-pulse"
            style={{ pointerEvents: 'none' }}
          />
        )
      }
    }
    return null
  }, [isInputMode, selectedBeatIdx, rows, staffTopY, bassStaffTopY, grandStaffMode])

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-x-auto overflow-y-hidden">
      {/* Hidden input para captura de teclado — sem auto-refocus para não bloquear inputs externos */}
      {inputRef && onKeyDown && (
        <input
          ref={inputRef}
          type="text"
          onKeyDown={onKeyDown}
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
        style={{
          display: 'block',
          width: `${svgRenderWidth}px`,
          minWidth: `${svgRenderWidth}px`,
          height: 'auto',
          cursor: isInputMode ? 'crosshair' : 'default',
        }}
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
