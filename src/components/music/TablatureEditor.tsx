import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { FloppyDisk, Trash, Guitar, MusicNote, Timer, X } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'
import { AlphaTabViewer } from './AlphaTabViewer'
import { TabSvgEditor, BEATS_PER_LINE } from './TabSvgEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ─── Instrumentos ───────────────────────────────────────────────────

export type TabInstrument = 'guitar' | 'bass_4' | 'bass_5' | 'bass_6' | 'ukulele' | 'guitar_7'

interface InstrumentConfig {
  label: string
  stringCount: number
  /** Nomes das cordas — do agudo (topo) ao grave (baixo) */
  stringNames: string[]
  /** Afinação alphaTex (agudo → grave, formato nota+oitava) */
  tuningAlphaTex: string
  /** Instrumento alphaTex */
  alphaTabInstrument: string
  /** Traste máximo */
  maxFret: number
}

const INSTRUMENTS: Record<TabInstrument, InstrumentConfig> = {
  guitar: {
    label: 'Violão / Guitarra',
    stringCount: 6,
    stringNames: ['e', 'B', 'G', 'D', 'A', 'E'],
    tuningAlphaTex: 'E4 B3 G3 D3 A2 E2',
    alphaTabInstrument: 'AcousticGuitarSteel',
    maxFret: 22,
  },
  guitar_7: {
    label: 'Guitarra 7 cordas',
    stringCount: 7,
    stringNames: ['e', 'B', 'G', 'D', 'A', 'E', 'B'],
    tuningAlphaTex: 'E4 B3 G3 D3 A2 E2 B1',
    alphaTabInstrument: 'ElectricGuitarClean',
    maxFret: 24,
  },
  bass_4: {
    label: 'Baixo 4 cordas',
    stringCount: 4,
    stringNames: ['G', 'D', 'A', 'E'],
    tuningAlphaTex: 'G2 D2 A1 E1',
    alphaTabInstrument: 'ElectricBass',
    maxFret: 24,
  },
  bass_5: {
    label: 'Baixo 5 cordas',
    stringCount: 5,
    stringNames: ['G', 'D', 'A', 'E', 'B'],
    tuningAlphaTex: 'G2 D2 A1 E1 B0',
    alphaTabInstrument: 'ElectricBass',
    maxFret: 24,
  },
  bass_6: {
    label: 'Baixo 6 cordas',
    stringCount: 6,
    stringNames: ['C', 'G', 'D', 'A', 'E', 'B'],
    tuningAlphaTex: 'C3 G2 D2 A1 E1 B0',
    alphaTabInstrument: 'ElectricBass',
    maxFret: 24,
  },
  ukulele: {
    label: 'Ukulele',
    stringCount: 4,
    stringNames: ['A', 'E', 'C', 'G'],
    tuningAlphaTex: 'A4 E4 C4 G4',
    alphaTabInstrument: 'AcousticGuitarNylon',
    maxFret: 15,
  },
}

const INSTRUMENT_OPTIONS: { value: TabInstrument; label: string }[] = [
  { value: 'guitar', label: 'Violão / Guitarra' },
  { value: 'guitar_7', label: 'Guitarra 7 cordas' },
  { value: 'bass_4', label: 'Baixo 4 cordas' },
  { value: 'bass_5', label: 'Baixo 5 cordas' },
  { value: 'bass_6', label: 'Baixo 6 cordas' },
  { value: 'ukulele', label: 'Ukulele' },
]

// ─── Durações ───────────────────────────────────────────────────────

export type BeatDuration = 'w' | 'h' | 'q' | '8' | '16'

const DURATION_OPTIONS: { value: BeatDuration; label: string; symbol: string; beats: number }[] = [
  { value: 'w', label: 'Semibreve', symbol: '𝅝', beats: 4 },
  { value: 'h', label: 'Mínima', symbol: '𝅗𝅥', beats: 2 },
  { value: 'q', label: 'Semínima', symbol: '♩', beats: 1 },
  { value: '8', label: 'Colcheia', symbol: '♪', beats: 0.5 },
  { value: '16', label: 'Semicolcheia', symbol: '𝅘𝅥𝅯', beats: 0.25 },
]

const DURATION_ALPHATEX: Record<BeatDuration, number> = { w: 1, h: 2, q: 4, '8': 8, '16': 16 }

/** Valor de cada duração em quarter-note beats (semínima = 1) */
const DURATION_QUARTER_BEATS: Record<BeatDuration, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 }

// ─── Fórmulas de compasso ───────────────────────────────────────────

export type TimeSignature = '2/4' | '3/4' | '4/4' | '5/4' | '6/4' | '7/4' |
  '2/2' | '3/2' | '4/2' |
  '3/8' | '5/8' | '6/8' | '7/8' | '9/8' | '12/8' | 'free'

