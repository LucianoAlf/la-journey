import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { FloppyDisk, Trash, X, ArrowCounterClockwise, ArrowClockwise, Timer, ArrowUp, ArrowDown, Play, Pause, Export, MusicNote, PianoKeys } from '@phosphor-icons/react'
import * as Tone from 'tone'
import MidiWriter from 'midi-writer-js'
import { AlphaTabViewer } from './AlphaTabViewer'
import { NotationSvgEditor, type Beat as SvgBeat, type BeatDuration, type PitchData } from './NotationSvgEditor'
import type { Beat as AlphaTexBeat } from '@/lib/beatsToAlphaTex'
import { beatsToAlphaTexWithMap } from '@/lib/beatsToAlphaTex'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { createNotation, updateNotation, deleteNotation, type NotationLibraryRow } from '@/services/notationService'
import { getEditorTimeSignature, normalizeTimeSignature } from '@/lib/timeSignature'

// ─── Re-export tipos do NotationSvgEditor ───────────────────────────
export type { BeatDuration, PitchData }
export type Beat = SvgBeat

// ─── Durações ───────────────────────────────────────────────────────

const DURATION_OPTIONS: { value: BeatDuration; label: string; symbol: string; beats: number; key: string }[] = [
  { value: 'w', label: 'Semibreve', symbol: '𝅝', beats: 4, key: '7' },
  { value: 'h', label: 'Mínima', symbol: '𝅗𝅥', beats: 2, key: '6' },
  { value: 'q', label: 'Semínima', symbol: '♩', beats: 1, key: '5' },
  { value: '8', label: 'Colcheia', symbol: '♪', beats: 0.5, key: '4' },
  { value: '16', label: 'Semicolcheia', symbol: '𝅘𝅥𝅯', beats: 0.25, key: '3' },
  { value: '32', label: 'Fusa', symbol: '𝅘𝅥𝅰', beats: 0.125, key: '2' },
  { value: '64', label: 'Semifusa', symbol: '𝅘𝅥𝅱', beats: 0.0625, key: '1' },
]

const DURATION_BEATS: Record<BeatDuration, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125, '64': 0.0625 }

// ─── Claves ─────────────────────────────────────────────────────────

const CLEF_OPTIONS = [
  { value: 'treble', label: 'Sol (Treble)' },
  { value: 'bass', label: 'Fá (Bass)' },
  { value: 'alto', label: 'Dó (Alto)' },
  { value: 'percussion', label: 'Percussão' },
]

// ─── Armaduras ──────────────────────────────────────────────────────

const KEY_SIGNATURE_OPTIONS = [
  { value: 'C', label: 'C / Am (sem alteração)' },
  { value: 'G', label: 'G / Em (1♯)' },
  { value: 'D', label: 'D / Bm (2♯)' },
  { value: 'A', label: 'A / F♯m (3♯)' },
  { value: 'E', label: 'E / C♯m (4♯)' },
  { value: 'B', label: 'B / G♯m (5♯)' },
  { value: 'F#', label: 'F♯ / D♯m (6♯)' },
  { value: 'F', label: 'F / Dm (1♭)' },
  { value: 'Bb', label: 'B♭ / Gm (2♭)' },
  { value: 'Eb', label: 'E♭ / Cm (3♭)' },
  { value: 'Ab', label: 'A♭ / Fm (4♭)' },
  { value: 'Db', label: 'D♭ / B♭m (5♭)' },
  { value: 'Gb', label: 'G♭ / E♭m (6♭)' },
]

// ─── Fórmulas de compasso ───────────────────────────────────────────

const TIME_SIGNATURE_OPTIONS = [
  { value: 'free', label: 'Livre (sem compasso)' },
  { value: '2/4', label: '2/4' },
  { value: '3/4', label: '3/4 — Valsa' },
  { value: '4/4', label: '4/4 — Quaternário' },
  { value: '5/4', label: '5/4' },
  { value: '6/4', label: '6/4' },
  { value: '6/8', label: '6/8 — Balada' },
  { value: '9/8', label: '9/8' },
  { value: '12/8', label: '12/8 — Blues' },
]

// ─── Categorias ─────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'Escala', label: 'Escala' },
  { value: 'Arpejo', label: 'Arpejo' },
  { value: 'Acorde', label: 'Acorde' },
  { value: 'Intervalo', label: 'Intervalo' },
  { value: 'Ritmo', label: 'Ritmo' },
  { value: 'Exercício', label: 'Exercício' },
  { value: 'Melodia', label: 'Melodia' },
  { value: 'Outro', label: 'Outro' },
]

// ─── Quiálteras/Tuplets ─────────────────────────────────────────────

const TUPLET_OPTIONS = [
  { value: 'none', label: 'Sem quiáltera', numNotes: 0, notesOccupied: 0 },
  { value: '3:2', label: 'Tercina (3:2)', numNotes: 3, notesOccupied: 2 },
  { value: '5:4', label: 'Quintina (5:4)', numNotes: 5, notesOccupied: 4 },
  { value: '6:4', label: 'Sextina (6:4)', numNotes: 6, notesOccupied: 4 },
  { value: '7:4', label: 'Septina (7:4)', numNotes: 7, notesOccupied: 4 },
]

// ─── Helpers ────────────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

function getPitchLetterIndex(noteName: string): number {
  return NOTE_NAMES.indexOf(noteName.charAt(0).toUpperCase())
}

function getSmartOctave(noteName: string, lastPitch: string | null, clef: string): number {
  const defaultOctave = clef === 'bass' ? 3 : 4
  if (!lastPitch) return defaultOctave

  const [lastNotePart, lastOctStr] = lastPitch.split('/')
  const lastOctave = parseInt(lastOctStr, 10)
  const lastNoteIdx = getPitchLetterIndex(lastNotePart)
  const newNoteIdx = getPitchLetterIndex(noteName)

  if (lastNoteIdx < 0 || newNoteIdx < 0) return defaultOctave

  // Escolher oitava mais próxima
  const diff = newNoteIdx - lastNoteIdx
  if (diff > 3) return lastOctave - 1
  if (diff < -3) return lastOctave + 1
  return lastOctave
}

function getBeatDuration(beat: Beat): number {
  let dur = DURATION_BEATS[beat.duration] || 1
  if (beat.dotted) dur *= 1.5
  if (beat.doubleDotted) dur *= 1.75
  if (beat.tuplet) dur *= beat.tuplet.notesOccupied / beat.tuplet.numNotes
  return dur
}

