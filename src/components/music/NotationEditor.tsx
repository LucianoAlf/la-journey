import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { FloppyDisk, Trash, X, ArrowCounterClockwise, ArrowClockwise, PencilSimple, ArrowsOutCardinal, CaretUp, CaretDown, Play, Pause, Stop, MagnifyingGlassPlus, MagnifyingGlassMinus, Timer, ArrowUp, ArrowDown, Export } from '@phosphor-icons/react'
import * as Tone from 'tone'
import MidiWriter from 'midi-writer-js'
import { NotationRenderer } from '@/components/music/NotationRenderer'
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
const DURATION_BEATS: Record<string, number> = { w:4, h:2, q:1, '8':0.5, '16':0.25, '32':0.125, '64':0.0625 }
const DURATION_NAMES: Record<string, string> = { w:'Semibreve', h:'Mínima', q:'Semínima', '8':'Colcheia', '16':'Semicolcheia', '32':'Fusa', '64':'Semifusa' }
const DURATION_ORDER = ['64', '32', '16', '8', 'q', 'h', 'w'] as const

const CLEF_OPTIONS = [
  { value: 'treble', label: 'Sol' },
  { value: 'bass', label: 'Fá' },
  { value: 'alto', label: 'Dó' },
  { value: 'percussion', label: 'Percussão' },
]
const TIME_GROUPS = [
  { label: 'Simples', options: ['2/4', '3/4', '4/4', '5/4', '6/4', '7/4'] },
  { label: 'Alla breve', options: ['2/2', '3/2', '4/2'] },
  { label: 'Compostos', options: ['3/8', '5/8', '6/8', '7/8', '9/8', '12/8'] },
]
const KEY_SHARPS = [
  { value: 'C', label: 'C / Am (sem alteração)' },
  { value: 'G', label: 'G / Em (1♯)' },
  { value: 'D', label: 'D / Bm (2♯)' },
  { value: 'A', label: 'A / F♯m (3♯)' },
  { value: 'E', label: 'E / C♯m (4♯)' },
  { value: 'B', label: 'B / G♯m (5♯)' },
  { value: 'F#', label: 'F♯ / D♯m (6♯)' },
  { value: 'C#', label: 'C♯ / A♯m (7♯)' },
]
const KEY_FLATS = [
  { value: 'F', label: 'F / Dm (1♭)' },
  { value: 'Bb', label: 'B♭ / Gm (2♭)' },
  { value: 'Eb', label: 'E♭ / Cm (3♭)' },
  { value: 'Ab', label: 'A♭ / Fm (4♭)' },
  { value: 'Db', label: 'D♭ / B♭m (5♭)' },
  { value: 'Gb', label: 'G♭ / E♭m (6♭)' },
  { value: 'Cb', label: 'C♭ / A♭m (7♭)' },
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
  doubleDotted?: boolean
  articulations?: string[]
  tuplet?: { numNotes: number; notesOccupied: number; groupId: string }
  notehead?: 'normal' | 'x'
  barAfter?: boolean
  stemDirection?: 'up' | 'down'
  cifra: string | null
  cifra_offset?: OffsetXY
  annotation: string | null
  annotation_offset?: OffsetXY
  lyric: string | null
  lyric_offset?: OffsetXY
  // Fase 3
  dynamic?: string  // 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff' | 'sfz' | 'fp'
  hairpinStart?: 'crescendo' | 'decrescendo'  // este beat inicia um hairpin
  hairpinEnd?: boolean                          // este beat termina um hairpin
  graceNotes?: {
    pitches: PitchData[]
    type: 'acciaccatura' | 'appoggiatura'
    duration?: string  // default: '8' (colcheia)
  }
  ornament?: string  // código VexFlow: 'tr', 'mordent', 'mordent_inverted', 'turn', 'turn_inverted'
  slurStart?: boolean  // este beat inicia um slur
  slurEnd?: boolean    // este beat termina um slur
  volta?: { number: number; isStart: boolean; isEnd: boolean }  // volta bracket (1ª vez, 2ª vez)
  pedalStart?: boolean  // este beat inicia um pedal marking
  pedalEnd?: boolean    // este beat termina um pedal marking
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
  if (beat.doubleDotted) return base * 1.75
  return beat.dotted ? base * 1.5 : base
}

// Barlines automáticas: retorna Set de índices de beats APÓS os quais inserir barra
function computeAutoBarlines(beats: Beat[], timeSig: string | null): Set<number> {
  if (!timeSig) return new Set()
  const [n, d] = timeSig.split('/').map(Number)
  if (!n || !d) return new Set()
  const beatsPerBar = n * (4 / d)
  const result = new Set<number>()
  let accumulated = 0
  for (let i = 0; i < beats.length; i++) {
    const duration = getBeatDuration(beats[i])

    // Se o beat atual ultrapassa o compasso, fecha ANTES dele (no beat anterior)
    if (i > 0 && accumulated > 0 && accumulated + duration > beatsPerBar + 0.001) {
      result.add(i - 1)
      accumulated = 0
    }

    accumulated += duration

    // Fechamentos exatos (ou múltiplos) no fim do beat atual
    while (accumulated >= beatsPerBar - 0.001 && i < beats.length - 1) {
      result.add(i)
      accumulated -= beatsPerBar
    }
  }
  return result
}

// Números de compasso: retorna Map<beatIdx, measureNumber>
function computeMeasureNumbers(beats: Beat[], timeSig: string | null): Map<number, number> {
  const map = new Map<number, number>()
  if (!timeSig) return map
  const [n, d] = timeSig.split('/').map(Number)
  if (!n || !d) return map
  const beatsPerBar = n * (4 / d)
  let accumulated = 0
  let barNum = 1
  map.set(0, barNum)
  for (let i = 0; i < beats.length; i++) {
    const duration = getBeatDuration(beats[i])

    // Overflow: próximo beat já inicia novo compasso (quebra antes do beat atual)
    if (i > 0 && accumulated > 0 && accumulated + duration > beatsPerBar + 0.001) {
      barNum++
      map.set(i, barNum)
      accumulated = 0
    }

    accumulated += duration

    while (accumulated >= beatsPerBar - 0.001 && i < beats.length - 1) {
      accumulated -= beatsPerBar
      barNum++
      map.set(i + 1, barNum)
    }
  }
  return map
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
    ...(b.doubleDotted ? { doubleDotted: true } : {}),
    ...(b.articulations?.length ? { articulations: b.articulations } : {}),
    ...(b.tuplet ? { tuplet: b.tuplet } : {}),
    ...(b.notehead && b.notehead !== 'normal' ? { notehead: b.notehead } : {}),
    ...(b.barAfter ? { barAfter: true } : {}),
    cifra: b.cifra || null,
    ...(b.cifra_offset && (b.cifra_offset.x || b.cifra_offset.y) ? { cifra_offset: b.cifra_offset } : {}),
    annotation: b.annotation || null,
    ...(b.annotation_offset && (b.annotation_offset.x || b.annotation_offset.y) ? { annotation_offset: b.annotation_offset } : {}),
    lyric: b.lyric || null,
    ...(b.lyric_offset && (b.lyric_offset.x || b.lyric_offset.y) ? { lyric_offset: b.lyric_offset } : {}),
    // Fase 3
    ...(b.dynamic ? { dynamic: b.dynamic } : {}),
    ...(b.hairpinStart ? { hairpinStart: b.hairpinStart } : {}),
    ...(b.hairpinEnd ? { hairpinEnd: true } : {}),
    ...(b.graceNotes?.pitches?.length ? { graceNotes: b.graceNotes } : {}),
    ...(b.ornament ? { ornament: b.ornament } : {}),
    ...(b.slurStart ? { slurStart: true } : {}),
    ...(b.slurEnd ? { slurEnd: true } : {}),
    ...(b.volta ? { volta: b.volta } : {}),
    ...(b.pedalStart ? { pedalStart: true } : {}),
    ...(b.pedalEnd ? { pedalEnd: true } : {}),
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
        ...(b.doubleDotted ? { doubleDotted: true } : {}),
        ...(b.articulations?.length ? { articulations: b.articulations } : {}),
        ...(b.tuplet ? { tuplet: b.tuplet } : {}),
        ...(b.notehead ? { notehead: b.notehead } : {}),
        ...(b.barAfter ? { barAfter: true } : {}),
        cifra: b.cifra ?? null,
        ...(b.cifra_offset ? { cifra_offset: b.cifra_offset } : {}),
        annotation: b.annotation ?? null,
        ...(b.annotation_offset ? { annotation_offset: b.annotation_offset } : {}),
        lyric: b.lyric ?? null,
        ...(b.lyric_offset ? { lyric_offset: b.lyric_offset } : {}),
        // Fase 3
        ...(b.dynamic ? { dynamic: b.dynamic } : {}),
        ...(b.hairpinStart ? { hairpinStart: b.hairpinStart } : {}),
        ...(b.hairpinEnd ? { hairpinEnd: true } : {}),
        ...(b.graceNotes?.pitches?.length ? { graceNotes: b.graceNotes } : {}),
        ...(b.ornament ? { ornament: b.ornament } : {}),
        ...(b.slurStart ? { slurStart: true } : {}),
        ...(b.slurEnd ? { slurEnd: true } : {}),
        ...(b.volta ? { volta: b.volta } : {}),
        ...(b.pedalStart ? { pedalStart: true } : {}),
        ...(b.pedalEnd ? { pedalEnd: true } : {}),
      }
    })
  } catch {
    return []
  }
}

// ─── Helpers: oitava inteligente e cromática ─────────────────────────
const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// Todas as armaduras em ordem cromática (para transposição)
const ALL_KEYS_CHROMATIC = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const
// Mapa de equivalentes enarmônicos para armaduras VexFlow
const KEY_ENHARMONIC: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'G#': 'Ab', 'A#': 'Bb',
  'Fb': 'E', 'Cb': 'B', 'E#': 'F', 'B#': 'C',
}

