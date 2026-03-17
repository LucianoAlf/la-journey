import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { FloppyDisk, Plus, Minus, Trash, ArrowLeft, ArrowRight, Guitar } from '@phosphor-icons/react'
import { AlphaTabViewer } from './AlphaTabViewer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ─── Constantes ─────────────────────────────────────────────────────
const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'] // mi agudo → mi grave (top → bottom)
const STRING_COLORS = [
  'text-emerald-400', // E agudo
  'text-emerald-400', // B
  'text-emerald-400', // G
  'text-emerald-400', // D
  'text-emerald-400', // A
  'text-emerald-400', // E grave
]

const MIN_COLUMNS = 8
const MAX_COLUMNS = 40
const MAX_FRET = 24

// ─── Tipos ──────────────────────────────────────────────────────────

/** Cada célula da tablatura: null = vazio (---), number = traste */
type TabCell = number | null
/** Grid: 6 cordas × N colunas */
type TabGrid = TabCell[][]

export interface TablatureEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Linhas de tablatura existentes (formato texto, ex: ["E|---12---|", "B|---8---|", ...]) */
  initialLines?: string[]
  /** Label opcional (nome do acorde/seção) */
  initialLabel?: string
  /** Callback ao salvar — retorna as linhas de texto atualizadas */
  onSave: (lines: string[], label: string) => void
}

// ─── Parser: texto → grid ───────────────────────────────────────────

function parseTabLines(lines: string[]): { grid: TabGrid; columns: number } {
  if (!lines.length) {
    // Grid vazia com MIN_COLUMNS
    const grid = Array.from({ length: 6 }, () => Array(MIN_COLUMNS).fill(null))
    return { grid, columns: MIN_COLUMNS }
  }

  // Extrair conteúdo de cada linha (após o "X|")
  const contents: string[] = []
  for (const line of lines) {
    const match = line.match(/^[\s]*[EBADGe]\|(.*)$/)
    if (match) {
      contents.push(match[1].replace(/\|$/, '')) // remover pipe final
    }
  }

  if (contents.length === 0) {
    const grid = Array.from({ length: 6 }, () => Array(MIN_COLUMNS).fill(null))
    return { grid, columns: MIN_COLUMNS }
  }

  // Tokenizar cada linha em posições
  // Cada posição é: um número (1-2 dígitos) ou hifens/espaços
  const parsedRows: (number | null)[][] = []
  let maxCols = 0

  for (const content of contents) {
    const positions: (number | null)[] = []
    let i = 0
    while (i < content.length) {
      const ch = content[i]
      if (ch >= '0' && ch <= '9') {
        // Ler número (pode ser 2 dígitos)
        let num = ch
        if (i + 1 < content.length && content[i + 1] >= '0' && content[i + 1] <= '9') {
          num += content[i + 1]
          i++
        }
        positions.push(parseInt(num))
        i++
        // Pular separadores após o número
        while (i < content.length && (content[i] === '-' || content[i] === ' ')) i++
      } else if (ch === '-' || ch === ' ') {
        // Pular separadores (acumula até próximo número ou fim)
        let dashCount = 0
        while (i < content.length && (content[i] === '-' || content[i] === ' ')) {
          dashCount++
          i++
        }
        // Se estamos no início ou entre números, pode ser uma posição vazia
        if (positions.length === 0 && dashCount > 0 && i < content.length) {
          // Separadores iniciais — ignorar
        } else if (i >= content.length && positions.length === 0) {
          // Linha toda de hifens — inserir nulls
          positions.push(null)
        }
      } else {
        i++
      }
    }
    // Se não parseou nada, linha vazia
    if (positions.length === 0) positions.push(null)
    parsedRows.push(positions)
    maxCols = Math.max(maxCols, positions.length)
  }

  // Normalizar para mesmo número de colunas
  const columns = Math.max(maxCols, MIN_COLUMNS)
  const grid: TabGrid = []
  for (let s = 0; s < 6; s++) {
    const row = parsedRows[s] ?? []
    grid.push([...row, ...Array(columns - row.length).fill(null)])
  }

  return { grid, columns }
}

// ─── Serializer: grid → texto ───────────────────────────────────────

function gridToTabLines(grid: TabGrid, columns: number): string[] {
  const lines: string[] = []
  for (let s = 0; s < 6; s++) {
    let content = ''
    for (let c = 0; c < columns; c++) {
      const val = grid[s][c]
      if (val !== null) {
        const numStr = String(val)
        // Separador antes
        if (c === 0) {
          content += numStr.length === 2 ? '' : '-'
        }
        content += numStr
        // Separador após
        content += '---'
        if (numStr.length === 1) content += '-'
      } else {
        content += '------'
      }
    }
    // Padding para alinhar
    content += '--|'
    lines.push(`${STRING_NAMES[s]}|${content}`)
  }
  return lines
}

