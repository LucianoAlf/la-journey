import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { FloppyDisk, Trash, Guitar, MusicNote, Timer, X, CaretLeft, CaretRight, PencilSimple } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'
import { AlphaTabViewer } from './AlphaTabViewer'
import { ChordDiagram } from './ChordDiagram'
import type { ChordPositions } from './ChordDiagram'
import { getChordPositionsByName, createChord, updateChord, type Chord } from '@/services/libraryService'
import { ChordEditor, createEmptyState as createEmptyChordState, positionsToState, stateToPositions } from './ChordEditor'
import type { ChordEditorState } from './ChordEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
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

export const INSTRUMENTS: Record<TabInstrument, InstrumentConfig> = {
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

export type BeatDuration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64'

const DURATION_OPTIONS: { value: BeatDuration; label: string; symbol: string; beats: number }[] = [
  { value: 'w', label: 'Semibreve', symbol: '𝅝', beats: 4 },
  { value: 'h', label: 'Mínima', symbol: '𝅗𝅥', beats: 2 },
  { value: 'q', label: 'Semínima', symbol: '♩', beats: 1 },
  { value: '8', label: 'Colcheia', symbol: '♪', beats: 0.5 },
  { value: '16', label: 'Semicolcheia', symbol: '𝅘𝅥𝅯', beats: 0.25 },
  { value: '32', label: 'Fusa', symbol: '𝅘𝅥𝅰', beats: 0.125 },
  { value: '64', label: 'Semifusa', symbol: '𝅘𝅥𝅱', beats: 0.0625 },
]

const DURATION_ALPHATEX: Record<BeatDuration, number> = { w: 1, h: 2, q: 4, '8': 8, '16': 16, '32': 32, '64': 64 }

/** Valor de cada duração em quarter-note beats (semínima = 1) */
const DURATION_QUARTER_BEATS: Record<BeatDuration, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125, '64': 0.0625 }

/** Pontos de aumento: 0 = sem, 1 = ponto, 2 = duplo ponto */
export type DotType = 0 | 1 | 2

/** Multiplicadores para pontos: 1.0, 1.5, 1.75 */
const DOT_MULTIPLIERS: Record<DotType, number> = { 0: 1, 1: 1.5, 2: 1.75 }

/** Direção de palhetada: none = sem, down = para baixo (П), up = para cima (V) */
export type PickingDirection = 'none' | 'down' | 'up'

/** Quiáltera: 0 = sem, 3 = tercina, 5 = quintina, 6 = sextina, 7 = septina */
export type TupletValue = 0 | 3 | 5 | 6 | 7

/** Fator de duração das quiálteras: tercina = 2/3, quintina = 4/5, etc. */
const TUPLET_FACTORS: Record<TupletValue, number> = { 0: 1, 3: 2 / 3, 5: 4 / 5, 6: 4 / 6, 7: 4 / 7 }

/** Opções de quiáltera disponíveis */
const TUPLET_OPTIONS: { value: TupletValue; label: string; shortLabel: string }[] = [
  { value: 0, label: 'Sem quiáltera', shortLabel: '—' },
  { value: 3, label: 'Tercina (3:2)', shortLabel: '3' },
  { value: 5, label: 'Quintina (5:4)', shortLabel: '5' },
  { value: 6, label: 'Sextina (6:4)', shortLabel: '6' },
  { value: 7, label: 'Septina (7:4)', shortLabel: '7' },
]

/** Calcula o valor efetivo de uma duração com ponto e quiáltera */
export function getEffectiveBeats(duration: BeatDuration, dot: DotType = 0, tuplet: TupletValue = 0): number {
  return DURATION_QUARTER_BEATS[duration] * DOT_MULTIPLIERS[dot] * TUPLET_FACTORS[tuplet]
}

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
  /** Compasso composto? (6/8, 9/8, 12/8) */
  compound?: boolean
  /** Duração padrão sugerida ao selecionar este compasso */
  defaultDuration?: BeatDuration
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
  '6/8': { label: '6/8', numerator: 6, denominator: 8, quarterBeatsPerBar: 3, grouping: [1.5, 1.5], compound: true, defaultDuration: '8' },
  '7/8': { label: '7/8', numerator: 7, denominator: 8, quarterBeatsPerBar: 3.5, grouping: [1.5, 1, 1] },
  '9/8': { label: '9/8', numerator: 9, denominator: 8, quarterBeatsPerBar: 4.5, grouping: [1.5, 1.5, 1.5], compound: true, defaultDuration: '8' },
  '12/8': { label: '12/8', numerator: 12, denominator: 8, quarterBeatsPerBar: 6, grouping: [1.5, 1.5, 1.5, 1.5], compound: true, defaultDuration: '8' },
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
  { value: '2/2', label: '2/2 — Alla breve', category: 'Simples' },
  { value: '3/2', label: '3/2', category: 'Simples' },
  { value: '4/2', label: '4/2', category: 'Simples' },
  { value: '3/8', label: '3/8', category: 'Irregular' },
  { value: '5/8', label: '5/8', category: 'Irregular' },
  { value: '7/8', label: '7/8', category: 'Irregular' },
  { value: '6/8', label: '6/8 — Balada', category: 'Composto' },
  { value: '9/8', label: '9/8', category: 'Composto' },
  { value: '12/8', label: '12/8 — Blues', category: 'Composto' },
]

