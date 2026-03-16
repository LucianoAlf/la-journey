import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Fretboard, GUITAR_TUNINGS } from '@moonwave99/fretboard.js'
import { FloppyDisk, Trash, X, Eraser, Crosshair, ListNumbers } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { createChord, updateChord, deleteChord } from '@/services/libraryService'
import { injectInlayDots, type GuitarFretboardPositions, type FretboardNote } from './GuitarFretboardDiagram'

// ─── Constantes musicais ────────────────────────────────────────────
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTE_NAMES_PT = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si']

// Afinação padrão da guitarra: E2, A2, D3, G3, B3, E4
// string 6=E2(grave) … string 1=E4(agudo) — convenção fretboard.js
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64] // E2, A2, D3, G3, B3, E4

// ─── Presets de acordes e escalas ───────────────────────────────────
const PRESETS: Record<string, number[]> = {
  // Tríades
  major: [0, 4, 7], minor: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 2, 4, 7],
  // Tétrades
  '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10],
  '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], mmaj7: [0, 3, 7, 11],
  // Escalas
  major_scale: [0, 2, 4, 5, 7, 9, 11],
  minor_scale: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor_scale: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor_scale: [0, 2, 3, 5, 7, 9, 11],
  penta_major: [0, 2, 4, 7, 9],
  penta_minor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
}

// ─── Tensões ────────────────────────────────────────────────────────
type TensionKey = '9' | 'b9' | '#9' | '11' | '#11' | '13' | 'b13' | 'b5' | '#5'

const TENSION_INTERVALS: Record<TensionKey, number> = {
  '9': 14, 'b9': 13, '#9': 15,
  '11': 17, '#11': 18,
  '13': 21, 'b13': 20,
  'b5': 6, '#5': 8,
}

const TENSION_LABELS: Record<TensionKey, string> = {
  '9': '9', 'b9': 'b9', '#9': '#9',
  '11': '11', '#11': '#11',
  '13': '13', 'b13': 'b13',
  'b5': 'b5', '#5': '#5',
}

const ALL_TENSIONS: TensionKey[] = ['9', 'b9', '#9', '11', '#11', '13', 'b13', 'b5', '#5']

const PRESET_LABELS: Record<string, string> = {
  major: 'Maior', minor: 'Menor', dim: 'Dim', aug: 'Aug', sus2: 'sus2', sus4: 'sus4', add9: 'add9',
  '7': '7', m7: 'm7', maj7: 'Maj7', dim7: 'dim7', m7b5: 'm7(b5)',
  '6': '6', m6: 'm6', mmaj7: 'mMaj7',
  major_scale: 'Maior', minor_scale: 'Menor Natural',
  harmonic_minor_scale: 'Menor Harmônica', melodic_minor_scale: 'Menor Melódica',
  penta_major: 'Penta Maior', penta_minor: 'Penta Menor', blues: 'Blues',
}

const QUALITY_MAP: Record<string, string> = {
  major: 'major', minor: 'minor', dim: 'diminished', aug: 'augmented',
  sus2: 'sus2', sus4: 'sus4', add9: 'add9',
  '7': 'dominant7', m7: 'minor7', maj7: 'major7', dim7: 'diminished7', m7b5: 'half_diminished',
  '6': 'major6', m6: 'minor6', mmaj7: 'minor_major7',
}

const FAMILY_MAP: Record<string, string> = {
  major: 'triad', minor: 'triad', dim: 'triad', aug: 'triad',
  sus2: 'suspended', sus4: 'suspended', add9: 'triad',
  '7': 'tetrad', m7: 'tetrad', maj7: 'tetrad', dim7: 'tetrad', m7b5: 'tetrad',
  '6': 'tetrad', m6: 'tetrad', mmaj7: 'tetrad',
  major_scale: 'scale', minor_scale: 'scale', harmonic_minor_scale: 'scale',
  melodic_minor_scale: 'scale', penta_major: 'scale', penta_minor: 'scale', blues: 'scale',
}

// ─── Helpers musicais ───────────────────────────────────────────────

/** Converte nota raiz (C, C#, D…) para índice MIDI (0-11) */
function rootToMidi(root: string): number {
  return NOTE_NAMES.indexOf(root)
}

