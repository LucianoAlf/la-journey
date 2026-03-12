import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow'

export interface StaffNotationProps {
  /** Notas no formato 'nota/oitava:duração' ex: 'c/4:q', 'd/4:h' */
  notes: string[]
  clef?: 'treble' | 'bass'
  timeSignature?: string
  keySignature?: string
  /** Largura do SVG em px */
  width?: number
  /** Altura do SVG em px */
  height?: number
}

const DURATION_BEATS: Record<string, number> = {
  w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25,
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
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark')
      const noteColor = isDark ? '#e2e8f0' : '#1a1a2e'
      const lineColor = isDark ? '#94a3b8' : '#1a1a2e'

      const renderer = new Renderer(ref.current, Renderer.Backends.SVG)
      renderer.resize(width, height)
      const context = renderer.getContext()

      context.setFillStyle(noteColor)
      context.setStrokeStyle(lineColor)

      const staveWidth = width - 20
      const stave = new Stave(10, 10, staveWidth)
      stave.addClef(clef)
      if (keySignature) stave.addKeySignature(keySignature)
      if (timeSignature) stave.addTimeSignature(timeSignature)
      stave.setContext(context).draw()

      const staveNotes = notes.map(n => {
        const [pitch, duration = 'q'] = n.split(':')

        // Extrair nota base e acidente: "eb/4" → base="e", acc="b", octave="4"
        // "f#/4" → base="f", acc="#", octave="4"
        // "b/4"  → base="b", acc=null, octave="4" (B natural, sem flat!)
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

      // Calcular total de beats para a Voice
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

      // Patch pós-render: forçar cores em todos os elementos SVG
      const svg = ref.current.querySelector('svg')
      if (svg) {
        const BLACK = ['#000000', '#000', 'black', 'none', '']
        svg.querySelectorAll('path, line, rect').forEach(el => {
          const s = el.getAttribute('stroke')
          if (!s || BLACK.includes(s)) el.setAttribute('stroke', lineColor)
          const f = el.getAttribute('fill')
          if (f && BLACK.includes(f)) el.setAttribute('fill', noteColor)
        })
        svg.querySelectorAll('text').forEach(el => {
          el.setAttribute('fill', noteColor)
        })
      }
    } catch (e) {
      console.error('StaffNotation render error:', e)
    }
  }, [notes, clef, timeSignature, keySignature, width, height])

  return <div ref={ref} className="overflow-x-auto" />
}
