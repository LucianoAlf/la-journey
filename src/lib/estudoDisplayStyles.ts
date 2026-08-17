import * as alphaTabModule from '@coderline/alphatab'
import type { EstudoDisplayMode } from './estudoConfig'

export type HiddenGlyph = 'stem' | 'flags' | 'beams' | 'rests' | 'notehead' | 'accidentals'

const TRANSPARENT = new alphaTabModule.model.Color(0, 0, 0, 0)

export function hiddenGlyphsForDisplay(mode: EstudoDisplayMode): HiddenGlyph[] {
  if (mode === 'slash-beat') return ['stem', 'flags', 'beams', 'accidentals']
  if (mode === 'slash-rhythm') return ['accidentals']
  if (mode === 'chords') return ['stem', 'flags', 'beams', 'rests', 'notehead', 'accidentals']
  return []
}

export function applyEstudoBarsPerRow(
  score: alphaTabModule.model.Score | null,
  barsPerRow: number,
) {
  if (!score?.masterBars?.length || barsPerRow <= 0) return
  const systems: number[] = []
  let remaining = score.masterBars?.length ?? 0
  while (remaining > 0) {
    systems.push(Math.min(barsPerRow, remaining))
    remaining -= barsPerRow
  }
  score.defaultSystemsLayout = barsPerRow
  score.systemsLayout = systems
  for (const track of score.tracks ?? []) {
    track.defaultSystemsLayout = barsPerRow
    track.systemsLayout = systems
  }
}

export function applyEstudoDisplayStyles(
  score: alphaTabModule.model.Score | null,
  mode: EstudoDisplayMode,
) {
  const glyphs = hiddenGlyphsForDisplay(mode)
  if (!score || glyphs.length === 0) return

  const BeatSub = alphaTabModule.model.BeatSubElement
  const NoteSub = alphaTabModule.model.NoteSubElement
  const hideStem = glyphs.includes('stem')
  const hideFlags = glyphs.includes('flags')
  const hideBeams = glyphs.includes('beams')
  const hideRests = glyphs.includes('rests')
  const hideNotehead = glyphs.includes('notehead')
  const hideAccidentals = glyphs.includes('accidentals')

  const bars = score.tracks?.[0]?.staves?.[0]?.bars ?? []
  for (const bar of bars) {
    for (const beat of bar.voices?.[0]?.beats ?? []) {
      const style = beat.style ?? new alphaTabModule.model.BeatStyle()
      if (hideStem) style.colors.set(BeatSub.StandardNotationStem, TRANSPARENT)
      if (hideFlags) style.colors.set(BeatSub.StandardNotationFlags, TRANSPARENT)
      if (hideBeams) style.colors.set(BeatSub.StandardNotationBeams, TRANSPARENT)
      if (hideRests) style.colors.set(BeatSub.StandardNotationRests, TRANSPARENT)
      beat.style = style

      if (!hideNotehead && !hideAccidentals) continue
      for (const note of beat.notes ?? []) {
        const noteStyle = note.style ?? new alphaTabModule.model.NoteStyle()
        if (hideNotehead) noteStyle.colors.set(NoteSub.StandardNotationNoteHead, TRANSPARENT)
        if (hideAccidentals) noteStyle.colors.set(NoteSub.StandardNotationAccidentals, TRANSPARENT)
        note.style = noteStyle
      }
    }
  }
}
