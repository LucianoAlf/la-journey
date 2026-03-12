import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { FloppyDisk, Trash, X, ArrowCounterClockwise } from '@phosphor-icons/react'
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

const PT: Record<string, string> = { c:'Dó', d:'Ré', e:'Mi', f:'Fá', g:'Sol', a:'Lá', b:'Si' }
const DURATION_BEATS: Record<string, number> = { w:4, h:2, q:1, '8':0.5, '16':0.25 }
const DURATION_NAMES: Record<string, string> = { w:'Semibreve', h:'Mínima', q:'Semínima', '8':'Colcheia', '16':'Semicolcheia' }

const CLEF_OPTIONS = [
  { value: 'treble', label: 'Sol' },
  { value: 'bass', label: 'Fá' },
  { value: 'alto', label: 'Dó' },
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

interface Beat {
  pitches: PitchData[]
  duration: string
  tie: boolean
  cifra: string | null
}

type EditorMode = 'free' | 'metered'
type InputMode = 'melodic' | 'chord' | 'tie' | 'cifra'

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
  return TREBLE_RANGE
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
  return tags
}

function beatsToSaveFormat(beats: Beat[]) {
  return beats.map(b => ({
    notes: b.pitches.map(p => p.pitch + ':' + b.duration),
    accidentals: b.pitches.map(p => p.accidental),
    tie: b.tie || false,
    cifra: b.cifra || null,
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
      const dur = notes[0]?.split(':')[1] ?? 'q'
      return {
        pitches,
        duration: dur,
        tie: b.tie ?? false,
        cifra: b.cifra ?? null,
      }
    })
  } catch {
    return []
  }
}

// ─── Conversão beats → formato NotationRenderer (VexFlow) ───────────
function beatsToNotationData(
  beats: Beat[],
  clef: string,
  keySig: string,
  mode: EditorMode,
  timeSig: string,
) {
  // Converter cada beat para o formato "note/octave:duration"
  const notes: string[] = []
  const accidentals: (string | null)[] = []

  beats.forEach(beat => {
    if (beat.pitches.length === 1) {
      const p = beat.pitches[0]
      notes.push(`${p.pitch}:${beat.duration}`)
      accidentals.push(p.accidental)
    } else if (beat.pitches.length > 1) {
      // Acorde: VexFlow suporta múltiplas keys num StaveNote, mas o NotationRenderer espera 1 nota por entry.
      // Para simplificar, colocar cada pitch como nota separada com mesma duração
      beat.pitches.forEach(p => {
        notes.push(`${p.pitch}:${beat.duration}`)
        accidentals.push(p.accidental)
      })
    }
  })

  return {
    type: 'staff' as const,
    staves: [{
      clef: clef as 'treble' | 'bass',
      key_signature: keySig !== 'C' ? keySig : undefined,
      time_signature: mode === 'metered' ? timeSig : undefined,
      notes,
      accidentals,
      label: '',
    }],
    width: 700,
    height: 160,
  }
}

// Geometria do VexFlow para mapeamento de clicks
const VEXFLOW_STAFF_TOP = 40    // Y do topo da pauta no SVG
const VEXFLOW_LINE_SPACE = 10   // espaçamento entre linhas no VexFlow
const VEXFLOW_STAFF_BOTTOM = VEXFLOW_STAFF_TOP + 4 * VEXFLOW_LINE_SPACE

function vexflowYToPos(y: number, scaleArr: string[]): number {
  // Converter posição Y no SVG para índice na escala
  // pos 4 = primeira linha (Mi4 na clave de Sol), cada meia-linha = 1 pos
  const pos = Math.round((VEXFLOW_STAFF_BOTTOM - y) / (VEXFLOW_LINE_SPACE / 2)) + 4
  return Math.max(0, Math.min(scaleArr.length - 1, pos))
}

