import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FloppyDisk, Trash, X } from '@phosphor-icons/react'
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

// ─── Constantes musicais ────────────────────────────────────────────
const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NP = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si']
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]
const BLACK_POSITIONS = [
  { semitone: 1, afterWhite: 0 },
  { semitone: 3, afterWhite: 1 },
  { semitone: 6, afterWhite: 3 },
  { semitone: 8, afterWhite: 4 },
  { semitone: 10, afterWhite: 5 },
]

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
  major_scale: [0, 2, 4, 5, 7, 9, 11], minor_scale: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor_scale: [0, 2, 3, 5, 7, 8, 11], melodic_minor_scale: [0, 2, 3, 5, 7, 9, 11],
  penta: [0, 2, 4, 7, 9], blues: [0, 3, 5, 6, 7, 10],
}

// ─── Tensões (modificadores que se somam ao acorde base) ─────────
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

const FINGERING_RH: Record<string, number[]> = {
  major: [1, 3, 5], minor: [1, 3, 5], dim: [1, 3, 5], aug: [1, 3, 5],
  sus2: [1, 2, 5], sus4: [1, 4, 5], add9: [1, 2, 3, 5],
  '7': [1, 2, 3, 5], m7: [1, 2, 3, 5], maj7: [1, 2, 3, 5],
  dim7: [1, 2, 3, 5], m7b5: [1, 2, 3, 5],
  '6': [1, 2, 3, 5], m6: [1, 2, 3, 5], mmaj7: [1, 2, 3, 5],
  major_scale: [1, 2, 3, 1, 2, 3, 4, 5], minor_scale: [1, 2, 3, 1, 2, 3, 4, 5],
  harmonic_minor_scale: [1, 2, 3, 1, 2, 3, 4, 5], melodic_minor_scale: [1, 2, 3, 1, 2, 3, 4, 5],
  penta: [1, 2, 3, 1, 2, 3], blues: [1, 2, 3, 1, 2, 3, 4],
}

const FINGERING_LH: Record<string, number[]> = {
  major: [5, 3, 1], minor: [5, 3, 1], dim: [5, 3, 1], aug: [5, 3, 1],
  sus2: [5, 4, 1], sus4: [5, 2, 1], add9: [5, 4, 2, 1],
  '7': [5, 4, 2, 1], m7: [5, 4, 2, 1], maj7: [5, 4, 2, 1],
  dim7: [5, 4, 2, 1], m7b5: [5, 4, 2, 1],
  '6': [5, 4, 2, 1], m6: [5, 4, 2, 1], mmaj7: [5, 4, 2, 1],
  major_scale: [5, 4, 3, 2, 1, 3, 2, 1], minor_scale: [5, 4, 3, 2, 1, 3, 2, 1],
  harmonic_minor_scale: [5, 4, 3, 2, 1, 3, 2, 1], melodic_minor_scale: [5, 4, 3, 2, 1, 3, 2, 1],
  penta: [3, 2, 1, 3, 2, 1], blues: [4, 3, 2, 1, 3, 2, 1],
}

const PRESET_LABELS: Record<string, string> = {
  major: 'Maior', minor: 'Menor', dim: 'Dim', aug: 'Aug', sus2: 'sus2', sus4: 'sus4', add9: 'add9',
  '7': '7', m7: 'm7', maj7: 'Maj7', dim7: 'dim7', m7b5: 'm7(b5)',
  '6': '6', m6: 'm6', mmaj7: 'mMaj7',
  major_scale: 'Escala Maior', minor_scale: 'Menor Natural',
  harmonic_minor_scale: 'Menor Harmônica', melodic_minor_scale: 'Menor Melódica',
  penta: 'Pentatônica', blues: 'Blues',
}

const QUALITY_MAP: Record<string, string> = {
  major: 'major', minor: 'minor', dim: 'diminished', aug: 'augmented',
  sus2: 'sus2', sus4: 'sus4', add9: 'add9',
  '7': 'dominant7', m7: 'minor7', maj7: 'major7', dim7: 'diminished7', m7b5: 'half_diminished',
  '6': 'major6', m6: 'minor6', mmaj7: 'minor_major7',
}

const TYPE_MAP: Record<string, string> = {
  major: 'triad', minor: 'triad', dim: 'triad', aug: 'triad',
  sus2: 'triad', sus4: 'triad', add9: 'triad',
  '7': 'tetrad', m7: 'tetrad', maj7: 'tetrad', dim7: 'tetrad', m7b5: 'tetrad',
  '6': 'tetrad', m6: 'tetrad', mmaj7: 'tetrad',
  major_scale: 'scale', minor_scale: 'scale', harmonic_minor_scale: 'scale', melodic_minor_scale: 'scale',
  penta: 'scale', blues: 'scale',
}

// ─── Tipos ──────────────────────────────────────────────────────────
interface KeyInfo { finger: number }
type KeyMap = Map<number, KeyInfo>
type EditorMode = 'chord' | 'scale' | 'arpeggio'
type ActiveHand = 'right' | 'left'
type VoicingPosition = 'root_position' | '1st_inversion' | '2nd_inversion' | '3rd_inversion'

const VOICING_LABELS: Record<VoicingPosition, string> = {
  root_position: 'Fund.',
  '1st_inversion': '1ª Pos',
  '2nd_inversion': '2ª Pos',
  '3rd_inversion': '3ª Pos',
}

export interface PianoChordData {
  name: string
  instrument: 'piano'
  positions: {
    keys: string[]
    keys_lh?: string[]
    root: string
    octave: number
    fingering_rh: number[]
    fingering_lh: number[]
    type: string
    quality: string
    octave_start: number
    octave_count: number
    voicing_position?: string
  }
  difficulty: number
  tags: string[]
}

export interface KeyboardEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = novo acorde, objeto = editando */
  chord?: any | null
  onSave: (data: PianoChordData) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

