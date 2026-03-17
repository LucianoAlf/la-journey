import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { FloppyDisk, Plus, Minus, Trash, ArrowLeft, ArrowRight, Guitar, MusicNote, Timer } from '@phosphor-icons/react'
import { AlphaTabViewer } from './AlphaTabViewer'
import { TabSvgEditor } from './TabSvgEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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

// ─── Constantes ─────────────────────────────────────────────────────

const MIN_COLUMNS = 8
const MAX_COLUMNS = 40

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
): string {
  const stringCount = instrumentConfig.stringCount
  let hasNotes = false
  for (let s = 0; s < stringCount; s++) {
    for (let c = 0; c < columns; c++) {
      if (grid[s]?.[c] !== null) { hasNotes = true; break }
    }
    if (hasNotes) break
  }
  if (!hasNotes) return ''

  const lines: string[] = []
  if (label) lines.push(`\\title "${label}"`)
  lines.push('\\tempo 120')
  lines.push('\\staff{tabs}')
  lines.push(`\\tuning ${instrumentConfig.tuningAlphaTex}`)
  lines.push(`\\instrument ${instrumentConfig.alphaTabInstrument}`)
  lines.push('.')

  // Cada coluna = um beat com duração configurável
  // Cordas no grid: [0]=agudo(string 1), ..., [N-1]=grave(string N)
  const beats: string[] = []
  for (let c = 0; c < columns; c++) {
    const dur = DURATION_ALPHATEX[durations[c] ?? 'q']
    const notesInCol: string[] = []
    for (let s = 0; s < stringCount; s++) {
      const val = grid[s]?.[c]
      if (val !== null) {
        notesInCol.push(`${val}.${s + 1}`)
      }
    }
    if (notesInCol.length === 0) {
      beats.push(`r.${dur}`)
    } else if (notesInCol.length === 1) {
      beats.push(`${notesInCol[0]}.${dur}`)
    } else {
      beats.push(`(${notesInCol.join(' ')}).${dur}`)
    }
  }

  // Agrupar em compassos de 4 beats
  const bars: string[] = []
  for (let i = 0; i < beats.length; i += 4) {
    bars.push(beats.slice(i, i + 4).join(' '))
  }
  lines.push(bars.join(' | \n'))

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
  const fretInputRef = useRef<HTMLInputElement>(null)

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
    setTimeout(() => fretInputRef.current?.focus(), 50)
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
    setGrid(prev => prev.map(row => {
      const next = [...row]
      next.splice(selectedCol + 1, 0, null)
      return next
    }))
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
    setGrid(prev => prev.map(row => {
      const next = [...row]
      next.splice(selectedCol, 1)
      return next
    }))
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

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        if (selectedCol < columns - 1) setSelectedCol(selectedCol + 1)
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
      case 'Backspace':
        e.preventDefault()
        clearCell()
        break
      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          if (selectedCol > 0) setSelectedCol(selectedCol - 1)
        } else {
          if (selectedCol < columns - 1) setSelectedCol(selectedCol + 1)
        }
        break
    }

    // Números diretos (0-9)
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const current = grid[selectedString]?.[selectedCol]
      const currentStr = current !== null ? String(current) : ''
      const newVal = currentStr.length >= 2 ? e.key : currentStr + e.key
      const num = parseInt(newVal)
      if (num >= 0 && num <= maxFret) {
        setFretValue(newVal)
      }
    }
  }, [selectedCol, selectedString, columns, stringCount, grid, maxFret, clearCell, setFretValue])

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

  // AlphaTex para preview
  const alphaTex = useMemo(
    () => gridToAlphaTex(grid, columns, durations, instrumentConfig, label || undefined),
    [grid, columns, durations, instrumentConfig, label],
  )

  // Salvar
  const handleSave = useCallback(() => {
    const data: TablatureData = {
      instrument,
      grid: grid.map(row => [...row]),
      columns,
      durations: [...durations],
      label: label || undefined,
    }
    onSave(previewLines, label, data)
    onOpenChange(false)
  }, [instrument, grid, columns, durations, label, previewLines, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[960px] max-h-[90vh] overflow-y-auto bg-surface border-border"
        onInteractOutside={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            Editor de <span className="text-accent">Tablatura</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">

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
                        onClick={() => setCurrentDuration(d.value)}
                      >
                        {d.symbol}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{d.label}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            <div className="h-6 w-px bg-border mx-1" />

            {/* Colunas */}
            <div className="flex items-center gap-1">
              <Label className="text-[11px] text-text3 uppercase tracking-wider whitespace-nowrap">Posições:</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={removeColumn} disabled={columns <= MIN_COLUMNS}>
                      <Minus size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Remover última coluna</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Badge variant="secondary" className="text-[11px] font-mono min-w-[2rem] justify-center">
                {columns}
              </Badge>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={addColumn} disabled={columns >= MAX_COLUMNS}>
                      <Plus size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Adicionar coluna</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="h-6 w-px bg-border mx-1" />

            {/* Inserir/remover na posição */}
            {selectedCol !== null && (
              <>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-text3" onClick={insertColumnAt} disabled={columns >= MAX_COLUMNS}>
                        <ArrowRight size={12} /> Inserir após {selectedCol + 1}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Inserir coluna vazia após a posição selecionada</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-vermelho" onClick={removeColumnAt} disabled={columns <= MIN_COLUMNS}>
                        <Trash size={12} /> Remover {selectedCol + 1}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Remover coluna selecionada</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            <div className="flex-1" />

            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-text3 hover:text-vermelho" onClick={clearAll}>
              <Trash size={12} /> Limpar tudo
            </Button>
          </div>

          {/* Instruções */}
          <div className="text-center text-[11px] text-text3/80">
            <span className="text-accent font-semibold">Clique</span> = selecionar ·
            <span className="text-accent font-semibold"> Duplo clique</span> = apagar ·
            <span className="text-accent font-semibold"> Setas</span> = navegar ·
            <span className="text-accent font-semibold"> 0–9</span> = traste ·
            <span className="text-accent font-semibold"> Del</span> = apagar ·
            <span className="text-accent font-semibold"> Clique no símbolo ♩</span> = aplicar duração
          </div>

          {/* Editor SVG interativo */}
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
          />

          {/* Preview (alphaTab) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-[11px] text-text3 uppercase tracking-wider">Preview</Label>
              <Badge variant="secondary" className="text-[10px]">
                {instrumentConfig.label}
              </Badge>
            </div>
            {noteCount > 0 && alphaTex ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <AlphaTabViewer
                  tex={alphaTex}
                  layout="horizontal"
                  scale={0.7}
                  minHeight={140}
                />
              </div>
            ) : (
              <div className="rounded-lg bg-[var(--bg2)] border border-border/50 p-6 text-center text-text3/50 text-[12px]">
                Insira notas no grid para visualizar o preview
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} className="gap-1.5">
            <FloppyDisk size={16} /> Salvar Tablatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