interface TimeSignatureConfig {
  label: string
  /** Numerador */
  numerator: number
  /** Denominador */
  denominator: number
  /** Total de quarter beats por compasso */
  quarterBeatsPerBar: number
  /** Grupamento de subdivisions dentro do compasso (em quarter beats) */
  grouping: number[]
}

const TIME_SIGNATURES: Record<TimeSignature, TimeSignatureConfig> = {
  '2/4': { label: '2/4', numerator: 2, denominator: 4, quarterBeatsPerBar: 2, grouping: [1, 1] },
  '3/4': { label: '3/4', numerator: 3, denominator: 4, quarterBeatsPerBar: 3, grouping: [1, 1, 1] },
  '4/4': { label: '4/4', numerator: 4, denominator: 4, quarterBeatsPerBar: 4, grouping: [1, 1, 1, 1] },
  '5/4': { label: '5/4', numerator: 5, denominator: 4, quarterBeatsPerBar: 5, grouping: [3, 2] },
  '6/4': { label: '6/4', numerator: 6, denominator: 4, quarterBeatsPerBar: 6, grouping: [3, 3] },
  '7/4': { label: '7/4', numerator: 7, denominator: 4, quarterBeatsPerBar: 7, grouping: [4, 3] },
  '2/2': { label: '2/2', numerator: 2, denominator: 2, quarterBeatsPerBar: 4, grouping: [2, 2] },
  '3/2': { label: '3/2', numerator: 3, denominator: 2, quarterBeatsPerBar: 6, grouping: [2, 2, 2] },
  '4/2': { label: '4/2', numerator: 4, denominator: 2, quarterBeatsPerBar: 8, grouping: [2, 2, 2, 2] },
  '3/8': { label: '3/8', numerator: 3, denominator: 8, quarterBeatsPerBar: 1.5, grouping: [1.5] },
  '5/8': { label: '5/8', numerator: 5, denominator: 8, quarterBeatsPerBar: 2.5, grouping: [1.5, 1] },
  '6/8': { label: '6/8', numerator: 6, denominator: 8, quarterBeatsPerBar: 3, grouping: [1.5, 1.5] },
  '7/8': { label: '7/8', numerator: 7, denominator: 8, quarterBeatsPerBar: 3.5, grouping: [1.5, 1, 1] },
  '9/8': { label: '9/8', numerator: 9, denominator: 8, quarterBeatsPerBar: 4.5, grouping: [1.5, 1.5, 1.5] },
  '12/8': { label: '12/8', numerator: 12, denominator: 8, quarterBeatsPerBar: 6, grouping: [1.5, 1.5, 1.5, 1.5] },
  free: { label: 'Livre', numerator: 0, denominator: 0, quarterBeatsPerBar: 0, grouping: [] },
}

const TIME_SIGNATURE_OPTIONS: { value: TimeSignature; label: string; category: string }[] = [
  { value: 'free', label: 'Livre (sem compasso)', category: 'Livre' },
  { value: '2/4', label: '2/4', category: 'Simples' },
  { value: '3/4', label: '3/4 — Valsa', category: 'Simples' },
  { value: '4/4', label: '4/4 — Quaternário', category: 'Simples' },
  { value: '5/4', label: '5/4', category: 'Simples' },
  { value: '6/4', label: '6/4', category: 'Simples' },
  { value: '7/4', label: '7/4', category: 'Simples' },
  { value: '2/2', label: '2/2 — Alla breve', category: 'Composto' },
  { value: '3/2', label: '3/2', category: 'Composto' },
  { value: '4/2', label: '4/2', category: 'Composto' },
  { value: '3/8', label: '3/8', category: 'Composto' },
  { value: '5/8', label: '5/8', category: 'Composto' },
  { value: '6/8', label: '6/8 — Balada', category: 'Composto' },
  { value: '7/8', label: '7/8', category: 'Composto' },
  { value: '9/8', label: '9/8', category: 'Composto' },
  { value: '12/8', label: '12/8 — Blues', category: 'Composto' },
]

/** Calcula posições de barras de compasso (índice da coluna APÓS a qual desenhar barra) */
export function computeBarlines(
  durations: BeatDuration[],
  columns: number,
  timeSignature: TimeSignature,
): number[] {
  if (timeSignature === 'free') return []
  const tsConfig = TIME_SIGNATURES[timeSignature]
  if (!tsConfig || tsConfig.quarterBeatsPerBar <= 0) return []

  const barlines: number[] = []
  let accumulated = 0

  for (let c = 0; c < columns; c++) {
    const dur = durations[c] ?? 'q'
    accumulated += DURATION_QUARTER_BEATS[dur]

    // Quando acumulamos beats suficientes para um compasso completo
    if (accumulated >= tsConfig.quarterBeatsPerBar - 0.001) {
      // Só adiciona barline se não for a última coluna (não precisa barra no fim)
      if (c < columns - 1) {
        barlines.push(c)
      }
      accumulated = accumulated - tsConfig.quarterBeatsPerBar
    }
  }

  return barlines
}