function normalizeLegacyBeats(rawBeats: any[]): SvgBeat[] {
  return rawBeats
    .map((rawBeat): SvgBeat | null => {
      if (!rawBeat || typeof rawBeat !== 'object') return null

      const legacyNotes = Array.isArray(rawBeat.notes) ? rawBeat.notes : []
      const legacyAccidentals = Array.isArray(rawBeat.accidentals) ? rawBeat.accidentals : []

      let pitches: PitchData[] = []
      if (Array.isArray(rawBeat.pitches)) {
        pitches = rawBeat.pitches
          .map((p: any) => ({ pitch: String(p?.pitch ?? ''), accidental: p?.accidental ?? undefined }))
          .filter((p: PitchData) => p.pitch.includes('/'))
      } else {
        pitches = legacyNotes
          .map((entry: any, i: number) => {
            const noteText = typeof entry === 'string'
              ? entry
              : typeof entry?.key === 'string'
                ? entry.key
                : ''
            const pitch = noteText.split(':')[0]
            if (!pitch.includes('/')) return null
            const accidental = legacyAccidentals[i] ?? null
            return { pitch, accidental: accidental ?? undefined }
          })
          .filter((p: PitchData | null): p is PitchData => p !== null)
      }

      const rawDurationFromNotes = typeof legacyNotes[0] === 'string'
        ? String(legacyNotes[0]).split(':')[1] ?? 'q'
        : 'q'

      const rawDuration = String(rawBeat.duration ?? rawDurationFromNotes ?? 'q')
      const doubleDotted = Boolean(rawBeat.doubleDotted) || rawDuration.includes('dd')
      const dotted = doubleDotted ? false : (Boolean(rawBeat.dotted) || rawDuration.includes('d'))
      const duration = rawDuration.replace(/dd|d|r/g, '') as BeatDuration
      const safeDuration: BeatDuration = (['w', 'h', 'q', '8', '16', '32', '64'] as string[]).includes(duration)
        ? duration
        : 'q'

      const isRest = Boolean(rawBeat.isRest) || rawDuration.includes('r') || pitches.length === 0

      return {
        pitches,
        duration: safeDuration,
        isRest,
        dotted,
        doubleDotted,
        tieToNext: Boolean(rawBeat.tieToNext ?? rawBeat.tie),
        articulations: Array.isArray(rawBeat.articulations) ? rawBeat.articulations : undefined,
        dynamics: rawBeat.dynamics ?? rawBeat.dynamic,
        lyric: typeof rawBeat.lyric === 'string' ? rawBeat.lyric : undefined,
        staff: rawBeat.staff === 'bass' ? 'bass' : rawBeat.staff === 'treble' ? 'treble' : undefined,
        tuplet: rawBeat.tuplet,
        timeSlot: Number.isFinite(rawBeat.timeSlot) ? rawBeat.timeSlot : undefined,
      }
    })
    .filter((beat): beat is SvgBeat => beat !== null)
}

function computeBarlines(beats: Beat[], timeSignature: string, grandStaffMode = false): number[] {
  if (timeSignature === 'free' || !timeSignature) return []
  const [num, den] = timeSignature.split('/').map(Number)
  if (!num || !den) return []
  const beatsPerBar = num * (4 / den)

  if (grandStaffMode) {
    const slotMap = new Map<number, { duration: number; indices: number[] }>()

    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i]
      const slot = beat.timeSlot ?? i
      const entry = slotMap.get(slot) ?? { duration: 0, indices: [] }
      entry.duration = Math.max(entry.duration, getBeatDuration(beat))
      entry.indices.push(i)
      slotMap.set(slot, entry)
    }

    const sortedSlots = Array.from(slotMap.keys()).sort((a, b) => a - b)
    const barlines: number[] = []
    let accumulated = 0

    for (const slot of sortedSlots) {
      const entry = slotMap.get(slot)
      if (!entry) continue
      accumulated += entry.duration
      if (accumulated >= beatsPerBar - 0.001) {
        if (slot !== sortedSlots[sortedSlots.length - 1]) {
          barlines.push(Math.max(...entry.indices))
        }
        accumulated -= beatsPerBar
      }
    }

    return barlines
  }

  const barlines: number[] = []
  let accumulated = 0

  for (let i = 0; i < beats.length; i++) {
    accumulated += getBeatDuration(beats[i])
    if (accumulated >= beatsPerBar - 0.001) {
      if (i < beats.length - 1) barlines.push(i)
      accumulated -= beatsPerBar
    }
  }

  return barlines
}

// ─── Props ──────────────────────────────────────────────────────────

export interface NotationEditorV2Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  notation?: NotationLibraryRow | null
  onSave?: (notation: NotationLibraryRow) => void
  onDelete?: (id: string) => void
  onSaveDraft?: (notation: NotationEditorDraft) => Promise<void> | void
  onDeleteDraft?: (id: string) => Promise<void> | void
}

export interface NotationEditorDraft {
  id?: string
  name: string
  category: string
  clef: string
  key_signature: string
  time_signature: string | null
  notation_data: any
  description?: string | null
  difficulty: number
  tags: string[]
}

// ─── Componente Principal ───────────────────────────────────────────

