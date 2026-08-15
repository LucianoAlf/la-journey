import type { BeatDuration } from '@/components/music/NotationSvgEditor'

export const DURATION_OPTIONS: { value: BeatDuration; label: string; symbol: string; beats: number; key: string }[] = [
  { value: 'w', label: 'Semibreve', symbol: '𝅝', beats: 4, key: '7' },
  { value: 'h', label: 'Mínima', symbol: '𝅗𝅥', beats: 2, key: '6' },
  { value: 'q', label: 'Semínima', symbol: '♩', beats: 1, key: '5' },
  { value: '8', label: 'Colcheia', symbol: '♪', beats: 0.5, key: '4' },
  { value: '16', label: 'Semicolcheia', symbol: '𝅘𝅥𝅯', beats: 0.25, key: '3' },
  { value: '32', label: 'Fusa', symbol: '𝅘𝅥𝅰', beats: 0.125, key: '2' },
  { value: '64', label: 'Semifusa', symbol: '𝅘𝅥𝅱', beats: 0.0625, key: '1' },
]

export const CLEF_OPTIONS = [
  { value: 'treble', label: 'Sol (Treble)' },
  { value: 'bass', label: 'Fá (Bass)' },
  { value: 'alto', label: 'Dó (Alto)' },
  { value: 'percussion', label: 'Percussão' },
]

export const KEY_SIGNATURE_OPTIONS = [
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

export const TIME_SIGNATURE_OPTIONS = [
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

export const TUPLET_OPTIONS = [
  { value: 'none', label: 'Sem quiáltera', numNotes: 0, notesOccupied: 0 },
  { value: '3:2', label: 'Tercina (3:2)', numNotes: 3, notesOccupied: 2 },
  { value: '5:4', label: 'Quintina (5:4)', numNotes: 5, notesOccupied: 4 },
  { value: '6:4', label: 'Sextina (6:4)', numNotes: 6, notesOccupied: 4 },
  { value: '7:4', label: 'Septina (7:4)', numNotes: 7, notesOccupied: 4 },
]