/** Calcula números dos compassos (retorna mapa colIdx → número do compasso) */
export function computeBarNumbers(
  durations: BeatDuration[],
  columns: number,
  timeSignature: TimeSignature,
): Map<number, number> {
  const map = new Map<number, number>()
  if (timeSignature === 'free') return map
  const tsConfig = TIME_SIGNATURES[timeSignature]
  if (!tsConfig || tsConfig.quarterBeatsPerBar <= 0) return map

  let accumulated = 0
  let barNumber = 1
  map.set(0, barNumber) // Primeiro compasso começa na coluna 0

  for (let c = 0; c < columns; c++) {
    const dur = durations[c] ?? 'q'
    accumulated += DURATION_QUARTER_BEATS[dur]

    if (accumulated >= tsConfig.quarterBeatsPerBar - 0.001) {
      accumulated = accumulated - tsConfig.quarterBeatsPerBar
      barNumber++
      // A próxima coluna inicia novo compasso
      if (c + 1 < columns) {
        map.set(c + 1, barNumber)
      }
    }
  }

  return map
}

// ─── Constantes ─────────────────────────────────────────────────────

const MIN_COLUMNS = 8
const MAX_COLUMNS = BEATS_PER_LINE * 3 // 3 linhas completas

// ─── Tipos ──────────────────────────────────────────────────────────

/** Cada célula da tablatura: null = vazio (---), number = traste */
type TabCell = number | null
/** Grid: N cordas × M colunas */
type TabGrid = TabCell[][]

/** Dados enriquecidos da tablatura (novo formato) */
export interface TablatureData {
  instrument: TabInstrument
  grid: TabGrid
  columns: number
  durations: BeatDuration[]
  label?: string
  timeSignature?: TimeSignature
}

export interface TablatureEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Linhas de tablatura legadas (formato texto, ex: ["E|---12---|", "B|---8---|", ...]) */
  initialLines?: string[]
  /** Dados enriquecidos — se fornecido, tem prioridade sobre initialLines */
  initialData?: TablatureData | null
  /** Label opcional (nome do acorde/seção) */
  initialLabel?: string
  /** Instrumento inicial (default: guitar) */
  initialInstrument?: TabInstrument
  /** Callback ao salvar — retorna dados enriquecidos + linhas texto (retrocompat) */
  onSave: (lines: string[], label: string, data: TablatureData) => void
}

// ─── Parser: texto legado → grid (retrocompatibilidade) ─────────────

function parseTabLines(lines: string[], stringCount = 6): { grid: TabGrid; columns: number } {
  if (!lines.length) {
    const grid = Array.from({ length: stringCount }, () => Array(MIN_COLUMNS).fill(null))
    return { grid, columns: MIN_COLUMNS }
  }

  // Extrair conteúdo de cada linha (após o "X|")
  const contents: string[] = []
  for (const line of lines) {
    const match = line.match(/^[\s]*[A-Ga-g]\|(.*)$/)
    if (match) {
      contents.push(match[1].replace(/\|$/, ''))
    }
  }

  if (contents.length === 0) {
    const grid = Array.from({ length: stringCount }, () => Array(MIN_COLUMNS).fill(null))
    return { grid, columns: MIN_COLUMNS }
  }

  const parsedRows: (number | null)[][] = []
  let maxCols = 0

  for (const content of contents) {
    const positions: (number | null)[] = []
    let i = 0
    while (i < content.length) {
      const ch = content[i]
      if (ch >= '0' && ch <= '9') {
        let num = ch
        if (i + 1 < content.length && content[i + 1] >= '0' && content[i + 1] <= '9') {
          num += content[i + 1]
          i++
        }
        positions.push(parseInt(num))
        i++
        while (i < content.length && (content[i] === '-' || content[i] === ' ')) i++
      } else if (ch === '-' || ch === ' ') {
        let dashCount = 0
        while (i < content.length && (content[i] === '-' || content[i] === ' ')) { dashCount++; i++ }
        if (positions.length === 0 && dashCount > 0 && i < content.length) { /* skip */ }
        else if (i >= content.length && positions.length === 0) positions.push(null)
      } else {
        i++
      }
    }
    if (positions.length === 0) positions.push(null)
    parsedRows.push(positions)
    maxCols = Math.max(maxCols, positions.length)
  }

  const columns = Math.max(maxCols, MIN_COLUMNS)
  const grid: TabGrid = []
  for (let s = 0; s < stringCount; s++) {
    const row = parsedRows[s] ?? []
    grid.push([...row, ...Array(columns - row.length).fill(null)])
  }

  return { grid, columns }
}