// ─── Componente Principal ───────────────────────────────────────────
export function NotationEditor({ open, onOpenChange, notation, onSave, onDelete }: NotationEditorProps) {
  const isEditing = !!notation
  const wrapRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Estado do editor
  const [beats, setBeats] = useState<Beat[]>([])
  const [editorMode, setEditorMode] = useState<EditorMode>('free')
  const [inputMode, setInputMode] = useState<InputMode>('melodic')
  const [currentDuration, setCurrentDuration] = useState('q')
  const [currentAccidental, setCurrentAccidental] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<number | null>(null)
  const [hoverMouse, setHoverMouse] = useState<{ x: number; y: number } | null>(null)
  const [selectedClef, setSelectedClef] = useState('treble')
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedTime, setSelectedTime] = useState('4/4')
  const [labelText, setLabelText] = useState('')

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

  // Preview da última nota
  const [lastNote, setLastNote] = useState<string>('—')
  const [lastNoteInfo, setLastNoteInfo] = useState<string>('Clique na pauta')

  const scale = useMemo(() => getScaleForClef(selectedClef), [selectedClef])

  // Dados VexFlow atualizados em tempo real
  const notationData = useMemo(
    () => beatsToNotationData(beats, selectedClef, selectedKey, editorMode, selectedTime),
    [beats, selectedClef, selectedKey, editorMode, selectedTime],
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
    setHoverPos(null)
    setHoverMouse(null)
    setLastNote('—')
    setLastNoteInfo('Clique na pauta')
    setCifraPopupVisible(false)
  }, [open, notation])

  // Helper: mapear coordenada do mouse no overlay para posição Y no SVG do VexFlow
  function getSvgY(clientY: number): number {
    const wrap = wrapRef.current
    if (!wrap) return 0
    const svg = wrap.querySelector('svg')
    if (!svg) return clientY
    const svgRect = svg.getBoundingClientRect()
    // VexFlow SVG tem viewBox implícito — coordenada proporcional
    const svgHeight = parseFloat(svg.getAttribute('height') || '160')
    const ratio = svgHeight / svgRect.height
    return (clientY - svgRect.top) * ratio
  }

  // Mouse move handler — overlay
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const svgY = getSvgY(e.clientY)
    const pos = vexflowYToPos(svgY, scale)
    setHoverPos(pos)
    const r = wrap.getBoundingClientRect()
    setHoverMouse({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [scale])

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null)
    setHoverMouse(null)
  }, [])

  // Click handler — overlay
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const svgY = getSvgY(e.clientY)

    // Cifra mode — encontrar beat mais próximo pelo X
    if (inputMode === 'cifra') {
      if (beats.length === 0) return
      // Usar o beat mais próximo do click X (heurística simples baseada na proporção)
      const svg = wrap.querySelector('svg')
      if (!svg) return
      const svgRect = svg.getBoundingClientRect()
      const relX = (e.clientX - svgRect.left) / svgRect.width
      const bi = Math.min(beats.length - 1, Math.max(0, Math.round(relX * beats.length - 0.5)))
      setCifraTarget(bi)
      const wr = wrap.getBoundingClientRect()
      setCifraPopupPos({ x: e.clientX - wr.left - 40, y: e.clientY - wr.top - 50 })
      setCifraInput(beats[bi]?.cifra || '')
      setCifraPopupVisible(true)
      return
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
          pitches: [{ pitch, accidental: currentAccidental }],
          duration: currentDuration,
          tie: false,
          cifra: null,
        })
        // Tie mode: marca o penúltimo com tie
        if (inputMode === 'tie' && next.length >= 2) {
          next[next.length - 2] = { ...next[next.length - 2], tie: true }
          setInputMode('melodic')
        }
      }
      return next
    })

    setLastNote(displayNote(pitch, currentAccidental))
    setLastNoteInfo(inputMode === 'chord' ? 'Empilhado' : DURATION_NAMES[currentDuration])
  }, [inputMode, currentAccidental, currentDuration, scale, beats])

  // Double click = remove last beat (simplificado — sem hit-test de nota individual no VexFlow)
  const handleOverlayDblClick = useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
    setBeats(prev => prev.length > 0 ? prev.slice(0, -1) : prev)
  }, [])

  // Cifra apply
  const applyCifra = useCallback(() => {
    if (cifraTarget !== null && cifraTarget < beats.length) {
      setBeats(prev => {
        const next = [...prev]
        next[cifraTarget!] = { ...next[cifraTarget!], cifra: cifraInput || null }
        return next
      })
    }
    setCifraPopupVisible(false)
    setCifraTarget(null)
  }, [cifraTarget, cifraInput, beats.length])

  // Undo
  const handleUndo = useCallback(() => {
    setBeats(prev => prev.length > 0 ? prev.slice(0, -1) : prev)
  }, [])

  // Clear
  const handleClear = useCallback(() => {
    setBeats([])
    setInputMode('melodic')
    setCifraPopupVisible(false)
    setLastNote('—')
    setLastNoteInfo('Clique na pauta')
  }, [])

  // Info computada
  const noteCount = beats.reduce((s, b) => s + b.pitches.length, 0)
  const chordCount = beats.filter(b => b.pitches.length > 1).length
  const totalBeats = beats.reduce((s, b) => s + (DURATION_BEATS[b.duration] || 1), 0)
  const tieCount = beats.filter(b => b.tie).length
  const cifraCount = beats.filter(b => b.cifra).length
  const clefDisplay = selectedClef === 'treble' ? 'Sol' : selectedClef === 'bass' ? 'Fá' : 'Dó'

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
        className="sm:max-w-[980px] max-h-[90vh] overflow-y-auto bg-surface border-border"
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
            <Select value={selectedClef} onValueChange={v => { setSelectedClef(v); setBeats([]) }}>
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

          {/* Armadura */}
          <div className="space-y-1 min-w-[80px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Armadura</span>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="h-[34px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KEY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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

        {/* ── Linha 2: Toolbar ── */}
        <div className="flex gap-[2px] rounded-[9px] mb-2.5 flex-wrap items-center" style={{ padding: '6px 8px', backgroundColor: '#162032' }}>
          {/* Duração */}
          <div className="flex gap-[2px] items-center" style={{ paddingRight: 7, marginRight: 4, borderRight: '1px solid #334155' }}>
            <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginRight: 3, whiteSpace: 'nowrap' }}>Duração</span>
            {[
              { key: 'w', label: '𝅝' },
              { key: 'h', label: '𝅗𝅥' },
              { key: 'q', label: '♩' },
              { key: '8', label: '♪' },
              { key: '16', label: '𝅘𝅥𝅯' },
            ].map(d => (
              <TBtn key={d.key} active={currentDuration === d.key} onClick={() => setCurrentDuration(d.key)}>
                {d.label}
              </TBtn>
            ))}
          </div>

          {/* Alteração */}
          <div className="flex gap-[2px] items-center" style={{ paddingRight: 7, marginRight: 4, borderRight: '1px solid #334155' }}>
            <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginRight: 3, whiteSpace: 'nowrap' }}>Alteração</span>
            <TBtn active={currentAccidental === null} onClick={() => setCurrentAccidental(null)}>♮</TBtn>
            <TBtn active={currentAccidental === '#'} onClick={() => setCurrentAccidental('#')}>♯</TBtn>
            <TBtn active={currentAccidental === 'b'} onClick={() => setCurrentAccidental('b')}>♭</TBtn>
          </div>

          {/* Modo de input */}
          <div className="flex gap-[2px] items-center" style={{ paddingRight: 7, marginRight: 4, borderRight: '1px solid #334155' }}>
            <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginRight: 3, whiteSpace: 'nowrap' }}>Modo</span>
            <TBtn active={inputMode === 'melodic'} onClick={() => { setInputMode('melodic'); setCifraPopupVisible(false) }} title="Melódico — notas horizontais">
              <span style={{ fontSize: 10, padding: '0 2px' }}>→ Mel</span>
            </TBtn>
            <TBtn active={inputMode === 'chord'} color="chord" onClick={() => { setInputMode('chord'); setCifraPopupVisible(false) }} title="Harmônico — empilha notas">
              <span style={{ fontSize: 10, padding: '0 2px' }}>↕ Ac</span>
            </TBtn>
            <TBtn active={inputMode === 'tie'} color="tie" onClick={() => { setInputMode('tie'); setCifraPopupVisible(false) }} title="Ligadura">
              <span style={{ fontSize: 10, padding: '0 2px' }}>⌒ Lig</span>
            </TBtn>
            <TBtn active={inputMode === 'cifra'} onClick={() => { setInputMode('cifra') }} title="Cifra em cima">
              <span style={{ fontSize: 10, padding: '0 2px' }}>A7</span>
            </TBtn>
          </div>

          {/* Ferramentas */}
          <div className="flex gap-[2px] items-center">
            <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginRight: 3, whiteSpace: 'nowrap' }}>Ferramentas</span>
            <TBtn active={false} onClick={handleUndo} title="Desfazer">
              <ArrowCounterClockwise size={14} />
            </TBtn>
          </div>
        </div>

        {/* ── Linha 3: VexFlow Preview + Painel lateral ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 14, alignItems: 'start' }}>
          {/* Área do editor: VexFlow + overlay */}
          <div>
            <div
              ref={wrapRef}
              style={{ backgroundColor: '#fff', borderRadius: 10, padding: '12px 14px', position: 'relative', overflowX: 'auto', minHeight: 140 }}
            >
              {/* Indicador de modo (canto superior direito) */}
              <div style={{ position: 'absolute', top: 6, right: 10, zIndex: 15, pointerEvents: 'none' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                  color: inputMode === 'chord' ? '#6366F1' : inputMode === 'tie' ? '#F97316' : inputMode === 'cifra' ? '#6366F1' : '#22C55E',
                }}>
                  {inputMode === 'chord' ? '↕ ACORDE' : inputMode === 'tie' ? '⌒ LIGADURA' : inputMode === 'cifra' ? 'A7 CIFRA' : '→ MELÓDICO'}
                </span>
              </div>

              {/* Camada 1: VexFlow preview (bonito, profissional) */}
              <div className="notation-editor-vexflow" style={{ pointerEvents: 'none' }}>
                <NotationRenderer notation={notationData} />
              </div>

              {/* Camada 2: Overlay de input invisível por cima */}
              <div
                ref={overlayRef}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  cursor: 'crosshair', zIndex: 10,
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleOverlayClick}
                onDoubleClick={handleOverlayDblClick}
              />

              {/* Ghost note tooltip */}
              {hoverPos !== null && hoverMouse && inputMode !== 'cifra' && (
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
                    color: inputMode === 'chord' ? '#6366F1' : '#FF2D78',
                  }}>
                    {displayNote(scale[hoverPos], currentAccidental)} · {DURATION_NAMES[currentDuration]}
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
                    border: '2px solid #FF2D78',
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
                      background: '#FF2D78', color: '#fff', fontSize: 11,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    OK
                  </button>
                </div>
              )}
            </div>

            {/* Instruções */}
            <div className="text-[11px] text-text3 text-center leading-relaxed mt-2">
              <span className="text-accent font-semibold">→ Mel</span> = notas horizontais (melódicas) ·{' '}
              <span style={{ color: '#6366F1' }}><strong>↕ Ac</strong> = empilha na última posição (harmônico)</span> ·{' '}
              <span style={{ color: '#F97316' }}><strong>⌒ Lig</strong> = liga nota anterior à próxima</span> ·{' '}
              <span className="text-accent font-semibold">A7</span> = cifra em cima<br />
              <span className="text-accent font-semibold">Clique</span> = colocar nota ·{' '}
              <span className="text-accent font-semibold">Duplo clique</span> = remover nota
            </div>
          </div>

          {/* Painel lateral */}
          <div className="flex flex-col gap-2">
            {/* Informações */}
            <div style={{ background: 'var(--bg, #0F172A)', border: '1px solid #334155', borderRadius: 9, padding: 8 }}>
              <h3 style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginBottom: 4 }}>Informações</h3>
              {[
                ['Notas', String(noteCount)],
                ['Acordes', String(chordCount)],
                ...(editorMode === 'metered' ? [['Compassos', String(measureCount)]] : []),
                ['Clave', clefDisplay],
                ['Armadura', selectedKey],
                ['Tempos', totalBeats + ' tempos'],
                ['Ligaduras', String(tieCount)],
                ['Cifras', String(cifraCount)],
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