/** Gera todas as notas de uma escala/acorde no braço inteiro da guitarra */
function generateFretboardNotes(
  root: string,
  intervals: number[],
  fretCount: number = 15,
): FretboardNote[] {
  const rootIdx = rootToMidi(root)
  if (rootIdx < 0) return []

  // Notas MIDI da escala/acorde (dentro de 1 oitava)
  const scaleNotes = new Set(intervals.map(i => (rootIdx + i) % 12))

  const notes: FretboardNote[] = []

  for (let stringNum = 6; stringNum >= 1; stringNum--) {
    const openMidi = STANDARD_TUNING_MIDI[6 - stringNum]
    for (let fret = 0; fret <= fretCount; fret++) {
      const midi = openMidi + fret
      const noteIdx = midi % 12
      if (scaleNotes.has(noteIdx)) {
        const isRoot = noteIdx === rootIdx
        const degree = intervals.indexOf((noteIdx - rootIdx + 12) % 12) + 1
        // Dedilhado automático: dedo 1-4 baseado na posição relativa no bloco de 4 trastes
        let finger: number | undefined
        if (fret > 0) {
          const posInBlock = ((fret - 1) % 4)
          finger = posInBlock + 1  // 1, 2, 3, 4
        }
        notes.push({
          string: stringNum,
          fret,
          note: NOTE_NAMES[noteIdx],
          isRoot,
          degree: degree > 0 ? degree : undefined,
          interval: isRoot ? '1P' : undefined,
          finger,
        })
      }
    }
  }

  return notes
}

/** Gera tags para o banco */
function generateTags(preset: string | null, difficulty: number): string[] {
  const tags: string[] = []
  const isScale = preset && (preset.includes('scale') || preset.startsWith('penta') || preset === 'blues')
  if (isScale) {
    tags.push('escala')
  } else {
    const family = preset ? (FAMILY_MAP[preset] ?? 'triad') : 'triad'
    if (family === 'triad') tags.push('tríade')
    else if (family === 'tetrad') tags.push('tétrade')
    else if (family === 'suspended') tags.push('suspensa')
  }
  tags.push(`nível ${difficulty}`)
  return tags
}

// ─── Tipos ──────────────────────────────────────────────────────────

type EditorMode = 'chord' | 'scale'

interface GuitarChordData {
  id?: string
  name: string
  instrument: 'electric_guitar'
  positions: GuitarFretboardPositions
  difficulty: number
  tags: string[]
  family?: string
  quality?: string
  root_note?: string
}

export interface GuitarFretboardEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dados do acorde/escala para edição (null = criação) */
  chord?: GuitarChordData | null
  /** Callback quando salvar */
  onSave?: (data: GuitarChordData) => void
}

// ─── Cores do Design System ─────────────────────────────────────────

const COLORS = {
  dark: {
    dotFill: '#FF2D78',
    dotStroke: '#0F172A',
    rootFill: '#F97316',
    fretColor: '#475569',
    stringColor: '#64748B',
    fretNumbersColor: '#475569',
    bg: '#0F172A',
  },
  light: {
    dotFill: '#FF2D78',
    dotStroke: '#FFFFFF',
    rootFill: '#F97316',
    fretColor: '#CBD5E1',
    stringColor: '#9CA3AF',
    fretNumbersColor: '#94A3B8',
    bg: '#F8FAFC',
  },
}

// ─── Componente Principal ───────────────────────────────────────────