// ─── Serializer: grid → texto ───────────────────────────────────────

function gridToTabLines(grid: TabGrid, columns: number, stringNames: string[]): string[] {
  const lines: string[] = []
  const stringCount = grid.length
  for (let s = 0; s < stringCount; s++) {
    let content = ''
    for (let c = 0; c < columns; c++) {
      const val = grid[s]?.[c] ?? null
      if (val !== null) {
        const numStr = String(val)
        if (c === 0) content += numStr.length === 2 ? '' : '-'
        content += numStr
        content += '---'
        if (numStr.length === 1) content += '-'
      } else {
        content += '------'
      }
    }
    content += '--|'
    lines.push(`${stringNames[s]}|${content}`)
  }
  return lines
}

// ─── Helpers: criar grid vazia ──────────────────────────────────────

function createEmptyGrid(stringCount: number, columns: number): TabGrid {
  return Array.from({ length: stringCount }, () => Array(columns).fill(null))
}

function createDefaultDurations(columns: number): BeatDuration[] {
  return Array(columns).fill('q')
}

// ─── Conversor: grid → alphaTex (dinâmico) ──────────────────────────

function gridToAlphaTex(
  grid: TabGrid,
  columns: number,
  durations: BeatDuration[],
  instrumentConfig: InstrumentConfig,
  label?: string,
  timeSignature: TimeSignature = 'free',
): string {
  const stringCount = instrumentConfig.stringCount

  // Encontrar última coluna com nota (ignorar vazias do final)
  let lastNoteCol = -1
  for (let c = columns - 1; c >= 0; c--) {
    for (let s = 0; s < stringCount; s++) {
      if (grid[s]?.[c] !== null) { lastNoteCol = c; break }
    }
    if (lastNoteCol >= 0) break
  }
  if (lastNoteCol < 0) return ''

  const effectiveCols = lastNoteCol + 1

  const lines: string[] = []
  if (label) lines.push(`\\title "${label}"`)
  lines.push('\\tempo 120')
  lines.push('\\staff{tabs}')
  lines.push(`\\tuning ${instrumentConfig.tuningAlphaTex}`)
  lines.push(`\\instrument ${instrumentConfig.alphaTabInstrument}`)
  lines.push('.')

  // Fórmula de compasso como bar metadata (após o .)
  const tsPrefix = (timeSignature !== 'free')
    ? `\\ts ${TIME_SIGNATURES[timeSignature].numerator} ${TIME_SIGNATURES[timeSignature].denominator} `
    : ''

  // Gerar beats apenas até a última coluna com nota
  const allBeats: string[] = []
  for (let c = 0; c < effectiveCols; c++) {
    const dur = DURATION_ALPHATEX[durations[c] ?? 'q']
    const notesInCol: string[] = []
    for (let s = 0; s < stringCount; s++) {
      const val = grid[s]?.[c]
      if (val !== null) {
        notesInCol.push(`${val}.${s + 1}`)
      }
    }
    if (notesInCol.length === 0) {
      allBeats.push(`r.${dur}`)
    } else if (notesInCol.length === 1) {
      allBeats.push(`${notesInCol[0]}.${dur}`)
    } else {
      allBeats.push(`(${notesInCol.join(' ')}).${dur}`)
    }
  }

  // Separar em compassos usando barlines calculadas
  if (timeSignature !== 'free') {
    const barlineSet = new Set(computeBarlines(durations, effectiveCols, timeSignature))
    const bars: string[] = []
    let currentBar: string[] = []
    for (let c = 0; c < allBeats.length; c++) {
      currentBar.push(allBeats[c])
      if (barlineSet.has(c)) {
        bars.push(currentBar.join(' '))
        currentBar = []
      }
    }
    if (currentBar.length > 0) bars.push(currentBar.join(' '))
    // Prefixar \ts no primeiro compasso
    if (bars.length > 0) bars[0] = tsPrefix + bars[0]
    lines.push(bars.join(' |\n'))
  } else {
    // Modo livre: agrupar em blocos de 4 beats
    const bars: string[] = []
    for (let i = 0; i < allBeats.length; i += 4) {
      bars.push(allBeats.slice(i, i + 4).join(' '))
    }
    lines.push(bars.join(' |\n'))
  }

  return lines.join('\n')
}

// ─── Componente Principal ───────────────────────────────────────────