function transposePitch(pitch: string, accidental: string | null, semitones: number): { pitch: string; accidental: string | null } {
  const match = pitch.match(/^([a-g])(#|b)?\/(\d)$/i)
  if (!match) return { pitch, accidental }
  const noteName = match[1].toUpperCase()
  const existingAcc = accidental || match[2] || ''
  const octave = parseInt(match[3])
  const chromRef = existingAcc === 'b' ? CHROMATIC_FLAT : CHROMATIC_SHARP
  let idx = chromRef.findIndex(n => n.toLowerCase() === (noteName.toLowerCase() + existingAcc))
  if (idx === -1) idx = CHROMATIC_SHARP.findIndex(n => n[0].toLowerCase() === noteName.toLowerCase())
  if (idx === -1) return { pitch, accidental }
  idx += semitones
  let newOctave = octave
  while (idx >= 12) { idx -= 12; newOctave++ }
  while (idx < 0) { idx += 12; newOctave-- }
  const newNote = chromRef[idx]
  const newBase = newNote[0].toLowerCase()
  const newAcc = newNote.length > 1 ? newNote[1] === '#' ? '#' : 'b' : null
  return { pitch: `${newBase}/${newOctave}`, accidental: newAcc }
}

function transposeKey(key: string, semitones: number): string {
  const normalized = KEY_ENHARMONIC[key] || key
  let idx = ALL_KEYS_CHROMATIC.indexOf(normalized as any)
  if (idx === -1) idx = 0
  idx = ((idx + semitones) % 12 + 12) % 12
  return ALL_KEYS_CHROMATIC[idx]
}

function getSmartOctave(
  noteName: string,
  prevPitch: string | null,
  clef: string,
): number {
  if (!prevPitch) {
    if (clef === 'bass') return 3
    if (clef === 'alto') return 4
    return 4
  }
  const parts = prevPitch.split('/')
  if (parts.length !== 2) return 4
  const prevOctave = parseInt(parts[1])
  const prevName = parts[0].replace(/[#bn]/g, '').toUpperCase()
  const prevIdx = NOTE_ORDER.indexOf(prevName as any)
  const newIdx = NOTE_ORDER.indexOf(noteName.toUpperCase() as any)
  if (prevIdx === -1 || newIdx === -1) return prevOctave
  const distUp = (newIdx - prevIdx + 7) % 7
  const distDown = (prevIdx - newIdx + 7) % 7
  if (distUp <= distDown) {
    return newIdx < prevIdx ? prevOctave + 1 : prevOctave
  } else {
    return newIdx > prevIdx ? prevOctave - 1 : prevOctave
  }
}

// ─── Multi-line: quebrar beats em linhas ─────────────────────────────
const NOTES_PER_LINE_OPTIONS = [4, 8, 12, 16] as const

function splitBeatsIntoLines(beats: Beat[], notesPerLine: number): Beat[][] {
  if (beats.length === 0) return [[]]
  const lines: Beat[][] = []
  let current: Beat[] = []
  for (const beat of beats) {
    current.push(beat)
    // Quebra de linha: atingiu notesPerLine OU beat tem barAfter (separação de stave)
    if (current.length >= notesPerLine || beat.barAfter) {
      lines.push(current)
      current = []
    }
  }
  if (current.length > 0) lines.push(current)
  if (lines.length === 0) lines.push([])
  return lines
}

// Converter uma linha de beats para o formato NotationRenderer
function lineBeatsToStaveData(
  lineBeats: Beat[],
  clef: string,
  keySig: string | undefined,
  timeSig: string | undefined,
  width = 700,
  localBarlineBeatIndices?: Set<number>,
) {
  const notes: string[] = []
  const accidentals: (string | null)[] = []
  const noteArticulations: (string[] | null)[] = []
  const noteTuplets: ({ groupId: string; numNotes: number; notesOccupied: number } | null)[] = []
  const noteDynamics: (string | null)[] = []  // Fase 3
  const hairpins: { type: 'crescendo' | 'decrescendo'; startNoteIdx: number; endNoteIdx: number }[] = []  // Fase 3
  const graceNotes: ({ pitches: { pitch: string; accidental: string | null }[]; type: 'acciaccatura' | 'appoggiatura'; duration?: string } | null)[] = []  // Fase 3
  const ornaments: (string | null)[] = []  // Fase 3

  // Mapear índice de beat para índice de nota (considerando acordes)
  const beatToNoteIdx: number[] = []
  let noteIdx = 0

  lineBeats.forEach((beat, beatIdx) => {
    beatToNoteIdx[beatIdx] = noteIdx
    const durSuffix = (beat.doubleDotted ? 'dd' : beat.dotted ? 'd' : '') + (beat.isRest ? 'r' : '')
    beat.pitches.forEach((p, pi) => {
      notes.push(`${p.pitch}:${beat.duration}${durSuffix}`)
      accidentals.push(p.accidental)
      // Articulações só no primeiro pitch do beat (evitar duplicar em acordes)
      noteArticulations.push(pi === 0 && beat.articulations?.length ? beat.articulations : null)
      // Tuplet info só no primeiro pitch do beat
      noteTuplets.push(pi === 0 && beat.tuplet ? beat.tuplet : null)
      // Dinâmica só no primeiro pitch do beat (Fase 3)
      noteDynamics.push(pi === 0 && beat.dynamic ? beat.dynamic : null)
      // Grace notes só no primeiro pitch do beat (Fase 3)
      graceNotes.push(pi === 0 && beat.graceNotes?.pitches?.length ? beat.graceNotes : null)
      // Ornamento só no primeiro pitch do beat (Fase 3)
      ornaments.push(pi === 0 && beat.ornament ? beat.ornament : null)
      noteIdx++
    })
  })

  // Construir hairpins a partir dos beats (Fase 3)
  lineBeats.forEach((beat, beatIdx) => {
    if (beat.hairpinStart) {
      // Encontrar o beat com hairpinEnd correspondente
      for (let i = beatIdx + 1; i < lineBeats.length; i++) {
        if (lineBeats[i].hairpinEnd) {
          hairpins.push({
            type: beat.hairpinStart,
            startNoteIdx: beatToNoteIdx[beatIdx],
            endNoteIdx: beatToNoteIdx[i],
          })
          break
        }
      }
    }
  })

  // Construir slurs a partir dos beats (Fase 3)
  const slurs: { startNoteIdx: number; endNoteIdx: number }[] = []
  lineBeats.forEach((beat, beatIdx) => {
    if (beat.slurStart) {
      // Encontrar o beat com slurEnd correspondente
      for (let i = beatIdx + 1; i < lineBeats.length; i++) {
        if (lineBeats[i].slurEnd) {
          slurs.push({
            startNoteIdx: beatToNoteIdx[beatIdx],
            endNoteIdx: beatToNoteIdx[i],
          })
          break
        }
      }
    }
  })

  // Construir voltas a partir dos beats (Fase 3)
  const voltas: { number: number; startNoteIdx: number; endNoteIdx: number }[] = []
  lineBeats.forEach((beat, beatIdx) => {
    if (beat.volta?.isStart) {
      // Encontrar o beat com volta.isEnd correspondente
      for (let i = beatIdx + 1; i < lineBeats.length; i++) {
        if (lineBeats[i].volta?.isEnd && lineBeats[i].volta?.number === beat.volta?.number) {
          voltas.push({
            number: beat.volta.number,
            startNoteIdx: beatToNoteIdx[beatIdx],
            endNoteIdx: beatToNoteIdx[i],
          })
          break
        }
      }
    }
  })

  // Construir pedals a partir dos beats (Fase 3)
  const pedals: { startNoteIdx: number; endNoteIdx: number }[] = []
  lineBeats.forEach((beat, beatIdx) => {
    if (beat.pedalStart) {
      // Encontrar o beat com pedalEnd correspondente
      for (let i = beatIdx + 1; i < lineBeats.length; i++) {
        if (lineBeats[i].pedalEnd) {
          pedals.push({
            startNoteIdx: beatToNoteIdx[beatIdx],
            endNoteIdx: beatToNoteIdx[i],
          })
          break
        }
      }
    }
  })

  return {
    type: 'staff' as const,
    staves: [{
      clef: clef as 'treble' | 'bass' | 'alto' | 'percussion',
      key_signature: clef === 'percussion' ? undefined : keySig,
      time_signature: timeSig,
      notes,
      accidentals,
      noteArticulations,
      noteTuplets,
      noteDynamics,  // Fase 3
      hairpins: hairpins.length > 0 ? hairpins : undefined,  // Fase 3
      graceNotes: graceNotes.some(g => g !== null) ? graceNotes : undefined,  // Fase 3
      ornaments: ornaments.some(o => o !== null) ? ornaments : undefined,  // Fase 3
      slurs: slurs.length > 0 ? slurs : undefined,  // Fase 3
      voltas: voltas.length > 0 ? voltas : undefined,  // Fase 3
      pedals: pedals.length > 0 ? pedals : undefined,  // Fase 3
      // Barlines: converter de beat index local para note index
      barlineAfterIndices: localBarlineBeatIndices?.size
        ? [...localBarlineBeatIndices]
            // Não inserir BarNote no último beat da linha: a própria Stave já fecha com barra final
            .filter(bi => bi < lineBeats.length - 1)
            .map(bi => {
            // Último pitch do beat (para posicionar a barline APÓS todo o acorde)
            const lastPitchIdx = beatToNoteIdx[bi] + lineBeats[bi].pitches.length - 1
            return lastPitchIdx
          })
        : undefined,
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
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  // Estado do editor
  const [beats, setBeats] = useState<Beat[]>([])
  const [editorMode, setEditorMode] = useState<EditorMode>('free')
  const [inputMode, setInputMode] = useState<InputMode>('melodic')
  const [isKeyboardMode, setIsKeyboardMode] = useState(false)
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
  // Distingue digitação contínua (inserir) de edição pontual (substituir)
  const lastActionWasInsertRef = useRef(false)

  // ── Fase 2: Undo/Redo ──
  const MAX_HISTORY = 50
  const [history, setHistory] = useState<Beat[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const historySkipRef = useRef(false) // evita pushHistory quando undo/redo restaura

  // ── Fase 2: Zoom ──
  const [zoom, setZoom] = useState(100)

  // ── Fase 2: Clipboard ──
  const [clipboard, setClipboard] = useState<Beat[] | null>(null)

  // ── Fase 2: BPM ──
  const [bpm, setBpm] = useState(120)

  // ── Fase 2: Tuplets ──
  const [activeTuplet, setActiveTuplet] = useState<{ numNotes: number; notesOccupied: number } | null>(null)
  const tupletCounterRef = useRef(0)
  const tupletGroupIdRef = useRef('')

  // ── Fase 3: Dinâmicas ──
  const [showDynamicsPopover, setShowDynamicsPopover] = useState(false)

  // ── Fase 3: Hairpins ──
  const [activeHairpin, setActiveHairpin] = useState<{ type: 'crescendo' | 'decrescendo'; startBeatIdx: number } | null>(null)

  // ── Fase 3: Grace Notes ──
  const [graceNoteMode, setGraceNoteMode] = useState(false)

  // ── Fase 3: Slurs ──
  const [activeSlur, setActiveSlur] = useState<{ startBeatIdx: number } | null>(null)

  // ── Fase 3: Volta brackets ──
  const [activeVolta, setActiveVolta] = useState<{ number: number; startBeatIdx: number } | null>(null)

  // ── Fase 3: Pedal marking ──
  const [activePedal, setActivePedal] = useState<{ startBeatIdx: number } | null>(null)

  // Largura dinâmica da pauta (medida do container)
  const [staveWidth, setStaveWidth] = useState(500)

  // Posições X reais dos noteheads lidas do SVG (por linha)
  const [notePositions, setNotePositions] = useState<number[][]>([])

  const scale = useMemo(() => getScaleForClef(selectedClef), [selectedClef])

  // Multi-line: dividir beats em linhas e gerar dados VexFlow por linha
  const beatLines = useMemo(() => splitBeatsIntoLines(beats, notesPerLine), [beats, notesPerLine])

  // Barlines automáticas (modo metered) — precisa vir antes de linedNotationData
  const autoBarlineSet = useMemo(
    () => editorMode === 'metered' ? computeAutoBarlines(beats, selectedTime) : new Set<number>(),
    [beats, editorMode, selectedTime],
  )

  const linedNotationData = useMemo(
    () => beatLines.map((lineBeats, i) => {
      // Converter barlines globais para locais (dentro desta linha)
      const globalOffset = i * notesPerLine
      const localBarlines = new Set<number>()
      autoBarlineSet.forEach(globalIdx => {
        const localIdx = globalIdx - globalOffset
        if (localIdx >= 0 && localIdx < lineBeats.length) {
          localBarlines.add(localIdx)
        }
      })
      return lineBeatsToStaveData(
        lineBeats,
        selectedClef,
        i === 0 && selectedKey !== 'C' ? selectedKey : undefined,
        i === 0 && editorMode === 'metered' ? selectedTime : undefined,
        staveWidth,
        localBarlines.size > 0 ? localBarlines : undefined,
      )
    }),
    [beatLines, selectedClef, selectedKey, editorMode, selectedTime, staveWidth, autoBarlineSet, notesPerLine],
  )
  const measureNumbers = useMemo(
    () => editorMode === 'metered' ? computeMeasureNumbers(beats, selectedTime) : new Map<number, number>(),
    [beats, editorMode, selectedTime],
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
    setIsKeyboardMode(false)
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
    setBpm(notation?.notation_data?.bpm ?? 120)
    setActiveTuplet(null)
    tupletCounterRef.current = 0
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
    // Converter clickX de pixels do viewport para coordenadas do viewBox do SVG
    const vb = svg.getAttribute('viewBox')
    const vbWidth = vb ? parseFloat(vb.split(' ')[2]) : svgRect.width
    const scaleX = svgRect.width / vbWidth
    const clickX = (clientX - svgRect.left) / scaleX
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
    // Só considera "perto" se o mouse está a menos de 40px (em coordenadas viewBox) da nota
    if (bestDist > 40) return null
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
    // Detectar se está sobre uma nota existente (para cursor pointer)
    setHoverBeatIdx(getNearestBeat(e.clientX, e.clientY))
  }, [scale, getNearestBeat])

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

    // No modo melódico/acorde/ligadura, clique perto de nota existente
    if (inputMode === 'melodic' || inputMode === 'chord' || inputMode === 'tie') {
      const nearBeat = getNearestBeat(e.clientX, e.clientY)
      if (nearBeat !== null && inputMode === 'melodic') {
        lastActionWasInsertRef.current = false
        setSelectedElement({ type: 'note', beatIdx: nearBeat })
        return
      }
      // Modo acorde: clique perto de nota = empilhar naquela nota
      if (nearBeat !== null && inputMode === 'chord') {
        const pos = vexflowYToPos(svgY, scale)
        const pitch = scale[pos]
        if (!pitch) return
        setBeats(prev => {
          const next = [...prev]
          const target = { ...next[nearBeat], pitches: [...next[nearBeat].pitches] }
          if (target.isRest) {
            target.isRest = false
            target.pitches = [{ pitch, accidental: currentAccidental }]
          } else if (!target.pitches.find(p => p.pitch === pitch)) {
            target.pitches.push({ pitch, accidental: currentAccidental })
            target.pitches.sort((a, b) => scale.indexOf(a.pitch) - scale.indexOf(b.pitch))
          }
          next[nearBeat] = target
          return next
        })
        setSelectedElement({ type: 'note', beatIdx: nearBeat })
        setLastNote(displayNote(pitch, currentAccidental))
        setLastNoteInfo('Empilhado')
        return
      }
      // Clique em área vazia = desselecionar
      lastActionWasInsertRef.current = false
      setSelectedElement(null)
    }

    const pos = vexflowYToPos(svgY, scale)
    const pitch = scale[pos]
    if (!pitch) return

    setBeats(prev => {
      const next = [...prev]
      if (inputMode === 'chord' && next.length > 0) {
        // Empilha na nota selecionada, ou na última se nenhuma selecionada
        const targetIdx = selectedBeatIdx >= 0 && selectedBeatIdx < next.length ? selectedBeatIdx : next.length - 1
        const target = { ...next[targetIdx], pitches: [...next[targetIdx].pitches] }
        if (target.isRest) {
          // Se é pausa, converte para nota
          target.isRest = false
          target.pitches = [{ pitch, accidental: currentAccidental }]
        } else if (!target.pitches.find(p => p.pitch === pitch)) {
          target.pitches.push({ pitch, accidental: currentAccidental })
          target.pitches.sort((a, b) => scale.indexOf(a.pitch) - scale.indexOf(b.pitch))
        }
        next[targetIdx] = target
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
  }, [inputMode, currentAccidental, currentDuration, scale, beats, beatLines, notesPerLine, restMode, dottedMode, selectedClef, selectedElement])

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

  // ── Helpers: derivados para keyboard input ──────────────────────────
  const selectedBeatIdx = selectedElement?.type === 'note' ? selectedElement.beatIdx : -1

  const getLastPitch = useCallback((): string | null => {
    if (selectedBeatIdx >= 0 && selectedBeatIdx < beats.length) {
      const b = beats[selectedBeatIdx]
      if (b.pitches.length > 0 && !b.isRest) return b.pitches[b.pitches.length - 1].pitch
    }
    for (let i = beats.length - 1; i >= 0; i--) {
      if (beats[i].pitches.length > 0 && !beats[i].isRest) return beats[i].pitches[beats[i].pitches.length - 1].pitch
    }
    return null
  }, [beats, selectedBeatIdx])

  // Substituir nota selecionada (ao invés de inserir nova)
  const replaceNoteAtCursor = useCallback((pitch: string, accidental: string | null) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    setBeats(prev => prev.map((b, i) => {
      if (i !== selectedBeatIdx) return b
      return {
        ...b,
        pitches: [{ pitch, accidental }],
        isRest: false,
        ...(selectedClef === 'percussion' && DRUM_X_NOTEHEADS.has(pitch) ? { notehead: 'x' as const } : {}),
      }
    }))
    // Auto-advance: avançar para próxima nota após substituição
    if (selectedBeatIdx < beats.length - 1) {
      setSelectedElement({ type: 'note', beatIdx: selectedBeatIdx + 1 })
    }
    setCurrentAccidental(null)
    setLastNote(displayNote(pitch, accidental))
    setLastNoteInfo('Substituído')
    lastActionWasInsertRef.current = false
  }, [selectedBeatIdx, beats.length, selectedClef])

  const insertNoteAtCursor = useCallback((pitch: string, accidental: string | null) => {
    // Tuplet: se ativo, marca o beat com info de tuplet
    let tupletInfo: Beat['tuplet'] = undefined
    if (activeTuplet) {
      tupletInfo = { numNotes: activeTuplet.numNotes, notesOccupied: activeTuplet.notesOccupied, groupId: tupletGroupIdRef.current }
      tupletCounterRef.current--
      if (tupletCounterRef.current <= 0) {
        setActiveTuplet(null)
      }
    }
    const newBeat: Beat = {
      pitches: [{ pitch, accidental }],
      duration: currentDuration,
      isRest: false,
      tie: false,
      dotted: dottedMode,
      ...(tupletInfo ? { tuplet: tupletInfo } : {}),
      ...(selectedClef === 'percussion' && DRUM_X_NOTEHEADS.has(pitch) ? { notehead: 'x' as const } : {}),
      cifra: null,
      annotation: null,
      lyric: null,
    }
    if (selectedBeatIdx >= 0) {
      setBeats(prev => {
        const next = [...prev]
        next.splice(selectedBeatIdx + 1, 0, newBeat)
        return next
      })
      // Auto-advance: selecionar a nota recém-inserida
      setSelectedElement({ type: 'note', beatIdx: selectedBeatIdx + 1 })
    } else {
      setBeats(prev => [...prev, newBeat])
      setSelectedElement({ type: 'note', beatIdx: beats.length })
    }
    setCurrentAccidental(null)
    setLastNote(displayNote(pitch, accidental))
    setLastNoteInfo(DURATION_NAMES[currentDuration] + (dottedMode ? ' •' : '') + (tupletInfo ? ` (${tupletInfo.numNotes}:${tupletInfo.notesOccupied})` : ''))
    lastActionWasInsertRef.current = true
  }, [currentDuration, dottedMode, selectedClef, selectedBeatIdx, beats.length, activeTuplet])

  const insertRestAtCursor = useCallback(() => {
    const newBeat: Beat = {
      pitches: [{ pitch: 'b/4', accidental: null }],
      duration: currentDuration,
      isRest: true,
      tie: false,
      dotted: dottedMode,
      cifra: null,
      annotation: null,
      lyric: null,
    }
    if (selectedBeatIdx >= 0) {
      setBeats(prev => {
        const next = [...prev]
        next.splice(selectedBeatIdx + 1, 0, newBeat)
        return next
      })
      setSelectedElement({ type: 'note', beatIdx: selectedBeatIdx + 1 })
    } else {
      setBeats(prev => [...prev, newBeat])
      setSelectedElement({ type: 'note', beatIdx: beats.length })
    }
    setLastNote('𝄽')
    setLastNoteInfo('Pausa · ' + DURATION_NAMES[currentDuration] + (dottedMode ? ' •' : ''))
    lastActionWasInsertRef.current = true
  }, [currentDuration, dottedMode, selectedBeatIdx, beats.length])

  const addNoteToChord = useCallback((noteName: string) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) {
      // Se não há nota selecionada, selecionar a última nota primeiro
      if (beats.length > 0) {
        setSelectedElement({ type: 'note', beatIdx: beats.length - 1 })
      }
      return
    }
    const beat = beats[selectedBeatIdx]
    if (beat.isRest) return
    const octave = getSmartOctave(noteName, beat.pitches[0]?.pitch || null, selectedClef)
    const pitch = `${noteName.toLowerCase()}/${octave}`
    if (beat.pitches.find(p => p.pitch === pitch)) return
    const newPitches = [...beat.pitches, { pitch, accidental: currentAccidental }]
      .sort((a, b) => {
        const [, oA] = a.pitch.split('/')
        const [, oB] = b.pitch.split('/')
        if (oA !== oB) return parseInt(oA) - parseInt(oB)
        const order = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
        return order.indexOf(a.pitch[0]) - order.indexOf(b.pitch[0])
      })
    setBeats(prev => prev.map((b, i) => i === selectedBeatIdx ? { ...b, pitches: newPitches } : b))
    setCurrentAccidental(null)
    setLastNote(`${displayNote(pitch, currentAccidental)} (acorde)`)
    setLastNoteInfo('Empilhado')
  }, [selectedBeatIdx, beats, selectedClef, currentAccidental])

  const movePitchSemitone = useCallback((beatIndex: number, direction: number) => {
    if (beatIndex < 0 || beatIndex >= beats.length) return
    const beat = beats[beatIndex]
    if (!beat.pitches.length || beat.isRest) return
    setBeats(prev => prev.map((b, i) => {
      if (i !== beatIndex) return b
      const newPitches = b.pitches.map(p => {
        const [nameWithAcc, octStr] = p.pitch.split('/')
        let octave = parseInt(octStr)
        const name = nameWithAcc.replace(/[#bn]/g, '')
        const acc = nameWithAcc.includes('#') ? '#' : nameWithAcc.includes('b') ? 'b' : ''
        const scaleRef = acc === 'b' ? CHROMATIC_FLAT : CHROMATIC_SHARP
        let idx = scaleRef.findIndex(n => n.toLowerCase() === (name + acc).toLowerCase())
        if (idx === -1) idx = CHROMATIC_SHARP.findIndex(n => n.toLowerCase() === name.toLowerCase())
        if (idx === -1) return p
        idx += direction
        if (idx >= 12) { idx -= 12; octave++ }
        if (idx < 0) { idx += 12; octave-- }
        const newName = scaleRef[idx]
        const newAcc = newName.includes('#') ? '#' : newName.includes('b') ? 'b' : null
        const cleanName = newName.replace(/[#b]/g, '').toLowerCase()
        return { pitch: `${cleanName}/${octave}`, accidental: newAcc }
      })
      return { ...b, pitches: newPitches }
    }))
  }, [beats])

  const movePitchOctave = useCallback((beatIndex: number, direction: number) => {
    if (beatIndex < 0 || beatIndex >= beats.length) return
    const beat = beats[beatIndex]
    if (!beat.pitches.length || beat.isRest) return
    setBeats(prev => prev.map((b, i) => {
      if (i !== beatIndex) return b
      const newPitches = b.pitches.map(p => {
        const [name, octStr] = p.pitch.split('/')
        const newOct = parseInt(octStr) + direction
        if (newOct < 0 || newOct > 8) return p
        return { ...p, pitch: `${name}/${newOct}` }
      })
      return { ...b, pitches: newPitches }
    }))
  }, [beats])

  // ── Fase 2: Transposição ────────────────────────────────────────────
  const applyTransposition = useCallback((semitones: number) => {
    if (semitones === 0 || beats.length === 0) return
    setBeats(prev => prev.map(b => {
      if (b.isRest) return b
      const newPitches = b.pitches.map(p => transposePitch(p.pitch, p.accidental, semitones))
      return { ...b, pitches: newPitches }
    }))
    if (selectedClef !== 'percussion') {
      setSelectedKey(prev => transposeKey(prev, semitones))
    }
  }, [beats.length, selectedClef])

  const changeDuration = useCallback((beatIndex: number, dir: 'increase' | 'decrease') => {
    if (beatIndex < 0 || beatIndex >= beats.length) return
    const idx = DURATION_ORDER.indexOf(beats[beatIndex].duration as any)
    if (idx === -1) return
    const newIdx = dir === 'increase' ? idx + 1 : idx - 1
    if (newIdx < 0 || newIdx >= DURATION_ORDER.length) return
    setBeats(prev => prev.map((b, i) => i === beatIndex ? { ...b, duration: DURATION_ORDER[newIdx] } : b))
  }, [beats])

  const toggleStemDirection = useCallback((beatIndex: number) => {
    if (beatIndex < 0 || beatIndex >= beats.length) return
    setBeats(prev => prev.map((b, i) => {
      if (i !== beatIndex) return b
      const next = b.stemDirection === 'up' ? 'down' : b.stemDirection === 'down' ? undefined : 'up'
      return { ...b, stemDirection: next }
    }))
  }, [beats])

  const repeatLastNote = useCallback(() => {
    const last = [...beats].reverse().find(b => !b.isRest && b.pitches.length > 0)
    if (!last) return
    const clone: Beat = { ...last, tie: false, cifra: null, annotation: null, lyric: null, cifra_offset: undefined, annotation_offset: undefined, lyric_offset: undefined }
    if (selectedBeatIdx >= 0) {
      setBeats(prev => {
        const next = [...prev]
        next.splice(selectedBeatIdx + 1, 0, clone)
        return next
      })
      setSelectedElement({ type: 'note', beatIdx: selectedBeatIdx + 1 })
    } else {
      setBeats(prev => [...prev, clone])
      setSelectedElement({ type: 'note', beatIdx: beats.length })
    }
  }, [beats, selectedBeatIdx])

  // ── Fase 2: Toggle articulação ──────────────────────────────────
  const toggleArticulation = useCallback((artCode: string) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    setBeats(prev => prev.map((b, i) => {
      if (i !== selectedBeatIdx) return b
      const arts = b.articulations ? [...b.articulations] : []
      const idx = arts.indexOf(artCode)
      if (idx >= 0) arts.splice(idx, 1)
      else arts.push(artCode)
      return { ...b, articulations: arts.length > 0 ? arts : undefined }
    }))
  }, [selectedBeatIdx, beats.length])

  // ── Fase 3: Setar dinâmica ──────────────────────────────────
  const setDynamic = useCallback((dyn: string | undefined) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    setBeats(prev => prev.map((b, i) => {
      if (i !== selectedBeatIdx) return b
      return { ...b, dynamic: dyn }
    }))
  }, [selectedBeatIdx, beats.length])

  // ── Fase 3: Toggle hairpin (crescendo/decrescendo) ──────────────────────────────────
  const toggleHairpin = useCallback((type: 'crescendo' | 'decrescendo') => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    
    if (activeHairpin) {
      // Fechar hairpin: marcar beat atual como fim
      if (selectedBeatIdx > activeHairpin.startBeatIdx) {
        setBeats(prev => prev.map((b, i) => {
          if (i === activeHairpin.startBeatIdx) return { ...b, hairpinStart: activeHairpin.type }
          if (i === selectedBeatIdx) return { ...b, hairpinEnd: true }
          return b
        }))
      }
      setActiveHairpin(null)
    } else {
      // Iniciar hairpin: marcar beat atual como início
      setActiveHairpin({ type, startBeatIdx: selectedBeatIdx })
    }
  }, [selectedBeatIdx, beats.length, activeHairpin])

  // ── Fase 3: Adicionar grace note ao beat selecionado ──────────────────────────────────
  const addGraceNote = useCallback((pitch: string, accidental: string | null) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    setBeats(prev => prev.map((b, i) => {
      if (i !== selectedBeatIdx) return b
      const existingGrace = b.graceNotes || { pitches: [], type: 'acciaccatura' as const, duration: '8' }
      return {
        ...b,
        graceNotes: {
          ...existingGrace,
          pitches: [...existingGrace.pitches, { pitch, accidental }],
        },
      }
    }))
    setGraceNoteMode(false)
  }, [selectedBeatIdx, beats.length])

  // ── Fase 3: Toggle ornamento ──────────────────────────────────
  const toggleOrnament = useCallback((ornCode: string) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    setBeats(prev => prev.map((b, i) => {
      if (i !== selectedBeatIdx) return b
      return { ...b, ornament: b.ornament === ornCode ? undefined : ornCode }
    }))
  }, [selectedBeatIdx, beats.length])

  // ── Fase 3: Toggle slur (ligadura de expressão) ──────────────────────────────────
  const toggleSlur = useCallback(() => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    
    if (activeSlur) {
      // Fechar slur: marcar beat atual como fim
      if (selectedBeatIdx > activeSlur.startBeatIdx) {
        setBeats(prev => prev.map((b, i) => {
          if (i === activeSlur.startBeatIdx) return { ...b, slurStart: true }
          if (i === selectedBeatIdx) return { ...b, slurEnd: true }
          return b
        }))
      }
      setActiveSlur(null)
    } else {
      // Iniciar slur: marcar beat atual como início
      setActiveSlur({ startBeatIdx: selectedBeatIdx })
    }
  }, [selectedBeatIdx, beats.length, activeSlur])

  // ── Fase 3: Toggle volta bracket (1ª vez, 2ª vez) ──────────────────────────────────
  const toggleVolta = useCallback((voltaNumber: number) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    
    if (activeVolta && activeVolta.number === voltaNumber) {
      // Fechar volta: marcar beat atual como fim
      if (selectedBeatIdx > activeVolta.startBeatIdx) {
        setBeats(prev => prev.map((b, i) => {
          if (i === activeVolta.startBeatIdx) {
            return { ...b, volta: { number: voltaNumber, isStart: true, isEnd: false } }
          }
          if (i === selectedBeatIdx) {
            return { ...b, volta: { number: voltaNumber, isStart: false, isEnd: true } }
          }
          return b
        }))
      }
      setActiveVolta(null)
    } else {
      // Iniciar volta: marcar beat atual como início
      setActiveVolta({ number: voltaNumber, startBeatIdx: selectedBeatIdx })
    }
  }, [selectedBeatIdx, beats.length, activeVolta])

  // ── Fase 3: Toggle pedal marking ──────────────────────────────────
  const togglePedal = useCallback(() => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    
    if (activePedal) {
      // Fechar pedal: marcar beat atual como fim
      if (selectedBeatIdx > activePedal.startBeatIdx) {
        setBeats(prev => prev.map((b, i) => {
          if (i === activePedal.startBeatIdx) return { ...b, pedalStart: true }
          if (i === selectedBeatIdx) return { ...b, pedalEnd: true }
          return b
        }))
      }
      setActivePedal(null)
    } else {
      // Iniciar pedal: marcar beat atual como início
      setActivePedal({ startBeatIdx: selectedBeatIdx })
    }
  }, [selectedBeatIdx, beats.length, activePedal])

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

  // Helper: aplica armadura da tonalidade à nota para playback
  const applyKeySignatureToNote = useCallback((noteLetter: string, octave: string, noteAccidental: string | null): string => {
    // Notas afetadas por cada armadura
    const KEY_SHARPS_MAP: Record<string, string[]> = {
      'G': ['f'], 'D': ['f', 'c'], 'A': ['f', 'c', 'g'], 'E': ['f', 'c', 'g', 'd'],
      'B': ['f', 'c', 'g', 'd', 'a'], 'F#': ['f', 'c', 'g', 'd', 'a', 'e'], 'C#': ['f', 'c', 'g', 'd', 'a', 'e', 'b'],
    }
    const KEY_FLATS_MAP: Record<string, string[]> = {
      'F': ['b'], 'Bb': ['b', 'e'], 'Eb': ['b', 'e', 'a'], 'Ab': ['b', 'e', 'a', 'd'],
      'Db': ['b', 'e', 'a', 'd', 'g'], 'Gb': ['b', 'e', 'a', 'd', 'g', 'c'], 'Cb': ['b', 'e', 'a', 'd', 'g', 'c', 'f'],
    }
    
    const letter = noteLetter.toLowerCase().replace(/[#b]/g, '')
    
    // Se a nota já tem acidente explícito, usa ele
    if (noteAccidental) {
      if (noteAccidental === '#') return `${letter.toUpperCase()}#${octave}`
      if (noteAccidental === 'b') return `${letter.toUpperCase()}b${octave}`
      return `${letter.toUpperCase()}${octave}`
    }
    
    // Aplica armadura
    const sharps = KEY_SHARPS_MAP[selectedKey] || []
    const flats = KEY_FLATS_MAP[selectedKey] || []
    
    if (sharps.includes(letter)) return `${letter.toUpperCase()}#${octave}`
    if (flats.includes(letter)) return `${letter.toUpperCase()}b${octave}`
    
    return `${letter.toUpperCase()}${octave}`
  }, [selectedKey])

  const playAll = useCallback(async () => {
    if (isPlaying) { stopPlayback(); return }
    if (beats.length === 0) return
    await Tone.start()
    initSynth()
    setIsPlaying(true)

    const beatDuration = 60 / bpm
    const DURATIONS: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125, '64': 0.0625 }

    let delay = 0
    const timeouts: number[] = []

    beats.forEach((beat, index) => {
      const dur = DURATIONS[beat.duration] || 1
      let seconds = dur * beatDuration * (beat.doubleDotted ? 1.75 : beat.dotted ? 1.5 : 1)
      // Ajustar duração para tuplets (ex: tercina = 3 notas no espaço de 2)
      if (beat.tuplet) {
        seconds = seconds * (beat.tuplet.notesOccupied / beat.tuplet.numNotes)
      }

      // Highlight visual
      const hlId = window.setTimeout(() => setPlayingBeatIndex(index), delay * 1000)
      timeouts.push(hlId)

      if (!beat.isRest) {
        const notes = beat.pitches.map(p => {
          const parts = p.pitch.split('/')
          if (parts.length !== 2) return p.pitch
          // Aplica armadura da tonalidade ao playback
          return applyKeySignatureToNote(parts[0], parts[1], p.accidental)
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
  }, [isPlaying, beats, bpm, stopPlayback, initSynth, applyKeySignatureToNote])

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

  // ── Handler unificado de teclado (hidden input) ───────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const key = e.key
    const upper = key.toUpperCase()
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'TEXTAREA') return
    if (tag === 'INPUT' && e.target !== hiddenInputRef.current) return

    // ── Ctrl combos (sempre ativos) ──
    if (e.ctrlKey || e.metaKey) {
      if (key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return }
      if (key === 'y') { e.preventDefault(); redo(); return }
      if (key === 'c') { e.preventDefault(); copyBeat(); return }
      if (key === 'v') { e.preventDefault(); pasteBeat(); return }
      if (key === 'ArrowUp' && selectedBeatIdx >= 0) { e.preventDefault(); movePitchOctave(selectedBeatIdx, 1); return }
      if (key === 'ArrowDown' && selectedBeatIdx >= 0) { e.preventDefault(); movePitchOctave(selectedBeatIdx, -1); return }
      // ── Ctrl+D — Abrir popover de dinâmicas ──
      if (upper === 'D' && selectedBeatIdx >= 0) {
        e.preventDefault()
        setShowDynamicsPopover(prev => !prev)
        return
      }
      // ── Ctrl+3/5/6/7 — Ativar tuplet ──
      const tupletMap: Record<string, { numNotes: number; notesOccupied: number }> = {
        '3': { numNotes: 3, notesOccupied: 2 },
        '5': { numNotes: 5, notesOccupied: 4 },
        '6': { numNotes: 6, notesOccupied: 4 },
        '7': { numNotes: 7, notesOccupied: 4 },
      }
      if (tupletMap[key] && isKeyboardMode) {
        e.preventDefault()
        const t = tupletMap[key]
        setActiveTuplet(t)
        tupletCounterRef.current = t.numNotes
        tupletGroupIdRef.current = `tup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        return
      }
      return
    }

    // ── N — Toggle keyboard input mode ──
    if (upper === 'N' && !e.altKey && !e.shiftKey) {
      e.preventDefault()
      setIsKeyboardMode(prev => {
        if (!prev && beats.length > 0) setSelectedElement({ type: 'note', beatIdx: beats.length - 1 })
        return !prev
      })
      return
    }

    // ── Escape — Sair do modo input / desselecionar ──
    if (key === 'Escape') {
      if (isKeyboardMode) { e.preventDefault(); setIsKeyboardMode(false); return }
      if (graceNoteMode) { e.preventDefault(); setGraceNoteMode(false); return }
      if (activeHairpin) { e.preventDefault(); setActiveHairpin(null); return }
      if (activeSlur) { e.preventDefault(); setActiveSlur(null); return }
      if (activeVolta) { e.preventDefault(); setActiveVolta(null); return }
      if (activePedal) { e.preventDefault(); setActivePedal(null); return }
      if (selectedElement) { e.preventDefault(); setSelectedElement(null); return }
      return
    }

    // ── Ctrl+L — Toggle slur (ligadura de expressão) ──
    if (e.ctrlKey && upper === 'L' && selectedBeatIdx >= 0 && !beats[selectedBeatIdx]?.isRest) {
      e.preventDefault()
      toggleSlur()
      return
    }

    // ── Ctrl+1 / Ctrl+2 — Volta brackets (1ª vez, 2ª vez) ──
    if (e.ctrlKey && (key === '1' || key === '2') && selectedBeatIdx >= 0) {
      e.preventDefault()
      toggleVolta(parseInt(key))
      return
    }

    // ── Ctrl+P — Toggle pedal marking ──
    if (e.ctrlKey && upper === 'P' && selectedBeatIdx >= 0) {
      e.preventDefault()
      togglePedal()
      return
    }

    // ── / — Ativar modo grace note ──
    if (e.key === '/' && !e.ctrlKey && !e.altKey && selectedBeatIdx >= 0 && !beats[selectedBeatIdx]?.isRest) {
      e.preventDefault()
      setGraceNoteMode(true)
      return
    }

    // ── < — Crescendo (Shift+,) ──
    if (e.key === '<' && selectedBeatIdx >= 0) {
      e.preventDefault()
      toggleHairpin('crescendo')
      return
    }

    // ── > — Decrescendo (Shift+.) ──
    if (e.key === '>' && selectedBeatIdx >= 0) {
      e.preventDefault()
      toggleHairpin('decrescendo')
      return
    }

    // ── Space — Play/Pause ──
    if (key === ' ' && inputMode !== 'lyric' && inputMode !== 'cifra' && inputMode !== 'annotation') {
      e.preventDefault(); playAll(); return
    }

    // ── Durações 1-7 ──
    if ('1234567'.includes(key) && !e.altKey && !e.shiftKey) {
      e.preventDefault()
      const map: Record<string, string> = { '1': '64', '2': '32', '3': '16', '4': '8', '5': 'q', '6': 'h', '7': 'w' }
      setCurrentDuration(map[key])
      return
    }

    // ── Tab — Recuar cursor (como Backspace na tablatura) ──
    if (key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      lastActionWasInsertRef.current = false
      if (selectedBeatIdx > 0) {
        setSelectedElement({ type: 'note', beatIdx: selectedBeatIdx - 1 })
      } else if (beats.length > 0 && selectedBeatIdx === -1) {
        setSelectedElement({ type: 'note', beatIdx: beats.length - 1 })
      }
      return
    }

    // ── Navegação ←/→ (com auto-expand no final) ──
    if (key === 'ArrowLeft' && !e.shiftKey) {
      e.preventDefault()
      lastActionWasInsertRef.current = false
      if (selectedBeatIdx > 0) setSelectedElement({ type: 'note', beatIdx: selectedBeatIdx - 1 })
      else if (beats.length > 0 && selectedBeatIdx === -1) setSelectedElement({ type: 'note', beatIdx: beats.length - 1 })
      return
    }
    if (key === 'ArrowRight' && !e.shiftKey) {
      e.preventDefault()
      lastActionWasInsertRef.current = false
      if (selectedBeatIdx >= 0 && selectedBeatIdx < beats.length - 1) {
        setSelectedElement({ type: 'note', beatIdx: selectedBeatIdx + 1 })
      } else if (selectedBeatIdx === beats.length - 1 && isKeyboardMode) {
        // Auto-expand: criar nova nota vazia (pausa) e selecionar
        const newBeat: Beat = {
          pitches: [{ pitch: 'b/4', accidental: null }],
          duration: currentDuration,
          isRest: true,
          tie: false,
          dotted: dottedMode,
          cifra: null,
          annotation: null,
          lyric: null,
        }
        setBeats(prev => [...prev, newBeat])
        setSelectedElement({ type: 'note', beatIdx: beats.length })
      } else if (beats.length > 0 && selectedBeatIdx === -1) {
        setSelectedElement({ type: 'note', beatIdx: 0 })
      }
      return
    }

    // ── ↑/↓ — Mover pitch semitom ──
    if (key === 'ArrowUp' && !e.shiftKey && selectedBeatIdx >= 0) {
      e.preventDefault(); movePitchSemitone(selectedBeatIdx, 1); return
    }
    if (key === 'ArrowDown' && !e.shiftKey && selectedBeatIdx >= 0) {
      e.preventDefault(); movePitchSemitone(selectedBeatIdx, -1); return
    }

    // ── Delete — Apagar nota selecionada ──
    if (key === 'Delete' && selectedElement) {
      e.preventDefault(); deleteSelected(); return
    }

    // ── Backspace inteligente — Apagar nota atual, retroceder cursor, contrair grid ──
    if (key === 'Backspace' && selectedElement && selectedElement.type === 'note') {
      e.preventDefault()
      const currentIdx = selectedElement.beatIdx
      
      // Apagar a nota atual
      setBeats(prev => {
        const next = prev.filter((_, i) => i !== currentIdx)
        return next
      })
      
      // Retroceder cursor (ou desselecionar se era a primeira)
      if (currentIdx > 0) {
        setSelectedElement({ type: 'note', beatIdx: currentIdx - 1 })
      } else if (beats.length > 1) {
        setSelectedElement({ type: 'note', beatIdx: 0 })
      } else {
        setSelectedElement(null)
      }
      return
    }

    // ── . (ponto) — Ciclar: sem → ponto → duplo ponto → sem ──
    if (key === '.') {
      e.preventDefault()
      if (selectedBeatIdx >= 0 && !isKeyboardMode) {
        setBeats(prev => prev.map((b, i) => {
          if (i !== selectedBeatIdx) return b
          if (!b.dotted && !b.doubleDotted) return { ...b, dotted: true, doubleDotted: undefined }
          if (b.dotted && !b.doubleDotted) return { ...b, dotted: false, doubleDotted: true }
          return { ...b, dotted: false, doubleDotted: undefined }
        }))
      } else {
        setDottedMode(prev => !prev)
      }
      return
    }

    // ── Q/W — Diminuir/aumentar duração ──
    if (upper === 'Q' && !e.altKey && !e.shiftKey && selectedBeatIdx >= 0) {
      e.preventDefault(); changeDuration(selectedBeatIdx, 'decrease'); return
    }
    if (upper === 'W' && !e.altKey && !e.shiftKey && selectedBeatIdx >= 0) {
      e.preventDefault(); changeDuration(selectedBeatIdx, 'increase'); return
    }

    // ── X — Inverter stem ──
    if (upper === 'X' && !e.altKey && !e.shiftKey && selectedBeatIdx >= 0) {
      e.preventDefault(); toggleStemDirection(selectedBeatIdx); return
    }

    // ── T — Toggle tie ──
    if (upper === 'T' && !e.altKey && !e.shiftKey && isKeyboardMode && selectedBeatIdx >= 0) {
      e.preventDefault()
      setBeats(prev => prev.map((b, i) => i === selectedBeatIdx ? { ...b, tie: !b.tie } : b))
      return
    }

    // ── 0 — Inserir pausa ──
    if (key === '0' && isKeyboardMode) {
      e.preventDefault(); insertRestAtCursor(); return
    }

    // ── R — Repetir última nota ──
    if (upper === 'R' && isKeyboardMode && !e.altKey && !e.shiftKey) {
      e.preventDefault(); repeatLastNote(); return
    }

    // ── Grace notes A-G (quando graceNoteMode ativo) ──
    if (graceNoteMode && 'ABCDEFG'.includes(upper) && !e.altKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault()
      const octave = getSmartOctave(upper, getLastPitch(), selectedClef)
      const accSuffix = currentAccidental === '#' ? '#' : currentAccidental === 'b' ? 'b' : ''
      const pitch = `${upper.toLowerCase()}${accSuffix}/${octave}`
      addGraceNote(pitch, currentAccidental)
      return
    }

    // ── Notas A-G (só em keyboard mode) ──
    if (isKeyboardMode && 'ABCDEFG'.includes(upper) && !e.altKey && !e.metaKey) {
      e.preventDefault()
      if (e.shiftKey) {
        addNoteToChord(upper)
      } else {
        const octave = getSmartOctave(upper, getLastPitch(), selectedClef)
        const accSuffix = currentAccidental === '#' ? '#' : currentAccidental === 'b' ? 'b' : ''
        const pitch = `${upper.toLowerCase()}${accSuffix}/${octave}`
        // Substituição direta: se há nota selecionada, substituir; senão, inserir
        if (selectedBeatIdx >= 0 && selectedBeatIdx < beats.length) {
          if (lastActionWasInsertRef.current) {
            insertNoteAtCursor(pitch, currentAccidental)
          } else {
            replaceNoteAtCursor(pitch, currentAccidental)
          }
        } else {
          insertNoteAtCursor(pitch, currentAccidental)
        }
      }
      return
    }

    // ── Shift+S/V/E/M/F — Articulações (não conflita com A-G) ──
    if (e.shiftKey && !e.ctrlKey && !e.altKey && selectedBeatIdx >= 0) {
      const artMap: Record<string, string> = {
        'S': 'a.',   // staccato
        'V': 'a>',   // acento
        'E': 'a-',   // tenuto
        'M': 'a^',   // marcato
        'F': 'a@a',  // fermata
      }
      const artCode = artMap[upper]
      if (artCode) {
        e.preventDefault()
        toggleArticulation(artCode)
        return
      }
    }
  }, [
    isKeyboardMode, selectedBeatIdx, selectedElement, beats, inputMode,
    currentDuration, currentAccidental, dottedMode, selectedClef,
    undo, redo, copyBeat, pasteBeat, playAll,
    deleteSelected, movePitchSemitone, movePitchOctave,
    changeDuration, toggleStemDirection, insertNoteAtCursor, insertRestAtCursor,
    addNoteToChord, repeatLastNote, getLastPitch, toggleArticulation, replaceNoteAtCursor,
  ])

  // Focar hidden input ao clicar no editor
  const focusHiddenInput = useCallback(() => {
    hiddenInputRef.current?.focus()
  }, [])

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
        notation_data: { beats: beatsToSaveFormat(beats), ...(bpm !== 120 ? { bpm } : {}) },
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

  // ── Fase 3: Exportar MIDI ──────────────────────────────────────────
  const exportMidi = useCallback(() => {
    if (beats.length === 0) return

    const track = new MidiWriter.Track()
    track.setTempo(bpm)
    track.addTrackName(notationName || 'LA Journey Export')

    // Converter duração VexFlow para MIDI (1 = quarter note)
    const durationToMidi: Record<string, string> = {
      'w': '1', 'h': '2', 'q': '4', '8': '8', '16': '16', '32': '32', '64': '64'
    }

    beats.forEach(beat => {
      const dur = beat.duration.replace('d', '') // remover ponto
      const midiDur = durationToMidi[dur] || '4'
      const dotted = beat.duration.includes('d')

      if (beat.isRest) {
        // Pausa: usar nota silenciosa (wait)
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: ['C4'],
          duration: dotted ? `d${midiDur}` : midiDur,
          velocity: 0,
        }))
      } else {
        // Converter pitches para formato MIDI (C4, D#5, etc.)
        const midiPitches = beat.pitches.map(p => {
          const [note, octave] = p.pitch.split('/')
          const acc = p.accidental === '#' ? '#' : p.accidental === 'b' ? 'b' : ''
          return `${note.toUpperCase()}${acc}${octave}`
        })

        // Velocity baseada na dinâmica
        let velocity = 80
        if (beat.dynamic) {
          const dynMap: Record<string, number> = {
            'ppp': 20, 'pp': 35, 'p': 50, 'mp': 65, 'mf': 80, 'f': 95, 'ff': 110, 'fff': 127, 'sfz': 127
          }
          velocity = dynMap[beat.dynamic] || 80
        }

        track.addEvent(new MidiWriter.NoteEvent({
          pitch: midiPitches,
          duration: dotted ? `d${midiDur}` : midiDur,
          velocity,
        }))
      }
    })

    const write = new MidiWriter.Writer([track])
    const blob = new Blob([write.buildFile()], { type: 'audio/midi' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${notationName || 'notation'}.mid`
    a.click()
    URL.revokeObjectURL(url)
  }, [beats, bpm, notationName])

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
      {/* CSS para animação do cursor pulsante */}
      <style>{`
        @keyframes notationPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 12px rgba(255, 45, 120, 0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 20px rgba(255, 45, 120, 0.6); }
        }
      `}</style>
      <DialogContent
        className="sm:max-w-[1100px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-surface border-border"
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
                  {TIME_GROUPS.map((group, gi) => (
                    <div key={group.label}>
                      {gi > 0 && <div className="h-px bg-border my-1" />}
                      <div className="text-[9px] text-text3 px-2 py-0.5 uppercase font-semibold">{group.label}</div>
                      {group.options.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Armadura (esconder em percussão) */}
          {selectedClef !== 'percussion' && (
            <div className="space-y-1 min-w-[120px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Armadura</span>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger className="h-[34px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <div className="text-[9px] text-text3 px-2 py-0.5 uppercase font-semibold">Sustenidos</div>
                  {KEY_SHARPS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  <div className="h-px bg-border my-1" />
                  <div className="text-[9px] text-text3 px-2 py-0.5 uppercase font-semibold">Bemóis</div>
                  {KEY_FLATS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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

        {/* ── Toolbar (responsiva com wrap) ── */}
        <div className="flex flex-wrap gap-[2px] items-center rounded-[9px] mb-2.5" style={{ padding: '5px 6px', backgroundColor: '#162032' }}>
          {/* Duração */}
          {[
            { key: 'w', label: '𝅝', tip: 'Semibreve (7)' },
            { key: 'h', label: '𝅗𝅥', tip: 'Mínima (6)' },
            { key: 'q', label: '♩', tip: 'Semínima (5)' },
            { key: '8', label: '♪', tip: 'Colcheia (4)' },
            { key: '16', label: '𝅘𝅥𝅯', tip: 'Semicolcheia (3)' },
            { key: '32', label: '𝅘𝅥𝅰', tip: 'Fusa (2)' },
            { key: '64', label: '𝅘𝅥𝅱', tip: 'Semifusa (1)' },
          ].map(d => (
            <TBtn
              key={d.key}
              active={currentDuration === d.key}
              onClick={() => {
                // Se há nota/pausa selecionada, muda a duração dela
                if (selectedBeatIdx >= 0 && selectedBeatIdx < beats.length) {
                  setBeats(prev => prev.map((b, i) => i === selectedBeatIdx ? { ...b, duration: d.key } : b))
                }
                setCurrentDuration(d.key)
              }}
              title={d.tip}
            >
              {d.label}
            </TBtn>
          ))}
          <TBtn active={restMode} onClick={() => setRestMode(p => !p)} title="Pausa (0 no modo input)">
            <span style={{ fontSize: 10, padding: '0 2px' }}>🔇</span>
          </TBtn>
          <TBtn active={dottedMode} onClick={() => setDottedMode(p => !p)} title="Ponto de aumento (.)">
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

          {/* Articulações */}
          {selectedBeatIdx >= 0 && !beats[selectedBeatIdx]?.isRest && (<>
            {[
              { code: 'a.', label: '•', tip: 'Staccato (Shift+S)' },
              { code: 'a>', label: '>', tip: 'Acento (Shift+V)' },
              { code: 'a-', label: '—', tip: 'Tenuto (Shift+E)' },
              { code: 'a^', label: '^', tip: 'Marcato (Shift+M)' },
              { code: 'a@a', label: '𝄐', tip: 'Fermata (Shift+F)' },
            ].map(a => (
              <TBtn
                key={a.code}
                active={beats[selectedBeatIdx]?.articulations?.includes(a.code) || false}
                onClick={() => toggleArticulation(a.code)}
                title={a.tip}
              >
                <span style={{ fontSize: 11, fontWeight: 700, padding: '0 2px' }}>{a.label}</span>
              </TBtn>
            ))}
            <div style={{ width: 1, height: 18, backgroundColor: '#334155', margin: '0 3px' }} />
          </>)}

          {/* Dinâmicas (Fase 3) */}
          {selectedBeatIdx >= 0 && !beats[selectedBeatIdx]?.isRest && (
            <div style={{ position: 'relative' }}>
              <TBtn
                active={!!beats[selectedBeatIdx]?.dynamic}
                onClick={() => setShowDynamicsPopover(prev => !prev)}
                title="Dinâmicas (Ctrl+D)"
              >
                <span style={{ fontSize: 11, fontStyle: 'italic', fontFamily: 'serif', padding: '0 2px' }}>
                  {beats[selectedBeatIdx]?.dynamic || 'mf'}
                </span>
              </TBtn>
              {showDynamicsPopover && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, zIndex: 50,
                  backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8,
                  padding: 8, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4,
                  minWidth: 180, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                  {['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz', 'fp'].map(dyn => (
                    <button
                      key={dyn}
                      onClick={() => { setDynamic(dyn); setShowDynamicsPopover(false) }}
                      style={{
                        padding: '4px 6px', fontSize: 11, fontStyle: 'italic', fontFamily: 'serif',
                        backgroundColor: beats[selectedBeatIdx]?.dynamic === dyn ? '#FF2D78' : '#334155',
                        color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
                      }}
                    >
                      {dyn}
                    </button>
                  ))}
                  <button
                    onClick={() => { setDynamic(undefined); setShowDynamicsPopover(false) }}
                    style={{
                      gridColumn: 'span 5', padding: '4px 6px', fontSize: 9,
                      backgroundColor: 'transparent', color: '#94A3B8', border: '1px solid #334155',
                      borderRadius: 4, cursor: 'pointer', marginTop: 4,
                    }}
                  >
                    Remover dinâmica
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Ornamentos (Fase 3) */}
          {selectedBeatIdx >= 0 && !beats[selectedBeatIdx]?.isRest && (
            <>
              <TBtn
                active={beats[selectedBeatIdx]?.ornament === 'tr'}
                onClick={() => toggleOrnament('tr')}
                title="Trinado (tr)"
              >
                <span style={{ fontSize: 9, fontStyle: 'italic', fontFamily: 'serif' }}>tr</span>
              </TBtn>
              <TBtn
                active={beats[selectedBeatIdx]?.ornament === 'mordent'}
                onClick={() => toggleOrnament('mordent')}
                title="Mordente"
              >
                <span style={{ fontSize: 9, fontFamily: 'serif' }}>∿</span>
              </TBtn>
              <TBtn
                active={beats[selectedBeatIdx]?.ornament === 'turn'}
                onClick={() => toggleOrnament('turn')}
                title="Grupeto"
              >
                <span style={{ fontSize: 9, fontFamily: 'serif' }}>∞</span>
              </TBtn>
              <TBtn
                active={graceNoteMode || !!beats[selectedBeatIdx]?.graceNotes?.pitches?.length}
                onClick={() => setGraceNoteMode(prev => !prev)}
                title="Grace note (/) — apogiatura/acciaccatura"
              >
                <span style={{ fontSize: 9, fontFamily: 'serif' }}>♪</span>
              </TBtn>
              <TBtn
                active={activeSlur !== null || beats[selectedBeatIdx]?.slurStart || beats[selectedBeatIdx]?.slurEnd}
                onClick={toggleSlur}
                title="Slur (Ctrl+L) — ligadura de expressão"
                color={activeSlur ? 'green' : undefined}
              >
                <span style={{ fontSize: 9, fontFamily: 'serif' }}>⌒</span>
              </TBtn>
              <TBtn
                active={activeVolta?.number === 1 || beats[selectedBeatIdx]?.volta?.number === 1}
                onClick={() => toggleVolta(1)}
                title="Volta 1ª vez (Ctrl+1)"
                color={activeVolta?.number === 1 ? 'orange' : undefined}
              >
                <span style={{ fontSize: 8, fontWeight: 700 }}>1.</span>
              </TBtn>
              <TBtn
                active={activeVolta?.number === 2 || beats[selectedBeatIdx]?.volta?.number === 2}
                onClick={() => toggleVolta(2)}
                title="Volta 2ª vez (Ctrl+2)"
                color={activeVolta?.number === 2 ? 'orange' : undefined}
              >
                <span style={{ fontSize: 8, fontWeight: 700 }}>2.</span>
              </TBtn>
              <TBtn
                active={activePedal !== null || beats[selectedBeatIdx]?.pedalStart || beats[selectedBeatIdx]?.pedalEnd}
                onClick={togglePedal}
                title="Pedal (Ctrl+P) — Ped. ... *"
                color={activePedal ? 'purple' : undefined}
              >
                <span style={{ fontSize: 7, fontWeight: 700 }}>Ped</span>
              </TBtn>
            </>
          )}

          {/* Transposição */}
          {beats.length > 0 && selectedClef !== 'percussion' && (<>
            <TBtn active={false} onClick={() => applyTransposition(-1)} title="Transpor ½ tom abaixo">
              <ArrowDown size={12} weight="bold" />
            </TBtn>
            <TBtn active={false} onClick={() => applyTransposition(1)} title="Transpor ½ tom acima">
              <ArrowUp size={12} weight="bold" />
            </TBtn>
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

          {/* Keyboard input mode */}
          <TBtn
            active={isKeyboardMode}
            color={isKeyboardMode ? undefined : undefined}
            onClick={() => {
              setIsKeyboardMode(prev => {
                if (!prev && beats.length > 0) setSelectedElement({ type: 'note', beatIdx: beats.length - 1 })
                return !prev
              })
              focusHiddenInput()
            }}
            title="Modo teclado (N) — A-G insere notas"
          >
            <span style={{ fontSize: 10, padding: '0 2px', fontWeight: isKeyboardMode ? 800 : 400 }}>⌨ N</span>
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

          {/* Play / Stop + BPM */}
          <TBtn active={isPlaying} onClick={playAll} title={isPlaying ? 'Pausar (Espaço)' : 'Tocar (Espaço)'}>
            {isPlaying ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
          </TBtn>
          {isPlaying && (
            <TBtn active={false} onClick={stopPlayback} title="Parar">
              <Stop size={14} weight="fill" />
            </TBtn>
          )}
          <div className="flex items-center gap-1 ml-1">
            <Timer size={12} className="text-slate-400" />
            <Slider
              value={[bpm]}
              onValueChange={([v]: number[]) => setBpm(v)}
              min={40}
              max={220}
              step={1}
              className="w-16"
            />
            <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: '#94A3B8', minWidth: 28, textAlign: 'right' }}>
              {bpm}
            </span>
          </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10, alignItems: 'start' }}>
          {/* Área do editor: VexFlow multi-line + overlay */}
          <div ref={editorColRef} style={{ minWidth: 0 }}>
            <div
              ref={wrapRef}
              onClick={focusHiddenInput}
              style={{
                backgroundColor: '#fff',
                borderRadius: 10,
                padding: '10px 12px 18px',
                position: 'relative',
                overflowX: 'hidden',
                overflowY: 'auto',
                minHeight: 140,
                maxHeight: 460,
              }}
            >
              {/* Hidden input para captura de teclado */}
              <input
                ref={hiddenInputRef}
                onKeyDown={handleKeyDown}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
                tabIndex={0}
                aria-label="Entrada de notas por teclado"
                autoComplete="off"
              />

              {/* Indicador de modo (canto superior direito) */}
              <div style={{ position: 'absolute', top: 6, right: 10, zIndex: 15, pointerEvents: 'none', display: 'flex', gap: 6, alignItems: 'center' }}>
                {isKeyboardMode && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, fontFamily: "'DM Mono', monospace",
                    color: '#fff', background: '#22C55E', borderRadius: 4, padding: '1px 6px',
                    letterSpacing: '.5px', animation: 'pulse 2s infinite',
                  }}>
                    ⌨ INPUT
                  </span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                  color: inputMode === 'chord' ? '#6366F1' : inputMode === 'tie' ? '#F97316' : inputMode === 'cifra' ? '#6366F1' : inputMode === 'annotation' ? '#94A3B8' : inputMode === 'lyric' ? '#FF2D78' : '#22C55E',
                }}>
                  {inputMode === 'chord' ? '↕ ACORDE' : inputMode === 'tie' ? '⌒ LIGADURA' : inputMode === 'cifra' ? 'A7 CIFRA' : inputMode === 'annotation' ? '📝 TEXTO' : inputMode === 'lyric' ? '🎤 LETRA' : '→ MELÓDICO'}
                </span>
                {restMode && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#F59E0B' }}>🔇 PAUSA</span>}
                {dottedMode && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#A78BFA' }}>• PONTO</span>}
                {activeTuplet && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: '#F97316' }}>{activeTuplet.numNotes}:{activeTuplet.notesOccupied} ({tupletCounterRef.current})</span>}
                {activeHairpin && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#22C55E' }}>{activeHairpin.type === 'crescendo' ? '< CRESC' : '> DECRESC'} — navegar e repetir</span>}
                {graceNoteMode && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#A78BFA' }}>♪ GRACE — tecle A-G</span>}
                {activeSlur && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#10B981' }}>⌒ SLUR — navegar e Ctrl+L</span>}
                {activeVolta && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#F59E0B' }}>🔁 {activeVolta.number}ª VEZ — navegar e Ctrl+{activeVolta.number}</span>}
                {activePedal && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#8B5CF6' }}>🎹 PED — navegar e Ctrl+P</span>}
                {selectedClef === 'percussion' && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#FB923C' }}>🥁 PERC</span>}
              </div>

              {/* Camada 1: VexFlow multi-line preview + cifras/annotations/lyrics overlay */}
              <div
                className="notation-editor-vexflow"
                style={{
                  pointerEvents: dragging ? 'auto' : 'none', position: 'relative',
                  transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: 'top left',
                  width: '100%',
                  maxWidth: '100%',
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
                    const VF_FIRST = 60, VF_LAST = staveWidth - 127
                    const total = lineBts.length
                    if (total <= 1) return (VF_FIRST + VF_LAST) / 2
                    return VF_FIRST + (VF_LAST - VF_FIRST) * bi / (total - 1)
                  }
                  // pctX local usando staveWidth real (não o VF_VIEWBOX_W fixo)
                  const pctXLocal = (px: number) => `${(px / staveWidth) * 100}%`
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
                              left: pctXLocal(noteXpx(bi)),
                              top: pctY(VEXFLOW_STAFF_TOP - 4),
                              width: pctXLocal(22), height: pctY(VEXFLOW_STAFF_BOTTOM - VEXFLOW_STAFF_TOP + 8),
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

                      {/* Highlight de nota selecionada ou hover — com cursor pulsante */}
                      {lineBts.map((_, bi) => {
                        const globalIdx = globalOffset + bi
                        const isSelected = selectedElement?.type === 'note' && selectedElement.beatIdx === globalIdx
                        const isHovered = hoverBeatIdx === globalIdx && (inputMode === 'melodic' || inputMode === 'chord') && !selectedElement
                        if (!isSelected && !isHovered) return null
                        return (
                          <div
                            key={`sel-${bi}`}
                            style={{
                              position: 'absolute',
                              left: pctXLocal(noteXpx(bi)),
                              top: pctY(VEXFLOW_STAFF_TOP - 4),
                              width: pctXLocal(22), height: pctY(VEXFLOW_STAFF_BOTTOM - VEXFLOW_STAFF_TOP + 8),
                              transform: 'translateX(-50%)',
                              border: isSelected ? '2.5px solid #FF2D78' : '1.5px dashed #FF2D7866',
                              borderRadius: 6,
                              background: isSelected ? '#FF2D7820' : '#FF2D780A',
                              boxShadow: isSelected ? '0 0 12px rgba(255, 45, 120, 0.4)' : 'none',
                              zIndex: 4,
                              pointerEvents: 'none',
                              transition: 'all .12s',
                              animation: isSelected && isKeyboardMode ? 'notationPulse 1.2s ease-in-out infinite' : 'none',
                            }}
                          />
                        )
                      })}

                      {/* Barlines automáticas agora são renderizadas nativamente pelo VexFlow via BarNote */}

                      {/* Números de compasso (modo metered) — acima da barra de compasso */}
                      {editorMode === 'metered' && lineBts.map((_, bi) => {
                        const globalIdx = globalOffset + bi
                        const mNum = measureNumbers.get(globalIdx)
                        if (mNum === undefined) return null
                        // Posicionar acima da nota que inicia o compasso
                        return (
                          <span
                            key={`mnum-${bi}`}
                            style={{
                              position: 'absolute',
                              left: pctXLocal(noteXpx(bi)),
                              top: pctY(VEXFLOW_STAFF_TOP - 18),
                              transform: 'translateX(-50%)',
                              fontSize: 11,
                              fontWeight: 800,
                              fontFamily: "'DM Mono', monospace",
                              color: '#475569',
                              background: 'rgba(255,255,255,0.85)',
                              padding: '0 4px',
                              borderRadius: 3,
                              zIndex: 3,
                              pointerEvents: 'none',
                            }}
                          >
                            {mNum}
                          </span>
                        )
                      })}

                      {/* Cifras e annotations — position absolute, alinhado com notas */}
                      {lineBts.map((beat, bi) => {
                        if (!beat.cifra && !beat.annotation) return null
                        const globalIdx = globalOffset + bi
                        const isDraggingThis = (t: string) => dragging?.type === t && dragging?.beatIdx === globalIdx
                        return (
                          <div key={`ca-${bi}`} style={{ position: 'absolute', left: pctXLocal(noteXpx(bi)), top: 0, transform: 'translateX(-50%)', zIndex: 5 }}>
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
                              left: pctXLocal(noteXpx(bi)),
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
                  cursor: inputMode === 'lyric'
                    ? 'default'
                    : dragging
                      ? 'grabbing'
                      : hoverBeatIdx !== null
                        ? 'pointer'
                        : hoverPos !== null
                          ? 'none'
                          : 'crosshair', zIndex: 10,
                  pointerEvents: (inputMode === 'lyric' || dragging) ? 'none' : 'auto',
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleOverlayClick}
                onDoubleClick={handleOverlayDblClick}
              />

              {/* Ghost note visual + tooltip — SÓ em áreas vazias (não sobre notas existentes) */}
              {hoverPos !== null && hoverMouse && hoverBeatIdx === null && inputMode !== 'cifra' && inputMode !== 'annotation' && inputMode !== 'lyric' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: hoverMouse.x - 8,
                      top: hoverMouse.y - 8,
                      width: 16,
                      height: 12,
                      borderRadius: 999,
                      transform: 'rotate(-12deg)',
                      background: restMode ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 45, 120, 0.25)',
                      border: `1px solid ${restMode ? 'rgba(245, 158, 11, 0.45)' : 'rgba(255, 45, 120, 0.5)'}`,
                      zIndex: 19,
                      pointerEvents: 'none',
                    }}
                  />
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
                </>
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
              <span style={{ color: '#22C55E', fontWeight: 700 }}>N</span> = modo teclado ·{' '}
              <span style={{ color: '#22C55E' }}>A-G</span> = nota ·{' '}
              <span style={{ color: '#22C55E' }}>Shift+A-G</span> = acorde ·{' '}
              <span style={{ color: '#94A3B8' }}>1-7</span> = duração ·{' '}
              <span style={{ color: '#94A3B8' }}>0</span> = pausa ·{' '}
              <span style={{ color: '#22D3EE' }}>↑↓</span> = semitom ·{' '}
              <span style={{ color: '#22D3EE' }}>Ctrl+↑↓</span> = oitava ·{' '}
              <span style={{ color: '#94A3B8' }}>←→</span> = navegar ·{' '}
              <span style={{ color: '#94A3B8' }}>Q/W</span> = ±duração ·{' '}
              <span style={{ color: '#94A3B8' }}>T</span> = ligadura ·{' '}
              <span style={{ color: '#94A3B8' }}>.</span> = ponto ·{' '}
              <span style={{ color: '#94A3B8' }}>R</span> = repetir ·{' '}
              <span style={{ color: '#94A3B8' }}>X</span> = stem ·{' '}
              <span style={{ color: '#94A3B8' }}>Del</span> = apagar ·{' '}
              <span className="text-accent font-semibold">Espaço</span> = play
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
              variant="outline"
              onClick={exportMidi}
              disabled={beats.length === 0}
              title="Exportar MIDI"
            >
              <Export size={16} />
              MIDI
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