/** Calcula posições de barras de compasso (índice da coluna APÓS a qual desenhar barra) */
export function computeBarlines(
  durations: BeatDuration[],
  columns: number,
  timeSignature: TimeSignature,
  dots: DotType[] = [],
  tuplets: TupletValue[] = [],
): number[] {
  if (timeSignature === 'free') return []
  const tsConfig = TIME_SIGNATURES[timeSignature]
  if (!tsConfig || tsConfig.quarterBeatsPerBar <= 0) return []

  const barlines: number[] = []
  let accumulated = 0

  for (let c = 0; c < columns; c++) {
    const dur = durations[c] ?? 'q'
    accumulated += getEffectiveBeats(dur, dots[c] ?? 0, tuplets[c] ?? 0)

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
  dots: DotType[] = [],
  tuplets: TupletValue[] = [],
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
    accumulated += getEffectiveBeats(dur, dots[c] ?? 0, tuplets[c] ?? 0)

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
  /** Ligaduras: Set serializado como array de strings "col-string" */
  ties?: string[]
  /** Pontos de aumento por coluna (0 = sem, 1 = ponto, 2 = duplo) */
  dots?: DotType[]
  /** Direção de palhetada por coluna */
  pickings?: PickingDirection[]
  /** Quiálteras por coluna (0 = sem, 3 = tercina, 5 = quintina, etc.) */
  tuplets?: TupletValue[]
  /** Nomes de acordes por coluna (cifra acima do beat) */
  chordNames?: (string | null)[]
  /** Dados de posição dos acordes para gerar \chord no AlphaTab */
  chordPositionsData?: ChordPositionData[]
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

function createDefaultDots(columns: number): DotType[] {
  return Array(columns).fill(0)
}

function createDefaultPickings(columns: number): PickingDirection[] {
  return Array(columns).fill('none')
}

function createDefaultTuplets(columns: number): TupletValue[] {
  return Array(columns).fill(0)
}

function createDefaultChordNames(columns: number): (string | null)[] {
  return Array(columns).fill(null)
}

/** Dados de posição do acorde para geração do \chord no AlphaTab */
export interface ChordPositionData {
  /** Nome do acorde ("C", "Am7", etc.) */
  name: string
  /** Frets do chords-db [E_grave..e_agudo] — raw, para gerar \chord */
  frets: number[]
  /** baseFret do chords-db */
  baseFret: number
  /** Barres do chords-db (frets relativos onde há pestana) */
  barres: number[]
}

/** Formato do popover: posição do acorde com dados para o diagrama e grid */
interface ChordPopoverPosition {
  positions: ChordPositions
  baseFret: number
}

/**
 * Converte um registro Chord do banco (chord_library) para o formato do popover.
 * O banco armazena fingers com frets absolutos: [string, fret, "fingerNum"]
 * e barres com frets absolutos: { fromString, toString, fret }
 */
function chordFromDbToPopover(chord: Chord): ChordPopoverPosition {
  const pos = chord.positions as any
  if (!pos) return { positions: { fingers: [], barres: [], muted: [] }, baseFret: 1 }

  const fingers: ChordPositions['fingers'] = pos.fingers ?? []
  const barres: ChordPositions['barres'] = pos.barres ?? []
  const muted: number[] = pos.muted ?? []

  // Calcular baseFret a partir dos frets absolutos (menor fret > 0)
  let minFret = Infinity
  for (const f of fingers) {
    const fret = f[1] as number
    if (fret > 0 && fret < minFret) minFret = fret
  }
  for (const b of barres) {
    if (b.fret > 0 && b.fret < minFret) minFret = b.fret
  }
  const baseFret = pos.position ?? (minFret === Infinity ? 1 : minFret)

  return {
    positions: { fingers, barres, muted },
    baseFret,
  }
}

/**
 * Extrai os frets absolutos por corda (grid order: corda 1=e agudo → corda 6=E grave)
 * a partir dos dados do banco (fingers + barres + muted).
 * Retorna array de 6 elementos: (number | null)[] para preencher o grid da tablatura.
 */
function chordDbToGridValues(chord: Chord, stringCount: number = 6): (number | null)[] {
  const pos = chord.positions as any
  if (!pos) return Array(stringCount).fill(null)

  const fingers: any[] = pos.fingers ?? []
  const barres: any[] = pos.barres ?? []
  const muted: number[] = pos.muted ?? []

  // Mapear string → fret (SVGuitar: string 1 = e agudo, string 6 = E grave)
  // Grid: index 0 = corda mais aguda (string 1), index 5 = corda mais grave (string 6)
  const result: (number | null)[] = Array(stringCount).fill(null)

  // Preencher com barres primeiro (todas as cordas cobertas)
  for (const b of barres) {
    const from = Math.max(b.fromString, b.toString)
    const to = Math.min(b.fromString, b.toString)
    for (let s = to; s <= from; s++) {
      const gridIdx = s - 1 // string 1 → idx 0, string 6 → idx 5
      if (gridIdx >= 0 && gridIdx < stringCount) {
        result[gridIdx] = b.fret
      }
    }
  }

  // Sobrescrever com fingers (mais específicos)
  for (const f of fingers) {
    const svgString = f[0] as number // string 1-6
    const fret = f[1] as number
    const gridIdx = svgString - 1
    if (gridIdx >= 0 && gridIdx < stringCount) {
      result[gridIdx] = fret // 0 = aberta, >0 = fret absoluto
    }
  }

  // Mutar cordas
  for (const m of muted) {
    const gridIdx = m - 1
    if (gridIdx >= 0 && gridIdx < stringCount) {
      result[gridIdx] = null
    }
  }

  return result
}

// ─── Conversor: grid → alphaTex (dinâmico) ──────────────────────────

export function gridToAlphaTex(
  grid: TabGrid,
  columns: number,
  durations: BeatDuration[],
  instrumentConfig: InstrumentConfig,
  label?: string,
  timeSignature: TimeSignature = 'free',
  ties: Set<string> = new Set(),
  dots: DotType[] = [],
  pickings: PickingDirection[] = [],
  tuplets: TupletValue[] = [],
  chordNames: (string | null)[] = [],
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
    const beatEffects: string[] = []
    for (let s = 0; s < stringCount; s++) {
      const val = grid[s]?.[c]
      if (val !== null) {
        // Se esta coluna tem ligadura para a próxima → hammer-on (arco + números preservados)
        const hasTie = ties.has(`${c}-${s}`)
        notesInCol.push(hasTie ? `${val}.${s + 1}{h}` : `${val}.${s + 1}`)
      }
    }
    // Efeito de ponto: d = ponto, dd = duplo
    const dot = dots[c] ?? 0
    if (dot === 1) beatEffects.push('d')
    else if (dot >= 2) beatEffects.push('dd') // AlphaTab suporta até duplo ponto
    // Direção de palhetada: su = up, sd = down
    const picking = pickings[c] ?? 'none'
    if (picking === 'down') beatEffects.push('sd')
    else if (picking === 'up') beatEffects.push('su')
    // Quiáltera: tu N
    const tuplet = tuplets[c] ?? 0
    if (tuplet > 0) beatEffects.push(`tu ${tuplet}`)
    const beatSuffix = beatEffects.length > 0 ? `{${beatEffects.join(' ')}}` : ''
    if (notesInCol.length === 0) {
      allBeats.push(`r.${dur}${beatSuffix}`)
    } else if (notesInCol.length === 1) {
      allBeats.push(`${notesInCol[0]}.${dur}${beatSuffix}`)
    } else {
      allBeats.push(`(${notesInCol.join(' ')}).${dur}${beatSuffix}`)
    }
  }

  // Separar em compassos usando barlines calculadas
  if (timeSignature !== 'free') {
    const barlineSet = new Set(computeBarlines(durations, effectiveCols, timeSignature, dots))
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
  const [ties, setTies] = useState<Set<string>>(new Set())
  const [dots, setDots] = useState<DotType[]>(() => createDefaultDots(MIN_COLUMNS))
  const [currentDot, setCurrentDot] = useState<DotType>(0)
  const [pickings, setPickings] = useState<PickingDirection[]>(() => createDefaultPickings(MIN_COLUMNS))
  const [tuplets, setTuplets] = useState<TupletValue[]>(() => createDefaultTuplets(MIN_COLUMNS))
  const [currentTuplet, setCurrentTuplet] = useState<TupletValue>(0)
  // Acordes por coluna
  const [chordNames, setChordNames] = useState<(string | null)[]>(() => createDefaultChordNames(MIN_COLUMNS))
  const [chordPositionsData, setChordPositionsData] = useState<ChordPositionData[]>([])
  // Popover de acorde
  const [chordPopoverCol, setChordPopoverCol] = useState<number | null>(null)
  const [chordInput, setChordInput] = useState('')
  const [chordPosIdx, setChordPosIdx] = useState(0)
  const [chordApplyNotes, setChordApplyNotes] = useState(true)
  const [chordAllPositions, setChordAllPositions] = useState<ChordPopoverPosition[]>([])
  const [chordDbRecords, setChordDbRecords] = useState<Chord[]>([])
  const [chordSearchLoading, setChordSearchLoading] = useState(false)
  // Dialog do ChordEditor (diagramador)
  const [chordEditorOpen, setChordEditorOpen] = useState(false)
  const [chordEditorState, setChordEditorState] = useState<ChordEditorState>(createEmptyChordState())
  const [chordEditorName, setChordEditorName] = useState('')
  const [chordEditorStartFret, setChordEditorStartFret] = useState(1)
  const [chordEditorId, setChordEditorId] = useState<string | null>(null)
  const [chordEditorSaving, setChordEditorSaving] = useState(false)

  // Hidden input ref para captura de teclado (padrão CodeMirror/Monaco)
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  // Helper: devolver foco pro hidden input após ações da toolbar
  const focusGrid = useCallback(() => {
    requestAnimationFrame(() => {
      hiddenInputRef.current?.focus()
    })
  }, [])

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
      setTies(initialData.ties ? new Set(initialData.ties) : new Set())
      setDots(initialData.dots ? [...initialData.dots] : createDefaultDots(initialData.columns))
      setPickings(initialData.pickings ? [...initialData.pickings] : createDefaultPickings(initialData.columns))
      setTuplets(initialData.tuplets ? [...initialData.tuplets] : createDefaultTuplets(initialData.columns))
      setChordNames(initialData.chordNames ? [...initialData.chordNames] : createDefaultChordNames(initialData.columns))
      setChordPositionsData(initialData.chordPositionsData ? [...initialData.chordPositionsData] : [])
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
      setTies(new Set())
      setDots(createDefaultDots(c))
      setPickings(createDefaultPickings(c))
      setTuplets(createDefaultTuplets(c))
      setChordNames(createDefaultChordNames(c))
      setChordPositionsData([])
    }
    setCurrentDuration('q')
    setCurrentDot(0)
    setCurrentTuplet(0)
    setSelectedCol(null)
    setSelectedString(null)
    setFretInput('')
    setChordPopoverCol(null)
    setChordInput('')
    setChordPosIdx(0)
    setChordAllPositions([])
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

  // Clique na duração de uma coluna — aplicar duração e ponto ativos
  const handleDurationClick = useCallback((colIdx: number) => {
    setDurations(prev => {
      const next = [...prev]
      next[colIdx] = currentDuration
      return next
    })
    setDots(prev => {
      const next = [...prev]
      next[colIdx] = currentDot
      return next
    })
  }, [currentDuration, currentDot])

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
    setDots(prev => [...prev, currentDot])
    setPickings(prev => [...prev, 'none'])
    setTuplets(prev => [...prev, currentTuplet])
    setChordNames(prev => [...prev, null])
    setColumns(prev => prev + 1)
  }, [columns, currentDuration, currentDot, currentTuplet])

  // Remover última coluna
  const removeColumn = useCallback(() => {
    if (columns <= MIN_COLUMNS) return
    setGrid(prev => prev.map(row => row.slice(0, -1)))
    setDurations(prev => prev.slice(0, -1))
    setDots(prev => prev.slice(0, -1))
    setPickings(prev => prev.slice(0, -1))
    setTuplets(prev => prev.slice(0, -1))
    setChordNames(prev => prev.slice(0, -1))
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
    setDots(prev => {
      const next = [...prev]
      next.splice(selectedCol + 1, 0, currentDot)
      return next
    })
    setPickings(prev => {
      const next = [...prev]
      next.splice(selectedCol + 1, 0, 'none')
      return next
    })
    setTuplets(prev => {
      const next = [...prev]
      next.splice(selectedCol + 1, 0, currentTuplet)
      return next
    })
    setChordNames(prev => {
      const next = [...prev]
      next.splice(selectedCol + 1, 0, null)
      return next
    })
    setColumns(prev => prev + 1)
    setSelectedCol(prev => prev !== null ? prev + 1 : null)
  }, [columns, selectedCol, currentDuration, currentDot, currentTuplet])

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
    setDots(prev => {
      const next = [...prev]
      next.splice(selectedCol, 1)
      return next
    })
    setPickings(prev => {
      const next = [...prev]
      next.splice(selectedCol, 1)
      return next
    })
    setTuplets(prev => {
      const next = [...prev]
      next.splice(selectedCol, 1)
      return next
    })
    setChordNames(prev => {
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
    setTies(new Set())
    setDots(createDefaultDots(columns))
    setPickings(createDefaultPickings(columns))
    setTuplets(createDefaultTuplets(columns))
    setChordNames(createDefaultChordNames(columns))
    setChordPositionsData([])
  }, [columns, instrumentConfig.stringCount])

  // Toggle ligadura na célula selecionada → liga à próxima coluna
  const toggleTie = useCallback(() => {
    if (selectedCol === null || selectedString === null) return
    // Precisa ter nota na coluna atual E na próxima
    const hasCurrentNote = grid[selectedString]?.[selectedCol] !== null
    const hasNextNote = grid[selectedString]?.[selectedCol + 1] !== null
    if (!hasCurrentNote || !hasNextNote) return

    const key = `${selectedCol}-${selectedString}`
    setTies(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [selectedCol, selectedString, grid])

  // ─── Acorde para Pulso ──────────────────────────────────────────────

  // Buscar acordes do banco (async) e atualizar posições
  const fetchChordPositions = useCallback(async (name: string) => {
    if (!name.trim()) {
      setChordAllPositions([])
      setChordDbRecords([])
      setChordSearchLoading(false)
      return
    }
    setChordSearchLoading(true)
    try {
      const records = await getChordPositionsByName(name.trim(), 'guitar')
      setChordDbRecords(records)
      setChordAllPositions(records.map(chordFromDbToPopover))
    } catch {
      setChordAllPositions([])
      setChordDbRecords([])
    } finally {
      setChordSearchLoading(false)
    }
  }, [])

  // Abrir popover de acorde na coluna selecionada
  const openChordPopover = useCallback(() => {
    if (selectedCol === null) return
    const existing = chordNames[selectedCol]
    setChordPopoverCol(selectedCol)
    setChordInput(existing ?? '')
    setChordPosIdx(0)
    setChordApplyNotes(true)
    if (existing) {
      fetchChordPositions(existing)
    } else {
      setChordAllPositions([])
      setChordDbRecords([])
    }
  }, [selectedCol, chordNames, fetchChordPositions])

  // Buscar posições quando o input muda (com debounce)
  const chordSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleChordInputChange = useCallback((value: string) => {
    // Normalizar: primeira letra maiúscula (nota raiz), resto mantém (b, #, m, 7, etc.)
    const normalized = value.length > 0
      ? value[0].toUpperCase() + value.slice(1)
      : value
    setChordInput(normalized)
    setChordPosIdx(0)
    if (chordSearchTimerRef.current) clearTimeout(chordSearchTimerRef.current)
    if (normalized.trim()) {
      setChordSearchLoading(true)
      chordSearchTimerRef.current = setTimeout(() => {
        fetchChordPositions(normalized.trim())
      }, 300)
    } else {
      setChordAllPositions([])
      setChordDbRecords([])
      setChordSearchLoading(false)
    }
  }, [fetchChordPositions])

  // Aplicar acorde na coluna
  const handleApplyChord = useCallback(() => {
    if (chordPopoverCol === null || !chordInput.trim() || chordAllPositions.length === 0) return
    const col = chordPopoverCol
    const name = chordInput.trim()
    const pos = chordAllPositions[chordPosIdx]
    const dbRecord = chordDbRecords[chordPosIdx]
    if (!pos) return

    // Salvar nome do acorde na coluna
    setChordNames(prev => {
      const next = [...prev]
      next[col] = name
      return next
    })

    // Se checkbox "Aplicar notas ao tab" está marcado, preencher o grid com dados do banco
    if (chordApplyNotes && dbRecord) {
      const gridValues = chordDbToGridValues(dbRecord, instrumentConfig.stringCount)
      setGrid(prev => {
        const next = prev.map(row => [...row])
        const sc = next.length
        for (let s = 0; s < sc; s++) {
          if (s < gridValues.length) {
            next[s][col] = gridValues[s]
          }
        }
        return next
      })
    }

    setChordPopoverCol(null)
    focusGrid()
  }, [chordPopoverCol, chordInput, chordAllPositions, chordDbRecords, chordPosIdx, chordApplyNotes, instrumentConfig.stringCount, focusGrid])

  // Remover acorde da coluna
  const handleRemoveChord = useCallback(() => {
    if (chordPopoverCol === null) return
    const col = chordPopoverCol
    const oldName = chordNames[col]

    setChordNames(prev => {
      const next = [...prev]
      next[col] = null
      return next
    })

    // Se nenhuma outra coluna usa esse acorde, remover dos chordPositionsData
    if (oldName) {
      setChordPositionsData(prev => {
        const stillUsed = chordNames.some((cn, i) => i !== col && cn === oldName)
        if (stillUsed) return prev
        return prev.filter(p => p.name !== oldName)
      })
    }

    // Limpar grid na coluna (opcional — remover notas do acorde)
    setGrid(prev => {
      const next = prev.map(row => [...row])
      for (let s = 0; s < next.length; s++) {
        next[s][col] = null
      }
      return next
    })

    setChordPopoverCol(null)
    focusGrid()
  }, [chordPopoverCol, chordNames, focusGrid])

  // ─── ChordEditor Dialog (diagramador) ────────────────────────────────

  // Abrir diagramador para editar posição existente do banco
  const openChordEditorForEdit = useCallback(() => {
    const record = chordDbRecords[chordPosIdx]
    if (!record) return
    const pos = (record.positions ?? { fingers: [], barres: [], muted: [] }) as any
    const frets = [
      ...(pos.fingers ?? []).map((f: any) => f[1]).filter((f: number) => f > 0),
      ...(pos.barres ?? []).map((b: any) => b.fret),
    ]
    const minFret = frets.length > 0 ? Math.min(...frets) : 1
    const sf = pos.position && pos.position > 0 ? pos.position : (minFret > 0 ? minFret : 1)
    setChordEditorState(positionsToState(pos as ChordPositions, sf))
    setChordEditorName(record.name)
    setChordEditorStartFret(sf)
    setChordEditorId(record.id)
    setChordEditorOpen(true)
  }, [chordDbRecords, chordPosIdx])

  // Abrir diagramador para criar novo acorde
  const openChordEditorForNew = useCallback(() => {
    setChordEditorState(createEmptyChordState())
    setChordEditorName(chordInput.trim() || '')
    setChordEditorStartFret(1)
    setChordEditorId(null)
    setChordEditorOpen(true)
  }, [chordInput])

  // Salvar acorde do diagramador no banco e recarregar posições
  const handleSaveChordEditor = useCallback(async () => {
    if (!chordEditorName.trim()) {
      toast.error('Informe o nome do acorde')
      return
    }
    setChordEditorSaving(true)
    try {
      const positions = stateToPositions(chordEditorState, chordEditorStartFret)
      const positionsWithPosition = { ...positions, position: chordEditorStartFret }
      if (chordEditorId) {
        await updateChord(chordEditorId, {
          name: chordEditorName,
          positions: positionsWithPosition as any,
        })
        toast.success(`Acorde "${chordEditorName}" atualizado na biblioteca!`)
      } else {
        await createChord({
          name: chordEditorName,
          instrument: 'guitar' as any,
          positions: positionsWithPosition as any,
          difficulty: 1,
          tags: [],
        })
        toast.success(`Acorde "${chordEditorName}" criado na biblioteca!`)
        window.dispatchEvent(new Event('chord-library-updated'))
      }
      setChordEditorOpen(false)
      // Recarregar posições no popover com o nome atualizado
      setChordInput(chordEditorName)
      await fetchChordPositions(chordEditorName)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar acorde')
    } finally {
      setChordEditorSaving(false)
    }
  }, [chordEditorId, chordEditorName, chordEditorState, chordEditorStartFret, fetchChordPositions])

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
      setDots(prev => [...prev, ...Array(toAdd).fill(currentDot)])
      setPickings(prev => [...prev, ...Array(toAdd).fill('none')])
      setTuplets(prev => [...prev, ...Array(toAdd).fill(currentTuplet)])
      setChordNames(prev => [...prev, ...Array(toAdd).fill(null)])
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
            setDots(prev => prev.slice(0, newColumns))
            setPickings(prev => prev.slice(0, newColumns))
            setTuplets(prev => prev.slice(0, newColumns))
            setChordNames(prev => prev.slice(0, newColumns))
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

    // Ponto (.) — ciclar ponto de aumento na coluna selecionada (0→1→2→3→0)
    if (e.key === '.') {
      e.preventDefault()
      setDots(prev => {
        const next = [...prev]
        const cur = (next[selectedCol] ?? 0) as DotType
        next[selectedCol] = ((cur + 1) % 3) as DotType
        return next
      })
      // Também atualizar currentDot para o novo valor
      setCurrentDot(prev => ((prev + 1) % 3) as DotType)
      return
    }

    // Palhetada para baixo (D) e para cima (U)
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault()
      setPickings(prev => {
        const next = [...prev]
        next[selectedCol] = prev[selectedCol] === 'down' ? 'none' : 'down'
        return next
      })
      return
    }
    if (e.key === 'u' || e.key === 'U') {
      e.preventDefault()
      setPickings(prev => {
        const next = [...prev]
        next[selectedCol] = prev[selectedCol] === 'up' ? 'none' : 'up'
        return next
      })
      return
    }

    // Tercina/quiáltera (T) — ciclar tuplet na coluna selecionada (0→3→5→6→7→0)
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault()
      const tupletCycle: TupletValue[] = [0, 3, 5, 6, 7]
      setTuplets(prev => {
        const next = [...prev]
        const cur = next[selectedCol] ?? 0
        const idx = tupletCycle.indexOf(cur as TupletValue)
        next[selectedCol] = tupletCycle[(idx + 1) % tupletCycle.length]
        return next
      })
      return
    }

    // Ligadura (L) — toggle tie na célula selecionada
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault()
      toggleTie()
      return
    }

    // Acorde (C) — abrir popover de acorde na coluna selecionada
    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault()
      openChordPopover()
      return
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
        // Aplicar ponto ativo à coluna ao inserir nota
        setDots(prev => {
          if (prev[selectedCol] === currentDot) return prev
          const next = [...prev]
          next[selectedCol] = currentDot
          return next
        })
        // Aplicar quiáltera ativa à coluna ao inserir nota
        setTuplets(prev => {
          if (prev[selectedCol] === currentTuplet) return prev
          const next = [...prev]
          next[selectedCol] = currentTuplet
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
              setDots(prev => [...prev, ...Array(toAdd).fill(currentDot)])
              setPickings(prev => [...prev, ...Array(toAdd).fill('none')])
              setTuplets(prev => [...prev, ...Array(toAdd).fill(currentTuplet)])
              setChordNames(prev => [...prev, ...Array(toAdd).fill(null)])
              setColumns(target)
            }
            setSelectedCol(selectedCol + 1)
          }
        }
      }
    }
  }, [selectedCol, selectedString, columns, stringCount, grid, maxFret, clearCell, setFretValue, currentDuration, currentDot, currentTuplet, toggleTie])

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
    () => computeBarlines(durations, effectiveCols, timeSignature, dots, tuplets),
    [durations, effectiveCols, timeSignature, dots, tuplets],
  )
  const barNumbers = useMemo(
    () => computeBarNumbers(durations, effectiveCols, timeSignature, dots, tuplets),
    [durations, effectiveCols, timeSignature, dots, tuplets],
  )

  // AlphaTex para preview
  const alphaTex = useMemo(
    () => gridToAlphaTex(grid, columns, durations, instrumentConfig, label || undefined, timeSignature, ties, dots, pickings, tuplets, chordNames),
    [grid, columns, durations, instrumentConfig, label, timeSignature, ties, dots, pickings, tuplets, chordNames],
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
      ties: ties.size > 0 ? Array.from(ties) : undefined,
      dots: dots.some(d => d > 0) ? [...dots] : undefined,
      pickings: pickings.some(p => p !== 'none') ? [...pickings] : undefined,
      tuplets: tuplets.some(t => t > 0) ? [...tuplets] : undefined,
      chordNames: chordNames.some(c => c !== null) ? [...chordNames] : undefined,
      chordPositionsData: chordPositionsData.length > 0 ? [...chordPositionsData] : undefined,
    }
    onSave(previewLines, label, data)
    onOpenChange(false)
  }, [instrument, grid, columns, durations, label, ties, dots, pickings, tuplets, chordNames, chordPositionsData, previewLines, onSave, onOpenChange])

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
              <Select value={timeSignature} onValueChange={(v) => {
                const ts = v as TimeSignature
                setTimeSignature(ts)
                const tsConfig = TIME_SIGNATURES[ts]
                // Em compasso composto, ajustar duração padrão para colcheia e resetar ponto
                if (tsConfig.defaultDuration) {
                  setCurrentDuration(tsConfig.defaultDuration)
                  setCurrentDot(0)
                }
              }}>
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

          {/* Linha 2: Duração + Quiáltera | Ponto · Ligadura · Palhetada · Acorde | Limpar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* ── Grupo Ritmo: Duração + Quiáltera ── */}
            <div className="flex items-center gap-1.5">
              {/* Duração ativa — Select compacto */}
              {(() => {
                const isCompound = TIME_SIGNATURES[timeSignature]?.compound === true
                const selectValue = currentDot > 0 ? `${currentDuration}:${currentDot}` : currentDuration
                const currentOpt = DURATION_OPTIONS.find(d => d.value === currentDuration)
                const dottedOptions = isCompound ? [
                  { value: 'q:1', label: '♩. Sem. pont.', symbol: '♩·', dur: 'q' as BeatDuration, dot: 1 as DotType },
                  { value: 'h:1', label: '𝅗𝅥. Mín. pont.', symbol: '𝅗𝅥·', dur: 'h' as BeatDuration, dot: 1 as DotType },
                ] : []

                return (
                  <Select
                    value={selectValue}
                    onValueChange={(v) => {
                      if (v.includes(':')) {
                        const [dur, dot] = v.split(':')
                        setCurrentDuration(dur as BeatDuration)
                        setCurrentDot(parseInt(dot) as DotType)
                      } else {
                        setCurrentDuration(v as BeatDuration)
                        setCurrentDot(0)
                      }
                      focusGrid()
                    }}
                  >
                    <SelectTrigger className="h-7 w-[110px] text-[13px] gap-1 px-2">
                      <SelectValue>
                        {currentOpt?.symbol}{currentDot > 0 ? '·'.repeat(currentDot) : ''}{' '}
                        <span className="text-[10px] text-text3/70">
                          {currentOpt?.label}{currentDot > 0 ? ' pont.' : ''}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {isCompound && dottedOptions.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] text-text3/60 uppercase tracking-wider">Pontuadas</div>
                          {dottedOptions.map(d => (
                            <SelectItem key={d.value} value={d.value} className="text-[13px]">
                              <span className="mr-2">{d.symbol}</span> {d.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-[10px] text-text3/60 uppercase tracking-wider border-t mt-1 pt-1">Normais</div>
                        </>
                      )}
                      {DURATION_OPTIONS.map(d => (
                        <SelectItem key={d.value} value={d.value} className="text-[13px]">
                          <span className="mr-2">{d.symbol}</span> {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              })()}

              {/* Quiáltera/Tercina — ao lado da duração (semântica rítmica) */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select
                        value={String(currentTuplet)}
                        onValueChange={(v) => {
                          const val = parseInt(v) as TupletValue
                          setCurrentTuplet(val)
                          if (selectedCol !== null) {
                            setTuplets(prev => {
                              const next = [...prev]
                              next[selectedCol] = val
                              return next
                            })
                          }
                          focusGrid()
                        }}
                      >
                        <SelectTrigger className={`h-7 w-auto min-w-[60px] text-[12px] px-1.5 gap-0.5 ${currentTuplet > 0 ? 'border-accent/40 text-accent' : 'border-input text-text3'}`}>
                          <SelectValue>
                            <span className="font-mono text-[11px]">┌ {currentTuplet > 0 ? currentTuplet : 3} ┐</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TUPLET_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={String(opt.value)} className="text-[12px]">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Quiáltera / Tercina (T)</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Separador visual */}
            <div className="w-px h-5 bg-border mx-0.5" />

            {/* ── Grupo Efeitos: Ponto · Ligadura · Palhetada · Acorde ── */}
            <div className="flex items-center gap-1">
              {/* Ponto de aumento */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-[13px] font-bold transition-colors
                        ${currentDot > 0
                          ? 'border-accent/40 bg-accent/10 text-accent'
                          : 'border-input text-text3 hover:bg-accent/5 hover:text-accent'
                        }`}
                      onClick={() => {
                        const nextDot = ((currentDot + 1) % 3) as DotType
                        setCurrentDot(nextDot)
                        if (selectedCol !== null) {
                          setDots(prev => {
                            const next = [...prev]
                            next[selectedCol] = nextDot
                            return next
                          })
                        }
                        focusGrid()
                      }}
                    >
                      {currentDot === 0 ? '·' : currentDot === 1 ? '•' : '••'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {currentDot === 0 ? 'Sem ponto (.)' : currentDot === 1 ? 'Ponto simples (.)' : 'Duplo ponto (.)'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Ligadura */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-sm transition-colors
                        ${selectedCol !== null && selectedString !== null && ties.has(`${selectedCol}-${selectedString}`)
                          ? 'border-accent/40 bg-accent/10 text-accent'
                          : 'border-input text-text3 hover:bg-accent/5 hover:text-accent'
                        }`}
                      onClick={() => { toggleTie(); focusGrid() }}
                    >
                      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                        <path d="M3 9 Q8 2 13 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Ligadura (L)</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Palhetada ↓↑ — componente único */}
              <div className={`inline-flex items-center h-7 rounded-md border overflow-hidden
                ${selectedCol !== null && (pickings[selectedCol] === 'down' || pickings[selectedCol] === 'up')
                  ? 'border-accent/40'
                  : 'border-input'
                }`}>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={`inline-flex items-center justify-center h-full w-7 text-[15px] font-bold transition-colors
                          ${selectedCol !== null && pickings[selectedCol] === 'down'
                            ? 'bg-accent/10 text-accent'
                            : 'text-text3 hover:bg-accent/5 hover:text-accent'
                          }`}
                        onClick={() => {
                          if (selectedCol !== null) {
                            setPickings(prev => {
                              const next = [...prev]
                              next[selectedCol] = prev[selectedCol] === 'down' ? 'none' : 'down'
                              return next
                            })
                          }
                          focusGrid()
                        }}
                      >
                        П
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Palhetada para baixo (D)</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="w-px h-4 bg-border" />
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={`inline-flex items-center justify-center h-full w-7 text-[15px] font-bold transition-colors
                          ${selectedCol !== null && pickings[selectedCol] === 'up'
                            ? 'bg-accent/10 text-accent'
                            : 'text-text3 hover:bg-accent/5 hover:text-accent'
                          }`}
                        onClick={() => {
                          if (selectedCol !== null) {
                            setPickings(prev => {
                              const next = [...prev]
                              next[selectedCol] = prev[selectedCol] === 'up' ? 'none' : 'up'
                              return next
                            })
                          }
                          focusGrid()
                        }}
                      >
                        V
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Palhetada para cima (U)</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Acorde */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`inline-flex items-center justify-center h-7 px-2 rounded-md border text-[12px] font-semibold transition-colors gap-1
                        ${selectedCol !== null && chordNames[selectedCol]
                          ? 'border-accent/40 bg-accent/10 text-accent'
                          : 'border-input text-text3 hover:bg-accent/5 hover:text-accent'
                        }`}
                      onClick={() => { openChordPopover() }}
                      disabled={selectedCol === null}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="2" y1="3" x2="14" y2="3" />
                        <line x1="2" y1="8" x2="14" y2="8" />
                        <line x1="2" y1="13" x2="14" y2="13" />
                        <line x1="2" y1="1" x2="2" y2="15" strokeWidth="2.5" />
                        <line x1="6" y1="1" x2="6" y2="15" />
                        <line x1="10" y1="1" x2="10" y2="15" />
                        <line x1="14" y1="1" x2="14" y2="15" />
                        <circle cx="8" cy="5.5" r="1.5" fill="currentColor" stroke="none" />
                        <circle cx="4" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
                        <circle cx="12" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
                      </svg>
                      {selectedCol !== null && chordNames[selectedCol] ? chordNames[selectedCol] : 'Acorde'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Acorde para pulso (C)</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Acorde popover container */}
            <div className="relative">
              {/* Popover anchor — positioned by the relative container */}

              {/* Popover de acorde */}
              {chordPopoverCol !== null && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-xl shadow-2xl p-4 w-[320px]"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="font-semibold text-[13px] text-center mb-3 uppercase tracking-wide">Acorde para Pulso</h3>

                  <div className="flex gap-3 items-start">
                    {/* Coluna esquerda: Input + Checkbox */}
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="text-[10px] text-text3 uppercase tracking-wider mb-1 block">Insira seu acorde</label>
                        <Input
                          value={chordInput}
                          onChange={e => handleChordInputChange(e.target.value)}
                          placeholder="Ex: C, Am7, F#m"
                          className="h-8 text-[13px] font-semibold"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleApplyChord()
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              setChordPopoverCol(null)
                              focusGrid()
                            }
                          }}
                        />
                      </div>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chordApplyNotes}
                          onChange={e => setChordApplyNotes(e.target.checked)}
                          className="rounded border-border accent-accent mt-0.5"
                        />
                        <span className="text-[11px] text-text2 leading-tight">Aplicar notas do<br />acorde ao tab</span>
                      </label>
                    </div>

                    {/* Coluna direita: Diagrama + navegação + criar */}
                    {chordAllPositions.length > 0 && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            className="p-0.5 rounded hover:bg-accent/10 text-text3 hover:text-accent disabled:opacity-30"
                            disabled={chordPosIdx <= 0}
                            onClick={() => setChordPosIdx(prev => Math.max(0, prev - 1))}
                          >
                            <CaretLeft size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer rounded-lg hover:ring-2 hover:ring-accent/30 transition-all relative group"
                            onClick={openChordEditorForEdit}
                            title="Clique para editar no diagramador"
                          >
                            <ChordDiagram
                              name=""
                              positions={chordAllPositions[chordPosIdx]?.positions ?? { fingers: [] }}
                              position={chordAllPositions[chordPosIdx]?.baseFret ?? 1}
                              size="compact"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors">
                              <PencilSimple size={18} weight="bold" className="text-accent opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                            </div>
                          </button>
                          <button
                            className="p-0.5 rounded hover:bg-accent/10 text-text3 hover:text-accent disabled:opacity-30"
                            disabled={chordPosIdx >= chordAllPositions.length - 1}
                            onClick={() => setChordPosIdx(prev => Math.min(chordAllPositions.length - 1, prev + 1))}
                          >
                            <CaretRight size={16} weight="bold" />
                          </button>
                        </div>
                        <span className="text-[10px] text-text3">{chordPosIdx + 1} de {chordAllPositions.length}</span>
                        {chordInput.trim() && (
                          <button
                            type="button"
                            className="text-[10px] text-accent hover:underline"
                            onClick={openChordEditorForNew}
                          >
                            + Criar nova posição
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    {chordNames[chordPopoverCol] && (
                      <Button variant="outline" size="sm" className="h-7 text-[11px] text-vermelho border-vermelho/30 hover:bg-vermelho/10" onClick={handleRemoveChord}>
                        Remover
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => { setChordPopoverCol(null); focusGrid() }}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="h-7 text-[11px]" onClick={handleApplyChord} disabled={!chordInput.trim() || chordAllPositions.length === 0}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              )}
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
            <span className="text-accent font-semibold"> L</span> = ligadura ·
            <span className="text-accent font-semibold"> .</span> = ponto ·
            <span className="text-accent font-semibold"> D</span> = palhetada ↓ ·
            <span className="text-accent font-semibold"> U</span> = palhetada ↑ ·
            <span className="text-accent font-semibold"> T</span> = quiáltera ·
            <span className="text-accent font-semibold"> C</span> = acorde ·
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
            ties={ties}
            dots={dots}
            pickings={pickings}
            tuplets={tuplets}
            chordNames={chordNames}
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

        {/* ====== DIALOG: ChordEditor (diagramador de acorde) ====== */}
        <Dialog open={chordEditorOpen} onOpenChange={setChordEditorOpen}>
          <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto bg-surface border-border" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="font-serif text-[22px]">
                {chordEditorId ? 'Editar' : 'Novo'} <span className="text-accent">Acorde</span>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-[1fr_200px] gap-6 mt-2">
              <ChordEditor
                state={chordEditorState}
                onChange={setChordEditorState}
                chordName={chordEditorName}
                startFret={chordEditorStartFret}
              />
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="text-[11px] text-text3 uppercase tracking-wider mb-1 block">Nome do acorde</Label>
                  <Input
                    value={chordEditorName}
                    onChange={e => setChordEditorName(e.target.value)}
                    placeholder="Ex: Am7"
                    className="text-[13px] h-9"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-text3 uppercase tracking-wider mb-1 block">Traste inicial</Label>
                  <Select value={String(chordEditorStartFret)} onValueChange={v => setChordEditorStartFret(Number(v))}>
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}ª casa</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setChordEditorOpen(false)} disabled={chordEditorSaving}>Cancelar</Button>
              <Button onClick={handleSaveChordEditor} disabled={chordEditorSaving}>
                <FloppyDisk size={16} /> {chordEditorSaving ? 'Salvando...' : (chordEditorId ? 'Salvar Acorde' : 'Criar Acorde')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>,
    document.body
  )
}
