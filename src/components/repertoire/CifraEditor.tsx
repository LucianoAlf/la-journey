import { useState, useCallback, useRef, useMemo, useEffect, forwardRef } from 'react'
import {
  TextAlignLeft, MusicNotes, Guitar,
  ArrowsOutSimple, ClipboardText,
  Eye, PencilSimple, Eraser,
  ArrowUUpLeft, ArrowUUpRight, Trash
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChordDiagram, type ChordPositions } from '@/components/music/ChordDiagram'
import { PianoKeyboard } from '@/components/music/PianoKeyboard'
import { getChordsByNames } from '@/services/libraryService'

// ============================================================
// Hook: Undo/Redo com histórico de estados
// ============================================================

const MAX_HISTORY = 50

function useUndoRedo(value: string, onChange: (v: string) => void) {
  const historyRef = useRef<string[]>([value])
  const indexRef = useRef(0)
  const isUndoRedoRef = useRef(false)

  // Quando o valor muda externamente (digitação), push no histórico
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }
    const history = historyRef.current
    const idx = indexRef.current

    // Se o valor é diferente do atual no histórico, truncar e adicionar
    if (history[idx] !== value) {
      const newHistory = history.slice(0, idx + 1)
      newHistory.push(value)
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      historyRef.current = newHistory
      indexRef.current = newHistory.length - 1
    }
  }, [value])

  const canUndo = indexRef.current > 0
  const canRedo = indexRef.current < historyRef.current.length - 1

  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      indexRef.current--
      isUndoRedoRef.current = true
      onChange(historyRef.current[indexRef.current])
    }
  }, [onChange])

  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current++
      isUndoRedoRef.current = true
      onChange(historyRef.current[indexRef.current])
    }
  }, [onChange])

  return { undo, redo, canUndo, canRedo }
}

// ============================================================
// Parser: extrai acordes do texto da cifra
// ============================================================

const CHORD_RE = /^[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9]|\/[A-G][#b]?)*$/

/**
 * Extrai todos os acordes únicos de um texto de cifra.
 * Detecta linhas de acordes (>50% tokens são acordes válidos).
 */
export function extractChordsFromCifra(text: string): string[] {
  const found = new Set<string>()
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Pular seções, tabs
    if (/^\[.*\]/.test(trimmed)) continue
    if (/^\s*[EBADGe]\|/.test(line)) continue

    const tokens = trimmed.split(/\s+/)
    const chords = tokens.filter(t => CHORD_RE.test(t))
    // Se >50% da linha são acordes, coletar todos
    if (chords.length > 0 && chords.length / tokens.length > 0.5) {
      chords.forEach(c => found.add(c))
    }
  }
  return Array.from(found)
}

/**
 * Parser inteligente: recebe texto colado de qualquer fonte e
 * normaliza para o formato cifra padrão do LA Journey.
 */
