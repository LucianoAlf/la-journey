import { useState, useCallback, useRef, useMemo, useEffect, forwardRef } from 'react'
import {
  TextAlignLeft, MusicNotes, Guitar,
  ArrowsOutSimple, ClipboardText,
  Eye, PencilSimple, Eraser,
  ArrowUUpLeft, ArrowUUpRight, Trash,
  Code, ArrowsClockwise, FileArrowDown, FileArrowUp,
  WarningCircle, PianoKeys, Lightning, SpinnerGap
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
import { ChordEditor, createEmptyState, positionsToState, stateToPositions, type ChordEditorState } from '@/components/music/ChordEditor'
import { KeyboardEditor, type PianoChordData } from '@/components/music/KeyboardEditor'
import { getChordsByNames, updateChord, createChord, type Chord } from '@/services/libraryService'
import { autoFillChordsFound } from '@/services/chordAutoFillService'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { TransposeControl } from '@/components/repertoire/TransposeControl'
import { transposeCifraContent, transposeChords, shouldUseFlats } from '@/lib/transpose'
import {
  chordProToPlainText,
  plainTextToChordPro,
  isChordProFormat,
  type ChordProMetadata,
} from '@/lib/chordpro'

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
  /** Tonalidade original da música (para TransposeControl) */
  originalKey?: string | null
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
  originalKey = null,
  minHeight = 300,
  readOnly = false,
  className = '',
}: CifraEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'split'>('split')
  const [cursorLine, setCursorLine] = useState(0)
  const [showGuitar, setShowGuitar] = useState(true)
  const [showPiano, setShowPiano] = useState(true)
  const [semitones, setSemitones] = useState(0)

  // Undo/Redo
  const { undo, redo, canUndo, canRedo } = useUndoRedo(value, onChange)

  // Acordes extraídos automaticamente
  const detectedChords = useMemo(() => extractChordsFromCifra(value), [value])

  // Transposição
  const useFlats = shouldUseFlats(originalKey)
  const transposedChords = useMemo(
    () => transposeChords(detectedChords, semitones, useFlats),
    [detectedChords, semitones, useFlats]
  )
  const transposedContent = useMemo(
    () => transposeCifraContent(value, semitones, useFlats),
    [value, semitones, useFlats]
  )
  // Acordes que serão usados para buscar diagramas (transpostos se houver transposição)
  const chordsForDiagrams = semitones !== 0 ? transposedChords : detectedChords

  // Contadores de linhas
  const lineCount = useMemo(() => value.split('\n').length, [value])

  // Buscar diagramas de acordes da chord_library (guitar + piano)
  // Guardar Chord completo para poder abrir o editor
  const [guitarChordMap, setGuitarChordMap] = useState<Map<string, Chord>>(new Map())
  const [pianoChordMap, setPianoChordMap] = useState<Map<string, Chord>>(new Map())
  const prevChordsKeyRef = useRef('')

  const reloadChords = useCallback(() => {
    if (chordsForDiagrams.length === 0) return
    getChordsByNames(chordsForDiagrams).then(data => {
      const guitar = new Map<string, Chord>()
      const piano = new Map<string, Chord>()
      for (const chord of data) {
        if (!chord.positions || typeof chord.positions !== 'object') continue
        if (chord.instrument === 'guitar') {
          guitar.set(chord.name, chord)
        } else if ((chord.instrument as string) === 'piano') {
          piano.set(chord.name, chord)
        }
      }
      setGuitarChordMap(guitar)
      setPianoChordMap(piano)
    }).catch(() => {})
  }, [chordsForDiagrams])

  useEffect(() => {
    const key = [...chordsForDiagrams].sort().join(',')
    if (!key || key === prevChordsKeyRef.current) return
    prevChordsKeyRef.current = key
    reloadChords()
  }, [chordsForDiagrams, reloadChords])

  const hasAnyDiagram = guitarChordMap.size > 0 || pianoChordMap.size > 0

  // --- Editor de acorde de violão (ChordEditor modal) ---
  const [chordEditorOpen, setChordEditorOpen] = useState(false)
  const [chordEditorState, setChordEditorState] = useState<ChordEditorState>(createEmptyState())
  const [chordEditorName, setChordEditorName] = useState('')
  const [chordEditorStartFret, setChordEditorStartFret] = useState(1)
  const [chordEditorId, setChordEditorId] = useState<string | null>(null)

  const openChordEditor = useCallback((chord: Chord) => {
    const pos = (chord.positions ?? { fingers: [], barres: [], muted: [] }) as any
    const sf = pos.position && pos.position > 0
      ? pos.position
      : (() => {
          const frets = [
            ...(pos.fingers ?? []).map((f: any) => f[1]).filter((f: number) => f > 0),
            ...(pos.barres ?? []).map((b: any) => b.fret),
          ]
          const minFret = frets.length > 0 ? Math.min(...frets) : 1
          return minFret > 0 ? minFret : 1
        })()
    setChordEditorState(positionsToState(pos as ChordPositions, sf))
    setChordEditorName(chord.name)
    setChordEditorStartFret(sf)
    setChordEditorId(chord.id)
    setChordEditorOpen(true)
  }, [])

  const openChordEditorForNew = useCallback((chordName: string) => {
    setChordEditorState(createEmptyState())
    setChordEditorName(chordName)
    setChordEditorStartFret(1)
    setChordEditorId(null)
    setChordEditorOpen(true)
  }, [])

  const handleSaveChordEditor = useCallback(async () => {
    const positions = stateToPositions(chordEditorState, chordEditorStartFret)
    const positionsWithPosition = { ...positions, position: chordEditorStartFret }
    try {
      if (chordEditorId) {
        await updateChord(chordEditorId, {
          name: chordEditorName,
          positions: positionsWithPosition as any,
        })
        toast.success(`Acorde "${chordEditorName}" atualizado!`)
      } else {
        await createChord({
          name: chordEditorName,
          instrument: 'guitar' as any,
          positions: positionsWithPosition as any,
          difficulty: 1,
          tags: [],
        })
        toast.success(`Acorde "${chordEditorName}" criado!`)
        window.dispatchEvent(new Event('chord-library-updated'))
      }
      setChordEditorOpen(false)
      prevChordsKeyRef.current = '' // forçar reload
      reloadChords()
    } catch (e: any) {
      toast.error('Erro ao salvar acorde: ' + (e?.message ?? ''))
    }
  }, [chordEditorId, chordEditorState, chordEditorName, chordEditorStartFret, reloadChords])

  // --- Editor de teclado (KeyboardEditor modal) ---
  const [keyboardEditorOpen, setKeyboardEditorOpen] = useState(false)
  const [keyboardEditorChord, setKeyboardEditorChord] = useState<any>(null)

  const openKeyboardEditor = useCallback((chord: Chord) => {
    setKeyboardEditorChord({
      id: chord.id,
      name: chord.name,
      instrument: 'piano',
      difficulty: chord.difficulty,
      positions: chord.positions,
    })
    setKeyboardEditorOpen(true)
  }, [])

  const openKeyboardEditorForNew = useCallback((chordName: string) => {
    setKeyboardEditorChord({
      id: null,
      name: chordName,
      instrument: 'piano',
      difficulty: 1,
      positions: {},
    })
    setKeyboardEditorOpen(true)
  }, [])

  const handleSaveKeyboard = useCallback(async (data: PianoChordData) => {
    try {
      if (keyboardEditorChord?.id) {
        await updateChord(keyboardEditorChord.id, {
          name: data.name,
          positions: data.positions as any,
        })
        toast.success(`Teclado "${data.name}" atualizado!`)
      } else {
        await createChord({
          name: data.name,
          instrument: 'piano' as any,
          positions: data.positions as any,
          difficulty: 1,
          tags: [],
        })
        toast.success(`Teclado "${data.name}" criado!`)
        window.dispatchEvent(new Event('chord-library-updated'))
      }
      setKeyboardEditorOpen(false)
      prevChordsKeyRef.current = '' // forçar reload
      reloadChords()
    } catch (e: any) {
      toast.error('Erro ao salvar teclado: ' + (e?.message ?? ''))
    }
  }, [keyboardEditorChord, reloadChords])

  // --- Auto-preenchimento de acordes faltantes ---
  const [autoFilling, setAutoFilling] = useState(false)

  const missingGuitarChords = useMemo(() => {
    if (!chordsForDiagrams.length) return []
    return chordsForDiagrams.filter(name => !guitarChordMap.has(name))
  }, [chordsForDiagrams, guitarChordMap])

  const missingPianoChords = useMemo(() => {
    if (!chordsForDiagrams.length) return []
    return chordsForDiagrams.filter(name => {
      const lib = pianoChordMap.get(name)
      if (!lib) return true
      const pos = lib.positions as any
      return !(pos?.keys?.length > 0)
    })
  }, [chordsForDiagrams, pianoChordMap])

  const totalMissing = missingGuitarChords.length + missingPianoChords.length

  const handleAutoFillChords = useCallback(async () => {
    if (!chordsForDiagrams.length) return
    setAutoFilling(true)

    try {
      const guitarResults = autoFillChordsFound(missingGuitarChords, ['guitar'])
      const pianoResults = autoFillChordsFound(missingPianoChords, ['piano'])

      let createdGuitar = 0
      let createdPiano = 0
      const errors: string[] = []

      // Evitar duplicatas
      const existingNames = new Set<string>()
      guitarChordMap.forEach((_, k) => existingNames.add(`${k}::guitar`))
      pianoChordMap.forEach((_, k) => existingNames.add(`${k}::piano`))

      for (const result of guitarResults) {
        if (existingNames.has(`${result.chordName}::guitar`)) continue
        try {
          const posWithPosition = { ...result.positions, position: result.baseFret ?? 1 }
          await createChord({
            name: result.chordName,
            instrument: 'guitar' as any,
            positions: posWithPosition as any,
            difficulty: 1,
            tags: ['auto-preenchido'],
          })
          createdGuitar++
        } catch (e: any) {
          errors.push(`${result.chordName} (violão): ${e?.message ?? 'erro'}`)
        }
      }

      for (const result of pianoResults) {
        if (existingNames.has(`${result.chordName}::piano`)) continue
        try {
          await createChord({
            name: result.chordName,
            instrument: 'piano' as any,
            positions: result.positions as any,
            difficulty: 1,
            tags: ['auto-preenchido'],
          })
          createdPiano++
        } catch (e: any) {
          errors.push(`${result.chordName} (piano): ${e?.message ?? 'erro'}`)
        }
      }

      const total = createdGuitar + createdPiano
      if (total > 0) {
        toast.success(`${total} acorde${total > 1 ? 's' : ''} criado${total > 1 ? 's' : ''} automaticamente!`, {
          description: `🎸 ${createdGuitar} violão · 🎹 ${createdPiano} piano`,
        })
        window.dispatchEvent(new Event('chord-library-updated'))
        prevChordsKeyRef.current = ''
        reloadChords()
      }

      const notFound = (missingGuitarChords.length - createdGuitar) + (missingPianoChords.length - createdPiano)
      if (notFound > 0) {
        toast.info(`${notFound} acorde${notFound > 1 ? 's' : ''} não encontrado${notFound > 1 ? 's' : ''} no banco automático`, {
          description: 'Use duplo clique para criar manualmente',
        })
      }

      if (errors.length > 0) console.warn('Erros ao auto-preencher:', errors)
    } catch (e: any) {
      toast.error('Erro ao preencher acordes: ' + (e?.message ?? ''))
    } finally {
      setAutoFilling(false)
    }
  }, [chordsForDiagrams, missingGuitarChords, missingPianoChords, guitarChordMap, pianoChordMap, reloadChords])

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

  // Colar e parsear cifra (com auto-detecção de ChordPro)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return

    const ta = textareaRef.current
    if (!ta) return

    // Se está colando em um campo vazio, parsear o texto colado
    if (value.trim() === '') {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text/plain')

      // Auto-detectar formato ChordPro e converter para ChordsOverWords
      if (isChordProFormat(pasted)) {
        const { content } = chordProToPlainText(pasted)
        onChange(content)
      } else {
        const parsed = parsePastedCifra(pasted)
        onChange(parsed)
      }
    }
    // Se já tem conteúdo, deixar o comportamento padrão
  }, [value, onChange, readOnly])

  // Converter conteúdo atual para ChordPro e copiar para clipboard
  const handleExportChordPro = useCallback(() => {
    const chordPro = plainTextToChordPro(value, {
      title: undefined,
      key: originalKey ?? undefined,
    })
    navigator.clipboard.writeText(chordPro)
  }, [value, originalKey])

  // Exportar como arquivo .cho
  const handleDownloadChordPro = useCallback(() => {
    const chordPro = plainTextToChordPro(value, {
      key: originalKey ?? undefined,
    })
    const blob = new Blob([chordPro], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cifra.cho'
    a.click()
    URL.revokeObjectURL(url)
  }, [value, originalKey])

  // Importar arquivo ChordPro (.cho, .chordpro, .pro, .txt)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleImportChordPro = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return
      if (isChordProFormat(text)) {
        const { content } = chordProToPlainText(text)
        onChange(content)
      } else {
        const parsed = parsePastedCifra(text)
        onChange(parsed)
      }
    }
    reader.readAsText(file)
    // Limpar input para permitir reimportar o mesmo arquivo
    e.target.value = ''
  }, [onChange])

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

          {/* ChordPro: Import/Export */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] gap-1 text-text2 hover:text-text"
                  >
                    <Code size={14} />
                    ChordPro
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Importar/Exportar formato ChordPro</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="min-w-[200px]">
              <DropdownMenuItem
                onClick={handleImportChordPro}
                className="text-xs gap-2"
              >
                <FileArrowUp size={14} className="text-accent" />
                Importar arquivo .cho
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleExportChordPro}
                className="text-xs gap-2"
                disabled={!value.trim()}
              >
                <ClipboardText size={14} className="text-blue-400" />
                Copiar como ChordPro
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDownloadChordPro}
                className="text-xs gap-2"
                disabled={!value.trim()}
              >
                <FileArrowDown size={14} className="text-emerald-400" />
                Baixar arquivo .cho
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Input hidden para import de arquivo */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".cho,.chordpro,.pro,.txt"
            className="hidden"
            onChange={handleFileChange}
          />

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

          {/* Transposição + Informações */}
          <div className="ml-auto flex items-center gap-2">
            {originalKey && detectedChords.length > 0 && (
              <TransposeControl
                originalKey={originalKey}
                semitones={semitones}
                onChange={setSemitones}
              />
            )}
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
            {chordsForDiagrams.map((chord, idx) => {
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
                  onClick={() => insertChord(detectedChords[idx])}
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

          {/* Botão auto-preencher acordes faltantes */}
          {totalMissing > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[11px] h-7 border-accent/30 text-accent hover:bg-accent/10 hover:text-accent"
              onClick={handleAutoFillChords}
              disabled={autoFilling}
            >
              {autoFilling ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <Lightning size={14} weight="fill" />
              )}
              {autoFilling
                ? 'Preenchendo...'
                : `Preencher ${totalMissing} acorde${totalMissing > 1 ? 's' : ''} faltante${totalMissing > 1 ? 's' : ''}`
              }
            </Button>
          )}

          {/* Mini-diagramas de violão */}
          {showGuitar && guitarChordMap.size > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-text3 uppercase tracking-wider font-semibold">
                Violão
                <span className="ml-1 text-text3/50 normal-case tracking-normal">
                  ({guitarChordMap.size} de {chordsForDiagrams.length} na biblioteca)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-card/50 border border-border/50">
                {chordsForDiagrams.map(chordName => {
                  const lib = guitarChordMap.get(chordName)
                  if (lib) {
                    const pos = lib.positions as any
                    if (!pos?.fingers) return null
                    return (
                      <TooltipProvider key={chordName} delayDuration={400}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="text-center cursor-pointer rounded-lg hover:bg-accent/10 transition-colors"
                              onDoubleClick={() => openChordEditor(lib)}
                            >
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
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs">Duplo clique para editar</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  }
                  // Acorde não encontrado — duplo clique para criar
                  return (
                    <TooltipProvider key={chordName} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="w-[80px] h-[100px] rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 text-text3/50 cursor-pointer hover:border-accent/40 hover:text-accent/70 transition-colors"
                            onDoubleClick={() => openChordEditorForNew(chordName)}
                          >
                            <WarningCircle size={14} />
                            <span className="font-mono text-[10px] font-bold">{chordName}</span>
                            <span className="text-[7px]">Sem diagrama</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Duplo clique para criar "{chordName}"</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                  ({pianoChordMap.size} de {chordsForDiagrams.length} na biblioteca)
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 rounded-lg bg-card/50 border border-border/50">
                {chordsForDiagrams.map(chordName => {
                  const lib = pianoChordMap.get(chordName)
                  if (lib) {
                    const pos = lib.positions as any
                    const keys = (pos?.keys ?? []) as string[]
                    if (keys.length === 0) return null
                    const fingeringRh = (pos?.fingering_rh ?? []) as number[]
                    return (
                      <TooltipProvider key={chordName} delayDuration={400}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="rounded-lg bg-card border border-border p-2 cursor-pointer hover:bg-accent/10 transition-colors"
                              onDoubleClick={() => openKeyboardEditor(lib)}
                            >
                              <PianoKeyboard
                                keys={keys}
                                fingeringRH={fingeringRh.length > 0 ? fingeringRh : undefined}
                                label={chordName}
                                showLabels={fingeringRh.length > 0}
                                range={['C4', 'C6']}
                                scale={0.8}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs">Duplo clique para editar</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  }
                  // Acorde não encontrado — duplo clique para criar
                  return (
                    <TooltipProvider key={chordName} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="rounded-lg bg-card border border-dashed border-border p-2 flex flex-col items-center justify-center gap-1 text-text3/50 cursor-pointer hover:border-accent/40 hover:text-accent/70 transition-colors min-h-[80px]"
                            onDoubleClick={() => openKeyboardEditorForNew(chordName)}
                          >
                            <PianoKeys size={16} />
                            <span className="font-mono text-[10px] font-bold">{chordName}</span>
                            <span className="text-[7px]">Sem teclado</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Duplo clique para criar "{chordName}"</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
          <PreviewPane content={transposedContent} minHeight={minHeight} />
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
            <PreviewPane content={transposedContent} minHeight={minHeight} />
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

      {/* ====== MODAL: Editor de Acorde (Violão) ====== */}
      <Dialog open={chordEditorOpen} onOpenChange={setChordEditorOpen}>
        <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto bg-surface border-border" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">
              Editar <span className="text-accent">Acorde</span>
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
            <Button variant="ghost" onClick={() => setChordEditorOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveChordEditor}>Salvar Acorde</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== MODAL: Editor de Teclado (Piano) ====== */}
      <KeyboardEditor
        open={keyboardEditorOpen}
        onOpenChange={(v) => { setKeyboardEditorOpen(v); if (!v) setKeyboardEditorChord(null) }}
        chord={keyboardEditorChord}
        onSave={handleSaveKeyboard}
      />
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
