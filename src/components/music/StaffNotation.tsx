import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow'

export interface StaffNotationProps {
  notes: string[]
  clef?: 'treble' | 'bass'
  timeSignature?: string
  keySignature?: string
  width?: number
  height?: number
}

const DURATION_BEATS: Record<string, number> = {
  w: 4,
  h: 2,
  q: 1,
  '8': 0.5,
  '16': 0.25,
}

export function StaffNotation({
  notes,
  clef = 'treble',
  timeSignature,
  keySignature,
  width = 500,
  height = 140,
}: StaffNotationProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || notes.length === 0) return
    ref.current.innerHTML = ''

    try {
      const renderer = new Renderer(ref.current, Renderer.Backends.SVG)
      renderer.resize(width, height)
      const context = renderer.getContext()

      const staveWidth = width - 20
      const stave = new Stave(10, 10, staveWidth)
      stave.addClef(clef)
      if (keySignature) stave.addKeySignature(keySignature)
      if (timeSignature) stave.addTimeSignature(timeSignature)
      stave.setContext(context).draw()

      const staveNotes = notes.map((n) => {
        const [pitch, duration = 'q'] = n.split(':')
        const match = pitch.match(/^([a-g])(#|b)?\/(\d)$/i)
        const basePitch = match ? `${match[1]}/${match[3]}` : pitch
        const accidental = match ? match[2] : null

        const note = new StaveNote({
          keys: [basePitch],
          duration,
          clef,
        })

        if (accidental) note.addModifier(new Accidental(accidental))

        return note
      })

      const totalBeats = notes.reduce((sum, n) => {
        const dur = n.split(':')[1] || 'q'
        return sum + (DURATION_BEATS[dur] ?? 1)
      }, 0)

      const voice = new Voice({
        numBeats: totalBeats,
        beatValue: 4,
      })
      voice.setStrict(false)
      voice.addTickables(staveNotes)

      new Formatter().joinVoices([voice]).format([voice], staveWidth - 80)
      voice.draw(context, stave)

      const svg = ref.current.querySelector('svg')
      if (svg) {
        svg.removeAttribute('width')
        svg.removeAttribute('height')
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
        svg.setAttribute('preserveAspectRatio', 'xMinYMid meet')
        svg.style.width = '100%'
        svg.style.height = 'auto'
        svg.style.maxWidth = '100%'
        svg.style.display = 'block'
      }
    } catch (e) {
      console.error('StaffNotation render error:', e)
    }
  }, [notes, clef, timeSignature, keySignature, width, height])

  return <div ref={ref} className="w-full min-w-0 overflow-x-auto notation-container bg-white rounded-lg" />
}
