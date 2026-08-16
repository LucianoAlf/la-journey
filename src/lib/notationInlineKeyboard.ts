// src/lib/notationInlineKeyboard.ts
export type NotationNoteName = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type NotationKeyDuration = '64' | '32' | '16' | '8' | 'q' | 'h' | 'w'

export interface NotationKeyEvent {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

export interface NotationKeyContext {
  hasSelection: boolean
  noteInputArmed?: boolean
}

export type NotationKeyAction =
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'set-duration'; duration: NotationKeyDuration }
  | { type: 'toggle-dot' }
  | { type: 'insert-rest' }
  | { type: 'toggle-play' }
  | { type: 'insert-note'; note: NotationNoteName }
  | { type: 'add-chord-note'; note: NotationNoteName }
  | { type: 'navigate'; delta: -1 | 1 }
  | { type: 'navigate-bar'; delta: -1 | 1 }
  | { type: 'transpose'; direction: -1 | 1; octave: boolean }
  | { type: 'repeat-last-note' }
  | { type: 'delete-beat'; backspace: boolean }
  | { type: 'set-accidental'; accidental: '#' | 'b' | 'n' }
  | { type: 'leave-note-input' }
  | { type: 'release-selection' }

const NOTE_LETTERS: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const DURATIONS: NotationKeyDuration[] = ['64', '32', '16', '8', 'q', 'h', 'w']

export function resolveNotationKeyAction(
  event: NotationKeyEvent,
  context: NotationKeyContext,
): NotationKeyAction | null {
  const { key } = event
  const ctrl = Boolean(event.ctrlKey || event.metaKey)

  if (ctrl && (key === 'z' || key === 'Z')) return { type: 'undo' }
  if (ctrl && (key === 'y' || key === 'Y')) return { type: 'redo' }

  if (key === 'ArrowLeft') {
    return ctrl ? { type: 'navigate-bar', delta: -1 } : { type: 'navigate', delta: -1 }
  }
  if (key === 'ArrowRight') {
    return ctrl ? { type: 'navigate-bar', delta: 1 } : { type: 'navigate', delta: 1 }
  }
  if (key === 'ArrowUp') return { type: 'transpose', direction: 1, octave: ctrl }
  if (key === 'ArrowDown') return { type: 'transpose', direction: -1, octave: ctrl }
  if (key === 'Tab') return { type: 'navigate-bar', delta: event.shiftKey ? -1 : 1 }

  if (ctrl || event.altKey) return null

  const durationIdx = '1234567'.indexOf(key)
  if (durationIdx >= 0) return { type: 'set-duration', duration: DURATIONS[durationIdx] }

  if (key === '.' || key === ',') return { type: 'toggle-dot' }
  if (key === '0') return { type: 'insert-rest' }
  if (key === ' ') return { type: 'toggle-play' }
  if (key === '#') return { type: 'set-accidental', accidental: '#' }
  if (key === '-') return { type: 'set-accidental', accidental: 'b' }
  if (key === '=') return { type: 'set-accidental', accidental: 'n' }
  if (key === 'r' || key === 'R') return { type: 'repeat-last-note' }
  if (key === 'v' || key === 'V') {
    return context.noteInputArmed ? { type: 'leave-note-input' } : null
  }
  if (key === 'Delete') return { type: 'delete-beat', backspace: false }
  if (key === 'Backspace') return { type: 'delete-beat', backspace: true }
  if (key === 'Escape') {
    if (context.noteInputArmed) return { type: 'leave-note-input' }
    if (context.hasSelection) return { type: 'release-selection' }
    return null
  }

  const letter = key.length === 1 ? key.toUpperCase() : ''
  if (NOTE_LETTERS.includes(letter)) {
    const note = letter as NotationNoteName
    if (event.shiftKey) return context.hasSelection ? { type: 'add-chord-note', note } : null
    return { type: 'insert-note', note }
  }

  return null
}
