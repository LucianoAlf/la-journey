import type { EstudoDisplayMode } from './estudoConfig'
import { hydrateNotationFromBlock, type InlineBeat } from './notationInlineHydrate'
import { sessionToAlphaTex } from './notationInlineOps'

function beatsForDisplay(beats: InlineBeat[], displayMode: EstudoDisplayMode): InlineBeat[] {
  if (displayMode !== 'chords') return beats
  return beats.map((beat) => ({
    ...beat,
    isRest: true,
    slash: false,
    pitches: [],
  }))
}

export function studyTexFromBlock(
  block: { content?: unknown; render_data?: unknown },
  displayMode: EstudoDisplayMode = 'slash-beat',
): { tex: string; barsPerSystem: number; indexMap: number[] } | null {
  const session = hydrateNotationFromBlock({
    content: block.content,
    render_data: block.render_data,
  })
  if (!session.beats.length) return null
  const hideKey = displayMode === 'slash-beat' || displayMode === 'chords'
  const { tex, indexMap } = sessionToAlphaTex({
    beats: beatsForDisplay(session.beats, displayMode),
    clef: session.clef,
    keySignature: hideKey ? 'C' : session.keySignature,
    timeSignature: session.timeSignature,
    bpm: session.bpm,
    grandStaff: session.grandStaff,
  })
  if (!tex.trim()) return null
  return { tex, barsPerSystem: session.barsPerSystem, indexMap }
}
