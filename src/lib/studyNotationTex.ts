import { hydrateNotationFromBlock } from './notationInlineHydrate'
import { sessionToAlphaTex } from './notationInlineOps'

export function studyTexFromBlock(block: {
  content?: unknown
  render_data?: unknown
}): { tex: string; barsPerSystem: number } | null {
  const session = hydrateNotationFromBlock({
    content: block.content,
    render_data: block.render_data,
  })
  if (!session.beats.length) return null
  const { tex } = sessionToAlphaTex({
    beats: session.beats,
    clef: session.clef,
    keySignature: session.keySignature,
    timeSignature: session.timeSignature,
    bpm: session.bpm,
    grandStaff: session.grandStaff,
  })
  if (!tex.trim()) return null
  return { tex, barsPerSystem: session.barsPerSystem }
}