// ─── Componente Grid Interativo ─────────────────────────────────────

interface TabGridEditorProps {
  grid: TabGrid
  columns: number
  selectedCol: number | null
  selectedString: number | null
  onCellClick: (stringIdx: number, colIdx: number) => void
  onCellDoubleClick: (stringIdx: number, colIdx: number) => void
  hoverCell: { s: number; c: number } | null
  onHoverCell: (cell: { s: number; c: number } | null) => void
}

function TabGridEditor({
  grid, columns, selectedCol, selectedString,
  onCellClick, onCellDoubleClick, hoverCell, onHoverCell,
}: TabGridEditorProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <div className="p-3 min-w-fit">
        {/* Header — números de posição */}
        <div className="flex items-center mb-1">
          <div className="w-7 flex-shrink-0" />
          <div className="w-5 flex-shrink-0 text-center text-text3/30 text-[9px]">|</div>
          {Array.from({ length: columns }, (_, c) => (
            <div
              key={c}
              className={`w-10 flex-shrink-0 text-center text-[9px] font-mono ${
                selectedCol === c ? 'text-accent font-bold' : 'text-text3/40'
              }`}
            >
              {c + 1}
            </div>
          ))}
          <div className="w-5 flex-shrink-0 text-center text-text3/30 text-[9px]">|</div>
        </div>

        {/* Cordas */}
        {STRING_NAMES.map((name, s) => (
          <div key={s} className="flex items-center h-7">
            {/* Label da corda */}
            <div className={`w-7 flex-shrink-0 text-center font-mono font-bold text-[12px] ${STRING_COLORS[s]}`}>
              {name}
            </div>
            {/* Pipe inicial */}
            <div className="w-5 flex-shrink-0 text-center text-text3/30 font-mono text-[11px]">|</div>

            {/* Células */}
            {Array.from({ length: columns }, (_, c) => {
              const val = grid[s]?.[c] ?? null
              const isSelected = selectedCol === c && selectedString === s
              const isColSelected = selectedCol === c
              const isHovered = hoverCell?.s === s && hoverCell?.c === c
              const hasValue = val !== null

              return (
                <div
                  key={c}
                  className={`w-10 h-7 flex-shrink-0 flex items-center justify-center cursor-pointer
                    font-mono text-[12px] transition-all border-b relative
                    ${isSelected
                      ? 'bg-accent/20 border-accent/40 ring-1 ring-accent/30 rounded'
                      : isColSelected
                        ? 'bg-accent/5 border-border/40'
                        : isHovered
                          ? 'bg-[var(--azul-soft)] border-border/40'
                          : 'border-border/20'
                    }
                    ${hasValue ? 'font-bold' : ''}
                  `}
                  onClick={() => onCellClick(s, c)}
                  onDoubleClick={() => onCellDoubleClick(s, c)}
                  onMouseEnter={() => onHoverCell({ s, c })}
                  onMouseLeave={() => onHoverCell(null)}
                >
                  {hasValue ? (
                    <span className="text-[#FF2D78] font-bold text-[13px]">{val}</span>
                  ) : (
                    <span className="text-blue-400/20">—</span>
                  )}
                </div>
              )
            })}

            {/* Pipe final */}
            <div className="w-5 flex-shrink-0 text-center text-text3/30 font-mono text-[11px]">|</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Conversor: grid → alphaTex ─────────────────────────────────────

function gridToAlphaTex(grid: TabGrid, columns: number, label?: string): string {
  // Verificar se há notas
  let hasNotes = false
  for (let s = 0; s < 6; s++) {
    for (let c = 0; c < columns; c++) {
      if (grid[s]?.[c] !== null) { hasNotes = true; break }
    }
    if (hasNotes) break
  }
  if (!hasNotes) return ''

  const lines: string[] = []
  if (label) lines.push(`\\title "${label}"`)
  lines.push('\\tuning E4 B3 G3 D3 A2 E2')
  lines.push('\\instrument AcousticGuitarSteel')
  lines.push('\\tempo 120')
  lines.push('\\staff{score} \\staff{tabs}')
  lines.push('.')

  // Cada coluna = um beat (semínima)
  // Cordas no grid: [0]=E agudo(string 1), [1]=B(string 2), ..., [5]=E grave(string 6)
  const beats: string[] = []
  for (let c = 0; c < columns; c++) {
    const notesInCol: string[] = []
    for (let s = 0; s < 6; s++) {
      const val = grid[s]?.[c]
      if (val !== null) {
        // alphaTab: fret.string — string 1=E agudo, string 6=E grave
        // Grid: s=0 → string 1 (E agudo), s=5 → string 6 (E grave)
        notesInCol.push(`${val}.${s + 1}`)
      }
    }
    if (notesInCol.length === 0) {
      beats.push('r.4') // pausa
    } else if (notesInCol.length === 1) {
      beats.push(`${notesInCol[0]}.4`)
    } else {
      beats.push(`(${notesInCol.join(' ')}).4`)
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

// ─── Preview de texto ───────────────────────────────────────────────

function TabPreview({ lines, label }: { lines: string[]; label?: string }) {
  return (
    <div className="rounded-lg bg-[var(--bg2)] border border-border/50 overflow-hidden">
      {label && (
        <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[1px] text-text3/60">
          {label}
        </div>
      )}
      <div className="px-3 py-2 overflow-x-auto">
        <pre className="font-mono text-[11px] leading-[1.5] whitespace-pre text-text2">
          {lines.map((line, i) => {
            const match = line.match(/^(\s*)([EBADGe])(\|)(.*)$/)
            if (!match) return <div key={i}>{line}</div>
            const [, indent, stringLabel, pipe, rest] = match
            return (
              <div key={i} className="flex">
                <span className="text-text3/40 whitespace-pre">{indent}</span>
                <span className="text-emerald-400 font-bold w-[1ch] text-center">{stringLabel}</span>
                <span className="text-text3/30">{pipe}</span>
                <span className="text-blue-400/50">
                  {rest.split(/(\d+)/).map((part, j) =>
                    /^\d+$/.test(part)
                      ? <span key={j} className="text-[#FF2D78] font-bold">{part}</span>
                      : <span key={j}>{part}</span>
                  )}
                </span>
              </div>
            )
          })}
        </pre>
      </div>
    </div>
  )
}

// ─── Componente Principal ───────────────────────────────────────────

export function TablatureEditor({ open, onOpenChange, initialLines, initialLabel, onSave }: TablatureEditorProps) {
  // Parse dados iniciais
  const initial = useMemo(() => {
    const { grid, columns } = parseTabLines(initialLines ?? [])
    return { grid, columns }
  }, [initialLines])

  // Estado do editor
  const [grid, setGrid] = useState<TabGrid>(initial.grid)
  const [columns, setColumns] = useState(initial.columns)
  const [label, setLabel] = useState(initialLabel ?? '')
  const [selectedCol, setSelectedCol] = useState<number | null>(null)
  const [selectedString, setSelectedString] = useState<number | null>(null)
  const [hoverCell, setHoverCell] = useState<{ s: number; c: number } | null>(null)
  const [fretInput, setFretInput] = useState('')
  const fretInputRef = useRef<HTMLInputElement>(null)

  // Reset quando abrir com novos dados
  useEffect(() => {
    if (open) {
      const { grid: g, columns: c } = parseTabLines(initialLines ?? [])
      setGrid(g)
      setColumns(c)
      setLabel(initialLabel ?? '')
      setSelectedCol(null)
      setSelectedString(null)
      setFretInput('')
    }
  }, [open, initialLines, initialLabel])

  // Selecionar célula
  const handleCellClick = useCallback((s: number, c: number) => {
    setSelectedCol(c)
    setSelectedString(s)
    const val = grid[s]?.[c]
    setFretInput(val !== null ? String(val) : '')
    // Focar input de traste
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

  // Definir traste na célula selecionada
  const setFretValue = useCallback((value: string) => {
    if (selectedCol === null || selectedString === null) return
    const num = parseInt(value)
    if (isNaN(num) || num < 0 || num > MAX_FRET) return
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[selectedString][selectedCol] = num
      return next
    })
    setFretInput(value)
  }, [selectedCol, selectedString])

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
    setColumns(prev => prev + 1)
  }, [columns])

  // Remover última coluna
  const removeColumn = useCallback(() => {
    if (columns <= MIN_COLUMNS) return
    setGrid(prev => prev.map(row => row.slice(0, -1)))
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
    setColumns(prev => prev + 1)
    setSelectedCol(prev => prev !== null ? prev + 1 : null)
  }, [columns, selectedCol])

  // Remover coluna na posição selecionada
  const removeColumnAt = useCallback(() => {
    if (columns <= MIN_COLUMNS || selectedCol === null) return
    setGrid(prev => prev.map(row => {
      const next = [...row]
      next.splice(selectedCol, 1)
      return next
    }))
    setColumns(prev => prev - 1)
    setSelectedCol(null)
    setSelectedString(null)
  }, [columns, selectedCol])

  // Limpar tudo
  const clearAll = useCallback(() => {
    setGrid(Array.from({ length: 6 }, () => Array(columns).fill(null)))
    setSelectedCol(null)
    setSelectedString(null)
    setFretInput('')
  }, [columns])

  // Navegação com teclado
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
        if (selectedString < 5) setSelectedString(selectedString + 1)
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
      const current = grid[selectedString][selectedCol]
      const currentStr = current !== null ? String(current) : ''
      // Se já tem 2 dígitos, substituir
      const newVal = currentStr.length >= 2 ? e.key : currentStr + e.key
      const num = parseInt(newVal)
      if (num >= 0 && num <= MAX_FRET) {
        setFretValue(newVal)
      }
    }
  }, [selectedCol, selectedString, columns, grid, clearCell, setFretValue])

  // Gerar preview
  const previewLines = useMemo(() => gridToTabLines(grid, columns), [grid, columns])

  // Contagem de notas
  const noteCount = useMemo(() => {
    let count = 0
    for (let s = 0; s < 6; s++) {
      for (let c = 0; c < columns; c++) {
        if (grid[s]?.[c] !== null) count++
      }
    }
    return count
  }, [grid, columns])

  // Salvar
  const handleSave = useCallback(() => {
    onSave(previewLines, label)
    onOpenChange(false)
  }, [previewLines, label, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-surface border-border"
        onInteractOutside={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            Editor de <span className="text-accent">Tablatura</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
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

            <div className="h-6 w-px bg-border mx-1" />

            {/* Colunas */}
            <div className="flex items-center gap-1">
              <Label className="text-[11px] text-text3 uppercase tracking-wider whitespace-nowrap">Posições:</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0"
                      onClick={removeColumn}
                      disabled={columns <= MIN_COLUMNS}
                    >
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
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0"
                      onClick={addColumn}
                      disabled={columns >= MAX_COLUMNS}
                    >
                      <Plus size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Adicionar coluna</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="h-6 w-px bg-border mx-1" />

            {/* Inserir/remover coluna na posição */}
            {selectedCol !== null && (
              <>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 gap-1 text-[11px] text-text3"
                        onClick={insertColumnAt}
                        disabled={columns >= MAX_COLUMNS}
                      >
                        <ArrowRight size={12} /> Inserir após {selectedCol + 1}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Inserir coluna vazia após a posição selecionada</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 gap-1 text-[11px] text-vermelho"
                        onClick={removeColumnAt}
                        disabled={columns <= MIN_COLUMNS}
                      >
                        <Trash size={12} /> Remover {selectedCol + 1}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Remover coluna selecionada</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            <div className="flex-1" />

            {/* Limpar tudo */}
            <Button
              variant="ghost" size="sm"
              className="h-7 gap-1 text-[11px] text-text3 hover:text-vermelho"
              onClick={clearAll}
            >
              <Trash size={12} /> Limpar tudo
            </Button>
          </div>

          {/* Instruções */}
          <div className="text-center text-[11px] text-text3/80">
            <span className="text-accent font-semibold">Clique</span> = selecionar posição ·
            <span className="text-accent font-semibold"> Duplo clique</span> = apagar nota ·
            <span className="text-accent font-semibold"> Setas</span> = navegar ·
            <span className="text-accent font-semibold"> 0–9</span> = inserir traste ·
            <span className="text-accent font-semibold"> Del</span> = apagar
          </div>

          {/* Grid interativo */}
          <TabGridEditor
            grid={grid}
            columns={columns}
            selectedCol={selectedCol}
            selectedString={selectedString}
            onCellClick={handleCellClick}
            onCellDoubleClick={handleCellDoubleClick}
            hoverCell={hoverCell}
            onHoverCell={setHoverCell}
          />

          {/* Input de traste (para célula selecionada) */}
          {selectedCol !== null && selectedString !== null && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
              <div className="text-[11px] text-text3">
                Corda <span className="text-emerald-400 font-bold">{STRING_NAMES[selectedString]}</span> ·
                Posição <span className="text-accent font-bold">{selectedCol + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-text3">Traste:</Label>
                <Input
                  ref={fretInputRef}
                  value={fretInput}
                  onChange={e => {
                    const val = e.target.value
                    if (val === '') {
                      clearCell()
                    } else {
                      setFretValue(val)
                    }
                  }}
                  placeholder="0–24"
                  className="h-7 w-16 text-center font-mono text-[13px] font-bold"
                  type="number"
                  min={0}
                  max={MAX_FRET}
                />
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] text-text3" onClick={clearCell}>
                Limpar
              </Button>
            </div>
          )}

          {/* Preview profissional (alphaTab) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-[11px] text-text3 uppercase tracking-wider">Preview</Label>
              <Badge variant="secondary" className="text-[10px]">
                {noteCount} nota{noteCount !== 1 ? 's' : ''}
              </Badge>
            </div>
            {noteCount > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <AlphaTabViewer
                  tex={gridToAlphaTex(grid, columns, label || undefined)}
                  layout="horizontal"
                  scale={0.7}
                  minHeight={140}
                />
              </div>
            ) : (
              <TabPreview lines={previewLines} label={label || undefined} />
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
