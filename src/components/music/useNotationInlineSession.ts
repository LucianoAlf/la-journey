import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import * as Tone from 'tone'
import type { NotationDurationStripProps } from './NotationDurationStrip'
import type { NotationCifraBinding } from './NotationAlphaTabSurface'
import { playNotePreview, setNotePreviewMuted, soundingPitch } from '@/lib/notationInlineAudio'

const PREVIEW_SOUND_KEY = 'la.notation.previewSound'

function readPreviewSoundEnabled(): boolean {
  try {
    return localStorage.getItem(PREVIEW_SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}
import { SLASH_NEUTRAL_PITCH } from '@/lib/beatsToAlphaTex'
import { hydrateNotationFromBlock, type InlineBeat } from '@/lib/notationInlineHydrate'
import { resolveNotationKeyAction } from '@/lib/notationInlineKeyboard'
import { normalizeCifraSymbol } from '@/lib/notationCifra'
import {
  applyBarFact,
  applySessionToRenderData,
  deleteBeat,
  insertNote,
  insertRest,
  isSimileBar,
  replaceNote,
  resolveDeleteBeatIndex,
  sessionToAlphaTex,
  type BarFactPatch,
} from '@/lib/notationInlineOps'
import { barNumberForBeat, barStartIndexForBeat, barStartIndices, clampBarsPerSystem, navigateBarIndex } from '@/lib/notationLayout'

const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const DURATION_BEATS: Record<InlineBeat['duration'], number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125, '64': 0.0625 }

function getBeatDuration(beat: InlineBeat): number {
  let duration = DURATION_BEATS[beat.duration] || 1
  if (beat.dotted) duration *= 1.5
  if (beat.doubleDotted) duration *= 1.75
  if (beat.tuplet) duration *= beat.tuplet.notesOccupied / beat.tuplet.numNotes
  return duration
}

function getSmartOctave(noteName: string, lastPitch: string | null, clef: string): number {
  const defaultOctave = clef === 'bass' ? 3 : 4
  if (!lastPitch) return defaultOctave
  const [lastNotePart, lastOctaveText] = lastPitch.split('/')
  const lastOctave = Number(lastOctaveText)
  const lastIndex = NOTE_NAMES.indexOf(lastNotePart.charAt(0).toUpperCase())
  const nextIndex = NOTE_NAMES.indexOf(noteName)
  if (lastIndex < 0 || nextIndex < 0 || !Number.isFinite(lastOctave)) return defaultOctave
  const difference = nextIndex - lastIndex
  if (difference > 3) return lastOctave - 1
  if (difference < -3) return lastOctave + 1
  return lastOctave
}

function consumeNotationKey(event: KeyboardEvent<HTMLInputElement>) {
  event.preventDefault()
  event.stopPropagation()
}

function transposePitch(pitch: string, semitones: number): string {
  const match = pitch.match(/^([A-G])([#b]?)\/(\d+)$/)
  if (!match) return pitch
  const sharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const flat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
  const [, note, accidental, octaveText] = match
  let octave = Number(octaveText)
  let index = sharp.indexOf(note + accidental)
  if (index === -1) index = flat.indexOf(note + accidental)
  if (index === -1) index = sharp.indexOf(note)
  index += semitones
  while (index < 0) { index += 12; octave -= 1 }
  while (index >= 12) { index -= 12; octave += 1 }
  return `${sharp[index]}/${octave}`
}

type Playback = { stop: () => void }
type NotationSessionBlock = {
  id: string
  title?: string
  content?: Record<string, unknown>
  render_data?: Record<string, any>
}

export function useNotationInlineSession({
  block,
  enabled,
}: {
  block: NotationSessionBlock | null | undefined
  enabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cifraInputRef = useRef<HTMLInputElement>(null)
  const playbackRef = useRef<Playback | null>(null)
  const lastPitchRef = useRef<string | null>(null)
  const [beats, setBeats] = useState<InlineBeat[]>([])
  const [history, setHistory] = useState<InlineBeat[][]>([[]])
  const [historyIdx, setHistoryIdx] = useState(0)
  const [selectedBeatIdx, setSelectedBeatIdx] = useState(-1)
  const [currentDuration, setCurrentDuration] = useState<InlineBeat['duration']>('q')
  const [currentAccidental, setCurrentAccidental] = useState<string | null>(null)
  const [dotted, setDotted] = useState(false)
  const [doubleDotted, setDoubleDotted] = useState(false)
  const [currentTuplet, setCurrentTuplet] = useState('none')
  const [clef, setClef] = useState('treble')
  const [keySignature, setKeySignature] = useState('C')
  const [timeSignature, setTimeSignature] = useState('free')
  const [bpm, setBpm] = useState(120)
  const [grandStaff, setGrandStaff] = useState(false)
  const [barsPerSystem, setBarsPerSystem] = useState(4)
  const [activeStaff, setActiveStaff] = useState<'treble' | 'bass'>('treble')
  const [isPlaying, setIsPlaying] = useState(false)
  const [hydratedBlockId, setHydratedBlockId] = useState<string | null>(null)
  const [noteInputArmed, setNoteInputArmed] = useState(true)
  const [previewSound, setPreviewSound] = useState(readPreviewSoundEnabled)
  const [cifraEditing, setCifraEditing] = useState(false)
  const [slashArmed, setSlashArmed] = useState(false)
  const cifraEditingRef = useRef(false)

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
      inputRef.current?.select()
    })
  }, [])

  const startCifraEditing = useCallback(() => {
    if (selectedBeatIdx < 0) return
    cifraEditingRef.current = true
    setCifraEditing(true)
  }, [selectedBeatIdx])

  const stopCifraEditing = useCallback(() => {
    cifraEditingRef.current = false
    setCifraEditing(false)
    focusInput()
  }, [focusInput])

  useEffect(() => {
    playbackRef.current?.stop()
    if (!enabled || !block) {
      setHydratedBlockId(null)
      setBeats([])
      setHistory([[]])
      setHistoryIdx(0)
      setSelectedBeatIdx(-1)
      return
    }
    const session = hydrateNotationFromBlock({
      render_data: block.render_data,
      content: block.content,
      staveIndex: null,
    })
    setBeats(session.beats)
    setHistory([session.beats])
    setHistoryIdx(0)
    setSelectedBeatIdx(-1)
    setClef(session.clef)
    setKeySignature(session.keySignature)
    setTimeSignature(session.timeSignature)
    setBpm(session.bpm)
    setGrandStaff(session.grandStaff)
    setBarsPerSystem(session.barsPerSystem)
    setActiveStaff('treble')
    setCurrentAccidental(null)
    setDotted(false)
    setDoubleDotted(false)
    lastPitchRef.current = null
    setNoteInputArmed(true)
    cifraEditingRef.current = false
    setCifraEditing(false)
    setHydratedBlockId(block.id)
  }, [block?.id, enabled])

  useEffect(() => {
    if (!hydratedBlockId) return
    focusInput()
  }, [focusInput, hydratedBlockId])

  const pushHistory = useCallback((nextBeats: InlineBeat[]) => {
    setHistory(previous => {
      const trimmed = previous.slice(0, historyIdx + 1)
      return [...trimmed, nextBeats].slice(-50)
    })
    setHistoryIdx(previous => Math.min(previous + 1, 49))
  }, [historyIdx])

  const commit = useCallback((nextBeats: InlineBeat[]) => {
    setBeats(nextBeats)
    pushHistory(nextBeats)
  }, [pushHistory])

  const undo = useCallback(() => {
    if (historyIdx <= 0) return
    setHistoryIdx(index => index - 1)
    setBeats(history[historyIdx - 1])
  }, [history, historyIdx])

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return
    setHistoryIdx(index => index + 1)
    setBeats(history[historyIdx + 1])
  }, [history, historyIdx])

  const armNoteInput = useCallback(() => setNoteInputArmed(true), [])

  useEffect(() => {
    setNotePreviewMuted(!previewSound)
    try {
      localStorage.setItem(PREVIEW_SOUND_KEY, previewSound ? 'on' : 'off')
    } catch {
      // Sem storage — o mute vale só nesta sessão.
    }
  }, [previewSound])

  const onSelectBeat = useCallback((idx: number) => {
    if (idx < 0) {
      cifraEditingRef.current = false
      setCifraEditing(false)
    }
    setSelectedBeatIdx(idx)
    const beat = beats[idx]
    if (beat?.staff) setActiveStaff(beat.staff)
    if (beat && !beat.isRest && beat.pitches[0]) {
      lastPitchRef.current = beat.pitches[0].pitch
      void playNotePreview(beat.pitches.map(({ pitch, accidental }) => soundingPitch(pitch, accidental)))
    }
    if (cifraEditingRef.current) return
    focusInput()
  }, [beats, focusInput])

  const onInsertNote = useCallback((pitch: string, afterIdx: number, staff?: 'treble' | 'bass', explicitTimeSlot?: number) => {
    const lockIdx = afterIdx >= 0 ? afterIdx : selectedBeatIdx
    if (lockIdx >= 0 && isSimileBar(beats, lockIdx, timeSignature, grandStaff)) return
    const result = insertNote({
      beats, selectedBeatIdx, pitch, afterIdx, duration: currentDuration,
      accidental: currentAccidental, dotted, doubleDotted, grandStaff,
      staff, explicitTimeSlot, activeStaff, slash: slashArmed,
    })
    commit(result.beats)
    setSelectedBeatIdx(result.selectedBeatIdx)
    const writtenPitch = slashArmed ? SLASH_NEUTRAL_PITCH.pitch : pitch
    lastPitchRef.current = writtenPitch
    void playNotePreview([soundingPitch(writtenPitch, slashArmed ? null : currentAccidental)])
    if (staff) setActiveStaff(staff)
    setNoteInputArmed(true)
    focusInput()
  }, [activeStaff, beats, commit, currentAccidental, currentDuration, dotted, doubleDotted, focusInput, grandStaff, selectedBeatIdx, slashArmed, timeSignature])

  const toggleSlashArmed = useCallback(() => {
    const nextArmed = !slashArmed
    setSlashArmed(nextArmed)
    if (selectedBeatIdx < 0 || !beats[selectedBeatIdx]) return
    const beat = beats[selectedBeatIdx]
    const next = [...beats]
    next[selectedBeatIdx] = nextArmed
      ? { ...beat, slash: true, isRest: false, pitches: [{ pitch: SLASH_NEUTRAL_PITCH.pitch }] }
      : { ...beat, slash: undefined }
    commit(next)
  }, [beats, commit, selectedBeatIdx, slashArmed])

  const simileLocked = selectedBeatIdx >= 0 && isSimileBar(beats, selectedBeatIdx, timeSignature, grandStaff)

  const onApplyBarFact = useCallback((fact: BarFactPatch) => {
    if (selectedBeatIdx < 0) return
    commit(applyBarFact(beats, selectedBeatIdx, fact, timeSignature, grandStaff))
  }, [beats, commit, grandStaff, selectedBeatIdx, timeSignature])

  const onReplaceNote = useCallback((pitch: string, atIdx: number) => {
    if (isSimileBar(beats, atIdx, timeSignature, grandStaff)) return
    const result = replaceNote({ beats, atIdx, pitch, accidental: currentAccidental })
    commit(result.beats)
    lastPitchRef.current = pitch
    void playNotePreview([soundingPitch(pitch, currentAccidental)])
    setNoteInputArmed(true)
    focusInput()
  }, [beats, commit, currentAccidental, focusInput, grandStaff, timeSignature])

  const onDeleteBeat = useCallback((idx: number) => {
    const target = resolveDeleteBeatIndex(idx, beats.length)
    if (target < 0) return
    const result = deleteBeat({ beats, selectedBeatIdx, idx: target })
    commit(result.beats)
    setSelectedBeatIdx(result.selectedBeatIdx)
    focusInput()
  }, [beats, commit, focusInput, selectedBeatIdx])

  const updateBeat = useCallback((idx: number, update: Partial<InlineBeat>) => {
    if (idx < 0 || idx >= beats.length) return
    const nextBeats = [...beats]
    const nextUpdate = 'cifra' in update
      ? { ...update, cifra: normalizeCifraSymbol(update.cifra) }
      : update
    nextBeats[idx] = { ...nextBeats[idx], ...nextUpdate }
    commit(nextBeats)
  }, [beats, commit])

  const navigateBar = useCallback((delta: -1 | 1) => {
    if (beats.length === 0) return
    const next = navigateBarIndex(barStartIndices(beats, timeSignature, grandStaff), selectedBeatIdx, delta, beats.length)
    setSelectedBeatIdx(next)
    const beat = beats[next]
    if (beat?.staff) setActiveStaff(beat.staff)
    if (beat && !beat.isRest && beat.pitches[0]) {
      lastPitchRef.current = beat.pitches[0].pitch
      void playNotePreview(beat.pitches.map(({ pitch, accidental }) => soundingPitch(pitch, accidental)))
    }
    focusInput()
  }, [beats, focusInput, grandStaff, selectedBeatIdx, timeSignature])

  const navigateCifraBeat = useCallback((delta: -1 | 1) => {
    if (beats.length === 0) return
    const next = selectedBeatIdx < 0
      ? (delta > 0 ? 0 : beats.length - 1)
      : Math.min(beats.length - 1, Math.max(0, selectedBeatIdx + delta))
    setSelectedBeatIdx(next)
    const beat = beats[next]
    if (beat?.staff) setActiveStaff(beat.staff)
    if (beat && !beat.isRest && beat.pitches[0]) {
      lastPitchRef.current = beat.pitches[0].pitch
      void playNotePreview(beat.pitches.map(({ pitch, accidental }) => soundingPitch(pitch, accidental)))
    }
  }, [beats, selectedBeatIdx])

  const navigateSelection = useCallback((delta: -1 | 1) => {
    if (beats.length === 0) return
    const next = selectedBeatIdx < 0
      ? (delta > 0 ? 0 : beats.length - 1)
      : Math.min(beats.length - 1, Math.max(0, selectedBeatIdx + delta))
    setSelectedBeatIdx(next)
    const beat = beats[next]
    if (beat?.staff) setActiveStaff(beat.staff)
    if (beat && !beat.isRest && beat.pitches[0]) {
      lastPitchRef.current = beat.pitches[0].pitch
      void playNotePreview(beat.pitches.map(({ pitch, accidental }) => soundingPitch(pitch, accidental)))
    }
    focusInput()
  }, [beats, focusInput, selectedBeatIdx])

  const transposeSelected = useCallback((direction: -1 | 1, octave: boolean) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    const beat = beats[selectedBeatIdx]
    if (beat.isRest || beat.pitches.length === 0) return
    const nextPitches = beat.pitches.map(pitchData => {
      const [notePart, octaveText] = pitchData.pitch.split('/')
      let octaveValue = parseInt(octaveText, 10)
      let noteIdx = NOTE_NAMES.indexOf(notePart.charAt(0).toUpperCase())
      if (octave) {
        octaveValue += direction
      } else {
        noteIdx += direction
        if (noteIdx > 6) { noteIdx = 0; octaveValue += 1 }
        if (noteIdx < 0) { noteIdx = 6; octaveValue -= 1 }
      }
      return { ...pitchData, pitch: `${NOTE_NAMES[noteIdx]}/${octaveValue}` }
    })
    updateBeat(selectedBeatIdx, { pitches: nextPitches })
    lastPitchRef.current = nextPitches[0].pitch
    void playNotePreview(nextPitches.map(({ pitch, accidental }) => soundingPitch(pitch, accidental)))
  }, [beats, selectedBeatIdx, updateBeat])

  const addChordNote = useCallback((note: string) => {
    if (selectedBeatIdx < 0 || selectedBeatIdx >= beats.length) return
    const beat = beats[selectedBeatIdx]
    if (beat.isRest) return
    const inputClef = grandStaff && activeStaff === 'bass' ? 'bass' : clef
    const pitch = `${note}/${getSmartOctave(note, lastPitchRef.current, inputClef)}`
    const nextPitches = [...beat.pitches, { pitch, accidental: currentAccidental || undefined }]
    updateBeat(selectedBeatIdx, { pitches: nextPitches })
    lastPitchRef.current = pitch
    void playNotePreview(nextPitches.map(({ pitch: chordPitch, accidental }) => soundingPitch(chordPitch, accidental)))
  }, [activeStaff, beats, clef, currentAccidental, grandStaff, selectedBeatIdx, updateBeat])

  const insertNoteByName = useCallback((note: string) => {
    const inputClef = grandStaff && activeStaff === 'bass' ? 'bass' : clef
    const pitch = `${note}/${getSmartOctave(note, lastPitchRef.current, inputClef)}`
    onInsertNote(pitch, selectedBeatIdx >= 0 ? selectedBeatIdx : beats.length - 1)
  }, [activeStaff, beats.length, clef, grandStaff, onInsertNote, selectedBeatIdx])

  const repeatLastNote = useCallback(() => {
    const pitch = lastPitchRef.current
    if (!pitch) return
    onInsertNote(pitch, selectedBeatIdx >= 0 ? selectedBeatIdx : beats.length - 1)
  }, [beats.length, onInsertNote, selectedBeatIdx])

  const onInsertRest = useCallback(() => {
    if (simileLocked) return
    const result = insertRest({ beats, selectedBeatIdx, duration: currentDuration, dotted, doubleDotted })
    commit(result.beats)
    setSelectedBeatIdx(result.selectedBeatIdx)
    focusInput()
  }, [beats, commit, currentDuration, dotted, doubleDotted, focusInput, selectedBeatIdx, simileLocked])

  const toggleDot = useCallback(() => {
    const next = doubleDotted ? { dotted: false, doubleDotted: false } : dotted ? { dotted: false, doubleDotted: true } : { dotted: true, doubleDotted: false }
    setDotted(next.dotted)
    setDoubleDotted(next.doubleDotted)
    if (selectedBeatIdx >= 0) updateBeat(selectedBeatIdx, next)
    focusInput()
  }, [dotted, doubleDotted, focusInput, selectedBeatIdx, updateBeat])

  const startPlayback = useCallback(async () => {
    if (beats.length === 0) return
    await Tone.start()
    const synth = new Tone.PolySynth(Tone.Synth).toDestination()
    setIsPlaying(true)
    let currentTime = Tone.now()
    const secondsPerBeat = 60 / bpm
    for (let index = 0; index < beats.length; index += 1) {
      const beat = beats[index]
      const duration = getBeatDuration(beat) * secondsPerBeat
      if (!beat.isRest && beat.pitches.length > 0) {
        synth.triggerAttackRelease(beat.pitches.map(({ pitch }) => pitch.replace('/', '')), duration, currentTime)
      }
      currentTime += duration
    }
    Tone.Transport.schedule(() => {
      setIsPlaying(false)
      synth.dispose()
    }, currentTime)
    Tone.Transport.start()
    playbackRef.current = {
      stop: () => {
        Tone.Transport.stop()
        Tone.Transport.cancel()
        synth.dispose()
        setIsPlaying(false)
      },
    }
  }, [beats, bpm])

  const stopPlayback = useCallback(() => playbackRef.current?.stop(), [])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    const action = resolveNotationKeyAction(event, {
      hasSelection: selectedBeatIdx >= 0,
      noteInputArmed,
    })
    if (!action) return
    consumeNotationKey(event)
    if (simileLocked && (action.type === 'insert-note' || action.type === 'add-chord-note' || action.type === 'insert-rest' || action.type === 'set-duration' || action.type === 'toggle-dot' || action.type === 'repeat-last-note')) return
    switch (action.type) {
      case 'undo': undo(); break
      case 'redo': redo(); break
      case 'set-duration':
        setNoteInputArmed(true)
        setCurrentDuration(action.duration)
        if (selectedBeatIdx >= 0) updateBeat(selectedBeatIdx, { duration: action.duration })
        break
      case 'toggle-dot': toggleDot(); break
      case 'insert-rest': onInsertRest(); break
      case 'toggle-play':
        if (isPlaying) stopPlayback()
        else void startPlayback()
        break
      case 'insert-note': insertNoteByName(action.note); break
      case 'add-chord-note': addChordNote(action.note); break
      case 'navigate': navigateSelection(action.delta); break
      case 'navigate-bar': navigateBar(action.delta); break
      case 'transpose': transposeSelected(action.direction, action.octave); break
      case 'repeat-last-note': repeatLastNote(); break
      case 'delete-beat':
        onDeleteBeat(selectedBeatIdx)
        break
      case 'set-accidental':
        setCurrentAccidental(value => value === action.accidental ? null : action.accidental)
        break
      case 'leave-note-input':
        setNoteInputArmed(false)
        break
      case 'release-selection':
        cifraEditingRef.current = false
        setCifraEditing(false)
        setSelectedBeatIdx(-1)
        break
      case 'focus-cifra':
        startCifraEditing()
        break
    }
  }, [addChordNote, insertNoteByName, isPlaying, navigateBar, navigateSelection, noteInputArmed, onDeleteBeat, onInsertRest, redo, repeatLastNote, selectedBeatIdx, simileLocked, startCifraEditing, startPlayback, stopPlayback, toggleDot, transposeSelected, undo, updateBeat])

  const patchRenderData = useMemo(() => {
    if (!enabled || !block || hydratedBlockId !== block.id) return null
    return applySessionToRenderData(block.render_data ?? {}, {
      beats, clef, keySignature, timeSignature, bpm, grandStaff, barsPerSystem, title: block.title,
    })
  }, [barsPerSystem, beats, block, bpm, clef, enabled, grandStaff, hydratedBlockId, keySignature, timeSignature])
  const { tex, indexMap } = useMemo(() => sessionToAlphaTex({ beats, clef, keySignature, timeSignature, bpm, grandStaff }), [beats, bpm, clef, grandStaff, keySignature, timeSignature])

  const durationStrip: NotationDurationStripProps = {
    currentDuration, currentAccidental, dotted, doubleDotted,
    noteInputArmed,
    canDelete: beats.length > 0,
    previewSound,
    onDuration: duration => {
      stopCifraEditing()
      setNoteInputArmed(true)
      setCurrentDuration(duration)
    },
    onAccidental: accidental => {
      stopCifraEditing()
      setCurrentAccidental(accidental)
    },
    onToggleDot: toggleDot,
    onInsertRest,
    onDelete: () => onDeleteBeat(selectedBeatIdx),
    onTogglePreviewSound: () => setPreviewSound(value => !value),
    cifraEnabled: selectedBeatIdx >= 0,
    cifraOpen: cifraEditing,
    onOpenCifra: startCifraEditing,
    slashArmed,
    onToggleSlash: toggleSlashArmed,
    inputLocked: simileLocked,
  }

  const cifraValue = selectedBeatIdx >= 0 ? (beats[selectedBeatIdx]?.cifra ?? '') : ''

  const cifraOverlay: NotationCifraBinding = {
    value: cifraValue,
    editing: cifraEditing,
    inputRef: cifraInputRef,
    onCommit: (value: string) => {
      if (selectedBeatIdx < 0) return
      if ((beats[selectedBeatIdx]?.cifra ?? '') === (normalizeCifraSymbol(value) ?? '')) return
      updateBeat(selectedBeatIdx, { cifra: value })
    },
    onStartEditing: startCifraEditing,
    onStopEditing: stopCifraEditing,
    onNavigateBeat: navigateCifraBeat,
  }

  const barStart = selectedBeatIdx >= 0
    ? barStartIndexForBeat(beats, selectedBeatIdx, timeSignature, grandStaff)
    : -1
  const barFactBeat = barStart >= 0 ? beats[barStart] : undefined
  const barNumber = selectedBeatIdx >= 0
    ? barNumberForBeat(beats, selectedBeatIdx, timeSignature, grandStaff)
    : 0

  return {
    inputRef: inputRef as RefObject<HTMLInputElement>,
    beats, selectedBeatIdx, currentDuration, currentAccidental, dotted, doubleDotted,
    currentTuplet, clef, keySignature, timeSignature, bpm, grandStaff, barsPerSystem, activeStaff, isPlaying,
    canUndo: historyIdx > 0, canRedo: historyIdx < history.length - 1,
    isHydrated: hydratedBlockId === block?.id,
    patchRenderData, tex, indexMap, durationStrip, cifraOverlay, cifraValue, noteInputArmed, armNoteInput,
    onSelectBeat, onInsertNote, onReplaceNote, onDeleteBeat, onInsertRest,
    onDuration: setCurrentDuration, onAccidental: setCurrentAccidental, onToggleDot: toggleDot,
    onTimeSignature: setTimeSignature, onClef: setClef, onKeySignature: setKeySignature,
    onBarsPerSystem: (value: number) => setBarsPerSystem(clampBarsPerSystem(value)),
    onTuplet: setCurrentTuplet, onBpm: setBpm,
    onGrandStaff: () => setGrandStaff(value => !value),
    onFocusStaff: setActiveStaff,
    onTransposeUp: () => {
      const beat = beats[selectedBeatIdx]
      if (!beat || beat.isRest) return
      const pitches = beat.pitches.map(pitch => ({ ...pitch, pitch: transposePitch(pitch.pitch, 1), accidental: undefined }))
      updateBeat(selectedBeatIdx, { pitches })
      lastPitchRef.current = pitches[0]?.pitch ?? null
      void playNotePreview(pitches.map(({ pitch, accidental }) => soundingPitch(pitch, accidental)))
    },
    onTransposeDown: () => {
      const beat = beats[selectedBeatIdx]
      if (!beat || beat.isRest) return
      const pitches = beat.pitches.map(pitch => ({ ...pitch, pitch: transposePitch(pitch.pitch, -1), accidental: undefined }))
      updateBeat(selectedBeatIdx, { pitches })
      lastPitchRef.current = pitches[0]?.pitch ?? null
      void playNotePreview(pitches.map(({ pitch, accidental }) => soundingPitch(pitch, accidental)))
    },
    onUndo: undo, onRedo: redo, onTogglePlay: isPlaying ? stopPlayback : startPlayback,
    onOpenCifra: startCifraEditing,
    cifraEditing,
    barNumber,
    barEnabled: selectedBeatIdx >= 0,
    simileLocked,
    sectionMarker: barFactBeat?.sectionStart?.marker ?? '',
    sectionText: barFactBeat?.sectionStart?.text ?? '',
    repeatOpen: Boolean(barFactBeat?.repeatOpen),
    repeatClose: barFactBeat?.repeatClose,
    simile: Boolean(barFactBeat?.simile),
    barTimeSignature: barFactBeat?.timeSignature ?? '',
    jumpFine: barFactBeat?.jump === 'fine',
    onApplyBarFact,
    disarmNoteInput: () => { setNoteInputArmed(false); focusInput() },
    clearSelection: () => {
      cifraEditingRef.current = false
      setCifraEditing(false)
      setSelectedBeatIdx(-1)
    },
    handleKeyDown,
  }
}
