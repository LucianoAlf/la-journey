import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow'

interface RhythmFigure {
  duration: string
  namePt: string
  beats: string
}

const FIGURES: RhythmFigure[] = [
  { duration: 'w', namePt: 'Semibreve', beats: '4 tempos' },
  { duration: 'h', namePt: 'Mínima', beats: '2 tempos' },
  { duration: 'q', namePt: 'Semínima', beats: '1 tempo' },
  { duration: '8', namePt: 'Colcheia', beats: '½ tempo' },
  { duration: '16', namePt: 'Semicolcheia', beats: '¼ tempo' },
]

export function RhythmNotation() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''

    try {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark')
      const noteColor = isDark ? '#e2e8f0' : '#1a1a2e'
      const lineColor = isDark ? '#94a3b8' : '#1a1a2e'

      const renderer = new Renderer(ref.current, Renderer.Backends.SVG)
      renderer.resize(600, 140)
      const context = renderer.getContext()

      context.setFillStyle(noteColor)
      context.setStrokeStyle(lineColor)

      const stave = new Stave(10, 10, 580)
      stave.setContext(context).draw()

      // Cada figura é renderizada como uma nota B/4 com a duração correspondente
      // Usamos setStrict(false) pois as figuras não somam um compasso exato
      const staveNotes = FIGURES.map(f =>
        new StaveNote({ keys: ['b/4'], duration: f.duration })
      )

      // Total beats: 4 + 2 + 1 + 0.5 + 0.25 = 7.75
      const voice = new Voice({ numBeats: 7.75, beatValue: 4 })
      voice.setStrict(false)
      voice.addTickables(staveNotes)

      new Formatter().joinVoices([voice]).format([voice], 520)
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
      console.error('RhythmNotation render error:', e)
    }
  }, [])

  return (
    <div>
      <div ref={ref} className="overflow-x-auto" />
      <div className="flex justify-around mt-2 px-4">
        {FIGURES.map(f => (
          <div key={f.duration} className="text-center">
            <div className="text-[12px] font-bold text-text">{f.namePt}</div>
            <div className="text-[10px] text-text3">{f.beats}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
