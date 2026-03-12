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
      // VexFlow SEMPRE renderiza preto sobre branco
      // Dark mode é tratado via CSS no container (.notation-container + filter invert)
      const renderer = new Renderer(ref.current, Renderer.Backends.SVG)
      renderer.resize(600, 140)
      const context = renderer.getContext()

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
    } catch (e) {
      console.error('RhythmNotation render error:', e)
    }
  }, [])

  return (
    <div>
      <div ref={ref} className="overflow-x-auto notation-container bg-white rounded-lg" />
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