export function NotationEditorV2({
  open,
  onOpenChange,
  notation,
  onSave,
  onDelete,
  onSaveDraft,
  onDeleteDraft,
}: NotationEditorV2Props) {
  const isEditing = !!notation

  // ─── Estado do editor ──────────────────────────────────────────────
  const [beats, setBeats] = useState<SvgBeat[]>([])
  const [selectedBeatIdx, setSelectedBeatIdx] = useState(-1)
  const [currentDuration, setCurrentDuration] = useState<BeatDuration>('q')
  const [currentAccidental, setCurrentAccidental] = useState<string | null>(null)
  const [isInputMode, setIsInputMode] = useState(true)
  const [clef, setClef] = useState('treble')
  const [keySignature, setKeySignature] = useState('C')
  const [timeSignature, setTimeSignature] = useState<string>('free')
  const [bpm, setBpm] = useState(120)
  const [dotted, setDotted] = useState(false)
  const [doubleDotted, setDoubleDotted] = useState(false)
  const [grandStaffMode, setGrandStaffMode] = useState(false)
  const [activeStaff, setActiveStaff] = useState<'treble' | 'bass'>('treble')
  const [currentTuplet, setCurrentTuplet] = useState<string>('none')
  const tupletCounterRef = useRef(0)
  const tupletGroupIdRef = useRef('')

  // Metadados
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('Escala')
  const [difficulty, setDifficulty] = useState(1)

  // AlphaTex gerado
  const [alphaTex, setAlphaTex] = useState('')
  const [alphaTabIndexMap, setAlphaTabIndexMap] = useState<number[]>([])
  const [hoveredSvgPos, setHoveredSvgPos] = useState<{ beatIdx: number; pitch: string } | null>(null)

  // Undo/redo
  const [history, setHistory] = useState<SvgBeat[][]>([[]])
  const [historyIdx, setHistoryIdx] = useState(0)

  // Playback
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingBeatIdx, setPlayingBeatIdx] = useState(-1)
  const playbackRef = useRef<{ stop: () => void } | null>(null)

  // Refs
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const lastPitchRef = useRef<string | null>(null)

  // Saving state
  const [isSaving, setIsSaving] = useState(false)

  // ─── Carregar dados ao abrir ───────────────────────────────────────
  useEffect(() => {
    if (!open) return

    if (notation) {
      // Carregar dados existentes
      const data = notation.notation_data as any
      if (data?.beats && Array.isArray(data.beats)) {
        const normalizedBeats = normalizeLegacyBeats(data.beats)
        setBeats(normalizedBeats)
        setHistory([normalizedBeats])
        setHistoryIdx(0)
      } else {
        setBeats([])
        setHistory([[]])
        setHistoryIdx(0)
      }
      setClef(data?.clef || notation.clef || 'treble')
      setKeySignature(data?.keySignature || notation.key_signature || 'C')
      setTimeSignature(getEditorTimeSignature(data?.timeSignature, notation.time_signature))
      setBpm(data?.bpm || 120)
      setGrandStaffMode(data?.grandStaff || false)
      setLabel(notation.name || '')
      setCategory(notation.category || 'Escala')
      setDifficulty(notation.difficulty || 1)
    } else {
      // Novo — estado limpo
      setBeats([])
      setHistory([[]])
      setHistoryIdx(0)
      setClef('treble')
      setKeySignature('C')
      setTimeSignature('free')
      setBpm(120)
      setGrandStaffMode(false)
      setLabel('')
      setCategory('Escala')
      setDifficulty(1)
    }

    setSelectedBeatIdx(-1)
    setCurrentDuration('q')
    setCurrentAccidental(null)
    setIsInputMode(true)
    setDotted(false)
    setDoubleDotted(false)
    setActiveStaff('treble')
    lastPitchRef.current = null
  }, [open, notation])

  // ─── Converter beats → AlphaTex ────────────────────────────────────
  useEffect(() => {
    if (beats.length === 0) {
      setAlphaTex('')
      setAlphaTabIndexMap([])
      return
    }

    // Calcular barlines para sincronizar com AlphaTab
    const computedBarlines = computeBarlines(beats, timeSignature, grandStaffMode)
    const barlineSlotSet = new Set<number>(
      computedBarlines.map(idx => beats[idx]?.timeSlot ?? idx),
    )
    
    // Converter SvgBeat[] → AlphaTexBeat[] para o conversor
    const alphaTexBeats: AlphaTexBeat[] = beats.map((b, idx) => ({
      pitches: b.pitches.map(p => ({ pitch: p.pitch, accidental: p.accidental ?? null })),
      duration: b.duration,
      tie: b.tieToNext ?? false,
      isRest: b.isRest,
      dotted: b.dotted ?? false,
      doubleDotted: b.doubleDotted,
      articulations: b.articulations,
      tuplet: b.tuplet,
      cifra: null,
      annotation: null,
      lyric: null,
      staff: b.staff,
      timeSlot: b.timeSlot,
      barAfter: grandStaffMode
        ? barlineSlotSet.has(b.timeSlot ?? idx)
        : computedBarlines.includes(idx), // Sincronizar barlines
    }))
    const result = beatsToAlphaTexWithMap(alphaTexBeats, {
      clef,
      keySignature,
      timeSignature: timeSignature !== 'free' ? timeSignature : null,
      grandStaff: grandStaffMode,
      bpm,
      includeLyrics: false, // Não mostrar nomes de notas/sílabas no preview
    })
    setAlphaTex(result.tex)
    setAlphaTabIndexMap(result.indexMap)
  }, [beats, clef, keySignature, timeSignature, grandStaffMode, bpm])

  // ─── Barlines calculadas ───────────────────────────────────────────
  const barlines = useMemo(
    () => computeBarlines(beats, timeSignature, grandStaffMode),
    [beats, timeSignature, grandStaffMode],
  )

  // ─── Undo/Redo ─────────────────────────────────────────────────────
  const pushHistory = useCallback((newBeats: SvgBeat[]) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIdx + 1)
      return [...trimmed, newBeats].slice(-50) // Manter últimos 50
    })
    setHistoryIdx(prev => Math.min(prev + 1, 49))
  }, [historyIdx])

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      setHistoryIdx(prev => prev - 1)
      setBeats(history[historyIdx - 1])
    }
  }, [historyIdx, history])

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(prev => prev + 1)
      setBeats(history[historyIdx + 1])
    }
  }, [historyIdx, history])

  // ─── Focar hidden input (só quando o usuário clica no editor) ──────
  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      const input = hiddenInputRef.current
      if (!input) return
      input.focus({ preventScroll: true })
      input.select()
    })
  }, [])

  // ─── Callbacks do NotationSvgEditor ────────────────────────────────

  const handleSelectBeat = useCallback((idx: number) => {
    setSelectedBeatIdx(idx)
    if (idx >= 0 && idx < beats.length) {
      const beat = beats[idx]
      if (grandStaffMode) {
        setActiveStaff(beat.staff ?? 'treble')
      }
      if (!beat.isRest && beat.pitches.length > 0) {
        lastPitchRef.current = beat.pitches[0].pitch
      }
    }
    focusInput()
  }, [beats, focusInput, grandStaffMode])

  const handleInsertNote = useCallback((pitch: string, afterIdx: number, staff?: 'treble' | 'bass', explicitTimeSlot?: number) => {
    // Se staff foi passado (clique no SVG), usa ele. Senão usa activeStaff (teclado)
    const effectiveStaff = staff ?? activeStaff
    
    // Calcular o timeSlot para a nova nota
    let nextTimeSlot = 0
    if (grandStaffMode) {
      // Filtrar apenas as notas da pauta atual para escrita independente
      const staffBeats = beats.filter(b => (b.staff ?? 'treble') === effectiveStaff)
      const selectedStaffBeat = afterIdx >= 0 && afterIdx < beats.length
        ? beats[afterIdx]
        : null
      
      // Encontrar o maior timeSlot desta pauta
      const maxStaffTimeSlot = staffBeats.length > 0 
        ? staffBeats.reduce((max, b) => Math.max(max, b.timeSlot ?? 0), -1)
        : -1
      
      // Se foi passado um timeSlot explícito (clique na posição de outra nota), usar ele
      if (explicitTimeSlot !== undefined) {
        // Verificar se já existe nota desta pauta neste timeSlot
        const hasThisStaffAtSlot = beats.some(b => 
          (b.staff ?? 'treble') === effectiveStaff && b.timeSlot === explicitTimeSlot
        )
        
        if (hasThisStaffAtSlot) {
          // Já existe nota desta pauta neste slot → criar novo slot após o maior desta pauta
          nextTimeSlot = maxStaffTimeSlot + 1
        } else {
          // Usar o timeSlot passado (alinhamento vertical com nota da outra pauta)
          nextTimeSlot = explicitTimeSlot
        }
      } else if (selectedStaffBeat && (selectedStaffBeat.staff ?? 'treble') === effectiveStaff) {
        const referenceSlot = selectedStaffBeat.timeSlot ?? 0
        nextTimeSlot = referenceSlot + 1
      } else {
        // Escrita independente: próximo slot desta pauta
        nextTimeSlot = maxStaffTimeSlot + 1
      }
    }
    
    const newBeat: Beat = {
      pitches: [{ pitch, accidental: currentAccidental || undefined }],
      duration: currentDuration,
      isRest: false,
      dotted,
      doubleDotted,
      staff: grandStaffMode ? effectiveStaff : undefined,
      timeSlot: grandStaffMode ? nextTimeSlot : undefined,
    }

    const newBeats = [...beats]
    
    if (grandStaffMode) {
      if (explicitTimeSlot === undefined) {
        for (let i = 0; i < newBeats.length; i++) {
          const b = newBeats[i]
          if ((b.staff ?? 'treble') === effectiveStaff && (b.timeSlot ?? 0) >= nextTimeSlot) {
            newBeats[i] = {
              ...b,
              timeSlot: (b.timeSlot ?? 0) + 1,
            }
          }
        }
      }

      // Inserir na posição correta mantendo ordenação por timeSlot
      // Treble vem antes de bass no mesmo timeSlot
      let insertIdx = 0
      for (let i = 0; i < newBeats.length; i++) {
        const b = newBeats[i]
        const bSlot = b.timeSlot ?? i
        const bStaff = b.staff ?? 'treble'
        
        if (bSlot < nextTimeSlot) {
          insertIdx = i + 1
        } else if (bSlot === nextTimeSlot) {
          // Mesmo slot: treble antes de bass
          if (bStaff === 'treble' && effectiveStaff === 'bass') {
            insertIdx = i + 1
          }
        }
      }
      newBeats.splice(insertIdx, 0, newBeat)
      setBeats(newBeats)
      pushHistory(newBeats)
      setSelectedBeatIdx(insertIdx)
    } else {
      const insertIdx = afterIdx + 1
      newBeats.splice(insertIdx, 0, newBeat)
      setBeats(newBeats)
      pushHistory(newBeats)
      setSelectedBeatIdx(insertIdx)
    }
    
    lastPitchRef.current = pitch
    
    // Manter a pauta ativa coerente com a inserção recém-feita
    if (grandStaffMode) {
      setActiveStaff(effectiveStaff)
    }
    
    focusInput()
  }, [beats, currentDuration, currentAccidental, dotted, doubleDotted, grandStaffMode, activeStaff, pushHistory, focusInput])

  const handleReplaceNote = useCallback((pitch: string, atIdx: number) => {
    if (atIdx < 0 || atIdx >= beats.length) return

    const newBeats = [...beats]
    newBeats[atIdx] = {
      ...newBeats[atIdx],
      pitches: [{ pitch, accidental: currentAccidental || undefined }],
      isRest: false,
    }

    setBeats(newBeats)
    pushHistory(newBeats)
    lastPitchRef.current = pitch
  }, [beats, currentAccidental, pushHistory])

  const handleDeleteBeat = useCallback((idx: number) => {
    if (idx < 0 || idx >= beats.length) return

    const newBeats = beats.filter((_, i) => i !== idx)
    setBeats(newBeats)
    pushHistory(newBeats)

    if (selectedBeatIdx >= newBeats.length) {
      setSelectedBeatIdx(newBeats.length - 1)
    } else if (selectedBeatIdx === idx && idx > 0) {
      setSelectedBeatIdx(idx - 1)
    }
  }, [beats, selectedBeatIdx, pushHistory])

  const handleUpdateBeat = useCallback((idx: number, updates: Partial<Beat>) => {
    if (idx < 0 || idx >= beats.length) return

    const newBeats = [...beats]
    newBeats[idx] = { ...newBeats[idx], ...updates }

    setBeats(newBeats)
    pushHistory(newBeats)
  }, [beats, pushHistory])

  const focusStaff = useCallback((staff: 'treble' | 'bass') => {
    setActiveStaff(staff)

    const lastBeatIdxOnStaff = [...beats].reduce((foundIdx, beat, idx) => {
      return (beat.staff ?? 'treble') === staff ? idx : foundIdx
    }, -1)

    setSelectedBeatIdx(lastBeatIdxOnStaff)

    if (lastBeatIdxOnStaff >= 0) {
      const beat = beats[lastBeatIdxOnStaff]
      if (!beat.isRest && beat.pitches.length > 0) {
        lastPitchRef.current = beat.pitches[0].pitch
      }
    } else {
      lastPitchRef.current = null
    }

    focusInput()
  }, [beats, focusInput])

  // ─── Transposição ────────────────────────────────────────────────────
  const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

  const transposePitch = useCallback((pitch: string, semitones: number): string => {
    const match = pitch.match(/^([A-G])([#b]?)\/(\d+)$/)
    if (!match) return pitch
    const [, note, acc, octStr] = match
    let octave = parseInt(octStr)

    // Converter para índice cromático
    let noteWithAcc = note + (acc || '')
    let idx = CHROMATIC_SCALE.indexOf(noteWithAcc)
    if (idx === -1) idx = CHROMATIC_FLAT.indexOf(noteWithAcc)
    if (idx === -1) idx = CHROMATIC_SCALE.indexOf(note) // fallback sem acidente

    // Transpor
    idx += semitones
    while (idx < 0) { idx += 12; octave-- }
    while (idx >= 12) { idx -= 12; octave++ }

    // Usar escala com sustenidos por padrão
    const newNote = CHROMATIC_SCALE[idx]
    return `${newNote}/${octave}`
  }, [])

  const handleTransposeUp = useCallback(() => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    const beat = beats[selectedBeatIdx]
    if (beat.isRest || beat.pitches.length === 0) return

    const newPitches = beat.pitches.map(p => ({
      ...p,
      pitch: transposePitch(p.pitch, 1),
      accidental: undefined, // Limpar acidente manual após transposição
    }))

    handleUpdateBeat(selectedBeatIdx, { pitches: newPitches })
    lastPitchRef.current = newPitches[0].pitch
  }, [beats, selectedBeatIdx, transposePitch, handleUpdateBeat])

  const handleTransposeDown = useCallback(() => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    const beat = beats[selectedBeatIdx]
    if (beat.isRest || beat.pitches.length === 0) return

    const newPitches = beat.pitches.map(p => ({
      ...p,
      pitch: transposePitch(p.pitch, -1),
      accidental: undefined,
    }))

    handleUpdateBeat(selectedBeatIdx, { pitches: newPitches })
    lastPitchRef.current = newPitches[0].pitch
  }, [beats, selectedBeatIdx, transposePitch, handleUpdateBeat])

  // ─── Teclado ───────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+Z = Undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault()
      undo()
      return
    }

    // Ctrl+Y = Redo
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault()
      redo()
      return
    }

    // N = Toggle modo input
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      setIsInputMode(prev => !prev)
      return
    }

    // Escape = Sair do modo input
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsInputMode(false)
      return
    }

    // 1-7 = Selecionar duração
    const durIdx = '1234567'.indexOf(e.key)
    if (durIdx >= 0) {
      e.preventDefault()
      const durOptions = ['64', '32', '16', '8', 'q', 'h', 'w'] as BeatDuration[]
      setCurrentDuration(durOptions[durIdx])
      // Se tem beat selecionado, aplicar duração
      if (selectedBeatIdx >= 0 && selectedBeatIdx < beats.length) {
        handleUpdateBeat(selectedBeatIdx, { duration: durOptions[durIdx] })
      }
      return
    }

    // . = Toggle ponto
    if (e.key === '.') {
      e.preventDefault()
      if (doubleDotted) {
        setDotted(false)
        setDoubleDotted(false)
      } else if (dotted) {
        setDotted(false)
        setDoubleDotted(true)
      } else {
        setDotted(true)
      }
      // Aplicar ao beat selecionado
      if (selectedBeatIdx >= 0 && selectedBeatIdx < beats.length) {
        const beat = beats[selectedBeatIdx]
        if (beat.doubleDotted) {
          handleUpdateBeat(selectedBeatIdx, { dotted: false, doubleDotted: false })
        } else if (beat.dotted) {
          handleUpdateBeat(selectedBeatIdx, { dotted: false, doubleDotted: true })
        } else {
          handleUpdateBeat(selectedBeatIdx, { dotted: true, doubleDotted: false })
        }
      }
      return
    }

    // 0 = Inserir pausa
    if (e.key === '0') {
      e.preventDefault()
      const newBeat: Beat = {
        pitches: [],
        duration: currentDuration,
        isRest: true,
        dotted,
        doubleDotted,
      }
      const insertIdx = selectedBeatIdx >= 0 ? selectedBeatIdx + 1 : beats.length
      const newBeats = [...beats]
      newBeats.splice(insertIdx, 0, newBeat)
      setBeats(newBeats)
      pushHistory(newBeats)
      setSelectedBeatIdx(insertIdx)
      return
    }

    // A-G = Inserir nota
    const noteKey = e.key.toUpperCase()
    if (NOTE_NAMES.includes(noteKey) && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      const inputClef = grandStaffMode && activeStaff === 'bass' ? 'bass' : clef
      const octave = getSmartOctave(noteKey, lastPitchRef.current, inputClef)
      const pitch = `${noteKey}/${octave}`

      const selectedBeat = selectedBeatIdx >= 0 && selectedBeatIdx < beats.length ? beats[selectedBeatIdx] : null
      const selectedBeatStaff = selectedBeat?.staff ?? 'treble'
      const selectedTimeSlot = selectedBeat?.timeSlot
      const activeStaffBeats = grandStaffMode
        ? beats
            .map((beat, idx) => ({ beat, idx }))
            .filter(({ beat }) => (beat.staff ?? 'treble') === activeStaff)
        : []
      const activeSelectedBeatIdx = grandStaffMode && selectedBeat && selectedBeatStaff !== activeStaff
        ? (
            activeStaffBeats
              .filter(({ beat }) => (beat.timeSlot ?? Number.MAX_SAFE_INTEGER) <= (selectedTimeSlot ?? Number.MAX_SAFE_INTEGER))
              .at(-1)?.idx
              ?? activeStaffBeats.at(-1)?.idx
              ?? -1
          )
        : selectedBeatIdx

      if (e.shiftKey && selectedBeatIdx >= 0 && selectedBeatIdx < beats.length) {
        // Shift+A-G = Adicionar ao acorde
        const beatIdxForChord = activeSelectedBeatIdx
        const beat = beatIdxForChord >= 0 ? beats[beatIdxForChord] : beats[selectedBeatIdx]
        // Na Grande Pauta, só adicionar ao acorde se a nota selecionada for da pauta ativa
        const beatStaff = beat.staff ?? 'treble'
        const canAddToChord = !grandStaffMode || beatStaff === activeStaff
        
        if (!beat.isRest && canAddToChord) {
          const newPitches = [...beat.pitches, { pitch, accidental: currentAccidental || undefined }]
          handleUpdateBeat(beatIdxForChord >= 0 ? beatIdxForChord : selectedBeatIdx, { pitches: newPitches })
          lastPitchRef.current = pitch
        } else if (grandStaffMode && beatStaff !== activeStaff) {
          // Se a nota selecionada é de outra pauta, inserir nova nota na pauta ativa
          const insertAfterIdx = activeSelectedBeatIdx >= 0 ? activeSelectedBeatIdx : beats.length - 1
          handleInsertNote(pitch, insertAfterIdx)
        }
      } else {
        // A-G = Inserir nova nota após a seleção atual
        // Sempre insere uma nova nota (não substitui)
        const insertAfterIdx = activeSelectedBeatIdx >= 0 ? activeSelectedBeatIdx : beats.length - 1
        handleInsertNote(pitch, insertAfterIdx)
      }
      return
    }

    // ← → = Navegar
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (selectedBeatIdx > 0) {
        setSelectedBeatIdx(selectedBeatIdx - 1)
      }
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (selectedBeatIdx < beats.length - 1) {
        setSelectedBeatIdx(selectedBeatIdx + 1)
      }
      return
    }

    // ↑ ↓ = Mover pitch (semitom ou oitava com Ctrl)
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && selectedBeatIdx >= 0) {
      e.preventDefault()
      const beat = beats[selectedBeatIdx]
      if (beat.isRest || beat.pitches.length === 0) return

      const direction = e.key === 'ArrowUp' ? 1 : -1
      const semitones = e.ctrlKey ? 12 : 1

      const newPitches = beat.pitches.map(pd => {
        const [notePart, octStr] = pd.pitch.split('/')
        let octave = parseInt(octStr, 10)
        let noteIdx = getPitchLetterIndex(notePart)

        if (e.ctrlKey) {
          // Mover oitava
          octave += direction
        } else {
          // Mover semitom (simplificado — só move nota diatônica)
          noteIdx += direction
          if (noteIdx > 6) { noteIdx = 0; octave++ }
          if (noteIdx < 0) { noteIdx = 6; octave-- }
        }

        return { ...pd, pitch: `${NOTE_NAMES[noteIdx]}/${octave}` }
      })

      handleUpdateBeat(selectedBeatIdx, { pitches: newPitches })
      if (newPitches.length > 0) {
        lastPitchRef.current = newPitches[0].pitch
      }
      return
    }

    // Delete = Apagar beat
    if (e.key === 'Delete') {
      e.preventDefault()
      if (selectedBeatIdx >= 0) {
        handleDeleteBeat(selectedBeatIdx)
      }
      return
    }

    // Backspace = Apagar e recuar
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (selectedBeatIdx > 0) {
        handleDeleteBeat(selectedBeatIdx)
        setSelectedBeatIdx(selectedBeatIdx - 1)
      } else if (selectedBeatIdx === 0 && beats.length > 0) {
        handleDeleteBeat(0)
      }
      return
    }

    // T = Toggle tie
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault()
      if (selectedBeatIdx >= 0 && selectedBeatIdx < beats.length - 1) {
        const beat = beats[selectedBeatIdx]
        handleUpdateBeat(selectedBeatIdx, { tieToNext: !beat.tieToNext })
      }
      return
    }

    // Tab = Recuar seleção na pauta simples; alternar treble/bass na grande pauta
    if (e.key === 'Tab') {
      e.preventDefault()
      if (grandStaffMode) {
        focusStaff(activeStaff === 'treble' ? 'bass' : 'treble')
      } else if (selectedBeatIdx > 0) {
        setSelectedBeatIdx(selectedBeatIdx - 1)
      } else if (beats.length > 0 && selectedBeatIdx === -1) {
        setSelectedBeatIdx(beats.length - 1)
      }
      return
    }

    // # = Sustenido
    if (e.key === '#') {
      e.preventDefault()
      setCurrentAccidental(prev => prev === '#' ? null : '#')
      return
    }

    // b = Bemol (só se não for nota B)
    if (e.key === 'b' && e.shiftKey) {
      e.preventDefault()
      setCurrentAccidental(prev => prev === 'b' ? null : 'b')
      return
    }

    // = = Bequadro
    if (e.key === '=') {
      e.preventDefault()
      setCurrentAccidental(prev => prev === 'n' ? null : 'n')
      return
    }

    // R = Repetir última nota
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault()
      if (lastPitchRef.current) {
        handleInsertNote(lastPitchRef.current, selectedBeatIdx >= 0 ? selectedBeatIdx : beats.length - 1)
      }
      return
    }

    // Q = Diminuir duração
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault()
      const durOrder: BeatDuration[] = ['w', 'h', 'q', '8', '16', '32', '64']
      const idx = durOrder.indexOf(currentDuration)
      if (idx < durOrder.length - 1) {
        setCurrentDuration(durOrder[idx + 1])
      }
      return
    }

    // W = Aumentar duração
    if (e.key === 'w' || e.key === 'W') {
      e.preventDefault()
      const durOrder: BeatDuration[] = ['w', 'h', 'q', '8', '16', '32', '64']
      const idx = durOrder.indexOf(currentDuration)
      if (idx > 0) {
        setCurrentDuration(durOrder[idx - 1])
      }
      return
    }

    // Espaço = Play/Stop
    if (e.key === ' ') {
      e.preventDefault()
      if (isPlaying) {
        stopPlayback()
      } else {
        startPlayback()
      }
      return
    }
  }, [
    beats, selectedBeatIdx, currentDuration, currentAccidental, dotted, doubleDotted,
    clef, grandStaffMode, activeStaff, isPlaying,
    undo, redo, handleInsertNote, handleReplaceNote, handleDeleteBeat, handleUpdateBeat, pushHistory,
  ])

  // ─── Playback ──────────────────────────────────────────────────────
  const startPlayback = useCallback(async () => {
    if (beats.length === 0) return

    await Tone.start()
    const synth = new Tone.PolySynth(Tone.Synth).toDestination()
    setIsPlaying(true)

    let currentTime = Tone.now()
    const secondsPerBeat = 60 / bpm

    const events: { time: number; idx: number }[] = []

    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i]
      const duration = getBeatDuration(beat) * secondsPerBeat

      events.push({ time: currentTime, idx: i })

      if (!beat.isRest && beat.pitches.length > 0) {
        const notes = beat.pitches.map(pd => {
          const [note, oct] = pd.pitch.split('/')
          return `${note}${oct}`
        })
        synth.triggerAttackRelease(notes, duration, currentTime)
      }

      currentTime += duration
    }

    // Agendar highlights
    events.forEach(({ time, idx }) => {
      Tone.Transport.schedule(() => {
        setPlayingBeatIdx(idx)
      }, time)
    })

    // Agendar fim
    Tone.Transport.schedule(() => {
      setIsPlaying(false)
      setPlayingBeatIdx(-1)
      synth.dispose()
    }, currentTime)

    Tone.Transport.start()

    playbackRef.current = {
      stop: () => {
        Tone.Transport.stop()
        Tone.Transport.cancel()
        synth.dispose()
        setIsPlaying(false)
        setPlayingBeatIdx(-1)
      },
    }
  }, [beats, bpm])

  const stopPlayback = useCallback(() => {
    playbackRef.current?.stop()
  }, [])

  // ─── Export MIDI ───────────────────────────────────────────────────
  const exportMidi = useCallback(() => {
    if (beats.length === 0) {
      toast.error('Nenhuma nota para exportar')
      return
    }

    const track = new MidiWriter.Track()
    track.setTempo(bpm)

    for (const beat of beats) {
      if (beat.isRest) {
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: ['C4'],
          duration: `T${Math.round(getBeatDuration(beat) * 128)}`,
          velocity: 0,
        }))
      } else if (beat.pitches.length > 0) {
        const pitches = beat.pitches.map(pd => {
          const [note, oct] = pd.pitch.split('/')
          return `${note}${oct}`
        })
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: pitches,
          duration: `T${Math.round(getBeatDuration(beat) * 128)}`,
          velocity: 80,
        }))
      }
    }

    const write = new MidiWriter.Writer([track])
    const blob = new Blob([write.buildFile()], { type: 'audio/midi' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${label || 'notacao'}.mid`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('MIDI exportado!')
  }, [beats, bpm, label])

  // ─── Salvar ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!label.trim()) {
      toast.error('Informe um nome para a notação')
      return
    }

    setIsSaving(true)

    try {
      const normalizedTimeSignature = normalizeTimeSignature(timeSignature)
      const notationData = {
        beats,
        clef,
        keySignature,
        timeSignature: normalizedTimeSignature,
        bpm,
        grandStaff: grandStaffMode,
      }

      const draft: NotationEditorDraft = {
        id: notation?.id,
        name: label,
        category,
        clef,
        key_signature: keySignature,
        time_signature: normalizedTimeSignature,
        notation_data: notationData,
        difficulty,
        tags: notation?.tags ?? [],
        description: notation?.description ?? null,
      }

      if (onSaveDraft) {
        await onSaveDraft(draft)
        onOpenChange(false)
        return
      }

      if (isEditing && notation) {
        const updated = await updateNotation(notation.id, {
          name: label,
          category,
          clef,
          key_signature: keySignature,
          time_signature: normalizedTimeSignature,
          difficulty,
          notation_data: notationData,
        })
        toast.success('Notação atualizada!')
        onSave?.(updated)
      } else {
        const created = await createNotation({
          name: label,
          category,
          clef,
          key_signature: keySignature,
          time_signature: normalizedTimeSignature,
          difficulty,
          notation_data: notationData,
        })
        toast.success('Notação criada!')
        onSave?.(created)
      }

      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }, [
    beats, clef, keySignature, timeSignature, bpm, grandStaffMode,
    label, category, difficulty, alphaTex,
    isEditing, notation, onSave, onOpenChange, onSaveDraft,
  ])

  // ─── Excluir ───────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!notation) return

    try {
      if (onDeleteDraft) {
        await onDeleteDraft(notation.id)
        onOpenChange(false)
        return
      }

      await deleteNotation(notation.id)
      toast.success('Notação excluída!')
      onDelete?.(notation.id)
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir')
    }
  }, [notation, onDelete, onDeleteDraft, onOpenChange])

  // ─── Estatísticas ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    let notes = 0
    let rests = 0
    let chords = 0
    let ties = 0

    for (const beat of beats) {
      if (beat.isRest) {
        rests++
      } else {
        if (beat.pitches.length > 1) chords++
        else notes++
      }
      if (beat.tieToNext) ties++
    }

    return { notes, rests, chords, ties, total: beats.length }
  }, [beats])

  // ─── Focar input ao abrir (apenas quando o usuário interage com o editor) ──
  // Removido auto-focus agressivo que bloqueava input externo (chat, etc.)

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[1100px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-surface border-border"
        onInteractOutside={e => e.preventDefault()}
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
              <button
                onClick={() => setTimeSignature('free')}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  timeSignature === 'free' ? 'bg-accent text-white' : 'text-text3 hover:bg-accent/10 hover:text-accent'
                }`}
              >
                Livre
              </button>
              <button
                onClick={() => setTimeSignature('4/4')}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  timeSignature !== 'free' ? 'bg-accent text-white' : 'text-text3 hover:bg-accent/10 hover:text-accent'
                }`}
              >
                Compasso
              </button>
            </div>
          </div>

          {/* Fórmula de Compasso (só aparece em modo Compasso) */}
          {timeSignature !== 'free' && (
            <div className="space-y-1 min-w-[140px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Compasso</span>
              <Select value={timeSignature} onValueChange={setTimeSignature}>
                <SelectTrigger className="h-[34px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SIGNATURE_OPTIONS.filter(o => o.value !== 'free').map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Clave */}
          <div className="space-y-1 min-w-[80px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Clave</span>
            <Select value={clef} onValueChange={setClef}>
              <SelectTrigger className="h-[34px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLEF_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Armadura */}
          <div className="space-y-1 min-w-[160px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Armadura</span>
            <Select value={keySignature} onValueChange={setKeySignature}>
              <SelectTrigger className="h-[34px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KEY_SIGNATURE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

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
          <div className="space-y-1 flex-1 min-w-[180px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Label</span>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="h-[34px] text-[13px]"
              placeholder="Escala de Dó Maior"
            />
          </div>
        </div>

        {/* ── Toolbar: Tudo em uma linha ── */}
        <div className="flex flex-wrap items-center gap-1 mb-3">
          {/* Grande Pauta (Piano) */}
          <button
            onClick={() => setGrandStaffMode(prev => !prev)}
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors
              ${grandStaffMode
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
              }`}
            title="Grande Pauta (Piano)"
          >
            <PianoKeys className="h-4 w-4" />
          </button>

          {/* Botões de seleção de pauta (mão direita/esquerda) */}
          {grandStaffMode && (
            <>
              <button
                onClick={() => { focusStaff('treble') }}
                className={`h-7 px-2 rounded-md border text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  activeStaff === 'treble'
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
                }`}
                title="Pauta Sol - Mão Direita (Tab para alternar)"
              >
                𝄞 Sol (MD)
              </button>
              <button
                onClick={() => { focusStaff('bass') }}
                className={`h-7 px-2 rounded-md border text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  activeStaff === 'bass'
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-500'
                    : 'border-border text-text3 hover:border-indigo-500/50 hover:text-indigo-500'
                }`}
                title="Pauta Fá - Mão Esquerda (Tab para alternar)"
              >
                𝄢 Fá (ME)
              </button>
            </>
          )}

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Durações */}
          {DURATION_OPTIONS.map(d => (
            <button
              key={d.value}
              onClick={() => { setCurrentDuration(d.value); focusInput() }}
              title={`${d.label} (${d.key})`}
              className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-[15px] transition-colors
                ${currentDuration === d.value
                  ? 'border-accent bg-accent text-white'
                  : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
                }`}
            >
              {d.symbol}
            </button>
          ))}

          {/* Pausa */}
          <button
            onClick={() => {
              const newBeat: SvgBeat = { pitches: [], duration: currentDuration, isRest: true, dotted, doubleDotted }
              const insertIdx = selectedBeatIdx >= 0 ? selectedBeatIdx + 1 : beats.length
              const newBeats = [...beats]
              newBeats.splice(insertIdx, 0, newBeat)
              setBeats(newBeats)
              pushHistory(newBeats)
              setSelectedBeatIdx(insertIdx)
              focusInput()
            }}
            title="Pausa (0)"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 transition-colors"
          >
            🔇
          </button>

          {/* Ponto */}
          <button
            onClick={() => {
              if (doubleDotted) { setDotted(false); setDoubleDotted(false) }
              else if (dotted) { setDotted(false); setDoubleDotted(true) }
              else { setDotted(true) }
              focusInput()
            }}
            title="Ponto de aumento (.)"
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-[15px] font-bold transition-colors
              ${dotted || doubleDotted
                ? 'border-accent bg-accent text-white'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
              }`}
          >
            •{doubleDotted && '•'}
          </button>

          {/* Quiálteras/Tuplets */}
          <Select value={currentTuplet} onValueChange={(v) => {
            setCurrentTuplet(v)
            if (v !== 'none') {
              const opt = TUPLET_OPTIONS.find(o => o.value === v)
              if (opt) {
                tupletCounterRef.current = opt.numNotes
                tupletGroupIdRef.current = `tup-${Date.now()}`
              }
            } else {
              tupletCounterRef.current = 0
              tupletGroupIdRef.current = ''
            }
            focusInput()
          }}>
            <SelectTrigger className={`h-7 w-auto min-w-[70px] text-[11px] px-2 gap-0.5 ${currentTuplet !== 'none' ? 'border-orange-500/50 text-orange-500' : 'border-border text-text3'}`}>
              <SelectValue>
                <span className="font-mono text-[10px]">┌ {currentTuplet !== 'none' ? currentTuplet : '3:2'} ┐</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TUPLET_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-[12px]">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Acidentes */}
          <button
            onClick={() => { setCurrentAccidental('#'); focusInput() }}
            title="Sustenido (#)"
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-[14px] transition-colors
              ${currentAccidental === '#'
                ? 'border-accent bg-accent text-white'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
              }`}
          >
            ♯
          </button>
          <button
            onClick={() => { setCurrentAccidental('b'); focusInput() }}
            title="Bemol (B)"
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-[14px] transition-colors
              ${currentAccidental === 'b'
                ? 'border-accent bg-accent text-white'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
              }`}
          >
            ♭
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Transposição */}
          <button
            onClick={handleTransposeDown}
            title="Transpor ½ tom abaixo (↓)"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-text3 hover:border-accent/50 hover:text-accent transition-colors"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            onClick={handleTransposeUp}
            title="Transpor ½ tom acima (↑)"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-text3 hover:border-accent/50 hover:text-accent transition-colors"
          >
            <ArrowUp className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={historyIdx <= 0}
            title="Desfazer (Ctrl+Z)"
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors
              ${historyIdx <= 0
                ? 'border-border/50 text-text3/30 cursor-not-allowed'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
              }`}
          >
            <ArrowCounterClockwise className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIdx >= history.length - 1}
            title="Refazer (Ctrl+Y)"
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors
              ${historyIdx >= history.length - 1
                ? 'border-border/50 text-text3/30 cursor-not-allowed'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
              }`}
          >
            <ArrowClockwise className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Playback */}
          <button
            onClick={isPlaying ? stopPlayback : startPlayback}
            title={isPlaying ? 'Parar' : 'Tocar (Espaço)'}
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors
              ${isPlaying
                ? 'border-accent bg-accent text-white'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
              }`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          {/* BPM */}
          <div className="flex items-center gap-1 ml-1">
            <Timer className="h-3.5 w-3.5 text-text3" />
            <Slider
              value={[bpm]}
              onValueChange={([v]) => setBpm(v)}
              min={40}
              max={220}
              step={1}
              className="w-16"
            />
            <span className="text-[10px] text-text3 min-w-[24px]">{bpm}</span>
          </div>
        </div>

        {/* ── Layout principal: Editor + Info ── */}
        <div className="flex gap-4">
          {/* Coluna esquerda: Editor SVG + Preview */}
          <div className="flex-1 space-y-3">
            {/* Editor SVG */}
            <NotationSvgEditor
              beats={beats}
              selectedBeatIdx={isPlaying ? playingBeatIdx : selectedBeatIdx}
              onSelectBeat={handleSelectBeat}
              onInsertNote={handleInsertNote}
              onReplaceNote={handleReplaceNote}
              onDeleteBeat={handleDeleteBeat}
              onUpdateBeat={handleUpdateBeat}
              clef={clef}
              keySignature={keySignature}
              timeSignature={timeSignature !== 'free' ? timeSignature : null}
              currentDuration={currentDuration}
              isInputMode={isInputMode}
              grandStaffMode={grandStaffMode}
              activeStaff={activeStaff}
              barlines={barlines}
              inputRef={hiddenInputRef}
              onKeyDown={handleKeyDown}
              onHoverPosition={setHoveredSvgPos}
            />

            {/* Preview AlphaTab */}
            {alphaTex && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-1.5 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-text3">
                  Preview (AlphaTab)
                </div>
                <AlphaTabViewer
                  tex={alphaTex}
                  staveProfile="score"
                  purpose={grandStaffMode ? 'editor-notation-grand-staff' : 'editor-notation-score'}
                  grandStaffMode={grandStaffMode}
                  layout={grandStaffMode ? 'horizontal' : 'page'}
                  scale={1.0}
                  showTimeSignature={timeSignature !== 'free'}
                  minHeight={120}
                />
              </div>
            )}
          </div>

          {/* Coluna direita: Informações */}
          <div className="w-[180px] space-y-3">
            <div className="rounded-xl border border-border p-3 bg-muted/20">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text3 mb-2">Informações</h3>
              <div className="space-y-1 text-[12px]">
                <div className="flex justify-between"><span className="text-text3">Notas</span><span className="font-semibold text-accent">{stats.notes}</span></div>
                <div className="flex justify-between"><span className="text-text3">Pausas</span><span className="font-semibold">{stats.rests}</span></div>
                <div className="flex justify-between"><span className="text-text3">Acordes</span><span className="font-semibold">{stats.chords}</span></div>
                <div className="flex justify-between"><span className="text-text3">Clave</span><span className="font-semibold">{clef === 'treble' ? 'Sol' : clef === 'bass' ? 'Fá' : 'Dó'}</span></div>
                <div className="flex justify-between"><span className="text-text3">Armadura</span><span className="font-semibold">{keySignature}</span></div>
                <div className="flex justify-between"><span className="text-text3">Tempos</span><span className="font-semibold">{stats.total} tempos</span></div>
                <div className="flex justify-between"><span className="text-text3">Ligaduras</span><span className="font-semibold">{stats.ties}</span></div>
                <div className="flex justify-between"><span className="text-text3">Cifras</span><span className="font-semibold">0</span></div>
                <div className="flex justify-between"><span className="text-text3">Sílabas</span><span className="font-semibold">0</span></div>
              </div>
            </div>

            {/* Clique na pauta */}
            <div className="rounded-xl border border-border p-3 bg-accent/5 text-center">
              <span className="text-[11px] text-text3">
                {hoveredSvgPos?.pitch ?? '—'}
              </span>
              <div className="text-[10px] text-text3 mt-1">
                {hoveredSvgPos ? `Beat ${hoveredSvgPos.beatIdx >= 0 ? hoveredSvgPos.beatIdx + 1 : 'novo'}` : 'Clique na pauta'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Atalhos ── */}
        <div className="text-[10px] text-text3 flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
          <span><strong className="text-accent">N</strong> = modo teclado</span>
          <span><strong className="text-accent">A-G</strong> = nota</span>
          <span><strong className="text-accent">Shift+A-G</strong> = acorde</span>
          <span><strong className="text-accent">1-7</strong> = duração</span>
          <span><strong className="text-accent">0</strong> = pausa</span>
          <span><strong className="text-accent">↑↓</strong> = semitom</span>
          <span><strong className="text-accent">Ctrl+↑↓</strong> = oitava</span>
          <span><strong className="text-accent">←→</strong> = navegar</span>
          <span><strong className="text-accent">Q/W</strong> = ±duração</span>
          <span><strong className="text-accent">T</strong> = ligadura</span>
          <span><strong className="text-accent">.</strong> = ponto</span>
          <span><strong className="text-accent">R</strong> = repetir</span>
          <span><strong className="text-accent">X</strong> = stem</span>
          <span><strong className="text-accent">Del</strong> = apagar</span>
          <span><strong className="text-accent">Espaço</strong> = play</span>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
          <div className="flex items-center gap-2">
            {isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir notação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Nome inline no footer */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text3">Nome</span>
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="h-[32px] w-[180px] text-[12px]"
                placeholder="Dó Maior"
              />
            </div>

            {/* Dificuldade */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text3">Dificuldade</span>
              <Select value={String(difficulty)} onValueChange={v => setDifficulty(Number(v))}>
                <SelectTrigger className="h-[32px] w-[60px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={exportMidi}>
              <Export className="h-4 w-4 mr-1" />
              MIDI
            </Button>

            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>

            <Button onClick={handleSave} disabled={isSaving} className="bg-accent hover:bg-accent/90">
              <FloppyDisk className="h-4 w-4 mr-1" />
              {isSaving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