// ─── Helpers de conversão MIDI ↔ formato banco ─────────────────────
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
}

function midiToNoteName(midi: number): string {
  const note = NN[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${note}${octave}`
}

function noteNameToMidi(name: string): number {
  const match = name.match(/^([A-G][b#]?)(\d+)$/)
  if (!match) return 60
  let noteName = match[1]
  const octave = parseInt(match[2])
  if (noteName.length === 2 && noteName[1] === 'b') {
    noteName = FLAT_TO_SHARP[noteName] ?? noteName
  }
  const idx = NN.indexOf(noteName)
  if (idx === -1) return 60
  return idx + (octave + 1) * 12
}

function renumberFingers(map: KeyMap) {
  const sorted = [...map.keys()].sort((a, b) => a - b)
  sorted.forEach((midi, i) => {
    map.set(midi, { finger: i + 1 })
  })
}

/** Converte estado do editor → formato do banco */
function editorToData(
  rightKeys: KeyMap, leftKeys: KeyMap, rootNote: number | null,
  octaveStart: number, octaveCount: number, lastPreset: string | null,
  voicingPosition?: VoicingPosition | null,
): PianoChordData['positions'] {
  const sortedRH = [...rightKeys.entries()].sort((a, b) => a[0] - b[0])
  const sortedLH = [...leftKeys.entries()].sort((a, b) => a[0] - b[0])

  const allKeys = sortedRH.length > 0 ? sortedRH : sortedLH
  const rootName = rootNote != null ? NN[rootNote % 12] : (allKeys.length > 0 ? NN[allKeys[0][0] % 12] : 'C')
  const rootOctave = rootNote != null ? Math.floor(rootNote / 12) - 1 : octaveStart

  return {
    keys: sortedRH.map(([midi]) => midiToNoteName(midi)),
    keys_lh: sortedLH.map(([midi]) => midiToNoteName(midi)),
    root: rootName,
    octave: rootOctave,
    fingering_rh: sortedRH.map(([, info]) => info.finger),
    fingering_lh: sortedLH.map(([, info]) => info.finger),
    type: lastPreset ? (TYPE_MAP[lastPreset] ?? 'triad') : (allKeys.length <= 3 ? 'triad' : allKeys.length <= 4 ? 'tetrad' : 'scale'),
    quality: lastPreset ? (QUALITY_MAP[lastPreset] ?? '') : '',
    octave_start: octaveStart,
    octave_count: octaveCount,
    voicing_position: voicingPosition ?? undefined,
  }
}

/** Converte dados do banco → estado interno do editor (com inferência de slash) */
function dataToEditor(positions: any, chordName?: string): {
  rightKeys: KeyMap; leftKeys: KeyMap; rootNote: number | null;
  octaveStart: number; octaveCount: number; voicingPosition: VoicingPosition | null
} {
  const rightKeys: KeyMap = new Map()
  const leftKeys: KeyMap = new Map()

  let keys = (positions?.keys ?? []) as string[]
  let keysLh = (positions?.keys_lh ?? []) as string[]
  let fingeringRh = (positions?.fingering_rh ?? []) as number[]
  let fingeringLh = (positions?.fingering_lh ?? []) as number[]

  // Inferir keysLh para slash chords antigos sem keys_lh
  if (keysLh.length === 0 && chordName && chordName.includes('/')) {
    const slashNote = chordName.split('/')[1]
    if (slashNote) {
      const bassIdx = keys.findIndex(k => {
        const m = k.match(/^([A-G][b#]?)/)
        return m && m[1] === slashNote
      })
      if (bassIdx !== -1) {
        keysLh = [keys[bassIdx]]
        fingeringLh = fingeringRh[bassIdx] != null ? [fingeringRh[bassIdx]] : [1]
        fingeringRh = fingeringRh.filter((_, i) => i !== bassIdx)
        keys = keys.filter((_, i) => i !== bassIdx)
      }
    }
  }

  keys.forEach((key: string, i: number) => {
    const midi = noteNameToMidi(key)
    rightKeys.set(midi, { finger: fingeringRh[i] || (i + 1) })
  })

  // Se keys_lh existe, usar notas separadas; senão fallback legado (mesmas keys)
  if (keysLh.length > 0) {
    keysLh.forEach((key: string, i: number) => {
      const midi = noteNameToMidi(key)
      leftKeys.set(midi, { finger: fingeringLh[i] || (i + 1) })
    })
  } else if (fingeringLh.length > 0 && keys.length > 0) {
    keys.forEach((key: string, i: number) => {
      const midi = noteNameToMidi(key)
      leftKeys.set(midi, { finger: fingeringLh[i] || (i + 1) })
    })
  }

  // root pode vir como "C4" (com oitava) ou "C" (sem oitava)
  let rootMidi: number | null = null
  if (positions?.root) {
    const rm = String(positions.root).match(/^([A-G][b#]?)(\d*)$/)
    const rName = rm ? rm[1] : positions.root
    const rawOct = rm?.[2] ? parseInt(rm[2]) : (positions.octave ?? 4)
    const rOct = Math.max(0, Math.min(8, rawOct))
    rootMidi = noteNameToMidi(rName + rOct)
  } else if (rightKeys.size > 0) {
    rootMidi = [...rightKeys.keys()].sort((a, b) => a - b)[0]
  }

  // Ler voicing_position salvo no banco
  const vp = positions?.voicing_position as VoicingPosition | undefined
  const validVoicings: VoicingPosition[] = ['root_position', '1st_inversion', '2nd_inversion', '3rd_inversion']

  return {
    rightKeys,
    leftKeys,
    rootNote: rootMidi,
    octaveStart: Math.max(1, Math.min(7, positions?.octave_start ?? 4)),
    octaveCount: Math.max(1, Math.min(4, positions?.octave_count ?? 2)),
    voicingPosition: vp && validVoicings.includes(vp) ? vp : null,
  }
}

/** Auto-gera tags a partir do preset e dificuldade */
function generateTags(preset: string | null, difficulty: number): string[] {
  const tags: string[] = []
  const isScale = preset && preset.includes('scale') || preset === 'penta' || preset === 'blues'
  if (isScale) {
    tags.push('escala')
  } else {
    const type = preset ? (TYPE_MAP[preset] ?? 'triad') : 'triad'
    if (type === 'triad') tags.push('tríade')
    else if (type === 'tetrad') tags.push('tétrade')
  }
  if (preset) {
    const q = QUALITY_MAP[preset]
    if (q === 'major') tags.push('maior')
    else if (q === 'minor') tags.push('menor')
    else if (q === 'diminished') tags.push('diminuto')
    else if (q === 'augmented') tags.push('aumentado')
    else if (q === 'sus2' || q === 'sus4') tags.push('suspensa')
    else if (q === 'dominant7') tags.push('dominante')
    else if (q === 'minor7') tags.push('menor')
    else if (q === 'major7') tags.push('maior')
    else if (q === 'diminished7') tags.push('diminuto')
    else if (q === 'half_diminished') tags.push('meio-diminuto')
  }
  tags.push(`nível ${difficulty}`)
  return tags
}

// ─── Cores ──────────────────────────────────────────────────────────
const COLORS = {
  rightHand: '#FF2D78',
  leftHand: '#6366F1',
  root: '#F97316',
}

// ─── Componente do Teclado interativo ───────────────────────────────
interface PianoKeysProps {
  octaveStart: number
  octaveCount: number
  rightKeys: KeyMap
  leftKeys: KeyMap
  rootNote: number | null
  onToggleKey: (midi: number) => void
  onSetRoot: (midi: number) => void
  onFingerContext: (midi: number, rect: DOMRect) => void
}

function InteractivePiano({ octaveStart, octaveCount, rightKeys, leftKeys, rootNote, onToggleKey, onSetRoot, onFingerContext }: PianoKeysProps) {
  const totalWhiteKeys = octaveCount * 7
  const whiteKeyWidth = 100 / totalWhiteKeys

  const whiteKeys: { midi: number; semitone: number; label: string; noteName: string; index: number }[] = []
  const blackKeys: { midi: number; semitone: number; label: string; leftPct: number; widthPct: number }[] = []

  for (let o = octaveStart; o < octaveStart + octaveCount; o++) {
    const octOffset = (o - octaveStart) * 7
    WHITE_SEMITONES.forEach((sem, wi) => {
      const midi = sem + o * 12 + 12
      whiteKeys.push({
        midi,
        semitone: sem,
        label: NP[sem],
        noteName: `${NN[sem]}${o}`,
        index: octOffset + wi,
      })
    })

    BLACK_POSITIONS.forEach(bp => {
      const midi = bp.semitone + o * 12 + 12
      const wIdx = octOffset + bp.afterWhite
      const leftPct = ((wIdx + 1) / totalWhiteKeys) * 100 - whiteKeyWidth * 0.3
      blackKeys.push({
        midi,
        semitone: bp.semitone,
        label: NP[bp.semitone],
        leftPct,
        widthPct: whiteKeyWidth * 0.6,
      })
    })
  }

  function getKeyState(midi: number) {
    const isRoot = rootNote === midi
    const rh = rightKeys.has(midi)
    const lh = leftKeys.has(midi)
    const info = rh ? rightKeys.get(midi) : leftKeys.get(midi)
    return { isRoot, rh, lh, finger: info?.finger ?? null }
  }

  function getKeyBg(state: { isRoot: boolean; rh: boolean; lh: boolean }, isBlack: boolean) {
    if (state.isRoot) return COLORS.root
    if (state.rh) return COLORS.rightHand
    if (state.lh) return COLORS.leftHand
    return undefined
  }

  function getFingerClass(state: { isRoot: boolean; rh: boolean }) {
    if (state.isRoot) return COLORS.root
    if (state.rh) return COLORS.rightHand
    return COLORS.leftHand
  }

  return (
    <div className="relative select-none" style={{ height: 150 }}>
      {/* Teclas brancas */}
      <div className="relative flex h-full">
        {whiteKeys.map(wk => {
          const state = getKeyState(wk.midi)
          const activeBg = getKeyBg(state, false)
          const isActive = state.isRoot || state.rh || state.lh

          return (
            <div
              key={wk.midi}
              className="relative flex-1 cursor-pointer flex flex-col justify-end items-center pb-1.5 z-[1]"
              style={{
                backgroundColor: activeBg ?? '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '0 0 5px 5px',
                transition: 'background .1s',
              }}
              onClick={() => onToggleKey(wk.midi)}
              onDoubleClick={(e) => { e.preventDefault(); onSetRoot(wk.midi) }}
              onContextMenu={(e) => {
                e.preventDefault()
                if (isActive) onFingerContext(wk.midi, e.currentTarget.getBoundingClientRect())
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#FFF0F5' }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF' }}
            >
              {isActive && state.finger != null && (
                <div
                  className="pointer-events-none flex items-center justify-center"
                  style={{
                    position: 'absolute',
                    top: '68%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 22, height: 22, borderRadius: '50%',
                    backgroundColor: getFingerClass(state),
                    color: '#fff', fontSize: 11, fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(0,0,0,.3)',
                    zIndex: 4,
                  }}
                >
                  {state.finger}
                </div>
              )}
              <span
                style={{
                  fontSize: 9, fontFamily: "'DM Mono', monospace",
                  color: isActive ? '#fff' : '#94A3B8',
                  fontWeight: isActive ? 700 : 400,
                  transition: 'color .1s',
                }}
              >
                {wk.label}
              </span>
              <span
                style={{
                  fontSize: 7, marginTop: 1,
                  color: isActive ? 'rgba(255,255,255,0.7)' : '#CBD5E1',
                }}
              >
                {wk.noteName}
              </span>
            </div>
          )
        })}
      </div>

      {/* Teclas pretas */}
      {blackKeys.map(bk => {
        const state = getKeyState(bk.midi)
        const activeBg = getKeyBg(state, true)
        const isActive = state.isRoot || state.rh || state.lh

        return (
          <div
            key={bk.midi}
            className="absolute top-0 cursor-pointer flex flex-col justify-end items-center"
            style={{
              left: `${bk.leftPct}%`,
              width: `${bk.widthPct}%`,
              height: 95,
              backgroundColor: activeBg ?? '#1a1a2e',
              borderRadius: '0 0 4px 4px',
              boxShadow: '0 3px 6px rgba(0,0,0,.3)',
              paddingBottom: 5,
              transition: 'background .1s',
              zIndex: 3,
            }}
            onClick={(e) => { e.stopPropagation(); onToggleKey(bk.midi) }}
            onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); onSetRoot(bk.midi) }}
            onContextMenu={(e) => {
              e.preventDefault(); e.stopPropagation()
              if (isActive) onFingerContext(bk.midi, e.currentTarget.getBoundingClientRect())
            }}
            onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#333' }}
            onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a2e' }}
          >
            {isActive && state.finger != null && (
              <div
                className="absolute left-1/2 pointer-events-none flex items-center justify-center"
                style={{
                  top: '35%', transform: 'translate(-50%, -50%)',
                  width: 20, height: 20, borderRadius: '50%',
                  backgroundColor: getFingerClass(state),
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(0,0,0,.3)',
                }}
              >
                {state.finger}
              </div>
            )}
            <span
              style={{
                fontSize: 8, fontFamily: "'DM Mono', monospace",
                color: isActive ? '#fff' : '#64748B',
              }}
            >
              {bk.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente Principal ───────────────────────────────────────────
export function KeyboardEditor({ open, onOpenChange, chord, onSave, onDelete }: KeyboardEditorProps) {
  const isEditing = !!chord

  // Estado do editor
  const [mode, setMode] = useState<EditorMode>('chord')
  const [activeHand, setActiveHand] = useState<ActiveHand>('right')
  const [rightKeys, setRightKeys] = useState<KeyMap>(new Map())
  const [leftKeys, setLeftKeys] = useState<KeyMap>(new Map())
  const [rootNote, setRootNote] = useState<number | null>(null)
  const [lastPreset, setLastPreset] = useState<string | null>(null)
  const [octaveCount, setOctaveCount] = useState(2)
  const [octaveStart, setOctaveStart] = useState(4)
  const [selectedRoot, setSelectedRoot] = useState(0)
  const [voicingPosition, setVoicingPosition] = useState<VoicingPosition>('root_position')
  const [activeTensions, setActiveTensions] = useState<Set<TensionKey>>(new Set())

  // Campos de CRUD
  const [chordName, setChordName] = useState('')
  const [difficulty, setDifficulty] = useState(1)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Popover de dedilhado (botão direito na tecla)
  const [fingerPopover, setFingerPopover] = useState<{ midi: number; x: number; y: number } | null>(null)
  const fingerPopoverRef = useRef<HTMLDivElement>(null)

  // Inicializar estado quando modal abre
  useEffect(() => {
    if (!open) return
    if (chord) {
      // Modo edição: carregar dados existentes
      const pos = chord.positions ?? {}
      const { rightKeys: rk, leftKeys: lk, rootNote: rn, octaveStart: os, octaveCount: oc, voicingPosition: vp } = dataToEditor(pos, chord.name)
      setRightKeys(new Map(rk))
      setLeftKeys(new Map(lk))
      setRootNote(rn)
      setOctaveStart(os)
      setOctaveCount(oc)
      setVoicingPosition(vp ?? 'root_position')
      setChordName(chord.name ?? '')
      setDifficulty(chord.difficulty ?? 1)
      setLastPreset(null)
      // Determinar root selecionado
      if (rn != null) setSelectedRoot(rn % 12)
    } else {
      // Modo criação: reset
      resetEditor()
    }
  }, [open, chord])

  function resetEditor() {
    setMode('chord')
    setActiveHand('right')
    setRightKeys(new Map())
    setLeftKeys(new Map())
    setRootNote(null)
    setLastPreset(null)
    setOctaveCount(2)
    setOctaveStart(4)
    setSelectedRoot(0)
    setVoicingPosition('root_position')
    setActiveTensions(new Set())
    setChordName('')
    setDifficulty(1)
  }

  // Forçar re-render quando maps mudam (Map não é imutável)
  const [, forceRender] = useState(0)
  const bump = useCallback(() => forceRender(n => n + 1), [])

  const handleToggleKey = useCallback((midi: number) => {
    const map = activeHand === 'right' ? rightKeys : leftKeys
    const other = activeHand === 'right' ? leftKeys : rightKeys

    if (map.has(midi)) {
      map.delete(midi)
      if (rootNote === midi) setRootNote(null)
    } else {
      other.delete(midi)
      const sorted = [...map.keys()].sort((a, b) => a - b)
      map.set(midi, { finger: sorted.length + 1 })
      if (rootNote === null) setRootNote(midi)
    }

    renumberFingers(rightKeys)
    renumberFingers(leftKeys)
    bump()
  }, [activeHand, rightKeys, leftKeys, rootNote, bump])

  const handleSetRoot = useCallback((midi: number) => {
    const map = activeHand === 'right' ? rightKeys : leftKeys
    if (!map.has(midi) && !rightKeys.has(midi) && !leftKeys.has(midi)) {
      map.set(midi, { finger: map.size + 1 })
      renumberFingers(map)
    }
    setRootNote(midi)
    bump()
  }, [activeHand, rightKeys, leftKeys, bump])

  const handleFingerContext = useCallback((midi: number, rect: DOMRect) => {
    setFingerPopover({ midi, x: rect.left + rect.width / 2, y: rect.bottom + 6 })
  }, [])

  // Fechar popover de dedilhado ao clicar em qualquer lugar fora dele
  useEffect(() => {
    if (!fingerPopover) return
    const close = (e: MouseEvent) => {
      if (fingerPopoverRef.current?.contains(e.target as Node)) return
      setFingerPopover(null)
    }
    // setTimeout para não capturar o mesmo clique que abriu o popover
    const timer = setTimeout(() => {
      // Captura no document (funciona apesar do body ter pointer-events:none,
      // pois o dialog tem pointer-events:auto e os eventos borbulham até o document)
      document.addEventListener('pointerdown', close as EventListener)
    }, 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', close as EventListener)
    }
  }, [fingerPopover])

  const handleSetFinger = useCallback((finger: number) => {
    if (!fingerPopover) return
    const { midi } = fingerPopover
    const map = rightKeys.has(midi) ? rightKeys : leftKeys.has(midi) ? leftKeys : null
    if (map) {
      const info = map.get(midi)
      if (info) {
        map.set(midi, { ...info, finger })
        bump()
      }
    }
    setFingerPopover(null)
  }, [fingerPopover, rightKeys, leftKeys, bump])

  const SUFFIX_MAP: Record<string, string> = useMemo(() => ({
    major: '', minor: 'm', dim: 'dim', aug: 'aug', sus2: 'sus2', sus4: 'sus4', add9: 'add9',
    '7': '7', m7: 'm7', maj7: 'maj7', dim7: 'dim7', m7b5: 'm7(b5)',
    '6': '6', m6: 'm6', mmaj7: 'mMaj7',
  }), [])

  /** Monta as notas do acorde base + tensões ativas, aplica posição, e atualiza o teclado */
  const buildChord = useCallback((presetName: string, tensions: Set<TensionKey>, vp: VoicingPosition) => {
    const intervals = PRESETS[presetName]
    if (!intervals) return

    const map = activeHand === 'right' ? rightKeys : leftKeys
    map.clear()

    const rootMidi = selectedRoot + octaveStart * 12 + 12
    const isScale = presetName.includes('scale') || presetName === 'penta' || presetName === 'blues'

    // Gerar notas base
    let allIntervals = [...intervals]

    // Adicionar tensões (só para acordes, não escalas)
    if (!isScale && tensions.size > 0) {
      tensions.forEach(t => {
        const interval = TENSION_INTERVALS[t]
        // b5 e #5 substituem a 5ª (semitom 7) se existir
        if (t === 'b5' || t === '#5') {
          allIntervals = allIntervals.filter(i => i !== 7)
        }
        if (!allIntervals.includes(interval)) {
          allIntervals.push(interval)
        }
      })
      allIntervals.sort((a, b) => a - b)
    }

    let midis = allIntervals.map(interval => rootMidi + interval)

    // Aplicar posição: para a N-ésima posição, as N notas mais graves sobem 1 oitava
    if (!isScale) {
      const invIndex = vp === '1st_inversion' ? 1 : vp === '2nd_inversion' ? 2 : vp === '3rd_inversion' ? 3 : 0
      for (let n = 0; n < invIndex && n < midis.length - 1; n++) {
        midis[n] += 12
      }
      midis.sort((a, b) => a - b)
    }

    // Fundamental = nota com pitch class da fundamental DENTRO do acorde
    const rootInChord = midis.find(m => m % 12 === selectedRoot) ?? rootMidi
    setRootNote(rootInChord)

    // Dedilhado: se há tensões, numerar sequencialmente; senão usar preset base
    const hasTensions = tensions.size > 0
    const baseFingering = activeHand === 'right'
      ? (FINGERING_RH[presetName] ?? [])
      : (FINGERING_LH[presetName] ?? [])

    midis.forEach((midi, i) => {
      map.set(midi, { finger: hasTensions ? (i + 1) : (baseFingering[i] || (i + 1)) })
    })

    // Auto-nome: acorde base + tensões
    const noteName = NN[selectedRoot]
    const suffix = SUFFIX_MAP[presetName]
    if (suffix != null) {
      const tensionSuffix = [...tensions].map(t => `(${TENSION_LABELS[t]})`).join('')
      setChordName(`${noteName}${suffix}${tensionSuffix}`)
    }

    // Definir modo
    if (isScale) {
      setMode('scale')
    } else {
      setMode('chord')
    }

    bump()
  }, [activeHand, rightKeys, leftKeys, selectedRoot, octaveStart, SUFFIX_MAP, bump])

  const handleLoadPreset = useCallback((presetName: string, overrideVoicing?: VoicingPosition) => {
    if (!PRESETS[presetName]) return
    const vp = overrideVoicing ?? voicingPosition
    setLastPreset(presetName)
    // Limpar tensões ao trocar de preset base
    setActiveTensions(new Set())
    buildChord(presetName, new Set(), vp)
  }, [voicingPosition, buildChord])

  const handleVoicingChange = useCallback((vp: VoicingPosition) => {
    setVoicingPosition(vp)
    if (lastPreset) buildChord(lastPreset, activeTensions, vp)
  }, [lastPreset, activeTensions, buildChord])

  const handleReloadPreset = useCallback(() => {
    if (lastPreset) buildChord(lastPreset, activeTensions, voicingPosition)
  }, [lastPreset, activeTensions, voicingPosition, buildChord])

  /** Toggle de tensão: adiciona/remove e reconstrói o acorde */
  const handleToggleTension = useCallback((t: TensionKey) => {
    if (!lastPreset) return
    const next = new Set(activeTensions)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setActiveTensions(next)
    buildChord(lastPreset, next, voicingPosition)
  }, [lastPreset, activeTensions, voicingPosition, buildChord])

  const handleClearAll = useCallback(() => {
    rightKeys.clear()
    leftKeys.clear()
    setRootNote(null)
    setLastPreset(null)
    setActiveTensions(new Set())
    bump()
  }, [rightKeys, leftKeys, bump])

  // Info computada
  const infoMode = mode === 'chord' ? 'Acorde' : mode === 'scale' ? 'Escala' : 'Arpejo'
  const rootDisplay = rootNote != null
    ? `${NP[rootNote % 12]}${Math.floor(rootNote / 12) - 1}`
    : '—'

  const sortedRH = useMemo(() =>
    [...rightKeys.entries()].sort((a, b) => a[0] - b[0]),
    [rightKeys, rightKeys.size] // eslint-disable-line
  )
  const sortedLH = useMemo(() =>
    [...leftKeys.entries()].sort((a, b) => a[0] - b[0]),
    [leftKeys, leftKeys.size] // eslint-disable-line
  )

  // Salvar
  const handleSave = async () => {
    if (!chordName.trim()) return
    setSaving(true)
    try {
      const positions = editorToData(rightKeys, leftKeys, rootNote, octaveStart, octaveCount, lastPreset, voicingPosition)
      const tags = generateTags(lastPreset, difficulty)
      await onSave({
        name: chordName.trim(),
        instrument: 'piano',
        positions,
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
    if (!chord?.id || !onDelete) return
    setDeleting(true)
    try {
      await onDelete(chord.id)
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  // Pianoinfo label
  const pianoLabel = `${octaveCount} oitava${octaveCount > 1 ? 's' : ''} · C${octaveStart} — B${octaveStart + octaveCount - 1}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[960px] max-h-[90vh] overflow-y-auto bg-surface border-border"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            {isEditing ? 'Editar' : 'Editor de'}{' '}
            <span className="text-accent">Teclado</span>
          </DialogTitle>
        </DialogHeader>

        {/* ── Linha 1: Config principal ── */}
        <div className="flex gap-2.5 flex-wrap items-end mb-3">
          {/* Modo */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Modo</span>
            <div className="flex border border-border rounded-lg overflow-hidden">
              {(['chord', 'scale', 'arpeggio'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    mode === m ? 'bg-accent text-white' : 'text-text3 hover:bg-accent/10 hover:text-accent'
                  }`}
                >
                  {m === 'chord' ? 'Acorde' : m === 'scale' ? 'Escala' : 'Arpejo'}
                </button>
              ))}
            </div>
          </div>

          {/* Mão ativa */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Mão ativa</span>
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveHand('left')}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                  activeHand === 'left' ? 'text-white' : 'text-text3 hover:bg-white/5'
                }`}
                style={{ backgroundColor: activeHand === 'left' ? COLORS.leftHand : undefined }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.leftHand }} />
                Esquerda
              </button>
              <button
                onClick={() => setActiveHand('right')}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                  activeHand === 'right' ? 'text-white' : 'text-text3 hover:bg-white/5'
                }`}
                style={{ backgroundColor: activeHand === 'right' ? COLORS.rightHand : undefined }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.rightHand }} />
                Direita
              </button>
            </div>
          </div>

        </div>

        {/* ── Toolbar: 3 linhas separadas ── */}
        <div className="flex flex-col gap-1.5 mb-3.5">

          {/* ─ Linha 1: Configuração (Fundamental + Posição MD + Oitavas) ─ */}
          <div className="flex gap-2 items-stretch flex-wrap">
            {/* Card: Fundamental */}
            <div className="flex gap-[6px] items-center rounded-lg px-3 py-[6px]" style={{ backgroundColor: '#162032' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap' }}>Fundamental</span>
              <Select value={String(selectedRoot)} onValueChange={v => { setSelectedRoot(Number(v)); if (lastPreset) setTimeout(handleReloadPreset, 0) }}>
                <SelectTrigger className="h-7 w-[72px] text-[12px] font-semibold font-mono px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NP.map((name, i) => <SelectItem key={i} value={String(i)}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Card: Posição (MD) — só no modo Acorde */}
            {mode === 'chord' && (
              <div className="flex gap-[5px] items-center rounded-lg px-3 py-[6px]" style={{ backgroundColor: '#162032' }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap', marginRight: 2 }}>Posição (MD)</span>
                {(['root_position', '1st_inversion', '2nd_inversion', ...(lastPreset && TYPE_MAP[lastPreset] === 'tetrad' ? ['3rd_inversion' as const] : [])] as VoicingPosition[]).map(vp => (
                  <button
                    key={vp}
                    onClick={() => handleVoicingChange(vp)}
                    style={{
                      height: 28, padding: '0 10px',
                      border: voicingPosition === vp ? '1px solid #F97316' : '1px solid #334155',
                      borderRadius: 6,
                      background: voicingPosition === vp ? '#F97316' : 'transparent',
                      color: voicingPosition === vp ? '#fff' : '#94A3B8',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: voicingPosition === vp ? 600 : 400,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      transition: '.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => { if (voicingPosition !== vp) { (e.currentTarget as HTMLElement).style.borderColor = '#F97316'; (e.currentTarget as HTMLElement).style.color = '#F97316' } }}
                    onMouseLeave={(e) => { if (voicingPosition !== vp) { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; (e.currentTarget as HTMLElement).style.color = '#94A3B8' } }}
                  >
                    {VOICING_LABELS[vp]}
                  </button>
                ))}
              </div>
            )}

            {/* Card: Oitavas + Início — só para Escala/Arpejo */}
            {mode !== 'chord' && (
              <div className="flex gap-3 items-center rounded-lg px-3 py-[6px]" style={{ backgroundColor: '#162032' }}>
                <div className="flex gap-[6px] items-center">
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap' }}>Oitavas</span>
                  <Select value={String(octaveCount)} onValueChange={v => setOctaveCount(Number(v))}>
                    <SelectTrigger className="h-7 w-[52px] text-[12px] font-mono px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ width: 1, height: 20, backgroundColor: '#334155' }} />
                <div className="flex gap-[6px] items-center">
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap' }}>Início</span>
                  <Select value={String(octaveStart)} onValueChange={v => setOctaveStart(Number(v))}>
                    <SelectTrigger className="h-7 w-[60px] text-[12px] font-mono px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>C{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* ─ Linha 2: Qualidade (Tríades + Tétrades) ─ */}
          <div className="flex gap-2 items-stretch flex-wrap">
            {/* Card: Tríades */}
            <div className="flex gap-[4px] items-center rounded-lg px-3 py-[6px]" style={{ backgroundColor: '#162032' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap', marginRight: 3 }}>Tríades</span>
              {['major', 'minor', 'dim', 'aug', 'sus2', 'sus4', 'add9'].map(p => (
                <button
                  key={p}
                  onClick={() => handleLoadPreset(p)}
                  style={{
                    height: 28, padding: '0 10px',
                    border: lastPreset === p ? '1px solid #FF2D78' : '1px solid #334155',
                    borderRadius: 6,
                    background: lastPreset === p ? '#FF2D78' : 'transparent',
                    color: lastPreset === p ? '#fff' : '#94A3B8',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: lastPreset === p ? 600 : 400,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: '.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { if (lastPreset !== p) { (e.currentTarget as HTMLElement).style.borderColor = '#FF2D78'; (e.currentTarget as HTMLElement).style.color = '#FF2D78' } }}
                  onMouseLeave={(e) => { if (lastPreset !== p) { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; (e.currentTarget as HTMLElement).style.color = '#94A3B8' } }}
                >
                  {PRESET_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Card: Tétrades */}
            <div className="flex gap-[4px] items-center rounded-lg px-3 py-[6px]" style={{ backgroundColor: '#162032' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap', marginRight: 3 }}>Tétrades</span>
              {['7', 'm7', 'maj7', 'dim7', 'm7b5', '6', 'm6', 'mmaj7'].map(p => (
                <button
                  key={p}
                  onClick={() => handleLoadPreset(p)}
                  style={{
                    height: 28, padding: '0 10px',
                    border: lastPreset === p ? '1px solid #FF2D78' : '1px solid #334155',
                    borderRadius: 6,
                    background: lastPreset === p ? '#FF2D78' : 'transparent',
                    color: lastPreset === p ? '#fff' : '#94A3B8',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: lastPreset === p ? 600 : 400,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: '.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { if (lastPreset !== p) { (e.currentTarget as HTMLElement).style.borderColor = '#FF2D78'; (e.currentTarget as HTMLElement).style.color = '#FF2D78' } }}
                  onMouseLeave={(e) => { if (lastPreset !== p) { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; (e.currentTarget as HTMLElement).style.color = '#94A3B8' } }}
                >
                  {PRESET_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* ─ Linha 3: Tensões (toggle múltiplo, desabilitada sem acorde base) ─ */}
          <div className="flex gap-2 items-stretch flex-wrap">
            <div className="flex gap-[4px] items-center rounded-lg px-3 py-[6px]" style={{ backgroundColor: '#162032', opacity: lastPreset && !lastPreset.includes('scale') && lastPreset !== 'penta' && lastPreset !== 'blues' ? 1 : 0.4 }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap', marginRight: 3 }}>Tensões</span>
              {ALL_TENSIONS.map(t => {
                const isActive = activeTensions.has(t)
                const isDisabled = !lastPreset || lastPreset.includes('scale') || lastPreset === 'penta' || lastPreset === 'blues'
                return (
                  <button
                    key={t}
                    onClick={() => !isDisabled && handleToggleTension(t)}
                    disabled={isDisabled}
                    style={{
                      height: 28, padding: '0 8px',
                      border: isActive ? '1px solid #8B5CF6' : '1px solid #334155',
                      borderRadius: 6,
                      background: isActive ? '#8B5CF6' : 'transparent',
                      color: isActive ? '#fff' : '#94A3B8',
                      fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: isActive ? 600 : 400,
                      cursor: isDisabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                      transition: '.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => { if (!isActive && !isDisabled) { (e.currentTarget as HTMLElement).style.borderColor = '#8B5CF6'; (e.currentTarget as HTMLElement).style.color = '#8B5CF6' } }}
                    onMouseLeave={(e) => { if (!isActive && !isDisabled) { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; (e.currentTarget as HTMLElement).style.color = '#94A3B8' } }}
                  >
                    {TENSION_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─ Linha 4: Escalas ─ */}
          <div className="flex gap-2 items-stretch flex-wrap">
            <div className="flex gap-[4px] items-center rounded-lg px-3 py-[6px]" style={{ backgroundColor: '#162032' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap', marginRight: 3 }}>Escalas</span>
              {['major_scale', 'minor_scale', 'harmonic_minor_scale', 'melodic_minor_scale', 'penta', 'blues'].map(p => (
                <button
                  key={p}
                  onClick={() => handleLoadPreset(p)}
                  style={{
                    height: 28, padding: '0 10px',
                    border: lastPreset === p ? '1px solid #FF2D78' : '1px solid #334155',
                    borderRadius: 6,
                    background: lastPreset === p ? '#FF2D78' : 'transparent',
                    color: lastPreset === p ? '#fff' : '#94A3B8',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: lastPreset === p ? 600 : 400,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: '.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { if (lastPreset !== p) { (e.currentTarget as HTMLElement).style.borderColor = '#FF2D78'; (e.currentTarget as HTMLElement).style.color = '#FF2D78' } }}
                  onMouseLeave={(e) => { if (lastPreset !== p) { (e.currentTarget as HTMLElement).style.borderColor = '#334155'; (e.currentTarget as HTMLElement).style.color = '#94A3B8' } }}
                >
                  {PRESET_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── Linha 3: Piano + Painel lateral ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 190px', gap: 16, alignItems: 'start' }}>
          {/* Piano */}
          <div>
            <div
              style={{
                backgroundColor: '#f1f5f9',
                borderRadius: 12,
                padding: '16px 16px 12px',
              }}
            >
              <div style={{ fontSize: 10, color: '#64748B', textAlign: 'center', marginBottom: 8, fontWeight: 500 }}>{pianoLabel}</div>
              <InteractivePiano
                octaveStart={octaveStart}
                octaveCount={octaveCount}
                rightKeys={rightKeys}
                leftKeys={leftKeys}
                rootNote={rootNote}
                onToggleKey={handleToggleKey}
                onSetRoot={handleSetRoot}
                onFingerContext={handleFingerContext}
              />
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8, fontSize: 10, color: '#94A3B8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.rightHand }} />
                  Mão direita
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.leftHand }} />
                  Mão esquerda
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.root }} />
                  Fundamental
                </div>
              </div>
            </div>
            <div className="text-[10px] text-text3 text-center leading-relaxed mt-2">
              <span className="text-accent font-semibold">Clique</span> = selecionar com a mão ativa ·{' '}
              <span className="text-accent font-semibold">Duplo clique</span> = marcar como fundamental (laranja) ·{' '}
              <span className="text-accent font-semibold">Botão direito</span> = trocar dedo<br />
              Alterne entre <span className="text-accent font-semibold">Mão Direita</span> e{' '}
              <span className="text-accent font-semibold">Mão Esquerda</span> para definir dedilhado separado
            </div>
          </div>
          {/* Popover de dedilhado via portal (evita clipping do modal) */}
          {fingerPopover && createPortal(
            <div
              ref={fingerPopoverRef}
              className="fixed flex gap-1 p-1.5 rounded-lg shadow-xl"
              style={{
                left: fingerPopover.x,
                top: fingerPopover.y,
                transform: 'translate(-50%, 0)',
                zIndex: 9999,
                pointerEvents: 'auto',
                background: '#1E293B',
                border: '1px solid #475569',
              }}
            >
                {[1, 2, 3, 4, 5].map(f => {
                  const map = rightKeys.has(fingerPopover.midi) ? rightKeys : leftKeys
                  const current = map.get(fingerPopover.midi)?.finger
                  return (
                    <button
                      key={f}
                      onPointerDown={(e) => { e.stopPropagation(); handleSetFinger(f) }}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        border: current === f ? '2px solid #FF2D78' : '1px solid #475569',
                        background: current === f ? '#FF2D78' : 'transparent',
                        color: current === f ? '#fff' : '#94A3B8',
                        cursor: 'pointer',
                        transition: '.15s',
                      }}
                    >
                      {f}
                    </button>
                  )
                })}
            </div>,
            document.body
          )}

          {/* Painel lateral */}
          <div className="flex flex-col gap-2.5">
            {/* Informações */}
            <div style={{ background: 'var(--bg, #0F172A)', border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
              <h3 style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginBottom: 5 }}>Informações</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                <span style={{ color: '#94A3B8' }}>Mão direita</span>
                <span style={{ color: 'var(--text, #E2E8F0)', fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{rightKeys.size} teclas</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                <span style={{ color: '#94A3B8' }}>Mão esquerda</span>
                <span style={{ color: 'var(--text, #E2E8F0)', fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{leftKeys.size} teclas</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                <span style={{ color: '#94A3B8' }}>Fundamental</span>
                <span style={{ color: 'var(--text, #E2E8F0)', fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{rootDisplay}</span>
              </div>
            </div>

            {/* Mão direita */}
            <div style={{ background: 'var(--bg, #0F172A)', border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
              <h3 style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginBottom: 5 }}>Mão direita</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                {sortedRH.length === 0 ? (
                  <span style={{ color: '#94A3B8', fontSize: 10 }}>—</span>
                ) : sortedRH.map(([midi, info]) => (
                  <span
                    key={midi}
                    style={{
                      padding: '2px 7px', borderRadius: 5,
                      fontSize: 10, fontWeight: 600, fontFamily: "'DM Mono', monospace",
                      color: '#fff',
                      backgroundColor: rootNote === midi
                        ? 'rgba(249,115,22,0.8)'
                        : 'rgba(255,45,120,0.8)',
                    }}
                  >
                    {info.finger} {NP[midi % 12]}{Math.floor(midi / 12) - 1}
                  </span>
                ))}
              </div>
            </div>

            {/* Mão esquerda */}
            <div style={{ background: 'var(--bg, #0F172A)', border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
              <h3 style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginBottom: 5 }}>Mão esquerda</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                {sortedLH.length === 0 ? (
                  <span style={{ color: '#94A3B8', fontSize: 10 }}>—</span>
                ) : sortedLH.map(([midi, info]) => (
                  <span
                    key={midi}
                    style={{
                      padding: '2px 7px', borderRadius: 5,
                      fontSize: 10, fontWeight: 600, fontFamily: "'DM Mono', monospace",
                      color: '#fff',
                      backgroundColor: rootNote === midi
                        ? 'rgba(249,115,22,0.8)'
                        : 'rgba(99,102,241,0.8)',
                    }}
                  >
                    {info.finger} {NP[midi % 12]}{Math.floor(midi / 12) - 1}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer: nome, dificuldade, ações ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid #334155' }}>
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
                    <AlertDialogTitle>Excluir acorde de piano?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O acorde "{chordName}" será removido permanentemente da biblioteca. Essa ação não pode ser desfeita.
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
                onClick={handleClearAll}
                className="text-[12px] text-text3 hover:text-destructive transition-colors px-2 py-1 rounded"
              >
                <X size={12} className="inline mr-1" />Limpar tudo
              </button>
            )}
          </div>

          {/* Centro: nome + dificuldade */}
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Nome do acorde</Label>
              <Input
                value={chordName}
                onChange={e => setChordName(e.target.value)}
                placeholder="Ex: C, Am7, Dm"
                className="h-[34px] w-[140px] text-[13px]"
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
              disabled={saving || deleting || !chordName.trim() || rightKeys.size === 0}
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