export function TablatureEditor({
  open, onOpenChange, initialLines, initialData, initialLabel, initialInstrument, onSave,
}: TablatureEditorProps) {
  // Estado do instrumento
  const [instrument, setInstrument] = useState<TabInstrument>(initialInstrument ?? initialData?.instrument ?? 'guitar')
  const instrumentConfig = INSTRUMENTS[instrument]

  // Estado do editor
  const [grid, setGrid] = useState<TabGrid>(() => createEmptyGrid(instrumentConfig.stringCount, MIN_COLUMNS))
  const [columns, setColumns] = useState(MIN_COLUMNS)
  const [durations, setDurations] = useState<BeatDuration[]>(() => createDefaultDurations(MIN_COLUMNS))
  const [label, setLabel] = useState(initialLabel ?? '')
  const [currentDuration, setCurrentDuration] = useState<BeatDuration>('q')
  const [selectedCol, setSelectedCol] = useState<number | null>(null)
  const [selectedString, setSelectedString] = useState<number | null>(null)
  const [hoverCell, setHoverCell] = useState<{ s: number; c: number } | null>(null)
  const [fretInput, setFretInput] = useState('')
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('free')

  // Reset quando abrir com novos dados
  useEffect(() => {
    if (!open) return
    if (initialData) {
      // Formato enriquecido
      setInstrument(initialData.instrument)
      setGrid(initialData.grid.map(row => [...row]))
      setColumns(initialData.columns)
      setDurations([...initialData.durations])
      setLabel(initialData.label ?? initialLabel ?? '')
      setTimeSignature(initialData.timeSignature ?? 'free')
    } else {
      // Formato legado (linhas de texto) ou vazio
      const inst = initialInstrument ?? 'guitar'
      setInstrument(inst)
      const sc = INSTRUMENTS[inst].stringCount
      const { grid: g, columns: c } = parseTabLines(initialLines ?? [], sc)
      setGrid(g)
      setColumns(c)
      setDurations(createDefaultDurations(c))
      setLabel(initialLabel ?? '')
      setTimeSignature('free')
    }
    setCurrentDuration('q')
    setSelectedCol(null)
    setSelectedString(null)
    setFretInput('')
  }, [open, initialLines, initialData, initialLabel, initialInstrument])

  // Trocar instrumento — redimensionar grid
  const handleInstrumentChange = useCallback((newInst: TabInstrument) => {
    const newConfig = INSTRUMENTS[newInst]
    const oldStringCount = grid.length
    const newStringCount = newConfig.stringCount

    setInstrument(newInst)

    if (newStringCount === oldStringCount) return

    setGrid(prev => {
      if (newStringCount > oldStringCount) {
        // Adicionar cordas graves (no final)
        const extra = Array.from(
          { length: newStringCount - oldStringCount },
          () => Array(columns).fill(null),
        )
        return [...prev, ...extra]
      } else {
        // Remover cordas graves (do final)
        return prev.slice(0, newStringCount)
      }
    })

    // Reset seleção se corda inválida
    setSelectedString(prev => (prev !== null && prev >= newStringCount) ? null : prev)
  }, [grid.length, columns])

  // Selecionar célula
  const handleCellClick = useCallback((s: number, c: number) => {
    setSelectedCol(c)
    setSelectedString(s)
    const val = grid[s]?.[c]
    setFretInput(val !== null ? String(val) : '')
    // Focar o hidden input para capturar teclado
    requestAnimationFrame(() => {
      hiddenInputRef.current?.focus()
    })
  }, [grid])

  // Duplo clique — remover valor
  const handleCellDoubleClick = useCallback((s: number, c: number) => {
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[s][c] = null
      return next
    })
    setFretInput('')
  }, [])

  // Clique na duração de uma coluna — ciclar duração
  const handleDurationClick = useCallback((colIdx: number) => {
    setDurations(prev => {
      const next = [...prev]
      next[colIdx] = currentDuration
      return next
    })
  }, [currentDuration])

  // Definir traste na célula selecionada
  const maxFret = instrumentConfig.maxFret
  const setFretValue = useCallback((value: string) => {
    if (selectedCol === null || selectedString === null) return
    const num = parseInt(value)
    if (isNaN(num) || num < 0 || num > maxFret) return
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[selectedString][selectedCol] = num
      return next
    })
    setFretInput(value)
  }, [selectedCol, selectedString, maxFret])

  // Limpar célula selecionada
  const clearCell = useCallback(() => {
    if (selectedCol === null || selectedString === null) return
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[selectedString][selectedCol] = null
      return next
    })
    setFretInput('')
  }, [selectedCol, selectedString])

  // Adicionar coluna à direita
  const addColumn = useCallback(() => {
    if (columns >= MAX_COLUMNS) return
    setGrid(prev => prev.map(row => [...row, null]))
    setDurations(prev => [...prev, currentDuration])
    setColumns(prev => prev + 1)
  }, [columns, currentDuration])

  // Remover última coluna
  const removeColumn = useCallback(() => {
    if (columns <= MIN_COLUMNS) return
    setGrid(prev => prev.map(row => row.slice(0, -1)))
    setDurations(prev => prev.slice(0, -1))
    setColumns(prev => prev - 1)
    if (selectedCol !== null && selectedCol >= columns - 1) {
      setSelectedCol(null)
      setSelectedString(null)
    }
  }, [columns, selectedCol])

  // Inserir coluna na posição selecionada
  const insertColumnAt = useCallback(() => {
    if (columns >= MAX_COLUMNS || selectedCol === null) return
    setGrid(prev => {
      const next = prev.map(row => {
        const nextRow = [...row]
        nextRow.splice(selectedCol + 1, 0, null)
        return nextRow
      })
      return next
    })
    setDurations(prev => {
      const next = [...prev]
      next.splice(selectedCol + 1, 0, currentDuration)
      return next
    })
    setColumns(prev => prev + 1)
    setSelectedCol(prev => prev !== null ? prev + 1 : null)
  }, [columns, selectedCol, currentDuration])

  // Remover coluna na posição selecionada
  const removeColumnAt = useCallback(() => {
    if (columns <= MIN_COLUMNS || selectedCol === null) return
    setGrid(prev => {
      const next = prev.map(row => {
        const nextRow = [...row]
        nextRow.splice(selectedCol, 1)
        return nextRow
      })
      return next
    })
    setDurations(prev => {
      const next = [...prev]
      next.splice(selectedCol, 1)
      return next
    })
    setColumns(prev => prev - 1)
    setSelectedCol(null)
    setSelectedString(null)
  }, [columns, selectedCol])

  // Limpar tudo
  const clearAll = useCallback(() => {
    const sc = instrumentConfig.stringCount
    setGrid(createEmptyGrid(sc, columns))
    setDurations(createDefaultDurations(columns))
    setSelectedCol(null)
    setSelectedString(null)
    setFretInput('')
  }, [columns, instrumentConfig.stringCount])

  // Navegação com teclado
  const stringCount = instrumentConfig.stringCount
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (selectedCol === null || selectedString === null) return

    // Helper: expandir grid até completar a próxima linha inteira
    const expandToNextFullLine = () => {
      const nextLineEnd = Math.ceil((columns + 1) / BEATS_PER_LINE) * BEATS_PER_LINE
      const target = Math.min(nextLineEnd, MAX_COLUMNS)
      const toAdd = target - columns
      if (toAdd <= 0) return
      setGrid(prev => prev.map(row => [...row, ...Array(toAdd).fill(null)]))
      setDurations(prev => [...prev, ...Array(toAdd).fill(currentDuration)])
      setColumns(target)
      setSelectedCol(selectedCol + 1)
    }

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        if (selectedCol < columns - 1) {
          setSelectedCol(selectedCol + 1)
        } else if (columns < MAX_COLUMNS) {
          expandToNextFullLine()
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (selectedCol > 0) setSelectedCol(selectedCol - 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (selectedString < stringCount - 1) setSelectedString(selectedString + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (selectedString > 0) setSelectedString(selectedString - 1)
        break
      case 'Delete':
        e.preventDefault()
        clearCell()
        break
      case 'Backspace':
        e.preventDefault()
        if (selectedCol > 0) {
          const currentCol = selectedCol

          // Calcular novo grid, columns e durations de uma vez
          const newGrid = grid.map(row => [...row])
          for (let s = 0; s < newGrid.length; s++) {
            newGrid[s][currentCol] = null
          }

          // Encontrar última coluna com nota
          let lastNoteCol = -1
          for (let c = newGrid[0].length - 1; c >= 0; c--) {
            for (let s = 0; s < newGrid.length; s++) {
              if (newGrid[s][c] !== null) { lastNoteCol = c; break }
            }
            if (lastNoteCol >= 0) break
          }

          // Manter: última nota + 2 de respiro, mínimo MIN_COLUMNS
          const newColumns = Math.max(MIN_COLUMNS, lastNoteCol + 3)

          if (newColumns < columns) {
            setGrid(newGrid.map(row => row.slice(0, newColumns)))
            setDurations(prev => prev.slice(0, newColumns))
            setColumns(newColumns)
          } else {
            setGrid(newGrid)
          }

          setSelectedCol(currentCol - 1)
        } else if (selectedCol === 0) {
          setGrid(prev => {
            const next = prev.map(row => [...row])
            for (let s = 0; s < next.length; s++) {
              next[s][0] = null
            }
            return next
          })
        }
        break
    }

    // Números diretos (0-9)
    // Se célula tem 1 dígito e concatenar é válido (≤ maxFret), concatena (ex: 1→12)
    // Senão, substitui o valor existente (ex: 4→3)
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const current = grid[selectedString]?.[selectedCol]
      let newVal = e.key
      let shouldAdvance = true

      if (current !== null) {
        const currentStr = String(current)
        if (currentStr.length === 1) {
          const concat = currentStr + e.key
          const concatNum = parseInt(concat)
          if (concatNum <= maxFret) {
            newVal = concat
            shouldAdvance = false
          }
        }
      }
      const num = parseInt(newVal)
      if (num >= 0 && num <= maxFret) {
        setFretValue(newVal)
        // Aplicar a duração ativa à coluna ao inserir nota
        setDurations(prev => {
          if (prev[selectedCol] === currentDuration) return prev
          const next = [...prev]
          next[selectedCol] = currentDuration
          return next
        })

        // Auto-avançar cursor para próxima coluna
        if (shouldAdvance) {
          if (selectedCol < columns - 1) {
            setSelectedCol(selectedCol + 1)
          } else if (columns < MAX_COLUMNS) {
            const nextLineEnd = Math.ceil((columns + 1) / BEATS_PER_LINE) * BEATS_PER_LINE
            const target = Math.min(nextLineEnd, MAX_COLUMNS)
            const toAdd = target - columns
            if (toAdd > 0) {
              setGrid(prev => prev.map(row => [...row, ...Array(toAdd).fill(null)]))
              setDurations(prev => [...prev, ...Array(toAdd).fill(currentDuration)])
              setColumns(target)
            }
            setSelectedCol(selectedCol + 1)
          }
        }
      }
    }
  }, [selectedCol, selectedString, columns, stringCount, grid, maxFret, clearCell, setFretValue, currentDuration])

  // Hidden input ref para captura de teclado (padrão CodeMirror/Monaco)
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  // Focar o hidden input quando o modal abre
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      hiddenInputRef.current?.focus()
    }, 150)
    return () => clearTimeout(timer)
  }, [open])

  // Refocar o hidden input após mudança de seleção
  useEffect(() => {
    if (selectedCol !== null && selectedString !== null) {
      hiddenInputRef.current?.focus()
    }
  }, [selectedCol, selectedString])

  // Helper: devolver foco pro hidden input após ações da toolbar
  const focusGrid = useCallback(() => {
    requestAnimationFrame(() => {
      hiddenInputRef.current?.focus()
    })
  }, [])

  // Preview de texto
  const previewLines = useMemo(
    () => gridToTabLines(grid, columns, instrumentConfig.stringNames),
    [grid, columns, instrumentConfig.stringNames],
  )

  // Contagem de notas
  const noteCount = useMemo(() => {
    let count = 0
    for (let s = 0; s < grid.length; s++) {
      for (let c = 0; c < columns; c++) {
        if (grid[s]?.[c] !== null) count++
      }
    }
    return count
  }, [grid, columns])

  // Última coluna efetiva (com nota) — barras só até aqui
  const effectiveCols = useMemo(() => {
    let last = -1
    for (let c = columns - 1; c >= 0; c--) {
      for (let s = 0; s < grid.length; s++) {
        if (grid[s]?.[c] !== null) { last = c; break }
      }
      if (last >= 0) break
    }
    return last + 1
  }, [grid, columns])

  // Barras de compasso (só até onde tem notas)
  const barlines = useMemo(
    () => computeBarlines(durations, effectiveCols, timeSignature),
    [durations, effectiveCols, timeSignature],
  )
  const barNumbers = useMemo(
    () => computeBarNumbers(durations, effectiveCols, timeSignature),
    [durations, effectiveCols, timeSignature],
  )

  // AlphaTex para preview
  const alphaTex = useMemo(
    () => gridToAlphaTex(grid, columns, durations, instrumentConfig, label || undefined, timeSignature),
    [grid, columns, durations, instrumentConfig, label, timeSignature],
  )

  // Debounce: só atualiza o preview AlphaTab 800ms após última mudança
  const [debouncedAlphaTex, setDebouncedAlphaTex] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAlphaTex(alphaTex)
    }, 800)
    return () => clearTimeout(timer)
  }, [alphaTex])

  // Salvar
  const handleSave = useCallback(() => {
    const data: TablatureData = {
      instrument,
      grid: grid.map(row => [...row]),
      columns,
      durations: [...durations],
      label: label || undefined,
      timeSignature: timeSignature !== 'free' ? timeSignature : undefined,
    }
    onSave(previewLines, label, data)
    onOpenChange(false)
  }, [instrument, grid, columns, durations, label, previewLines, onSave, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/80 animate-in fade-in-0" onClick={() => onOpenChange(false)} />

      {/* Content */}
      <div
        className="relative z-50 w-full sm:max-w-[960px] max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-xl shadow-2xl p-6 mx-4 outline-none animate-in fade-in-0 zoom-in-95"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-serif text-[22px]">
            Editor de <span className="text-accent">Tablatura</span>
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X size={18} />
            <span className="sr-only">Fechar</span>
          </button>
        </div>

        <div className="space-y-4 overflow-hidden min-w-0">

          {/* Linha 1: Instrumento + Label */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Instrumento */}
            <div className="flex items-center gap-2">
              <Guitar size={16} className="text-accent" />
              <Select value={instrument} onValueChange={(v) => handleInstrumentChange(v as TabInstrument)}>
                <SelectTrigger className="h-8 w-[200px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTRUMENT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Label */}
            <div className="flex items-center gap-2">
              <Label className="text-[11px] text-text3 uppercase tracking-wider whitespace-nowrap">Label:</Label>
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Ex: Intro, Solo, Riff"
                className="h-8 text-[12px] w-40"
              />
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Fórmula de compasso */}
            <div className="flex items-center gap-2">
              <Label className="text-[11px] text-text3 uppercase tracking-wider whitespace-nowrap">Compasso:</Label>
              <Select value={timeSignature} onValueChange={(v) => setTimeSignature(v as TimeSignature)}>
                <SelectTrigger className="h-8 w-[160px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SIGNATURE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            {/* Info */}
            <Badge variant="secondary" className="text-[10px] gap-1">
              <MusicNote size={12} />
              {noteCount} nota{noteCount !== 1 ? 's' : ''} · {instrumentConfig.stringCount} cordas
            </Badge>
          </div>

          {/* Linha 2: Duração + Colunas + Ações */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Duração ativa */}
            <div className="flex items-center gap-1">
              <Timer size={14} className="text-text3" />
              <Label className="text-[11px] text-text3 uppercase tracking-wider whitespace-nowrap">Duração:</Label>
              {DURATION_OPTIONS.map(d => (
                <TooltipProvider key={d.value} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={currentDuration === d.value ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-7 w-8 p-0 text-[14px] ${currentDuration === d.value ? '' : 'text-text3/60'}`}
                        onClick={() => { setCurrentDuration(d.value); focusGrid() }}
                      >
                        {d.symbol}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{d.label}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            <div className="flex-1" />

            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-text3 hover:text-vermelho" onClick={() => { clearAll(); focusGrid() }}>
              <Trash size={12} /> Limpar tudo
            </Button>
          </div>

          {/* Instruções */}
          <div className="text-center text-[11px] text-text3/80">
            <span className="text-accent font-semibold">Clique</span> = selecionar ·
            <span className="text-accent font-semibold"> Duplo clique</span> = apagar ·
            <span className="text-accent font-semibold"> Setas</span> = navegar ·
            <span className="text-accent font-semibold"> 0–9</span> = traste ·
            <span className="text-accent font-semibold"> Backspace</span> = apagar e voltar ·
            <span className="text-accent font-semibold"> Del</span> = apagar célula ·
            <span className="text-accent font-semibold"> Clique no símbolo ♩</span> = aplicar duração
          </div>

          {/* Editor SVG interativo + hidden input para captura de teclado */}
          <TabSvgEditor
            grid={grid}
            columns={columns}
            stringNames={instrumentConfig.stringNames}
            durations={durations}
            selectedCol={selectedCol}
            selectedString={selectedString}
            onCellClick={handleCellClick}
            onCellDoubleClick={handleCellDoubleClick}
            onDurationClick={handleDurationClick}
            hoverCell={hoverCell}
            onHoverCell={setHoverCell}
            barlines={barlines}
            barNumbers={barNumbers}
            inputRef={hiddenInputRef}
            onKeyDown={handleKeyDown}
          />

          {/* Preview (alphaTab) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-[11px] text-text3 uppercase tracking-wider">Preview</Label>
              <Badge variant="secondary" className="text-[10px]">
                {instrumentConfig.label}
              </Badge>
            </div>
            {noteCount > 0 && debouncedAlphaTex ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <AlphaTabViewer
                  tex={debouncedAlphaTex}
                  layout="page"
                  scale={0.8}
                  minHeight={100}
                  showTimeSignature={timeSignature !== 'free'}
                />
              </div>
            ) : (
              <div className="rounded-lg bg-[var(--bg2)] border border-border/50 p-6 text-center text-text3/50 text-[12px]">
                Insira notas no grid para visualizar o preview
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4 pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} className="gap-1.5">
            <FloppyDisk size={16} /> Salvar Tablatura
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
