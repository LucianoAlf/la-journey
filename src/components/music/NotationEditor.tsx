import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { FloppyDisk, Trash, X, ArrowCounterClockwise, ArrowClockwise, PencilSimple, ArrowsOutCardinal, CaretUp, CaretDown, Play, Pause, Stop, MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react'
import * as Tone from 'tone'
import { NotationRenderer } from '@/components/music/NotationRenderer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { NotationLibraryRow } from '@/services/notationService'

// ─── Constantes musicais ─────────────────────────────────────────────
const TREBLE_RANGE = ['c/4','d/4','e/4','f/4','g/4','a/4','b/4','c/5','d/5','e/5','f/5','g/5','a/5','b/5','c/6']
const BASS_RANGE = ['e/2','f/2','g/2','a/2','b/2','c/3','d/3','e/3','f/3','g/3','a/3','b/3','c/4','d/4','e/4']
const ALTO_RANGE = ['d/3','e/3','f/3','g/3','a/3','b/3','c/4','d/4','e/4','f/4','g/4','a/4','b/4','c/5','d/5']
const PERCUSSION_RANGE = ['c/4','d/4','e/4','f/4','g/4','a/4','b/4','c/5','d/5','e/5','f/5','g/5']

const DRUM_NAMES: Record<string, string> = {
  'g/5': 'Crash', 'f/5': 'Hi-hat aberto', 'e/5': 'Hi-hat fechado',
  'd/5': 'Tom alto', 'c/5': 'Caixa', 'b/4': 'Tom médio',
  'a/4': 'Tom baixo', 'g/4': 'Floor tom', 'f/4': '—',
  'e/4': '—', 'd/4': 'Bumbo', 'c/4': 'Bumbo 2',
}

const DRUM_X_NOTEHEADS = new Set(['g/5','f/5','e/5'])

const PT: Record<string, string> = { c:'Dó', d:'Ré', e:'Mi', f:'Fá', g:'Sol', a:'Lá', b:'Si' }
const DURATION_BEATS: Record<string, number> = { w:4, h:2, q:1, '8':0.5, '16':0.25 }
const DURATION_NAMES: Record<string, string> = { w:'Semibreve', h:'Mínima', q:'Semínima', '8':'Colcheia', '16':'Semicolcheia' }

const CLEF_OPTIONS = [
  { value: 'treble', label: 'Sol' },
  { value: 'bass', label: 'Fá' },
  { value: 'alto', label: 'Dó' },
  { value: 'percussion', label: 'Percussão' },
]
const TIME_OPTIONS = ['4/4', '3/4', '2/4', '6/8']
const KEY_OPTIONS = [
  { value: 'C', label: 'Dó M' },
  { value: 'G', label: 'Sol M' },
  { value: 'D', label: 'Ré M' },
  { value: 'A', label: 'Lá M' },
  { value: 'F', label: 'Fá M' },
  { value: 'Bb', label: 'Sib M' },
  { value: 'Eb', label: 'Mib M' },
]
const CATEGORY_OPTIONS = [
  { value: 'scale', label: 'Escala' },
  { value: 'chord', label: 'Acorde' },
  { value: 'interval', label: 'Intervalo' },
  { value: 'rhythm', label: 'Ritmo' },
  { value: 'exercise', label: 'Exercício' },
  { value: 'pattern', label: 'Padrão' },
]

// ─── Tipos ──────────────────────────────────────────────────────────
interface PitchData {
  pitch: string
  accidental: string | null
}

interface OffsetXY {
  x: number
  y: number
}

interface Beat {
  pitches: PitchData[]
  duration: string
  tie: boolean
  isRest: boolean
  dotted: boolean
  notehead?: 'normal' | 'x'
  barAfter?: boolean
  cifra: string | null
  cifra_offset?: OffsetXY
  annotation: string | null
  annotation_offset?: OffsetXY
  lyric: string | null
  lyric_offset?: OffsetXY
}

type EditorMode = 'free' | 'metered'
type InputMode = 'melodic' | 'chord' | 'tie' | 'cifra' | 'annotation' | 'lyric'

export interface NotationSaveData {
  name: string
  category: string
  subcategory?: string | null
  clef: string
  key_signature: string
  time_signature?: string | null
  notation_data: any
  description?: string | null
  difficulty: number
  tags: string[]
}

interface NotationEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notation?: NotationLibraryRow | null
  onSave: (data: NotationSaveData) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

// ─── Helpers ────────────────────────────────────────────────────────
function getScaleForClef(clef: string): string[] {
  if (clef === 'bass') return BASS_RANGE
  if (clef === 'alto') return ALTO_RANGE
  if (clef === 'percussion') return PERCUSSION_RANGE
  return TREBLE_RANGE
}

function getBeatDuration(beat: Beat): number {
  const base = DURATION_BEATS[beat.duration] || 1
  return beat.dotted ? base * 1.5 : base
}


function displayNote(pitch: string, acc: string | null): string {
  const [letter, octave] = pitch.split('/')
  let n = PT[letter] || letter.toUpperCase()
  if (acc === '#') n += '♯'
  if (acc === 'b') n += '♭'
  return n + octave
}

function autoTags(beats: Beat[], category: string): string[] {
  const tags: string[] = [category]
  const noteCount = beats.reduce((s, b) => s + b.pitches.length, 0)
  if (noteCount <= 4) tags.push('básico')
  else if (noteCount <= 8) tags.push('intermediário')
  else tags.push('avançado')
  if (beats.some(b => b.pitches.length > 1)) tags.push('harmônico')
  if (beats.some(b => b.tie)) tags.push('ligadura')
  if (beats.some(b => b.cifra)) tags.push('cifra')
  if (beats.some(b => b.isRest)) tags.push('pausa')
  if (beats.some(b => b.dotted)) tags.push('pontuado')
  return tags
}

function beatsToSaveFormat(beats: Beat[]) {
  return beats.map(b => ({
    notes: b.pitches.map(p => p.pitch + ':' + b.duration + (b.dotted ? 'd' : '') + (b.isRest ? 'r' : '')),
    accidentals: b.pitches.map(p => p.accidental),
    tie: b.tie || false,
    isRest: b.isRest || false,
    dotted: b.dotted || false,
    ...(b.notehead && b.notehead !== 'normal' ? { notehead: b.notehead } : {}),
    ...(b.barAfter ? { barAfter: true } : {}),
    cifra: b.cifra || null,
    ...(b.cifra_offset && (b.cifra_offset.x || b.cifra_offset.y) ? { cifra_offset: b.cifra_offset } : {}),
    annotation: b.annotation || null,
    ...(b.annotation_offset && (b.annotation_offset.x || b.annotation_offset.y) ? { annotation_offset: b.annotation_offset } : {}),
    lyric: b.lyric || null,
    ...(b.lyric_offset && (b.lyric_offset.x || b.lyric_offset.y) ? { lyric_offset: b.lyric_offset } : {}),
  }))
}

function loadBeatsFromData(data: any): Beat[] {
  if (!data?.beats) return []
  try {
    return (data.beats as any[]).map((b: any) => {
      const notes = (b.notes ?? []) as string[]
      const accidentals = (b.accidentals ?? []) as (string | null)[]
      const pitches: PitchData[] = notes.map((n: string, i: number) => {
        const [pitch] = n.split(':')
        return { pitch, accidental: accidentals[i] ?? null }
      })
      // Extrair duração base (remover sufixos 'd' e 'r')
      const rawDur = notes[0]?.split(':')[1] ?? 'q'
      const dur = rawDur.replace(/[dr]/g, '')
      return {
        pitches,
        duration: dur,
        tie: b.tie ?? false,
        isRest: b.isRest ?? rawDur.includes('r'),
        dotted: b.dotted ?? rawDur.includes('d'),
        ...(b.notehead ? { notehead: b.notehead } : {}),
        ...(b.barAfter ? { barAfter: true } : {}),
        cifra: b.cifra ?? null,
        ...(b.cifra_offset ? { cifra_offset: b.cifra_offset } : {}),
        annotation: b.annotation ?? null,
        ...(b.annotation_offset ? { annotation_offset: b.annotation_offset } : {}),
        lyric: b.lyric ?? null,
        ...(b.lyric_offset ? { lyric_offset: b.lyric_offset } : {}),
      }
    })
  } catch {
    return []
  }
}

// ─── Multi-line: quebrar beats em linhas ─────────────────────────────
const NOTES_PER_LINE_OPTIONS = [4, 8, 12, 16] as const

function splitBeatsIntoLines(beats: Beat[], notesPerLine: number): Beat[][] {
  if (beats.length === 0) return [[]]
  const lines: Beat[][] = []
  for (let i = 0; i < beats.length; i += notesPerLine) {
    lines.push(beats.slice(i, i + notesPerLine))
  }
  return lines
}

// Converter uma linha de beats para o formato NotationRenderer
function lineBeatsToStaveData(
  lineBeats: Beat[],
  clef: string,
  keySig: string | undefined,
  timeSig: string | undefined,
  width = 700,
) {
  const notes: string[] = []
  const accidentals: (string | null)[] = []

  lineBeats.forEach(beat => {
    const durSuffix = (beat.dotted ? 'd' : '') + (beat.isRest ? 'r' : '')
    beat.pitches.forEach(p => {
      notes.push(`${p.pitch}:${beat.duration}${durSuffix}`)
      accidentals.push(p.accidental)
    })
  })

  return {
    type: 'staff' as const,
    staves: [{
      clef: clef as 'treble' | 'bass' | 'alto' | 'percussion',
      key_signature: clef === 'percussion' ? undefined : keySig,
      time_signature: timeSig,
      notes,
      accidentals,
      label: '',
    }],
    width,
    height: 150,
  }
}

// Geometria do VexFlow para mapeamento de clicks
const VEXFLOW_STAFF_TOP = 40    // Y do topo da pauta no SVG
const VEXFLOW_LINE_SPACE = 10   // espaçamento entre linhas no VexFlow
const VEXFLOW_STAFF_BOTTOM = VEXFLOW_STAFF_TOP + 4 * VEXFLOW_LINE_SPACE
const LINE_RENDER_HEIGHT = 150  // altura de cada linha renderizada
const VF_VIEWBOX_W = 700        // largura do viewBox do SVG VexFlow
const VF_VIEWBOX_H = 150        // altura do viewBox do SVG VexFlow
// Helpers: converter px do viewBox para % (overlay escala junto com o SVG)
const pctX = (px: number) => `${(px / VF_VIEWBOX_W) * 100}%`
const pctY = (py: number) => `${(py / VF_VIEWBOX_H) * 100}%`

function vexflowYToPos(y: number, scaleArr: string[]): number {
  // Converter posição Y no SVG para índice na escala
  // pos 4 = primeira linha (Mi4 na clave de Sol), cada meia-linha = 1 pos
  const pos = Math.round((VEXFLOW_STAFF_BOTTOM - y) / (VEXFLOW_LINE_SPACE / 2)) + 4
  return Math.max(0, Math.min(scaleArr.length - 1, pos))
}

// ─── Componente Principal ───────────────────────────────────────────
export function NotationEditor({ open, onOpenChange, notation, onSave, onDelete }: NotationEditorProps) {
  const isEditing = !!notation
  const editorColRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Estado do editor
  const [beats, setBeats] = useState<Beat[]>([])
  const [editorMode, setEditorMode] = useState<EditorMode>('free')
  const [inputMode, setInputMode] = useState<InputMode>('melodic')
  const [currentDuration, setCurrentDuration] = useState('q')
  const [currentAccidental, setCurrentAccidental] = useState<string | null>(null)
  const [restMode, setRestMode] = useState(false)
  const [dottedMode, setDottedMode] = useState(false)
  const [hoverPos, setHoverPos] = useState<number | null>(null)
  const [hoverMouse, setHoverMouse] = useState<{ x: number; y: number } | null>(null)
  const [selectedClef, setSelectedClef] = useState('treble')
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedTime, setSelectedTime] = useState('4/4')
  const [labelText, setLabelText] = useState('')
  const [notesPerLine, setNotesPerLine] = useState(8)

  // CRUD
  const [notationName, setNotationName] = useState('')
  const [category, setCategory] = useState('scale')
  const [difficulty, setDifficulty] = useState(1)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Cifra popup
  const [cifraPopupVisible, setCifraPopupVisible] = useState(false)
  const [cifraPopupPos, setCifraPopupPos] = useState({ x: 0, y: 0 })
  const [cifraTarget, setCifraTarget] = useState<number | null>(null)
  const [cifraInput, setCifraInput] = useState('')

  // Annotation popup
  const [annotPopupVisible, setAnnotPopupVisible] = useState(false)
  const [annotPopupPos, setAnnotPopupPos] = useState({ x: 0, y: 0 })
  const [annotTarget, setAnnotTarget] = useState<number | null>(null)
  const [annotInput, setAnnotInput] = useState('')

  // Lyric mode
  const [lyricCursor, setLyricCursor] = useState(0)
  const [lyricValue, setLyricValue] = useState('')
  const lyricInputRef = useRef<HTMLInputElement>(null)

  // Seleção de elemento (Fase 1 — interatividade)
  const [selectedElement, setSelectedElement] = useState<{
    type: 'note' | 'cifra' | 'annotation' | 'lyric'
    beatIdx: number
  } | null>(null)
  const [hoverBeatIdx, setHoverBeatIdx] = useState<number | null>(null)

  // Drag offsets para cifras/annotations/lyrics
  const [dragging, setDragging] = useState<{
    type: 'cifra' | 'annotation' | 'lyric'
    beatIdx: number
    startX: number
    startY: number
    origOffset: OffsetXY
  } | null>(null)
  const [dragPreview, setDragPreview] = useState<OffsetXY | null>(null)

  // Preview da última nota
  const [lastNote, setLastNote] = useState<string>('—')
  const [lastNoteInfo, setLastNoteInfo] = useState<string>('Clique na pauta')

  // ── Fase 2: Playback ──
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const playTimeoutsRef = useRef<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingBeatIndex, setPlayingBeatIndex] = useState<number | null>(null)

  // ── Fase 2: Undo/Redo ──
  const MAX_HISTORY = 50
  const [history, setHistory] = useState<Beat[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const historySkipRef = useRef(false) // evita pushHistory quando undo/redo restaura

  // ── Fase 2: Zoom ──
  const [zoom, setZoom] = useState(100)

  // ── Fase 2: Clipboard ──
  const [clipboard, setClipboard] = useState<Beat[] | null>(null)

  // Largura dinâmica da pauta (medida do container)
  const [staveWidth, setStaveWidth] = useState(700)

  // Posições X reais dos noteheads lidas do SVG (por linha)
  const [notePositions, setNotePositions] = useState<number[][]>([])

  const scale = useMemo(() => getScaleForClef(selectedClef), [selectedClef])

  // Multi-line: dividir beats em linhas e gerar dados VexFlow por linha
  const beatLines = useMemo(() => splitBeatsIntoLines(beats, notesPerLine), [beats, notesPerLine])

  const linedNotationData = useMemo(
    () => beatLines.map((lineBeats, i) => lineBeatsToStaveData(
      lineBeats,
      selectedClef,
      i === 0 && selectedKey !== 'C' ? selectedKey : undefined,
      i === 0 && editorMode === 'metered' ? selectedTime : undefined,
      staveWidth,
    )),
    [beatLines, selectedClef, selectedKey, editorMode, selectedTime, staveWidth],
  )

  // Inicializar ao abrir
  useEffect(() => {
    if (!open) return
    if (notation) {
      setNotationName(notation.name ?? '')
      setCategory(notation.category ?? 'scale')
      setSelectedClef(notation.clef ?? 'treble')
      setSelectedKey(notation.key_signature ?? 'C')
      setSelectedTime(notation.time_signature ?? '4/4')
      setDescription(notation.description ?? '')
      setDifficulty(notation.difficulty ?? 1)
      setLabelText(notation.name ?? '')
      const loadedBeats = loadBeatsFromData(notation.notation_data)
      setBeats(loadedBeats)
      setEditorMode(notation.time_signature ? 'metered' : 'free')
    } else {
      setNotationName('')
      setCategory('scale')
      setSelectedClef('treble')
      setSelectedKey('C')
      setSelectedTime('4/4')
      setDescription('')
      setDifficulty(1)
      setLabelText('')
      setBeats([])
      setEditorMode('free')
    }
    setInputMode('melodic')
    setCurrentDuration('q')
    setCurrentAccidental(null)
    setRestMode(false)
    setDottedMode(false)
    setHoverPos(null)
    setHoverMouse(null)
    setLastNote('—')
    setLastNoteInfo('Clique na pauta')
    setCifraPopupVisible(false)
    setSelectedElement(null)
    setHoverBeatIdx(null)
    // Fase 2 reset
    stopPlayback()
    setHistory([])
    setHistoryIndex(-1)
    historySkipRef.current = false
    setZoom(100)
    setClipboard(null)
  }, [open, notation])

  // Ler posições X reais dos noteheads do SVG após cada render
  useEffect(() => {
    // Delay para garantir que VexFlow já renderizou no DOM
    const timer = requestAnimationFrame(() => {
      const wrap = wrapRef.current
      if (!wrap) return
      const svgs = wrap.querySelectorAll('svg')
      const positions: number[][] = []
      svgs.forEach(svg => {
        const svgRect = svg.getBoundingClientRect()
        const vbW = parseFloat(svg.getAttribute('width') || String(VF_VIEWBOX_W))
        const scaleFactor = svgRect.width / vbW // CSS escala o SVG → converter de volta para coords do viewBox
        const noteheads = svg.querySelectorAll('.vf-notehead')
        // Coletar todas as posições X (convertidas para coordenadas do viewBox)
        const rawX: number[] = []
        noteheads.forEach(nh => {
          const r = nh.getBoundingClientRect()
          rawX.push((r.left - svgRect.left + r.width / 2) / scaleFactor)
        })
        // Agrupar noteheads de acordes (mesma posição X ±5px = mesmo beat)
        const grouped: number[] = []
        rawX.forEach(x => {
          if (grouped.length === 0 || Math.abs(x - grouped[grouped.length - 1]) > 5) {
            grouped.push(x)
          }
          // Se está perto do último, ignora (faz parte do mesmo acorde)
        })
        positions.push(grouped)
      })
      setNotePositions(positions)
    })
    return () => cancelAnimationFrame(timer)
  }, [linedNotationData, beats])

  // Medir largura do container para pauta responsiva
  // Mede o pai (editorColRef = div 1fr do grid), não o wrap que tem overflow hidden
  useEffect(() => {
    const col = editorColRef.current
    if (!col) return
    const measure = () => {
      const w = col.clientWidth - 28 // padding 14px × 2
      if (w > 200) setStaveWidth(w)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(col)
    return () => ro.disconnect()
  }, [open])

  // Helper: encontrar qual SVG (linha) está sob o mouse e retornar Y local + índice da linha
  function getSvgInfo(clientY: number): { svgY: number; lineIndex: number } {
    const wrap = wrapRef.current
    if (!wrap) return { svgY: 0, lineIndex: 0 }
    const svgs = wrap.querySelectorAll('svg')
    for (let i = 0; i < svgs.length; i++) {
      const svgRect = svgs[i].getBoundingClientRect()
      if (clientY >= svgRect.top && clientY <= svgRect.bottom) {
        const svgHeight = parseFloat(svgs[i].getAttribute('height') || '150')
        const ratio = svgHeight / svgRect.height
        return { svgY: (clientY - svgRect.top) * ratio, lineIndex: i }
      }
    }
    // Fallback: última linha
    const lastIdx = Math.max(0, svgs.length - 1)
    return { svgY: VEXFLOW_STAFF_BOTTOM, lineIndex: lastIdx }
  }

  // Helper: encontrar beat global mais próximo do clique
  const getNearestBeat = useCallback((clientX: number, clientY: number): number | null => {
    const wrap = wrapRef.current
    if (!wrap || beats.length === 0) return null
    const { lineIndex } = getSvgInfo(clientY)
    const svgs = wrap.querySelectorAll('svg')
    const svg = svgs[lineIndex]
    if (!svg) return null
    const svgRect = svg.getBoundingClientRect()
    const clickX = clientX - svgRect.left
    const lineBts = beatLines[lineIndex] || []
    if (lineBts.length === 0) return null
    const realPos = notePositions[lineIndex]
    const total = lineBts.length
    let bestDist = Infinity
    let bestBi = 0
    for (let bi = 0; bi < total; bi++) {
      // Usa posição real se disponível, senão fallback
      const nx = realPos && realPos[bi] !== undefined
        ? realPos[bi]
        : (total <= 1 ? 316.5 : 60 + 513 * bi / (total - 1))
      const dist = Math.abs(clickX - nx)
      if (dist < bestDist) { bestDist = dist; bestBi = bi }
    }
    // Só considera "perto" se o mouse está a menos de 25px da nota
    if (bestDist > 25) return null
    return lineIndex * notesPerLine + bestBi
  }, [beats, beatLines, notesPerLine, notePositions])

  // Mouse move handler — overlay
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const { svgY } = getSvgInfo(e.clientY)
    const pos = vexflowYToPos(svgY, scale)
    setHoverPos(pos)
    const r = wrap.getBoundingClientRect()
    setHoverMouse({ x: e.clientX - r.left, y: e.clientY - r.top })
    // Detectar se está sobre uma nota existente (para cursor crosshair)
    if (inputMode === 'melodic') {
      setHoverBeatIdx(getNearestBeat(e.clientX, e.clientY))
    }
  }, [scale, inputMode, getNearestBeat])

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null)
    setHoverMouse(null)
  }, [])

  // Click handler — overlay
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const { svgY, lineIndex } = getSvgInfo(e.clientY)

    // Cifra ou Annotation mode — encontrar beat mais próximo pelo X
    if (inputMode === 'cifra' || inputMode === 'annotation') {
      if (beats.length === 0) return
      const svgs = wrap.querySelectorAll('svg')
      const svg = svgs[lineIndex]
      if (!svg) return
      const svgRect = svg.getBoundingClientRect()
      const relX = (e.clientX - svgRect.left) / svgRect.width
      const lineBts = beatLines[lineIndex] || []
      const localBi = Math.min(lineBts.length - 1, Math.max(0, Math.round(relX * lineBts.length - 0.5)))
      const globalBi = lineIndex * notesPerLine + localBi
      if (globalBi >= beats.length) return
      const wr = wrap.getBoundingClientRect()
      const popPos = { x: e.clientX - wr.left - 40, y: e.clientY - wr.top - 50 }

      if (inputMode === 'cifra') {
        setCifraTarget(globalBi)
        setCifraPopupPos(popPos)
        setCifraInput(beats[globalBi]?.cifra || '')
        setCifraPopupVisible(true)
        setAnnotPopupVisible(false)
      } else {
        setAnnotTarget(globalBi)
        setAnnotPopupPos(popPos)
        setAnnotInput(beats[globalBi]?.annotation || '')
        setAnnotPopupVisible(true)
        setCifraPopupVisible(false)
      }
      return
    }

    // No modo melódico, clique perto de nota existente = selecionar
    if (inputMode === 'melodic' || inputMode === 'chord' || inputMode === 'tie') {
      const nearBeat = getNearestBeat(e.clientX, e.clientY)
      if (nearBeat !== null && inputMode === 'melodic') {
        setSelectedElement({ type: 'note', beatIdx: nearBeat })
        return
      }
      // Clique em área vazia = desselecionar
      setSelectedElement(null)
    }

    const pos = vexflowYToPos(svgY, scale)
    const pitch = scale[pos]
    if (!pitch) return

    setBeats(prev => {
      const next = [...prev]
      if (inputMode === 'chord' && next.length > 0) {
        const last = { ...next[next.length - 1], pitches: [...next[next.length - 1].pitches] }
        if (!last.pitches.find(p => p.pitch === pitch)) {
          last.pitches.push({ pitch, accidental: currentAccidental })
          last.pitches.sort((a, b) => scale.indexOf(a.pitch) - scale.indexOf(b.pitch))
        }
        next[next.length - 1] = last
      } else {
        next.push({
          pitches: [{ pitch: restMode ? 'b/4' : pitch, accidental: restMode ? null : currentAccidental }],
          duration: currentDuration,
          tie: false,
          isRest: restMode,
          dotted: dottedMode,
          ...(selectedClef === 'percussion' && DRUM_X_NOTEHEADS.has(pitch) && !restMode ? { notehead: 'x' as const } : {}),
          cifra: null,
          annotation: null,
          lyric: null,
        })
        // Tie mode: marca o penúltimo com tie
        if (inputMode === 'tie' && next.length >= 2) {
          next[next.length - 2] = { ...next[next.length - 2], tie: true }
          setInputMode('melodic')
        }
      }
      return next
    })

    if (restMode) {
      setLastNote('𝄽')
      setLastNoteInfo('Pausa · ' + DURATION_NAMES[currentDuration] + (dottedMode ? ' •' : ''))
    } else if (selectedClef === 'percussion') {
      setLastNote(DRUM_NAMES[pitch] || pitch)
      setLastNoteInfo(DURATION_NAMES[currentDuration] + (dottedMode ? ' •' : ''))
    } else {
      setLastNote(displayNote(pitch, currentAccidental))
      setLastNoteInfo(inputMode === 'chord' ? 'Empilhado' : DURATION_NAMES[currentDuration] + (dottedMode ? ' •' : ''))
    }
  }, [inputMode, currentAccidental, currentDuration, scale, beats, beatLines, notesPerLine, restMode, dottedMode, selectedClef])

  // Double click = remove nota mais próxima do clique
  const handleOverlayDblClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const nearBeat = getNearestBeat(e.clientX, e.clientY)
    if (nearBeat !== null) {
      setBeats(prev => prev.filter((_, i) => i !== nearBeat))
      setSelectedElement(null)
    } else {
      // Fallback: remove última
      setBeats(prev => prev.length > 0 ? prev.slice(0, -1) : prev)
    }
  }, [getNearestBeat])

  // Cifra apply
  const applyCifra = useCallback(() => {
    if (cifraTarget !== null && cifraTarget < beats.length) {
      setBeats(prev => prev.map((b, i) =>
        i === cifraTarget ? { ...b, cifra: cifraInput || null } : b
      ))
    }
    setCifraPopupVisible(false)
    setCifraTarget(null)
  }, [cifraTarget, cifraInput, beats.length])

  // Annotation apply
  const applyAnnotation = useCallback(() => {
    if (annotTarget !== null && annotTarget < beats.length) {
      setBeats(prev => prev.map((b, i) =>
        i === annotTarget ? { ...b, annotation: annotInput || null } : b
      ))
    }
    setAnnotPopupVisible(false)
    setAnnotTarget(null)
  }, [annotTarget, annotInput, beats.length])

  // Lyric mode helpers
  const enterLyricMode = useCallback(() => {
    setInputMode('lyric')
    setCifraPopupVisible(false)
    setAnnotPopupVisible(false)
    const firstEmpty = beats.findIndex(b => !b.lyric)
    const cursor = firstEmpty >= 0 ? firstEmpty : 0
    setLyricCursor(cursor)
    setLyricValue(beats[cursor]?.lyric || '')
    setTimeout(() => lyricInputRef.current?.focus(), 50)
  }, [beats])

  const saveLyric = useCallback((index: number, text: string) => {
    setBeats(prev => prev.map((b, i) =>
      i === index ? { ...b, lyric: text || null } : b
    ))
  }, [])

  const handleLyricKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      saveLyric(lyricCursor, lyricValue)
      setInputMode('melodic')
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      saveLyric(lyricCursor, lyricValue)
      const prev = Math.max(0, lyricCursor - 1)
      setLyricCursor(prev)
      setLyricValue(beats[prev]?.lyric || '')
      setTimeout(() => lyricInputRef.current?.select(), 20)
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      saveLyric(lyricCursor, lyricValue)
      const next = Math.min(beats.length - 1, lyricCursor + 1)
      setLyricCursor(next)
      setLyricValue(beats[next]?.lyric || '')
      setTimeout(() => lyricInputRef.current?.select(), 20)
      return
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      saveLyric(lyricCursor, lyricValue)
      if (lyricCursor < beats.length - 1) {
        const next = lyricCursor + 1
        setLyricCursor(next)
        setLyricValue(beats[next]?.lyric || '')
        setTimeout(() => lyricInputRef.current?.select(), 20)
      }
      return
    }
  }, [lyricCursor, lyricValue, beats, saveLyric])

  // Drag handlers para cifras/annotations/lyrics
  const handleDragStart = useCallback((type: 'cifra' | 'annotation' | 'lyric', beatIdx: number, e: React.MouseEvent) => {
    if (inputMode !== 'melodic') return
    e.preventDefault()
    e.stopPropagation()
    const beat = beats[beatIdx]
    if (!beat) return
    const key = `${type}_offset` as const
    const orig = (beat as any)[key] || { x: 0, y: 0 }
    setDragging({ type, beatIdx, startX: e.clientX, startY: e.clientY, origOffset: { ...orig } })
    setDragPreview({ ...orig })
  }, [inputMode, beats])

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragging.startX
    const dy = e.clientY - dragging.startY
    setDragPreview({ x: dragging.origOffset.x + dx, y: dragging.origOffset.y + dy })
  }, [dragging])

  const handleDragEnd = useCallback(() => {
    if (!dragging || !dragPreview) { setDragging(null); setDragPreview(null); return }
    const { type, beatIdx } = dragging
    const key = `${type}_offset` as const
    const finalOffset = { ...dragPreview }
    setBeats(prev => prev.map((b, i) =>
      i === beatIdx ? { ...b, [key]: finalOffset } : b
    ))
    setDragging(null)
    setDragPreview(null)
  }, [dragging, dragPreview])

  // Deletar elemento selecionado
  const deleteSelected = useCallback(() => {
    if (!selectedElement) return
    const { type, beatIdx } = selectedElement
    if (type === 'note') {
      setBeats(prev => prev.filter((_, i) => i !== beatIdx))
    } else if (type === 'cifra') {
      setBeats(prev => prev.map((b, i) => i === beatIdx ? { ...b, cifra: null, cifra_offset: undefined } : b))
    } else if (type === 'annotation') {
      setBeats(prev => prev.map((b, i) => i === beatIdx ? { ...b, annotation: null, annotation_offset: undefined } : b))
    } else if (type === 'lyric') {
      setBeats(prev => prev.map((b, i) => i === beatIdx ? { ...b, lyric: null, lyric_offset: undefined } : b))
    }
    setSelectedElement(null)
  }, [selectedElement])

  // Editar elemento selecionado (abre popup/input inline)
  const editSelected = useCallback(() => {
    if (!selectedElement) return
    const { type, beatIdx } = selectedElement
    const beat = beats[beatIdx]
    if (!beat) return
    if (type === 'cifra') {
      setCifraTarget(beatIdx)
      setCifraInput(beat.cifra || '')
      setCifraPopupVisible(true)
      setAnnotPopupVisible(false)
    } else if (type === 'annotation') {
      setAnnotTarget(beatIdx)
      setAnnotInput(beat.annotation || '')
      setAnnotPopupVisible(true)
      setCifraPopupVisible(false)
    } else if (type === 'lyric') {
      setInputMode('lyric')
      setLyricCursor(beatIdx)
      setLyricValue(beat.lyric || '')
      setTimeout(() => lyricInputRef.current?.focus(), 50)
    }
    setSelectedElement(null)
  }, [selectedElement, beats])

  // Mover pitch da nota selecionada (↑/↓)
  const moveSelectedPitch = useCallback((direction: 1 | -1) => {
    if (!selectedElement || selectedElement.type !== 'note') return
    const { beatIdx } = selectedElement
    setBeats(prev => prev.map((b, i) => {
      if (i !== beatIdx) return b
      // Mover cada pitch do beat na mesma direção
      const newPitches = b.pitches.map(p => {
        const currentIdx = scale.indexOf(p.pitch)
        if (currentIdx < 0) return p
        const newIdx = Math.max(0, Math.min(scale.length - 1, currentIdx + direction))
        if (newIdx === currentIdx) return p
        return { ...p, pitch: scale[newIdx], accidental: null }
      })
      // Atualizar lyric automaticamente se existir (acompanha a nota)
      const mainPitch = newPitches[0]
      const newLyric = b.lyric !== null && b.lyric !== undefined
        ? displayNote(mainPitch.pitch, mainPitch.accidental).replace(/\d+$/, '')
        : b.lyric
      return { ...b, pitches: newPitches, lyric: newLyric }
    }))
  }, [selectedElement, scale])

  // Keyboard handler para seleção
  useEffect(() => {
    if (!open || !selectedElement) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedElement(null)
      } else if (e.key === 'ArrowUp' && selectedElement.type === 'note') {
        e.preventDefault()
        moveSelectedPitch(1)
      } else if (e.key === 'ArrowDown' && selectedElement.type === 'note') {
        e.preventDefault()
        moveSelectedPitch(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const next = selectedElement.beatIdx + 1
        if (next < beats.length) setSelectedElement({ ...selectedElement, beatIdx: next })
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prev = selectedElement.beatIdx - 1
        if (prev >= 0) setSelectedElement({ ...selectedElement, beatIdx: prev })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, selectedElement, deleteSelected, moveSelectedPitch, beats.length])

  // ── Fase 2: Undo/Redo com Stack ──────────────────────────────────
  const pushHistory = useCallback((currentBeats: Beat[]) => {
    if (historySkipRef.current) { historySkipRef.current = false; return }
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1)
      trimmed.push(JSON.parse(JSON.stringify(currentBeats)))
      if (trimmed.length > MAX_HISTORY) trimmed.shift()
      return trimmed
    })
    setHistoryIndex(prev => {
      const newLen = Math.min(prev + 2, MAX_HISTORY)
      return newLen - 1
    })
  }, [historyIndex, MAX_HISTORY])

  // Observar mudanças em beats para auto-pushHistory
  const prevBeatsRef = useRef<string>('')
  useEffect(() => {
    const snap = JSON.stringify(beats)
    if (snap !== prevBeatsRef.current && prevBeatsRef.current !== '') {
      pushHistory(beats)
    }
    prevBeatsRef.current = snap
  }, [beats]) // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    historySkipRef.current = true
    setHistoryIndex(newIndex)
    setBeats(JSON.parse(JSON.stringify(history[newIndex])))
  }, [historyIndex, history])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    historySkipRef.current = true
    setHistoryIndex(newIndex)
    setBeats(JSON.parse(JSON.stringify(history[newIndex])))
  }, [historyIndex, history])

  // ── Fase 2: Playback Sonoro (Tone.js) ──────────────────────────
  const initSynth = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
      }).toDestination()
    }
  }, [])

  const stopPlayback = useCallback(() => {
    playTimeoutsRef.current.forEach(id => clearTimeout(id))
    playTimeoutsRef.current = []
    synthRef.current?.releaseAll()
    setIsPlaying(false)
    setPlayingBeatIndex(null)
  }, [])

  const playAll = useCallback(async () => {
    if (isPlaying) { stopPlayback(); return }
    if (beats.length === 0) return
    await Tone.start()
    initSynth()
    setIsPlaying(true)

    const bpm = 120
    const beatDuration = 60 / bpm
    const DURATIONS: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 }

    let delay = 0
    const timeouts: number[] = []

    beats.forEach((beat, index) => {
      const dur = DURATIONS[beat.duration] || 1
      const seconds = dur * beatDuration * (beat.dotted ? 1.5 : 1)

      // Highlight visual
      const hlId = window.setTimeout(() => setPlayingBeatIndex(index), delay * 1000)
      timeouts.push(hlId)

      if (!beat.isRest) {
        const notes = beat.pitches.map(p => {
          const parts = p.pitch.split('/')
          if (parts.length !== 2) return p.pitch
          let note = parts[0].toUpperCase() + parts[1]
          if (p.accidental === '#') note = note.replace(/(\d)/, '#$1')
          if (p.accidental === 'b') note = note.replace(/(\d)/, 'b$1')
          return note
        })
        const playId = window.setTimeout(() => {
          try { synthRef.current?.triggerAttackRelease(notes, seconds) } catch { /* ignore */ }
        }, delay * 1000)
        timeouts.push(playId)
      }

      delay += seconds
    })

    // Ao final, parar
    const endId = window.setTimeout(() => {
      setIsPlaying(false)
      setPlayingBeatIndex(null)
    }, delay * 1000)
    timeouts.push(endId)
    playTimeoutsRef.current = timeouts
  }, [isPlaying, beats, stopPlayback, initSynth])

  // Cleanup do synth ao desmontar
  useEffect(() => {
    return () => {
      playTimeoutsRef.current.forEach(id => clearTimeout(id))
      synthRef.current?.dispose()
      synthRef.current = null
    }
  }, [])

  // ── Fase 2: Zoom helpers ────────────────────────────────────────
  const zoomIn = useCallback(() => setZoom(z => Math.min(200, z + 10)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(50, z - 10)), [])
  const zoomReset = useCallback(() => setZoom(100), [])

  // ── Fase 2: Copy/Paste ──────────────────────────────────────────
  const copyBeat = useCallback(() => {
    if (!selectedElement || selectedElement.type !== 'note') return
    const beat = beats[selectedElement.beatIdx]
    if (beat) setClipboard([JSON.parse(JSON.stringify(beat))])
  }, [selectedElement, beats])

  const pasteBeat = useCallback(() => {
    if (!clipboard) return
    const insertAt = selectedElement?.type === 'note' ? selectedElement.beatIdx + 1 : beats.length
    setBeats(prev => {
      const next = [...prev]
      next.splice(insertAt, 0, ...clipboard.map(b => ({ ...b })))
      return next
    })
  }, [clipboard, selectedElement, beats.length])

  // ── Fase 2: Keyboard shortcuts globais ──────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      // Ignorar quando está em input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // Ctrl+Z / Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
        return
      }
      // Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
        return
      }
      // Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        copyBeat()
        return
      }
      // Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        pasteBeat()
        return
      }
      // Espaço = Play/Pause (quando não está em modo texto)
      if (e.key === ' ' && inputMode !== 'lyric' && inputMode !== 'cifra' && inputMode !== 'annotation') {
        e.preventDefault()
        playAll()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, undo, redo, copyBeat, pasteBeat, playAll, inputMode])

  // Clear
  const handleClear = useCallback(() => {
    setBeats([])
    setInputMode('melodic')
    setCifraPopupVisible(false)
    setAnnotPopupVisible(false)
    setLastNote('—')
    setLastNoteInfo('Clique na pauta')
  }, [])

  // Info computada
  const noteCount = beats.filter(b => !b.isRest).reduce((s, b) => s + b.pitches.length, 0)
  const restCount = beats.filter(b => b.isRest).length
  const chordCount = beats.filter(b => !b.isRest && b.pitches.length > 1).length
  const totalBeats = beats.reduce((s, b) => s + getBeatDuration(b), 0)
  const tieCount = beats.filter(b => b.tie).length
  const cifraCount = beats.filter(b => b.cifra).length
  const lyricCount = beats.filter(b => b.lyric).length
  const clefDisplay = selectedClef === 'treble' ? 'Sol' : selectedClef === 'bass' ? 'Fá' : selectedClef === 'percussion' ? 'Perc' : 'Dó'

  const measureCount = useMemo(() => {
    if (editorMode !== 'metered') return 0
    const [n, d] = selectedTime.split('/')
    const bpb = parseInt(n) * (4 / parseInt(d))
    return Math.ceil(totalBeats / bpb) || 0
  }, [editorMode, selectedTime, totalBeats])

  // Salvar
  const handleSave = async () => {
    if (!notationName.trim() || beats.length === 0) return
    setSaving(true)
    try {
      const tags = autoTags(beats, category)
      await onSave({
        name: notationName.trim(),
        category,
        clef: selectedClef,
        key_signature: selectedKey,
        time_signature: editorMode === 'metered' ? selectedTime : null,
        notation_data: { beats: beatsToSaveFormat(beats) },
        description: description.trim() || null,
        difficulty,
        tags,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  // Deletar
  const handleDelete = async () => {
    if (!notation?.id || !onDelete) return
    setDeleting(true)
    try {
      await onDelete(notation.id)
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  // ─── Toolbar button helper ───────────────────────────────────────
  function TBtn({ active, color, onClick, children, title }: {
    active: boolean; color?: string; onClick: () => void; children: React.ReactNode; title?: string
  }) {
    const bg = active
      ? (color === 'chord' ? '#6366F1' : color === 'tie' ? '#F97316' : '#FF2D78')
      : 'transparent'
    const border = active
      ? (color === 'chord' ? '#6366F1' : color === 'tie' ? '#F97316' : '#FF2D78')
      : '#334155'
    return (
      <button
        onClick={onClick}
        title={title}
        style={{
          minWidth: 30, height: 30, padding: '0 6px',
          border: `1px solid ${border}`, borderRadius: 6,
          background: bg, color: active ? '#fff' : '#94A3B8',
          fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: '.15s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!active) { (e.currentTarget).style.borderColor = '#FF2D78'; (e.currentTarget).style.color = '#FF2D78' } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget).style.borderColor = '#334155'; (e.currentTarget).style.color = '#94A3B8' } }}
      >
        {children}
      </button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[1100px] max-h-[90vh] overflow-y-auto bg-surface border-border"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => { if (inputMode === 'lyric') e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            {isEditing ? 'Editar' : 'Editor de'}{' '}
            <span className="text-accent">Notação</span>
          </DialogTitle>
        </DialogHeader>

        {/* ── Linha 1: Config principal ── */}
        <div className="flex gap-2 flex-wrap items-end mb-2.5">
          {/* Modo */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Modo</span>
            <div className="flex border border-border rounded-lg overflow-hidden">
              {(['free', 'metered'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setEditorMode(m)}
                  className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    editorMode === m ? 'bg-accent text-white' : 'text-text3 hover:bg-accent/10 hover:text-accent'
                  }`}
                >
                  {m === 'free' ? 'Livre' : 'Compasso'}
                </button>
              ))}
            </div>
          </div>

          {/* Clave */}
          <div className="space-y-1 min-w-[80px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Clave</span>
            <Select value={selectedClef} onValueChange={v => { setSelectedClef(v); setBeats([]); if (v === 'percussion') { setSelectedKey('C'); setCurrentAccidental(null) } }}>
              <SelectTrigger className="h-[34px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLEF_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Compasso (só metered) */}
          {editorMode === 'metered' && (
            <div className="space-y-1 min-w-[80px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Compasso</span>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="h-[34px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Armadura (esconder em percussão) */}
          {selectedClef !== 'percussion' && (
            <div className="space-y-1 min-w-[80px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Armadura</span>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger className="h-[34px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KEY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-1 min-w-[100px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Categoria</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-[34px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-1 flex-1 min-w-[140px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Label</span>
            <Input
              value={labelText}
              onChange={e => setLabelText(e.target.value)}
              className="h-[34px] text-[13px]"
              placeholder="Escala de Dó Maior"
            />
          </div>
        </div>

        {/* ── Toolbar (linha única) ── */}
        <div className="flex gap-[2px] items-center rounded-[9px] mb-2.5" style={{ padding: '5px 6px', backgroundColor: '#162032' }}>
          {/* Duração */}
          {[
            { key: 'w', label: '𝅝', tip: 'Semibreve' },
            { key: 'h', label: '�𝅥', tip: 'Mínima' },
            { key: 'q', label: '♩', tip: 'Semínima' },
            { key: '8', label: '♪', tip: 'Colcheia' },
            { key: '16', label: '𝅘𝅥𝅯', tip: 'Semicolcheia' },
          ].map(d => (
            <TBtn key={d.key} active={currentDuration === d.key} onClick={() => setCurrentDuration(d.key)} title={d.tip}>
              {d.label}
            </TBtn>
          ))}
          <TBtn active={restMode} onClick={() => setRestMode(p => !p)} title="Pausa">
            <span style={{ fontSize: 10, padding: '0 2px' }}>🔇</span>
          </TBtn>
          <TBtn active={dottedMode} onClick={() => setDottedMode(p => !p)} title="Ponto de aumento">
            <span style={{ fontSize: 13, fontWeight: 900, padding: '0 3px', lineHeight: 1 }}>•</span>
          </TBtn>

          <div style={{ width: 1, height: 18, backgroundColor: '#334155', margin: '0 3px' }} />

          {/* Alteração (esconder em percussão) */}
          {selectedClef !== 'percussion' && (<>
            <TBtn active={currentAccidental === null} onClick={() => setCurrentAccidental(null)} title="Natural">♮</TBtn>
            <TBtn active={currentAccidental === '#'} onClick={() => setCurrentAccidental('#')} title="Sustenido">♯</TBtn>
            <TBtn active={currentAccidental === 'b'} onClick={() => setCurrentAccidental('b')} title="Bemol">♭</TBtn>
            <div style={{ width: 1, height: 18, backgroundColor: '#334155', margin: '0 3px' }} />
          </>)}

          {/* Modo de input */}
          <TBtn active={inputMode === 'melodic'} onClick={() => { setInputMode('melodic'); setCifraPopupVisible(false); setAnnotPopupVisible(false) }} title="Melódico">
            <span style={{ fontSize: 10, padding: '0 2px' }}>→ Mel</span>
          </TBtn>
          <TBtn active={inputMode === 'chord'} color="chord" onClick={() => { setInputMode('chord'); setCifraPopupVisible(false); setAnnotPopupVisible(false) }} title="Harmônico">
            <span style={{ fontSize: 10, padding: '0 2px' }}>↕ Ac</span>
          </TBtn>
          <TBtn active={inputMode === 'tie'} color="tie" onClick={() => { setInputMode('tie'); setCifraPopupVisible(false); setAnnotPopupVisible(false) }} title="Ligadura">
            <span style={{ fontSize: 10, padding: '0 2px' }}>⌒ Lig</span>
          </TBtn>
          <TBtn active={inputMode === 'cifra'} onClick={() => { setInputMode('cifra'); setAnnotPopupVisible(false) }} title="Cifra">
            <span style={{ fontSize: 10, padding: '0 2px' }}>A7</span>
          </TBtn>
          <TBtn active={inputMode === 'annotation'} onClick={() => { setInputMode('annotation'); setCifraPopupVisible(false) }} title="Anotação">
            <span style={{ fontSize: 10, padding: '0 2px' }}>📝</span>
          </TBtn>
          <TBtn active={inputMode === 'lyric'} onClick={enterLyricMode} title="Letra">
            <span style={{ fontSize: 10, padding: '0 2px' }}>🎤</span>
          </TBtn>

          <div style={{ width: 1, height: 18, backgroundColor: '#334155', margin: '0 3px' }} />

          {/* Notas por linha */}
          {NOTES_PER_LINE_OPTIONS.map(n => (
            <TBtn key={n} active={notesPerLine === n} onClick={() => setNotesPerLine(n)} title={`${n} notas/linha`}>
              <span style={{ fontSize: 10, padding: '0 1px' }}>{n}</span>
            </TBtn>
          ))}

          <div style={{ width: 1, height: 18, backgroundColor: '#334155', margin: '0 3px' }} />

          {/* Undo / Redo */}
          <TBtn active={false} onClick={undo} title="Desfazer (Ctrl+Z)">
            <ArrowCounterClockwise size={14} style={{ opacity: historyIndex <= 0 ? 0.35 : 1 }} />
          </TBtn>
          <TBtn active={false} onClick={redo} title="Refazer (Ctrl+Y)">
            <ArrowClockwise size={14} style={{ opacity: historyIndex >= history.length - 1 ? 0.35 : 1 }} />
          </TBtn>

          {editorMode === 'free' && (
            <TBtn active={false} onClick={() => {
              if (beats.length === 0) return
              setBeats(prev => {
                const next = [...prev]
                const last = next[next.length - 1]
                next[next.length - 1] = { ...last, barAfter: !last.barAfter }
                return next
              })
            }} title="Barra de compasso">
              <span style={{ fontSize: 12, fontWeight: 700, padding: '0 2px' }}>|</span>
            </TBtn>
          )}

          <div style={{ width: 1, height: 18, backgroundColor: '#334155', margin: '0 3px' }} />

          {/* Play / Stop */}
          <TBtn active={isPlaying} onClick={playAll} title={isPlaying ? 'Pausar (Espaço)' : 'Tocar (Espaço)'}>
            {isPlaying ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
          </TBtn>
          {isPlaying && (
            <TBtn active={false} onClick={stopPlayback} title="Parar">
              <Stop size={14} weight="fill" />
            </TBtn>
          )}

          <div style={{ width: 1, height: 18, backgroundColor: '#334155', margin: '0 3px' }} />

          {/* Zoom */}
          <TBtn active={false} onClick={zoomOut} title="Diminuir zoom">
            <MagnifyingGlassMinus size={14} />
          </TBtn>
          <button
            onClick={zoomReset}
            title="Resetar zoom"
            style={{
              minWidth: 34, height: 30, padding: '0 4px',
              border: '1px solid #334155', borderRadius: 6,
              background: 'transparent', color: zoom !== 100 ? '#FF2D78' : '#94A3B8',
              fontSize: 10, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Mono', monospace",
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {zoom}%
          </button>
          <TBtn active={false} onClick={zoomIn} title="Aumentar zoom">
            <MagnifyingGlassPlus size={14} />
          </TBtn>
        </div>

        {/* ── Linha 3: VexFlow Preview + Painel lateral ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 14, alignItems: 'start' }}>
          {/* Área do editor: VexFlow multi-line + overlay */}
          <div ref={editorColRef}>
            <div
              ref={wrapRef}
              style={{ backgroundColor: '#fff', borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'auto', minHeight: 140, maxHeight: 420 }}
            >
              {/* Indicador de modo (canto superior direito) */}
              <div style={{ position: 'absolute', top: 6, right: 10, zIndex: 15, pointerEvents: 'none', display: 'flex', gap: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                  color: inputMode === 'chord' ? '#6366F1' : inputMode === 'tie' ? '#F97316' : inputMode === 'cifra' ? '#6366F1' : inputMode === 'annotation' ? '#94A3B8' : inputMode === 'lyric' ? '#FF2D78' : '#22C55E',
                }}>
                  {inputMode === 'chord' ? '↕ ACORDE' : inputMode === 'tie' ? '⌒ LIGADURA' : inputMode === 'cifra' ? 'A7 CIFRA' : inputMode === 'annotation' ? '📝 TEXTO' : inputMode === 'lyric' ? '🎤 LETRA' : '→ MELÓDICO'}
                </span>
                {restMode && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#F59E0B' }}>🔇 PAUSA</span>}
                {dottedMode && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#A78BFA' }}>• PONTO</span>}
                {selectedClef === 'percussion' && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#FB923C' }}>🥁 PERC</span>}
              </div>

              {/* Camada 1: VexFlow multi-line preview + cifras/annotations/lyrics overlay */}
              <div
                className="notation-editor-vexflow"
                style={{
                  pointerEvents: dragging ? 'auto' : 'none', position: 'relative',
                  transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: 'top left',
                  width: zoom !== 100 ? `${10000 / zoom}%` : undefined,
                }}
                onMouseMove={dragging ? handleDragMove : undefined}
                onMouseUp={dragging ? handleDragEnd : undefined}
                onMouseLeave={dragging ? handleDragEnd : undefined}
              >
                {linedNotationData.map((lineData, lineIdx) => {
                  const lineBts = beatLines[lineIdx] || []
                  const globalOffset = lineIdx * notesPerLine
                  const hasLyrics = lineBts.some(b => b.lyric) || inputMode === 'lyric'
                  // Posição X: usa posições reais dos noteheads lidas do SVG
                  // Fallback para fórmula fixa quando SVG ainda não renderizou
                  const realPos = notePositions[lineIdx]
                  const noteXpx = (bi: number) => {
                    if (realPos && realPos[bi] !== undefined) return realPos[bi]
                    // Fallback: fórmula fixa (modo livre sem time_sig/key_sig)
                    const VF_FIRST = 60, VF_LAST = 573
                    const total = lineBts.length
                    if (total <= 1) return (VF_FIRST + VF_LAST) / 2
                    return VF_FIRST + (VF_LAST - VF_FIRST) * bi / (total - 1)
                  }
                  return (
                    <div key={lineIdx} style={{ position: 'relative', marginBottom: hasLyrics ? 20 : 0, overflow: 'visible' }}>
                      <NotationRenderer notation={lineData} />

                      {/* Highlight de playback — nota sendo tocada */}
                      {playingBeatIndex !== null && lineBts.map((_, bi) => {
                        const globalIdx = globalOffset + bi
                        if (globalIdx !== playingBeatIndex) return null
                        return (
                          <div
                            key={`play-${bi}`}
                            style={{
                              position: 'absolute',
                              left: pctX(noteXpx(bi)),
                              top: pctY(VEXFLOW_STAFF_TOP - 4),
                              width: pctX(22), height: pctY(VEXFLOW_STAFF_BOTTOM - VEXFLOW_STAFF_TOP + 8),
                              transform: 'translateX(-50%)',
                              background: 'rgba(255, 45, 120, 0.18)',
                              borderRadius: 4,
                              zIndex: 3,
                              pointerEvents: 'none',
                              transition: 'left 0.05s',
                            }}
                          />
                        )
                      })}

                      {/* Highlight de nota selecionada ou hover */}
                      {lineBts.map((_, bi) => {
                        const globalIdx = globalOffset + bi
                        const isSelected = selectedElement?.type === 'note' && selectedElement.beatIdx === globalIdx
                        const isHovered = hoverBeatIdx === globalIdx && inputMode === 'melodic' && !selectedElement
                        if (!isSelected && !isHovered) return null
                        return (
                          <div
                            key={`sel-${bi}`}
                            style={{
                              position: 'absolute',
                              left: pctX(noteXpx(bi)),
                              top: pctY(VEXFLOW_STAFF_TOP - 4),
                              width: pctX(22), height: pctY(VEXFLOW_STAFF_BOTTOM - VEXFLOW_STAFF_TOP + 8),
                              transform: 'translateX(-50%)',
                              border: isSelected ? '2px solid #FF2D78' : '1.5px dashed #FF2D7866',
                              borderRadius: 6,
                              background: isSelected ? '#FF2D7815' : '#FF2D780A',
                              zIndex: 4,
                              pointerEvents: 'none',
                              transition: 'all .12s',
                            }}
                          />
                        )
                      })}

                      {/* Cifras e annotations — position absolute, alinhado com notas */}
                      {lineBts.map((beat, bi) => {
                        if (!beat.cifra && !beat.annotation) return null
                        const globalIdx = globalOffset + bi
                        const isDraggingThis = (t: string) => dragging?.type === t && dragging?.beatIdx === globalIdx
                        return (
                          <div key={`ca-${bi}`} style={{ position: 'absolute', left: pctX(noteXpx(bi)), top: 0, transform: 'translateX(-50%)', zIndex: 5 }}>
                            {beat.annotation && (() => {
                              const off = isDraggingThis('annotation') && dragPreview ? dragPreview : (beat.annotation_offset || { x: 0, y: 0 })
                              return (
                                <span
                                  style={{
                                    display: 'block', fontSize: 9, fontStyle: 'italic', color: '#94A3B8',
                                    fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', lineHeight: 1.1,
                                    transform: `translate(${off.x}px, ${off.y}px)`,
                                    cursor: inputMode === 'melodic' ? (isDraggingThis('annotation') ? 'grabbing' : 'grab') : 'default',
                                    opacity: isDraggingThis('annotation') ? 0.7 : 1,
                                    pointerEvents: inputMode === 'melodic' ? 'auto' : 'none',
                                    userSelect: 'none',
                                  }}
                                  onClick={inputMode === 'melodic' ? (e) => { e.stopPropagation(); setSelectedElement({ type: 'annotation', beatIdx: globalIdx }) } : undefined}
                                  onMouseDown={inputMode === 'melodic' ? e => handleDragStart('annotation', globalIdx, e) : undefined}
                                >
                                  {beat.annotation}
                                </span>
                              )
                            })()}
                            {beat.cifra && (() => {
                              const off = isDraggingThis('cifra') && dragPreview ? dragPreview : (beat.cifra_offset || { x: 0, y: 0 })
                              return (
                                <span
                                  style={{
                                    display: 'block', fontSize: 11, fontWeight: 700, color: '#6366F1',
                                    fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap', lineHeight: 1.1,
                                    transform: `translate(${off.x}px, ${off.y}px)`,
                                    cursor: inputMode === 'melodic' ? (isDraggingThis('cifra') ? 'grabbing' : 'grab') : 'default',
                                    opacity: isDraggingThis('cifra') ? 0.7 : 1,
                                    pointerEvents: inputMode === 'melodic' ? 'auto' : 'none',
                                    userSelect: 'none',
                                  }}
                                  onClick={inputMode === 'melodic' ? (e) => { e.stopPropagation(); setSelectedElement({ type: 'cifra', beatIdx: globalIdx }) } : undefined}
                                  onMouseDown={inputMode === 'melodic' ? e => handleDragStart('cifra', globalIdx, e) : undefined}
                                >
                                  {beat.cifra}
                                </span>
                              )
                            })()}
                          </div>
                        )
                      })}

                      {/* Lyrics — logo abaixo da pauta, alinhado com notas */}
                      {hasLyrics && lineBts.map((beat, bi) => {
                        const globalIdx = globalOffset + bi
                        const isActive = inputMode === 'lyric' && lyricCursor === globalIdx
                        const isDraggingLyric = dragging?.type === 'lyric' && dragging?.beatIdx === globalIdx
                        const off = isDraggingLyric && dragPreview ? dragPreview : (beat.lyric_offset || { x: 0, y: 0 })

                        return (
                          <div
                            key={`lyr-${bi}`}
                            style={{
                              position: 'absolute',
                              left: pctX(noteXpx(bi)),
                              top: pctY(VEXFLOW_STAFF_BOTTOM + 22),
                              transform: `translateX(-50%) translate(${off.x}px, ${off.y}px)`,
                              zIndex: isActive ? 30 : 5,
                              pointerEvents: (inputMode === 'lyric' || inputMode === 'melodic') ? 'auto' : 'none',
                              textAlign: 'center',
                            }}
                          >
                            {isActive ? (
                              <input
                                ref={lyricInputRef}
                                value={lyricValue}
                                onChange={e => setLyricValue(e.target.value)}
                                onKeyDown={handleLyricKeyDown}
                                onBlur={() => saveLyric(lyricCursor, lyricValue)}
                                autoFocus
                                style={{
                                  width: 48, textAlign: 'center', fontSize: 11,
                                  fontFamily: "'DM Sans', sans-serif", color: '#1E293B',
                                  background: 'transparent', outline: 'none',
                                  borderBottom: '2px solid #FF2D78', padding: '0 2px',
                                }}
                                placeholder="♪"
                              />
                            ) : beat.lyric ? (
                              <span
                                style={{
                                  fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                                  color: '#1E293B', whiteSpace: 'nowrap',
                                  cursor: inputMode === 'lyric' ? 'pointer' : inputMode === 'melodic' ? (isDraggingLyric ? 'grabbing' : 'grab') : 'default',
                                  opacity: isDraggingLyric ? 0.7 : 1,
                                  userSelect: 'none',
                                }}
                                onClick={inputMode === 'lyric' ? () => {
                                  saveLyric(lyricCursor, lyricValue)
                                  setLyricCursor(globalIdx)
                                  setLyricValue(beat.lyric || '')
                                  setTimeout(() => lyricInputRef.current?.focus(), 20)
                                } : inputMode === 'melodic' ? (e) => { e.stopPropagation(); setSelectedElement({ type: 'lyric', beatIdx: globalIdx }) } : undefined}
                                onMouseDown={inputMode === 'melodic' ? e => handleDragStart('lyric', globalIdx, e) : undefined}
                              >
                                {beat.lyric}
                              </span>
                            ) : inputMode === 'lyric' ? (
                              <span
                                style={{ fontSize: 11, color: '#CBD5E1', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => {
                                  saveLyric(lyricCursor, lyricValue)
                                  setLyricCursor(globalIdx)
                                  setLyricValue('')
                                  setTimeout(() => lyricInputRef.current?.focus(), 20)
                                }}
                              >♪</span>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Camada 2: Overlay de input invisível por cima */}
              <div
                ref={overlayRef}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  cursor: inputMode === 'lyric' ? 'default' : dragging ? 'grabbing' : hoverBeatIdx !== null ? 'pointer' : 'crosshair', zIndex: 10,
                  pointerEvents: (inputMode === 'lyric' || dragging) ? 'none' : 'auto',
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleOverlayClick}
                onDoubleClick={handleOverlayDblClick}
              />

              {/* Ghost note tooltip */}
              {hoverPos !== null && hoverMouse && inputMode !== 'cifra' && inputMode !== 'annotation' && inputMode !== 'lyric' && (
                <div
                  style={{
                    position: 'absolute',
                    left: Math.min(hoverMouse.x + 14, 620),
                    top: hoverMouse.y - 28,
                    background: 'var(--bg, #0F172A)',
                    border: `1px solid ${inputMode === 'chord' ? '#6366F1' : '#FF2D78'}`,
                    borderRadius: 6,
                    padding: '2px 8px',
                    zIndex: 20,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{
                    fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                    color: restMode ? '#F59E0B' : inputMode === 'chord' ? '#6366F1' : '#FF2D78',
                  }}>
                    {restMode
                      ? `Pausa · ${DURATION_NAMES[currentDuration]}${dottedMode ? ' •' : ''}`
                      : selectedClef === 'percussion'
                        ? `${DRUM_NAMES[scale[hoverPos]] || scale[hoverPos]} · ${DURATION_NAMES[currentDuration]}${dottedMode ? ' •' : ''}`
                        : `${displayNote(scale[hoverPos], currentAccidental)} · ${DURATION_NAMES[currentDuration]}${dottedMode ? ' •' : ''}`
                    }
                  </span>
                </div>
              )}

              {/* Cifra popup */}
              {cifraPopupVisible && (
                <div
                  style={{
                    position: 'absolute',
                    left: cifraPopupPos.x,
                    top: cifraPopupPos.y,
                    background: '#1E293B',
                    border: '2px solid #6366F1',
                    borderRadius: 8,
                    padding: 8,
                    zIndex: 25,
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,.5)',
                  }}
                >
                  <input
                    value={cifraInput}
                    onChange={e => setCifraInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') applyCifra() }}
                    placeholder="Cmaj7"
                    autoFocus
                    style={{
                      width: 80, padding: '4px 8px',
                      border: '1px solid #334155', borderRadius: 6,
                      background: '#0F172A', color: '#E2E8F0',
                      fontFamily: "'DM Mono', monospace", fontSize: 12, outline: 'none',
                    }}
                  />
                  <button
                    onClick={applyCifra}
                    style={{
                      padding: '4px 8px', border: 'none', borderRadius: 6,
                      background: '#6366F1', color: '#fff', fontSize: 11,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    OK
                  </button>
                </div>
              )}

              {/* Annotation popup */}
              {annotPopupVisible && (
                <div
                  style={{
                    position: 'absolute',
                    left: annotPopupPos.x,
                    top: annotPopupPos.y,
                    background: '#1E293B',
                    border: '2px solid #94A3B8',
                    borderRadius: 8,
                    padding: 8,
                    zIndex: 25,
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,.5)',
                  }}
                >
                  <input
                    value={annotInput}
                    onChange={e => setAnnotInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') applyAnnotation() }}
                    placeholder="respirar, mf, cresc."
                    autoFocus
                    style={{
                      width: 120, padding: '4px 8px',
                      border: '1px solid #334155', borderRadius: 6,
                      background: '#0F172A', color: '#E2E8F0',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontStyle: 'italic', outline: 'none',
                    }}
                  />
                  <button
                    onClick={applyAnnotation}
                    style={{
                      padding: '4px 8px', border: 'none', borderRadius: 6,
                      background: '#94A3B8', color: '#fff', fontSize: 11,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    OK
                  </button>
                </div>
              )}

              {/* Toolbar contextual flutuante para elemento selecionado */}
              {selectedElement && (() => {
                const { type, beatIdx } = selectedElement
                const beat = beats[beatIdx]
                if (!beat) return null
                // Calcular posição da toolbar
                const lineIdx = Math.floor(beatIdx / notesPerLine)
                const localBi = beatIdx - lineIdx * notesPerLine
                const lineBts = beatLines[lineIdx] || []
                const realPos = notePositions[lineIdx]
                const total = lineBts.length
                const nx = realPos && realPos[localBi] !== undefined
                  ? realPos[localBi]
                  : (total <= 1 ? 316.5 : 60 + 513 * localBi / (total - 1))
                // Y depende do tipo: nota=acima da pauta, cifra=acima do top, lyric=abaixo da pauta
                const lineTop = lineIdx * (LINE_RENDER_HEIGHT + (lineBts.some(b => b.lyric) ? 20 : 0))
                const toolY = type === 'lyric' ? lineTop + VEXFLOW_STAFF_BOTTOM + 40 : lineTop + VEXFLOW_STAFF_TOP - 30
                const showEdit = type !== 'note'
                const showMove = type !== 'note'
                const label = type === 'note'
                  ? displayNote(beat.pitches[0]?.pitch, beat.pitches[0]?.accidental)
                  : type === 'cifra' ? beat.cifra
                  : type === 'annotation' ? beat.annotation
                  : beat.lyric
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: nx,
                      top: toolY,
                      transform: 'translateX(-50%)',
                      zIndex: 40,
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                      background: '#1E293B',
                      border: '1.5px solid #FF2D78',
                      borderRadius: 8,
                      padding: '3px 6px',
                      boxShadow: '0 4px 16px rgba(0,0,0,.5)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {/* Label do elemento */}
                    <span style={{ fontSize: 10, color: '#E2E8F0', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginRight: 4, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </span>
                    {/* Botões ↑/↓ para mover pitch (só para notas) */}
                    {type === 'note' && (
                      <>
                        <button
                          onClick={() => moveSelectedPitch(1)}
                          title="Subir nota (↑)"
                          style={{
                            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: '1px solid #475569', borderRadius: 5,
                            color: '#22D3EE', cursor: 'pointer', transition: '.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#22D3EE33'; e.currentTarget.style.borderColor = '#22D3EE' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#475569' }}
                        >
                          <CaretUp size={14} weight="bold" />
                        </button>
                        <button
                          onClick={() => moveSelectedPitch(-1)}
                          title="Descer nota (↓)"
                          style={{
                            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: '1px solid #475569', borderRadius: 5,
                            color: '#22D3EE', cursor: 'pointer', transition: '.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#22D3EE33'; e.currentTarget.style.borderColor = '#22D3EE' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#475569' }}
                        >
                          <CaretDown size={14} weight="bold" />
                        </button>
                      </>
                    )}
                    {/* Botão Deletar */}
                    <button
                      onClick={deleteSelected}
                      title="Deletar (Delete)"
                      style={{
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: '1px solid #475569', borderRadius: 5,
                        color: '#F87171', cursor: 'pointer', transition: '.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F8717133'; e.currentTarget.style.borderColor = '#F87171' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#475569' }}
                    >
                      <Trash size={13} />
                    </button>
                    {/* Botão Editar (só para texto) */}
                    {showEdit && (
                      <button
                        onClick={editSelected}
                        title="Editar"
                        style={{
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: '1px solid #475569', borderRadius: 5,
                          color: '#60A5FA', cursor: 'pointer', transition: '.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#60A5FA33'; e.currentTarget.style.borderColor = '#60A5FA' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#475569' }}
                      >
                        <PencilSimple size={13} />
                      </button>
                    )}
                    {/* Botão Mover (ativa drag — só para texto) */}
                    {showMove && (
                      <button
                        onClick={() => {
                          // Ativa dica visual de que pode arrastar
                          setSelectedElement(null)
                        }}
                        title="Arrastar para reposicionar"
                        style={{
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: '1px solid #475569', borderRadius: 5,
                          color: '#34D399', cursor: 'pointer', transition: '.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#34D39933'; e.currentTarget.style.borderColor = '#34D399' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#475569' }}
                      >
                        <ArrowsOutCardinal size={13} />
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Instruções */}
            <div className="text-[11px] text-text3 text-center leading-relaxed mt-2">
              <span className="text-accent font-semibold">Clique</span> = nota ·{' '}
              <span className="text-accent font-semibold">Duplo clique</span> = remover ·{' '}
              <span style={{ color: '#22D3EE' }}>↑↓</span> = mover ·{' '}
              <span style={{ color: '#94A3B8' }}>←→</span> = navegar ·{' '}
              <span style={{ color: '#94A3B8' }}>Del</span> = apagar ·{' '}
              <span style={{ color: '#94A3B8' }}>Ctrl+Z</span> = desfazer ·{' '}
              <span style={{ color: '#94A3B8' }}>Ctrl+Y</span> = refazer ·{' '}
              <span style={{ color: '#94A3B8' }}>Ctrl+C/V</span> = copiar/colar ·{' '}
              <span className="text-accent font-semibold">Espaço</span> = play/pause
            </div>
          </div>

          {/* Painel lateral */}
          <div className="flex flex-col gap-2">
            {/* Informações */}
            <div style={{ background: 'var(--bg, #0F172A)', border: '1px solid #334155', borderRadius: 9, padding: 8 }}>
              <h3 style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginBottom: 4 }}>Informações</h3>
              {[
                ['Notas', String(noteCount)],
                ['Pausas', String(restCount)],
                ['Acordes', String(chordCount)],
                ...(editorMode === 'metered' ? [['Compassos', String(measureCount)]] : []),
                ['Clave', clefDisplay],
                ...(selectedClef !== 'percussion' ? [['Armadura', selectedKey]] : []),
                ['Tempos', totalBeats + ' tempos'],
                ['Ligaduras', String(tieCount)],
                ['Cifras', String(cifraCount)],
                ['Sílabas', String(lyricCount)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '1px 0' }}>
                  <span style={{ color: '#94A3B8' }}>{label}</span>
                  <span style={{ color: 'var(--text, #E2E8F0)', fontWeight: 600, fontFamily: "'DM Mono', monospace", fontSize: 10 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Preview última nota */}
            <div style={{ background: 'var(--bg, #0F172A)', border: '1px solid #334155', borderRadius: 9, padding: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#FF2D78' }}>{lastNote}</div>
              <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 1 }}>{lastNoteInfo}</div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #334155' }}>
          {/* Esquerda: limpar ou excluir */}
          <div className="flex items-center gap-2">
            {isEditing && onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={deleting} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash size={16} /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-surface border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir notação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A notação "{notationName}" será removida permanentemente da biblioteca. Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Excluindo...' : 'Sim, excluir'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <button
                onClick={handleClear}
                className="text-[12px] text-text3 hover:text-destructive transition-colors px-2 py-1 rounded"
              >
                <X size={12} className="inline mr-1" />Limpar tudo
              </button>
            )}
          </div>

          {/* Centro: nome + dificuldade */}
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Nome</Label>
              <Input
                value={notationName}
                onChange={e => setNotationName(e.target.value)}
                placeholder="Ex: Dó Maior, Progressão I-IV-V"
                className="h-[34px] w-[180px] text-[13px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Dificuldade</Label>
              <Select value={String(difficulty)} onValueChange={v => setDifficulty(Number(v))}>
                <SelectTrigger className="h-[34px] w-[70px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Direita: cancelar + salvar */}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || deleting || !notationName.trim() || beats.length === 0}
            >
              <FloppyDisk size={16} />
              {saving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