export function GuitarFretboardEditor({
  open,
  onOpenChange,
  chord,
  onSave,
}: GuitarFretboardEditorProps) {
  // Estado do editor
  const [notes, setNotes] = useState<FretboardNote[]>([])
  const [chordName, setChordName] = useState('')
  const [difficulty, setDifficulty] = useState(1)
  const [rootNote, setRootNote] = useState('C')
  const [mode, setMode] = useState<EditorMode>('scale')
  const [lastPreset, setLastPreset] = useState<string | null>(null)
  const [activeTensions, setActiveTensions] = useState<Set<TensionKey>>(new Set())
  const [fretCount, setFretCount] = useState(15)
  const [rootMode, setRootMode] = useState(false)
  const [showTab, setShowTab] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dotLabel, setDotLabel] = useState<'finger' | 'note' | 'degree' | 'none'>('note')

  // Popover de edição (clique direito)
  const [popover, setPopover] = useState<{
    noteIdx: number
    x: number
    y: number
  } | null>(null)

  // Referências
  const fretboardRef = useRef<HTMLDivElement>(null)
  const fretboardCardRef = useRef<HTMLDivElement>(null)
  const fbInstanceRef = useRef<Fretboard | null>(null)

  // Tema
  const isDark = typeof document !== 'undefined' &&
    (document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark'))
  const colors = isDark ? COLORS.dark : COLORS.light

  // ── Carregar dados de edição ──
  useEffect(() => {
    if (chord && open) {
      setNotes(chord.positions.notes)
      setChordName(chord.name)
      setDifficulty(chord.difficulty)
      setRootNote(chord.root_note ?? 'C')
      setLastPreset(null)
      setActiveTensions(new Set())
    } else if (open && !chord) {
      // Modo criação: resetar
      setNotes([])
      setChordName('')
      setDifficulty(1)
      setRootNote('C')
      setMode('scale')
      setLastPreset(null)
      setActiveTensions(new Set())
    }
  }, [chord, open])

  // ── Renderizar fretboard ──
  const renderFretboard = useCallback(() => {
    if (!fretboardRef.current) return

    // Limpar
    fretboardRef.current.innerHTML = ''

    const fb = new Fretboard({
      el: fretboardRef.current,
      tuning: GUITAR_TUNINGS.default,
      fretCount,
      width: 900,
      height: 200,
      dotSize: 22,
      dotFill: colors.dotFill,
      dotStrokeColor: colors.dotStroke,
      dotStrokeWidth: 1.5,
      fretColor: colors.fretColor,
      stringColor: colors.stringColor,
      showFretNumbers: true,
      fretNumbersColor: colors.fretNumbersColor,
      middleFretColor: colors.fretColor,
      middleFretWidth: 1,
      scaleFrets: false,
      font: 'DM Sans, sans-serif',
      dotTextSize: 11,
      dotText: (dot: any) => {
        if (dotLabel === 'none') return ''
        if (dotLabel === 'note') return dot.note ?? ''
        if (dotLabel === 'degree') return dot.degree ? String(dot.degree) : ''
        if (dotLabel === 'finger') {
          if (dot.finger && dot.finger > 0) return String(dot.finger)
          // Dedilhado automático: dedo 1-4 baseado na posição do traste
          if (dot.fret > 0) return String(((dot.fret - 1) % 4) + 1)
          return ''
        }
        return ''
      },
    })

    fbInstanceRef.current = fb

    // Converter notas para formato fretboard.js
    const dots = notes.map(n => ({
      string: n.string,
      fret: n.fret,
      finger: n.finger ?? 0,
      isRoot: n.isRoot ?? false,
      note: n.note ?? '',
      interval: n.interval ?? '',
      degree: n.degree ?? 0,
    }))

    fb.setDots(dots).render()

    // Estilizar tônicas (laranja)
    fb.style({
      filter: { isRoot: true },
      fill: colors.rootFill,
      stroke: colors.rootFill,
      fontFill: '#FFFFFF',
    })

    // Estilizar notas normais (rosa)
    fb.style({
      filter: (dot: any) => !dot.isRoot,
      fill: colors.dotFill,
      fontFill: '#FFFFFF',
    })

    // Forçar texto branco em todas as notas (fretboard.js não aplica fontFill corretamente)
    fretboardRef.current.querySelectorAll('.dot-text').forEach(t => {
      t.setAttribute('fill', '#FFFFFF')
    })

    // Injetar inlay dots (marcadores de traste)
    const inlayColor = isDark ? '#94A3B8' : '#64748B'
    injectInlayDots(fretboardRef.current, fretCount, inlayColor, 0.21, 5)

    // Adicionar evento de clique
    fb.on('click', (position: any) => {
      if (!position || position.fret === undefined || position.string === undefined) return

      setNotes(prev => {
        const existing = prev.findIndex(
          n => n.string === position.string && n.fret === position.fret
        )

        if (existing >= 0) {
          // Remover nota existente
          return prev.filter((_, i) => i !== existing)
        } else {
          // Adicionar nova nota
          const midi = STANDARD_TUNING_MIDI[6 - position.string] + position.fret
          const noteIdx = midi % 12
          const isRoot = rootMode || noteIdx === rootToMidi(rootNote)
          return [...prev, {
            string: position.string,
            fret: position.fret,
            note: NOTE_NAMES[noteIdx],
            isRoot,
            degree: undefined,
            finger: undefined,
          }]
        }
      })
    })
  }, [notes, fretCount, colors, dotLabel, rootNote, rootMode])

  // Re-renderizar quando notas ou config mudam
  useEffect(() => {
    if (open) {
      // Pequeno delay para garantir que o DOM está pronto
      const timer = setTimeout(renderFretboard, 50)
      return () => clearTimeout(timer)
    }
  }, [open, renderFretboard])

  // ── Registrar contextmenu nativo direto no elemento (bypass Radix Dialog) ──
  const contextMenuHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)
  useEffect(() => {
    const el = fretboardRef.current
    if (!el || !open) return

    // Remover handler anterior se existir
    if (contextMenuHandlerRef.current) {
      el.removeEventListener('contextmenu', contextMenuHandlerRef.current)
    }

    const handler = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const svg = el.querySelector('svg')
      if (!svg) return

      const svgRect = svg.getBoundingClientRect()
      const mx = e.clientX - svgRect.left
      const my = e.clientY - svgRect.top

      const dotGroups = svg.querySelectorAll('g[class*="dot-string"]')
      let bestIdx = -1
      let bestDist = Infinity

      dotGroups.forEach(dotGroup => {
        const circle = dotGroup.querySelector('circle')
        if (!circle) return
        const cr = circle.getBoundingClientRect()
        const cx = cr.left + cr.width / 2 - svgRect.left
        const cy = cr.top + cr.height / 2 - svgRect.top
        const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2)
        if (dist < bestDist && dist < 20) {
          const cls = dotGroup.getAttribute('class') || ''
          const sm = cls.match(/dot-string-(\d+)/)
          const fm = cls.match(/dot-fret-(\d+)/)
          if (sm && fm) {
            const s = parseInt(sm[1])
            const f = parseInt(fm[1])
            const idx = notes.findIndex(n => n.string === s && n.fret === f)
            if (idx >= 0) { bestIdx = idx; bestDist = dist }
          }
        }
      })

      if (bestIdx < 0) return

      const cardRect = fretboardCardRef.current?.getBoundingClientRect()
      if (!cardRect) return

      // Encontrar o círculo exato da nota para posicionar acima dele
      setPopover({
        noteIdx: bestIdx,
        x: e.clientX - cardRect.left,
        y: e.clientY - cardRect.top,
      })
    }

    contextMenuHandlerRef.current = handler
    el.addEventListener('contextmenu', handler)
    return () => el.removeEventListener('contextmenu', handler)
  }, [open, notes])

  // ── Clique direito no overlay para abrir popover (mesmo padrão do ChordEditor) ──
  const handleOverlayContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const container = fretboardRef.current
    if (!container) return

    // Encontrar o SVG do fretboard
    const svg = container.querySelector('svg')
    if (!svg) return

    const svgRect = svg.getBoundingClientRect()
    const mx = e.clientX - svgRect.left
    const my = e.clientY - svgRect.top

    // Buscar a nota mais próxima do clique no SVG
    const dotGroups = svg.querySelectorAll('g[class*="dot-string"]')
    let bestIdx = -1
    let bestDist = Infinity

    dotGroups.forEach(dotGroup => {
      const circle = dotGroup.querySelector('circle')
      if (!circle) return

      const cx = circle.getBoundingClientRect().left + circle.getBoundingClientRect().width / 2 - svgRect.left
      const cy = circle.getBoundingClientRect().top + circle.getBoundingClientRect().height / 2 - svgRect.top
      const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2)

      if (dist < bestDist && dist < 20) {
        const cls = dotGroup.getAttribute('class') || ''
        const sm = cls.match(/dot-string-(\d+)/)
        const fm = cls.match(/dot-fret-(\d+)/)
        if (sm && fm) {
          const s = parseInt(sm[1])
          const f = parseInt(fm[1])
          const idx = notes.findIndex(n => n.string === s && n.fret === f)
          if (idx >= 0) {
            bestIdx = idx
            bestDist = dist
          }
        }
      }
    })

    if (bestIdx < 0) return

    const cardRect = fretboardCardRef.current?.getBoundingClientRect()
    if (!cardRect) return
    setPopover({
      noteIdx: bestIdx,
      x: e.clientX - cardRect.left,
      y: e.clientY - cardRect.top,
    })
  }, [notes])

  // ── Handlers de presets ──
  const handleLoadPreset = useCallback((presetKey: string) => {
    const intervals = PRESETS[presetKey]
    if (!intervals) return

    const generatedNotes = generateFretboardNotes(rootNote, intervals, fretCount)
    setNotes(generatedNotes)
    setLastPreset(presetKey)
    setActiveTensions(new Set())

    // Auto-nomear
    const isScale = presetKey.includes('scale') || presetKey.startsWith('penta') || presetKey === 'blues'
    if (isScale) {
      setMode('scale')
      setChordName(`${rootNote} ${PRESET_LABELS[presetKey] || presetKey}`)
    } else {
      setMode('chord')
      const suffix = presetKey === 'major' ? '' : presetKey === 'minor' ? 'm' : presetKey
      setChordName(`${rootNote}${suffix}`)
    }
  }, [rootNote, fretCount])

  // ── Toggle tensão ──
  const handleToggleTension = useCallback((tension: TensionKey) => {
    if (!lastPreset) return
    const isScale = lastPreset.includes('scale') || lastPreset.startsWith('penta') || lastPreset === 'blues'
    if (isScale) return

    setActiveTensions(prev => {
      const next = new Set(prev)
      if (next.has(tension)) next.delete(tension)
      else next.add(tension)

      // Recalcular notas com tensões
      const baseIntervals = [...(PRESETS[lastPreset] || [])]
      next.forEach(t => {
        const interval = TENSION_INTERVALS[t]
        if (interval !== undefined && !baseIntervals.includes(interval % 12)) {
          baseIntervals.push(interval % 12)
        }
      })

      const generatedNotes = generateFretboardNotes(rootNote, baseIntervals, fretCount)
      setNotes(generatedNotes)

      return next
    })
  }, [lastPreset, rootNote, fretCount])

  // ── Limpar tudo ──
  const handleClear = useCallback(() => {
    setNotes([])
    setLastPreset(null)
    setActiveTensions(new Set())
    setChordName('')
  }, [])

  // ── Salvar ──
  const handleSave = useCallback(async () => {
    if (!chordName.trim()) {
      toast.error('Informe o nome do acorde/escala')
      return
    }
    if (notes.length === 0) {
      toast.error('Adicione pelo menos uma nota no braço')
      return
    }

    setSaving(true)
    try {
      const positions: GuitarFretboardPositions = {
        format: 'fretboard_horizontal',
        notes,
        fretRange: [0, fretCount],
        tuning: GUITAR_TUNINGS.default,
      }

      const family = lastPreset ? (FAMILY_MAP[lastPreset] ?? null) : null
      const quality = lastPreset ? (QUALITY_MAP[lastPreset] ?? null) : null
      const tags = generateTags(lastPreset, difficulty)

      const data: GuitarChordData = {
        id: chord?.id,
        name: chordName.trim(),
        instrument: 'electric_guitar',
        positions,
        difficulty,
        tags,
        family: family ?? undefined,
        quality: quality ?? undefined,
        root_note: rootNote,
      }

      if (chord?.id) {
        // Atualizar existente
        await updateChord(chord.id, {
          name: data.name,
          instrument: 'electric_guitar' as any,
          positions: positions as any,
          difficulty,
          tags,
          family,
          quality,
          root_note: rootNote,
        })
        toast.success('Acorde/escala atualizado!')
      } else {
        // Criar novo
        await createChord({
          name: data.name,
          instrument: 'electric_guitar' as any,
          positions: positions as any,
          difficulty,
          tags,
          family,
          quality,
          root_note: rootNote,
        } as any)
        toast.success('Acorde/escala salvo na biblioteca!')
      }

      onSave?.(data)
      onOpenChange(false)
      window.dispatchEvent(new Event('chord-library-updated'))
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('23505') || msg.includes('409')) {
        toast.error('Já existe um registro com esse nome para guitarra')
      } else {
        toast.error('Erro ao salvar: ' + msg.slice(0, 80))
      }
    } finally {
      setSaving(false)
    }
  }, [chord, chordName, notes, difficulty, rootNote, lastPreset, fretCount, onSave, onOpenChange])

  // ── Excluir ──
  const handleDelete = useCallback(async () => {
    if (!chord?.id) return
    setDeleting(true)
    try {
      await deleteChord(chord.id)
      toast.success('Acorde/escala excluído')
      onOpenChange(false)
      window.dispatchEvent(new Event('chord-library-updated'))
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err?.message ?? '').slice(0, 80))
    } finally {
      setDeleting(false)
    }
  }, [chord, onOpenChange])

  // ── Info panel ──
  const uniqueNotes = useMemo(() => {
    const seen = new Set<string>()
    return notes.filter(n => {
      if (!n.note || seen.has(n.note)) return false
      seen.add(n.note)
      return true
    }).sort((a, b) => {
      const ai = NOTE_NAMES.indexOf(a.note!)
      const bi = NOTE_NAMES.indexOf(b.note!)
      return ai - bi
    })
  }, [notes])

  const fretRange = useMemo(() => {
    if (notes.length === 0) return [0, 0]
    const frets = notes.map(n => n.fret).filter(f => f > 0)
    if (frets.length === 0) return [0, 0]
    return [Math.min(...frets), Math.max(...frets)]
  }, [notes])

  // ── Tablatura simples ──
  const tabLines = useMemo(() => {
    if (!showTab || notes.length === 0) return null
    // 6 linhas: e, B, G, D, A, E (de cima pra baixo = agudo pra grave)
    const strings = [1, 2, 3, 4, 5, 6] // e, B, G, D, A, E
    const stringLabels = ['e', 'B', 'G', 'D', 'A', 'E']
    const maxFret = Math.max(...notes.map(n => n.fret), 12)

    return strings.map((s, si) => {
      const stringNotes = notes.filter(n => n.string === s).sort((a, b) => a.fret - b.fret)
      const fretNumbers = stringNotes.map(n => String(n.fret))
      return {
        label: stringLabels[si],
        frets: fretNumbers,
      }
    })
  }, [showTab, notes])

  // Variáveis para tensões
  const tensionEnabled = !!lastPreset && !lastPreset.includes('scale') && !lastPreset.startsWith('penta') && lastPreset !== 'blues'

  // ── Handler de clique direito no fretboard ──
  const handleFretboardContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setPopover(null)

    // Encontrar qual nota SVG foi clicada
    const target = e.target as Element
    const dotGroup = target.closest('g.dot')
    if (!dotGroup) return

    // Extrair string e fret do className: "dot dot-string-X dot-fret-Y ..."
    const cls = dotGroup.getAttribute('class') || ''
    const stringMatch = cls.match(/dot-string-(\d+)/)
    const fretMatch = cls.match(/dot-fret-(\d+)/)
    if (!stringMatch || !fretMatch) return

    const s = parseInt(stringMatch[1])
    const f = parseInt(fretMatch[1])

    // Encontrar índice no array de notas
    const idx = notes.findIndex(n => n.string === s && n.fret === f)
    if (idx < 0) return

    // Posição do popover relativa ao container do fretboard
    const containerRect = fretboardRef.current?.getBoundingClientRect()
    if (!containerRect) return

    setPopover({
      noteIdx: idx,
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top - 40,
    })
  }, [notes])

  // ── Atualizar valor da nota no popover ──
  const handlePopoverEdit = useCallback((value: number | string) => {
    if (popover === null) return
    setNotes(prev => {
      const updated = [...prev]
      const note = { ...updated[popover.noteIdx] }
      if (dotLabel === 'finger') {
        note.finger = typeof value === 'number' ? value : parseInt(String(value))
      } else if (dotLabel === 'degree') {
        note.degree = typeof value === 'number' ? value : parseInt(String(value))
      }
      updated[popover.noteIdx] = note
      return updated
    })
    setPopover(null)
  }, [popover, dotLabel])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[1100px] max-h-[95vh] overflow-y-auto bg-surface border-border"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            {chord?.id ? 'Editar' : 'Novo'} <span className="text-accent">Guitarra</span>
          </DialogTitle>
        </DialogHeader>

        {/* ── TOOLBAR ── */}
        <div className="space-y-2 mt-2">
          {/* Linha 1: Fundamental + Modo + Casas */}
          <div className="flex gap-2 items-center flex-wrap rounded-xl border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-[1px] font-bold text-muted-foreground">Fundamental</span>
              <Select value={rootNote} onValueChange={v => { setRootNote(v); if (lastPreset) handleLoadPreset(lastPreset) }}>
                <SelectTrigger className="h-7 w-[72px] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_NAMES.map(n => (
                    <SelectItem key={n} value={n} className="text-[11px]">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-px h-5 bg-border mx-1" />

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-[1px] font-bold text-muted-foreground">Modo</span>
              <Select value={mode} onValueChange={v => setMode(v as EditorMode)}>
                <SelectTrigger className="h-7 w-[90px] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chord" className="text-[11px]">Acorde</SelectItem>
                  <SelectItem value="scale" className="text-[11px]">Escala</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-px h-5 bg-border mx-1" />

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-[1px] font-bold text-muted-foreground">Casas</span>
              <Select value={String(fretCount)} onValueChange={v => setFretCount(Number(v))}>
                <SelectTrigger className="h-7 w-[68px] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[12, 15, 17, 19, 22].map(n => (
                    <SelectItem key={n} value={String(n)} className="text-[11px]">{n} casas</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-px h-5 bg-border mx-1" />

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-[1px] font-bold text-muted-foreground">Exibir</span>
              <Select value={dotLabel} onValueChange={v => setDotLabel(v as any)}>
                <SelectTrigger className="h-7 w-[80px] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note" className="text-[11px]">Nota</SelectItem>
                  <SelectItem value="degree" className="text-[11px]">Grau</SelectItem>
                  <SelectItem value="finger" className="text-[11px]">Digitação</SelectItem>
                  <SelectItem value="none" className="text-[11px]">Nenhum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <button
              onClick={handleClear}
              className="text-[11px] text-muted-foreground hover:text-vermelho transition-colors flex items-center gap-1"
            >
              <Eraser size={13} /> Limpar
            </button>
          </div>

          {/* Linha 2: Presets Acordes (quando modo = chord) */}
          {mode === 'chord' && (
            <div className="flex gap-2 items-stretch flex-wrap">
              {/* Tríades */}
              <div className="flex gap-[4px] items-center rounded-lg px-3 py-[6px] bg-muted/60">
                <span className="text-[9px] uppercase tracking-[1px] font-bold whitespace-nowrap mr-[3px] text-muted-foreground">Tríades</span>
                {['major', 'minor', 'dim', 'aug', 'sus2', 'sus4', 'add9'].map(p => (
                  <button
                    key={p}
                    onClick={() => handleLoadPreset(p)}
                    className={`h-7 px-2.5 rounded-md border text-[11px] whitespace-nowrap transition-all duration-150 flex items-center justify-center font-[DM_Sans,sans-serif] cursor-pointer ${
                      lastPreset === p
                        ? 'border-accent bg-accent text-white font-semibold'
                        : 'border-border text-muted-foreground hover:border-accent hover:text-accent font-normal'
                    }`}
                  >
                    {PRESET_LABELS[p]}
                  </button>
                ))}
              </div>

              {/* Tétrades */}
              <div className="flex gap-[4px] items-center rounded-lg px-3 py-[6px] bg-muted/60">
                <span className="text-[9px] uppercase tracking-[1px] font-bold whitespace-nowrap mr-[3px] text-muted-foreground">Tétrades</span>
                {['7', 'm7', 'maj7', 'dim7', 'm7b5', '6', 'm6', 'mmaj7'].map(p => (
                  <button
                    key={p}
                    onClick={() => handleLoadPreset(p)}
                    className={`h-7 px-2.5 rounded-md border text-[11px] whitespace-nowrap transition-all duration-150 flex items-center justify-center font-[DM_Sans,sans-serif] cursor-pointer ${
                      lastPreset === p
                        ? 'border-accent bg-accent text-white font-semibold'
                        : 'border-border text-muted-foreground hover:border-accent hover:text-accent font-normal'
                    }`}
                  >
                    {PRESET_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Linha 3: Tensões (quando modo = chord) */}
          {mode === 'chord' && (() => {
            return (
              <div className="flex gap-2 items-stretch flex-wrap">
                <div className={`flex gap-[4px] items-center rounded-lg px-3 py-[6px] bg-muted/60 transition-opacity duration-200 ${tensionEnabled ? 'opacity-100' : 'opacity-30'}`}>
                  <span className="text-[9px] uppercase tracking-[1px] font-bold whitespace-nowrap mr-[3px] text-muted-foreground">Tensões</span>
                  {!lastPreset && (
                    <span className="text-[10px] text-muted-foreground/60 italic mr-1">Selecione um acorde base</span>
                  )}
                  {ALL_TENSIONS.map(t => {
                    const isActive = activeTensions.has(t)
                    const isDisabled = !tensionEnabled
                    return (
                      <button
                        key={t}
                        onClick={() => !isDisabled && handleToggleTension(t)}
                        disabled={isDisabled}
                        className={`h-7 px-2 rounded-md border text-[11px] whitespace-nowrap transition-all duration-150 flex items-center justify-center font-[DM_Mono,monospace] ${
                          isActive
                            ? 'border-violet-500 bg-violet-500 text-white font-semibold'
                            : isDisabled
                              ? 'border-border text-muted-foreground/50 cursor-not-allowed'
                              : 'border-border text-muted-foreground hover:border-violet-500 hover:text-violet-500 cursor-pointer font-normal'
                        }`}
                      >
                        {TENSION_LABELS[t]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Linha 4: Presets Escalas (quando modo = scale) */}
          {mode === 'scale' && (
            <div className="flex gap-2 items-stretch flex-wrap">
              <div className="flex gap-[4px] items-center rounded-lg px-3 py-[6px] bg-muted/60">
                <span className="text-[9px] uppercase tracking-[1px] font-bold whitespace-nowrap mr-[3px] text-muted-foreground">Escalas</span>
                {['major_scale', 'minor_scale', 'harmonic_minor_scale', 'melodic_minor_scale', 'penta_major', 'penta_minor', 'blues'].map(p => (
                  <button
                    key={p}
                    onClick={() => handleLoadPreset(p)}
                    className={`h-7 px-2.5 rounded-md border text-[11px] whitespace-nowrap transition-all duration-150 flex items-center justify-center font-[DM_Sans,sans-serif] cursor-pointer ${
                      lastPreset === p
                        ? 'border-accent bg-accent text-white font-semibold'
                        : 'border-border text-muted-foreground hover:border-accent hover:text-accent font-normal'
                    }`}
                  >
                    {PRESET_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Linha 5: Ferramentas */}
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => setRootMode(prev => !prev)}
              className={`h-7 px-2.5 rounded-md border text-[11px] whitespace-nowrap transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                rootMode
                  ? 'border-orange-500 bg-orange-500 text-white font-semibold'
                  : 'border-border text-muted-foreground hover:border-orange-500 hover:text-orange-500 font-normal'
              }`}
            >
              <Crosshair size={13} /> Tônica
            </button>

            <button
              onClick={() => setShowTab(prev => !prev)}
              className={`h-7 px-2.5 rounded-md border text-[11px] whitespace-nowrap transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                showTab
                  ? 'border-accent bg-accent text-white font-semibold'
                  : 'border-border text-muted-foreground hover:border-accent hover:text-accent font-normal'
              }`}
            >
              <ListNumbers size={13} /> Tablatura
            </button>
          </div>
        </div>

        {/* ── BRAÇO HORIZONTAL ── */}
        <div ref={fretboardCardRef} className="mt-3 rounded-xl border border-border bg-card p-4 relative">
          <div className="overflow-x-auto">
            <div
              ref={fretboardRef}
              className="min-w-[900px] [&_svg]:w-full [&_svg]:h-auto [&_.dot-text]:fill-white"
              onContextMenu={handleOverlayContextMenu}
            />
          </div>

          {/* Popover de edição (clique direito) */}
          {popover !== null && (
            <>
              <div
                className="fixed inset-0 z-[199]"
                onMouseDown={() => setPopover(null)}
              />
              <div
                className="absolute z-[200] flex gap-[3px] p-[5px] rounded-xl border-2 border-accent bg-surface shadow-2xl"
                style={{ left: popover.x, top: popover.y, transform: 'translate(-50%, -100%) translateY(-12px)' }}
              >
                {dotLabel === 'finger' && (
                  [1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handlePopoverEdit(n)}
                      className={`w-[30px] h-[30px] rounded-full border-2 border-accent font-bold text-[13px] transition-all cursor-pointer select-none ${
                        notes[popover.noteIdx]?.finger === n
                          ? 'bg-accent text-white'
                          : 'bg-transparent text-accent hover:bg-accent hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))
                )}
                {dotLabel === 'degree' && (
                  [1, 2, 3, 4, 5, 6, 7].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handlePopoverEdit(n)}
                      className={`w-[28px] h-[28px] rounded-full border-2 border-accent font-bold text-[12px] transition-all cursor-pointer select-none ${
                        notes[popover.noteIdx]?.degree === n
                          ? 'bg-accent text-white'
                          : 'bg-transparent text-accent hover:bg-accent hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))
                )}
                {dotLabel === 'note' && (
                  <div className="flex flex-wrap gap-[3px] max-w-[200px]">
                    {NOTE_NAMES.map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          if (popover === null) return
                          setNotes(prev => {
                            const updated = [...prev]
                            updated[popover.noteIdx] = { ...updated[popover.noteIdx], note: n }
                            return updated
                          })
                          setPopover(null)
                        }}
                        className={`px-2 py-1 rounded-lg border border-accent font-bold text-[11px] transition-all cursor-pointer select-none ${
                          notes[popover.noteIdx]?.note === n
                            ? 'bg-accent text-white'
                            : 'bg-transparent text-accent hover:bg-accent hover:text-white'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                {dotLabel === 'none' && (
                  <span className="text-[11px] text-muted-foreground px-2 py-1">Selecione um modo em Exibir</span>
                )}
              </div>
            </>
          )}

          {/* Legenda */}
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.dotFill }} />
              <span>Nota</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.rootFill }} />
              <span>Tônica</span>
            </div>
            <span className="ml-auto">
              <span className="text-accent font-semibold">Clique</span> = adicionar/remover nota · <span className="text-accent font-semibold">Clique direito</span> na nota = editar
            </span>
          </div>
        </div>

        {/* ── TABLATURA (toggle) ── */}
        {showTab && notes.length > 0 && tabLines && (
          <div className="mt-2 rounded-xl border border-border bg-card p-4 overflow-x-auto">
            <div className="text-[9px] uppercase tracking-[1px] font-bold text-muted-foreground mb-2">Tablatura</div>
            <div className="font-mono text-[12px] leading-[1.8] text-text">
              {tabLines.map((line, i) => (
                <div key={i} className="flex items-center gap-0">
                  <span className="w-4 text-muted-foreground text-right mr-1">{line.label}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="tracking-wider">
                    {line.frets.length > 0
                      ? line.frets.map((f, fi) => (
                          <span key={fi} className="inline-block w-6 text-center text-accent font-semibold">{f}</span>
                        ))
                      : <span className="text-muted-foreground/40">{'─'.repeat(20)}</span>
                    }
                  </span>
                  <span className="text-muted-foreground">|</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INFO PANEL ── */}
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-[9px] uppercase tracking-[1px] font-bold text-muted-foreground mb-1.5">Informações</div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notas</span>
                <span className="font-semibold text-text">{notes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notas únicas</span>
                <span className="font-semibold text-text">{uniqueNotes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trastes</span>
                <span className="font-semibold text-text">{fretRange[0]}–{fretRange[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tônica</span>
                <span className="font-semibold text-text">{rootNote}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 col-span-2">
            <div className="text-[9px] uppercase tracking-[1px] font-bold text-muted-foreground mb-1.5">Notas no braço</div>
            <div className="flex flex-wrap gap-1.5">
              {uniqueNotes.map((n, i) => (
                <Badge
                  key={i}
                  variant={n.isRoot ? 'default' : 'outline'}
                  className={`text-[10px] ${n.isRoot ? 'bg-orange-500 text-white border-orange-500' : ''}`}
                >
                  {n.degree ? `${n.degree}·` : ''}{n.note}
                  {n.note && NOTE_NAMES_PT[NOTE_NAMES.indexOf(n.note)] ? (
                    <span className="text-[8px] opacity-60 ml-0.5">({NOTE_NAMES_PT[NOTE_NAMES.indexOf(n.note!)]})</span>
                  ) : null}
                </Badge>
              ))}
              {uniqueNotes.length === 0 && (
                <span className="text-[10px] text-muted-foreground/60 italic">Nenhuma nota selecionada</span>
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER: Nome + Dificuldade + Ações ── */}
        <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border">
          {/* Excluir */}
          {chord?.id && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-[12px] text-vermelho hover:underline flex items-center gap-1 cursor-pointer">
                  <Trash size={14} /> Excluir
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-surface border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir "{chordName}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O acorde/escala será removido permanentemente da biblioteca.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-vermelho hover:bg-vermelho/90"
                  >
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <div className="flex-1" />

          {/* Nome do acorde */}
          <div className="flex items-center gap-1.5">
            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Nome</Label>
            <Input
              value={chordName}
              onChange={e => setChordName(e.target.value)}
              placeholder="Ex: C Maior, Am Pentatônica"
              className="h-8 w-[200px] text-[12px]"
            />
          </div>

          {/* Dificuldade */}
          <div className="flex items-center gap-1.5">
            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Dificuldade</Label>
            <Select value={String(difficulty)} onValueChange={v => setDifficulty(Number(v))}>
              <SelectTrigger className="h-8 w-[60px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(n => (
                  <SelectItem key={n} value={String(n)} className="text-[11px]">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <FloppyDisk size={15} />
            {saving ? 'Salvando...' : chord?.id ? 'Atualizar' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GuitarFretboardEditor