export function parsePastedCifra(rawText: string): string {
  // Limpar caracteres invisíveis, normalizar quebras de linha
  let text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')

  // Detectar padrões comuns de seções e normalizar
  text = text.replace(
    /^(\s*)(Intro|Verso|Refrão|Refrão|Chorus|Bridge|Ponte|Solo|Outro|Final|Pré-Refrão|Pre-Chorus|Interlude|Interlúdio|Tab|Tablatura)(\s*\d*)\s*:?\s*$/gim,
    (_, _indent, name, num) => `[${capitalize(name)}${num ? ' ' + num.trim() : ''}]`
  )

  // Remover linhas duplicadas em branco consecutivas
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// ============================================================
// Seções pré-definidas
// ============================================================

const SECTIONS = [
  { label: 'Intro', value: '[Intro]' },
  { label: 'Verso', value: '[Verso]' },
  { label: 'Verso 2', value: '[Verso 2]' },
  { label: 'Pré-Refrão', value: '[Pré-Refrão]' },
  { label: 'Refrão', value: '[Refrão]' },
  { label: 'Ponte', value: '[Ponte]' },
  { label: 'Solo', value: '[Solo]' },
  { label: 'Final', value: '[Final]' },
  { label: 'Tab', value: '[Tab]' },
]

const COMMON_CHORDS = [
  // Maiores
  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  // Menores
  ['Am', 'Bm', 'Cm', 'Dm', 'Em', 'Fm', 'Gm'],
  // Sétima
  ['C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7'],
  // Menor com sétima
  ['Am7', 'Bm7', 'Cm7', 'Dm7', 'Em7'],
  // Sus e add
  ['Csus4', 'Dsus4', 'Esus4', 'Gsus4', 'Asus4'],
  // Outros comuns
  ['C7M', 'D7M', 'F7M', 'G7M', 'A7M'],
]

const TAB_TEMPLATE = `E|---
B|---
G|---
D|---
A|---
E|---`

// ============================================================
// Componente principal: CifraEditor
// ============================================================

interface CifraEditorProps {
  /** Valor inicial do texto da cifra */
  value: string
  /** Callback quando o texto muda */
  onChange: (value: string) => void
  /** Altura mínima do editor */
  minHeight?: number
  /** Se está em modo somente leitura */
  readOnly?: boolean
  /** Classe CSS adicional */
  className?: string
}

export function CifraEditor({
  value,
  onChange,
  minHeight = 300,
  readOnly = false,
  className = '',
}: CifraEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'split'>('split')
  const [cursorLine, setCursorLine] = useState(0)
  const [showGuitar, setShowGuitar] = useState(true)
  const [showPiano, setShowPiano] = useState(true)

  // Undo/Redo
  const { undo, redo, canUndo, canRedo } = useUndoRedo(value, onChange)

  // Acordes extraídos automaticamente
  const detectedChords = useMemo(() => extractChordsFromCifra(value), [value])

  // Contadores de linhas
  const lineCount = useMemo(() => value.split('\n').length, [value])

  // Buscar diagramas de acordes da chord_library (guitar + piano)
  const [guitarChordMap, setGuitarChordMap] = useState<Map<string, any>>(new Map())
  const [pianoChordMap, setPianoChordMap] = useState<Map<string, any>>(new Map())
  const prevChordsKeyRef = useRef('')

  useEffect(() => {
    const key = detectedChords.sort().join(',')
    if (!key || key === prevChordsKeyRef.current) return
    prevChordsKeyRef.current = key

    getChordsByNames(detectedChords).then(data => {
      const guitar = new Map<string, any>()
      const piano = new Map<string, any>()
      for (const chord of data) {
        if (!chord.positions || typeof chord.positions !== 'object') continue
        if (chord.instrument === 'guitar') {
          guitar.set(chord.name, chord.positions)
        } else if ((chord.instrument as string) === 'piano') {
          piano.set(chord.name, chord.positions)
        }
      }
      setGuitarChordMap(guitar)
      setPianoChordMap(piano)
    }).catch(() => {})
  }, [detectedChords])

  const hasAnyDiagram = guitarChordMap.size > 0 || pianoChordMap.size > 0

  // Inserir texto na posição do cursor
  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current
    if (!ta) return

    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = value.slice(0, start)
    const after = value.slice(end)

    // Se não estamos no início de uma linha, adicionar quebra antes
    const needNewlineBefore = before.length > 0 && !before.endsWith('\n')
    const prefix = needNewlineBefore ? '\n' : ''

    // Se o texto inserido é uma seção/bloco, adicionar quebra depois
    const needNewlineAfter = text.startsWith('[') || text.includes('|')
    const suffix = needNewlineAfter && !after.startsWith('\n') ? '\n' : ''

    const newValue = before + prefix + text + suffix + after
    onChange(newValue)

    // Reposicionar cursor após o texto inserido
    requestAnimationFrame(() => {
      const newPos = start + prefix.length + text.length + suffix.length
      ta.focus()
      ta.selectionStart = newPos
      ta.selectionEnd = newPos
    })
  }, [value, onChange])

  // Inserir seção
  const insertSection = useCallback((section: string) => {
    insertAtCursor(section + '\n')
  }, [insertAtCursor])

  // Inserir acorde na posição do cursor
  const insertChord = useCallback((chord: string) => {
    const ta = textareaRef.current
    if (!ta) return

    const start = ta.selectionStart
    const before = value.slice(0, start)
    const after = value.slice(ta.selectionEnd)

    // Inserir acorde com espaço depois
    const newValue = before + chord + ' ' + after
    onChange(newValue)

    requestAnimationFrame(() => {
      const newPos = start + chord.length + 1
      ta.focus()
      ta.selectionStart = newPos
      ta.selectionEnd = newPos
    })
  }, [value, onChange])

  // Inserir template de tablatura
  const insertTab = useCallback(() => {
    insertAtCursor('\n' + TAB_TEMPLATE + '\n')
  }, [insertAtCursor])

  // Colar e parsear cifra
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return

    const ta = textareaRef.current
    if (!ta) return

    // Se está colando em um campo vazio, parsear o texto colado
    if (value.trim() === '') {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text/plain')
      const parsed = parsePastedCifra(pasted)
      onChange(parsed)
    }
    // Se já tem conteúdo, deixar o comportamento padrão
  }, [value, onChange, readOnly])

  // Limpar conteúdo
  const handleClear = useCallback(() => {
    onChange('')
    textareaRef.current?.focus()
  }, [onChange])

  // Atualizar posição do cursor
  const handleSelect = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const beforeCursor = value.slice(0, ta.selectionStart)
    const line = beforeCursor.split('\n').length
    setCursorLine(line)
  }, [value])

  // Auto-resize da textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.max(minHeight, ta.scrollHeight) + 'px'
  }, [value, minHeight, activeTab])

  // Atalhos de teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab → inserir 2 espaços (em vez de mudar foco)
    if (e.key === 'Tab') {
      e.preventDefault()
      insertAtCursor('  ')
      return
    }
    // Ctrl+Z → undo
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      undo()
      return
    }
    // Ctrl+Shift+Z ou Ctrl+Y → redo
    if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'y' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault()
      redo()
      return
    }
  }, [insertAtCursor, undo, redo])

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Botão inserir seção */}
        <TooltipProvider delayDuration={300}>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] gap-1 text-text2 hover:text-text"
                    disabled={readOnly}
                  >
                    <TextAlignLeft size={14} />
                    Seção
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Inserir seção ([Intro], [Verso]...)</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              {SECTIONS.map(s => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => insertSection(s.value)}
                  className="text-xs gap-2"
                >
                  <span className="text-accent font-semibold font-mono">{s.value}</span>
                  <span className="text-text3">{s.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botão inserir acorde */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] gap-1 text-text2 hover:text-text"
                    disabled={readOnly}
                  >
                    <MusicNotes size={14} />
                    Acorde
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Inserir acorde na posição do cursor</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-[280px]">
              <div className="px-2 py-1.5 text-[10px] text-text3 uppercase tracking-wider font-semibold">
                Maiores
              </div>
              <div className="flex flex-wrap gap-1 px-2 pb-2">
                {COMMON_CHORDS[0].map(c => (
                  <button
                    key={c}
                    onClick={() => insertChord(c)}
                    className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-[10px] text-text3 uppercase tracking-wider font-semibold">
                Menores
              </div>
              <div className="flex flex-wrap gap-1 px-2 pb-2">
                {COMMON_CHORDS[1].map(c => (
                  <button
                    key={c}
                    onClick={() => insertChord(c)}
                    className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  Sétima (7)
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <div className="flex flex-wrap gap-1 p-2">
                    {COMMON_CHORDS[2].map(c => (
                      <button
                        key={c}
                        onClick={() => insertChord(c)}
                        className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  Menor 7ª (m7)
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <div className="flex flex-wrap gap-1 p-2">
                    {COMMON_CHORDS[3].map(c => (
                      <button
                        key={c}
                        onClick={() => insertChord(c)}
                        className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  Sus4
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <div className="flex flex-wrap gap-1 p-2">
                    {COMMON_CHORDS[4].map(c => (
                      <button
                        key={c}
                        onClick={() => insertChord(c)}
                        className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  Maior 7ª (7M)
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <div className="flex flex-wrap gap-1 p-2">
                    {COMMON_CHORDS[5].map(c => (
                      <button
                        key={c}
                        onClick={() => insertChord(c)}
                        className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botão inserir tab */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] gap-1 text-text2 hover:text-text"
                onClick={insertTab}
                disabled={readOnly}
              >
                <Guitar size={14} />
                Tab
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Inserir template de tablatura (6 cordas)</p>
            </TooltipContent>
          </Tooltip>

          {/* Separador */}
          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Undo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-text2 hover:text-text disabled:opacity-30"
                onClick={undo}
                disabled={!canUndo || readOnly}
              >
                <ArrowUUpLeft size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Desfazer (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>

          {/* Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-text2 hover:text-text disabled:opacity-30"
                onClick={redo}
                disabled={!canRedo || readOnly}
              >
                <ArrowUUpRight size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Refazer (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>

          {/* Separador */}
          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Botão limpar */}
          {value.length > 0 && !readOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] gap-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                  onClick={handleClear}
                >
                  <Trash size={14} />
                  Limpar
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Limpar todo o conteúdo</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Informações */}
          <div className="ml-auto flex items-center gap-2">
            {detectedChords.length > 0 && (
              <div className="flex items-center gap-1">
                <MusicNotes size={12} className="text-accent/60" />
                <span className="text-[10px] text-text3">{detectedChords.length} acordes</span>
              </div>
            )}
            <span className="text-[10px] text-text3/60">
              L{cursorLine}/{lineCount}
            </span>
          </div>
        </TooltipProvider>
      </div>

      {/* Acordes detectados + toggles + mini-diagramas */}
      {detectedChords.length > 0 && (
        <div className="space-y-2">
          {/* Badges de acordes + toggles de exibição */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-text3 uppercase tracking-wider font-semibold shrink-0">
              Acordes ({detectedChords.length}):
            </span>
            {detectedChords.map(chord => {
              const inGuitar = guitarChordMap.has(chord)
              const inPiano = pianoChordMap.has(chord)
              const inLibrary = inGuitar || inPiano
              return (
                <Badge
                  key={chord}
                  variant="secondary"
                  className={`text-[10px] font-mono px-1.5 py-0 h-5 cursor-pointer transition-colors ${
                    inLibrary
                      ? 'hover:bg-accent/20 hover:text-accent border-accent/20'
                      : 'opacity-60 hover:bg-yellow-500/20 hover:text-yellow-400'
                  }`}
                  onClick={() => insertChord(chord)}
                  title={inLibrary ? 'Na biblioteca — clique para inserir' : 'Não encontrado na biblioteca'}
                >
                  {chord}
                  {!inLibrary && <span className="ml-0.5 text-[8px]">?</span>}
                </Badge>
              )
            })}
          </div>

          {/* Toggles Violão / Teclado (mesmo padrão do preview) */}
          {hasAnyDiagram && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text3 uppercase tracking-wider font-semibold shrink-0">
                Exibir:
              </span>
              <button
                onClick={() => setShowGuitar(v => !v)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
                  showGuitar
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-transparent text-text3/50 border-border hover:border-text3/30'
                }`}
              >
                <Guitar size={12} />
                Violão
                {guitarChordMap.size > 0 && (
                  <span className="text-[9px] opacity-60">({guitarChordMap.size})</span>
                )}
              </button>
              <button
                onClick={() => setShowPiano(v => !v)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
                  showPiano
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-transparent text-text3/50 border-border hover:border-text3/30'
                }`}
              >
                🎹
                Teclado
                {pianoChordMap.size > 0 && (
                  <span className="text-[9px] opacity-60">({pianoChordMap.size})</span>
                )}
              </button>
            </div>
          )}

          {/* Mini-diagramas de violão */}
          {showGuitar && guitarChordMap.size > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-text3 uppercase tracking-wider font-semibold">
                Violão
                <span className="ml-1 text-text3/50 normal-case tracking-normal">
                  ({guitarChordMap.size} de {detectedChords.length} na biblioteca)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-card/50 border border-border/50">
                {detectedChords.map(chordName => {
                  const pos = guitarChordMap.get(chordName)
                  if (!pos?.fingers) return null
                  return (
                    <div key={chordName} className="text-center">
                      <ChordDiagram
                        name={chordName}
                        positions={{
                          fingers: pos.fingers ?? [],
                          barres: pos.barres ?? [],
                          muted: pos.muted ?? [],
                        }}
                        position={pos.position ?? 1}
                        size="compact"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mini-diagramas de teclado */}
          {showPiano && pianoChordMap.size > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-text3 uppercase tracking-wider font-semibold">
                Teclado
                <span className="ml-1 text-text3/50 normal-case tracking-normal">
                  ({pianoChordMap.size} de {detectedChords.length} na biblioteca)
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 rounded-lg bg-card/50 border border-border/50">
                {detectedChords.map(chordName => {
                  const pos = pianoChordMap.get(chordName)
                  if (!pos) return null
                  const keys = (pos.keys ?? []) as string[]
                  if (keys.length === 0) return null
                  const fingeringRh = (pos.fingering_rh ?? []) as number[]
                  return (
                    <div key={chordName} className="rounded-lg bg-card border border-border p-2">
                      <PianoKeyboard
                        keys={keys}
                        fingeringRH={fingeringRh.length > 0 ? fingeringRh : undefined}
                        label={chordName}
                        scale={0.8}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs: Editar / Preview / Split */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList className="h-8">
          <TabsTrigger value="edit" className="text-[11px] gap-1 px-3">
            <PencilSimple size={13} /> Editar
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-[11px] gap-1 px-3">
            <Eye size={13} /> Preview
          </TabsTrigger>
          <TabsTrigger value="split" className="text-[11px] gap-1 px-3">
            <ArrowsOutSimple size={13} /> Split
          </TabsTrigger>
        </TabsList>

        {/* Modo: somente editor */}
        <TabsContent value="edit" className="mt-2">
          <EditorPane
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onPaste={handlePaste}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            minHeight={minHeight}
            readOnly={readOnly}
            placeholder="Cole uma cifra aqui ou comece a digitar..."
          />
        </TabsContent>

        {/* Modo: somente preview */}
        <TabsContent value="preview" className="mt-2">
          <PreviewPane content={value} minHeight={minHeight} />
        </TabsContent>

        {/* Modo: split (editor + preview lado a lado) */}
        <TabsContent value="split" className="mt-2">
          <div className="grid grid-cols-2 gap-3">
            <EditorPane
              ref={textareaRef}
              value={value}
              onChange={onChange}
              onPaste={handlePaste}
              onSelect={handleSelect}
              onKeyDown={handleKeyDown}
              minHeight={minHeight}
              readOnly={readOnly}
              placeholder="Cole uma cifra aqui ou comece a digitar..."
            />
            <PreviewPane content={value} minHeight={minHeight} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dica quando vazio */}
      {value.trim() === '' && !readOnly && (
        <div className="text-center py-2">
          <p className="text-[11px] text-text3">
            <ClipboardText size={14} className="inline mr-1 align-text-bottom" />
            Cole uma cifra de qualquer site — seções e acordes serão detectados automaticamente
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Sub-componentes
// ============================================================

interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
  onPaste: (e: React.ClipboardEvent) => void
  onSelect: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  minHeight: number
  readOnly: boolean
  placeholder?: string
}

const EditorPane = forwardRef<HTMLTextAreaElement, EditorPaneProps>(
  ({ value, onChange, onPaste, onSelect, onKeyDown, minHeight, readOnly, placeholder }, ref) => {
    return (
      <div className="relative rounded-lg border border-border bg-bg overflow-hidden">
        {/* Números de linha */}
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-card/50 border-r border-border/50 pointer-events-none z-10">
          <div className="pt-3 px-1">
            {value.split('\n').map((_, i) => (
              <div
                key={i}
                className="text-[10px] text-text3/40 text-right pr-1 leading-[1.7] font-mono h-[1.7em]"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        {/* Textarea */}
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value)}
          onPaste={onPaste}
          onSelect={onSelect}
          onClick={onSelect}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full pl-12 pr-4 py-3 font-mono text-[12px] leading-[1.7] bg-transparent text-text resize-none outline-none placeholder:text-text3/30 min-h-0"
          style={{ minHeight: `${minHeight}px` }}
        />
      </div>
    )
  }
)
EditorPane.displayName = 'EditorPane'

// ============================================================
// Preview: reutiliza parseCifraBlocks do RepertoireSheet
// ============================================================

// Parser inline simplificado (para não importar do RepertoireSheet que é enorme)
const TAB_LINE_RE = /^\s*[EBADGe]\|/

function PreviewPane({ content, minHeight }: { content: string; minHeight: number }) {
  if (!content.trim()) {
    return (
      <div
        className="rounded-lg border border-border bg-card/30 flex items-center justify-center"
        style={{ minHeight: `${minHeight}px` }}
      >
        <p className="text-text3/40 text-xs">Preview aparecerá aqui</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 overflow-y-auto font-mono text-[12px] leading-[1.7]"
      style={{ minHeight: `${minHeight}px`, maxHeight: `${Math.max(minHeight, 500)}px` }}
    >
      {content.split('\n').map((line, i) => {
        const trimmed = line.trim()

        // Seção [Intro], [Verso], etc
        if (/^\[.*\]/.test(trimmed)) {
          return (
            <div key={i} className="text-accent font-bold mt-4 mb-1 text-[13px]">
              {trimmed}
            </div>
          )
        }

        // Tablatura
        if (TAB_LINE_RE.test(line)) {
          const match = line.match(/^(\s*)([EBADGe])(\|)(.*)$/)
          if (match) {
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
          }
          return <div key={i} className="text-blue-400/60">{line}</div>
        }

        // Linha vazia
        if (!trimmed) {
          return <div key={i} className="h-2" />
        }

        // Linha de acordes
        const tokens = trimmed.split(/\s+/)
        const chordRatio = tokens.filter(t => CHORD_RE.test(t) || t === '|').length / (tokens.length || 1)
        if (chordRatio > 0.5) {
          return (
            <div key={i} className="text-accent font-semibold whitespace-pre">
              {line}
            </div>
          )
        }

        // Letra normal
        return (
          <div key={i} className="text-text whitespace-pre-wrap">
            {line}
          </div>
        )
      })}
    </div>
  )
}
