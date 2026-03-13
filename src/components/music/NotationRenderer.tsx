import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot } from 'vexflow'

// --- Tipos ---

interface StaveData {
  clef?: 'treble' | 'bass' | 'alto' | 'percussion'
  key_signature?: string
  time_signature?: string
  notes?: (string | { key: string; duration: string; label?: string })[]
  accidentals?: (string | null)[]
  intervals?: string[]
  degree_names?: string[]
  label?: string
}

interface NotationData {
  type: 'staff' | 'multi_staff' | 'scale_with_intervals' | 'exercise_staff' |
        'rhythm_figures' | 'accidentals' | 'time_signatures' | 'rhythm_exercise'
  staves: StaveData[]
  width?: number
  height?: number
}

export interface NotationRendererProps {
  notation: NotationData
}

// --- Constantes ---

const DURATION_BEATS: Record<string, number> = {
  w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25,
}

const STAVE_HEIGHT = 120
const STAVE_GAP = 24
const LABEL_HEIGHT = 28
const INTERVAL_HEIGHT = 28

// --- Helpers ---

function parseNote(noteStr: string | { key: string; duration: string; label?: string }) {
  let key: string
  let rawDuration: string

  if (typeof noteStr === 'string') {
    const parts = noteStr.split(':')
    key = parts[0]
    rawDuration = parts[1] || 'q'
  } else {
    key = noteStr.key
    rawDuration = noteStr.duration || 'q'
  }

  // Extrair sufixos: 'd' = dotted, 'r' = rest
  const isDotted = rawDuration.includes('d')
  const isRest = rawDuration.includes('r')
  const duration = rawDuration.replace(/[dr]/g, '') + (isRest ? 'r' : '')

  // Extrair acidental: "f#/4" → base="f/4", acc="#"
  // "eb/4" → base="e/4", acc="b"
  // "b/4" → base="b/4", acc=null (B natural)
  const match = key.match(/^([a-g])(#|b)?\/([\d])$/i)
  const basePitch = match ? `${match[1]}/${match[3]}` : key
  const accidental = match ? match[2] : null

  return { basePitch, duration, accidental, isDotted, isRest }
}

// Cores fixas — VexFlow sempre renderiza no modo "light" (preto sobre branco)
// O dark mode é tratado via CSS no container (invert + hue-rotate)
const COLORS = {
  label: '#64748b',
  interval: '#b45309',
}

function renderStave(
  context: any,
  staveData: StaveData,
  yOffset: number,
  staveWidth: number,
) {
  const stave = new Stave(10, yOffset, staveWidth)
  if (staveData.clef) stave.addClef(staveData.clef)
  if (staveData.key_signature) stave.addKeySignature(staveData.key_signature)
  if (staveData.time_signature) stave.addTimeSignature(staveData.time_signature)
  stave.setContext(context).draw()

  const notes = staveData.notes ?? []
  if (notes.length === 0) return

  const staveNotes = notes.map((noteStr, i) => {
    const { basePitch, duration, accidental, isDotted, isRest } = parseNote(noteStr)
    const note = new StaveNote({
      keys: [isRest ? 'b/4' : basePitch],
      duration,
      clef: staveData.clef || 'treble',
    })

    // Ponto de aumento
    if (isDotted) {
      Dot.buildAndAttach([note], { all: true })
    }

    // Acidental (não aplicar em pausas)
    if (!isRest) {
      if (accidental) {
        note.addModifier(new Accidental(accidental))
      } else if (staveData.accidentals?.[i]) {
        note.addModifier(new Accidental(staveData.accidentals[i]!))
      }
    }

    return note
  })

  // Calcular beats totais
  const totalBeats = notes.reduce((sum, n) => {
    let rawDur: string
    if (typeof n === 'string') {
      rawDur = n.split(':')[1] || 'q'
    } else {
      rawDur = n.duration || 'q'
    }
    const isDot = rawDur.includes('d')
    const baseDur = rawDur.replace(/[dr]/g, '')
    const base = DURATION_BEATS[baseDur] ?? 1
    return sum + (isDot ? base * 1.5 : base)
  }, 0)

  const voice = new Voice({ numBeats: totalBeats, beatValue: 4 })
  voice.setStrict(false)
  voice.addTickables(staveNotes)

  new Formatter().joinVoices([voice]).format([voice], staveWidth - 80)
  voice.draw(context, stave)
}

// --- Componente Principal ---

export function NotationRenderer({ notation }: NotationRendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !notation?.staves?.length) return
    ref.current.innerHTML = ''

    try {
      const staveWidth = (notation.width ?? 550) - 20

      // Calcular altura total dinâmica — sempre respeitar conteúdo real
      const hasIntervals = notation.type === 'scale_with_intervals'
      const perStaveExtra = hasIntervals ? INTERVAL_HEIGHT : 0
      const calculatedHeight = notation.staves.reduce((h, s) => {
        const base = STAVE_HEIGHT + perStaveExtra
        const labelH = s.label ? LABEL_HEIGHT : 0
        return h + base + labelH + STAVE_GAP
      }, 0) - STAVE_GAP + 30

      const finalWidth = notation.width ?? 550
      // Usar o MAIOR entre banco e cálculo — nunca cortar conteúdo
      const finalHeight = Math.max(calculatedHeight, notation.height ?? 0, 140)

      const renderer = new Renderer(ref.current, Renderer.Backends.SVG)
      renderer.resize(finalWidth, finalHeight)
      const context = renderer.getContext()

      let yOffset = 10

      notation.staves.forEach((staveData) => {
        renderStave(context, staveData, yOffset, staveWidth)

        // Intervalos abaixo das notas (para escalas)
        if (hasIntervals && staveData.intervals?.length) {
          const noteCount = staveData.notes?.length ?? 0
          const spacing = (staveWidth - 80) / Math.max(noteCount - 1, 1)
          const startX = 70

          staveData.intervals.forEach((interval, i) => {
            const x = startX + i * spacing + spacing * 0.5
            const y = yOffset + STAVE_HEIGHT + 8

            context.save()
            context.setFont('DM Mono', 10, 'bold')
            context.setFillStyle(COLORS.interval)
            context.fillText(interval, x - 6, y)
            context.restore()
          })

          yOffset += INTERVAL_HEIGHT
        }

        // Graus abaixo das notas
        if (staveData.degree_names?.length) {
          const noteCount = staveData.notes?.length ?? 0
          const spacing = (staveWidth - 80) / Math.max(noteCount - 1, 1)
          const startX = 70

          staveData.degree_names.forEach((deg, i) => {
            const x = startX + i * spacing
            const y = yOffset + STAVE_HEIGHT + (hasIntervals ? 6 : 8)

            context.save()
            context.setFont('DM Sans', 9)
            context.setFillStyle(COLORS.label)
            context.fillText(deg, x - 4, y)
            context.restore()
          })
        }

        // Label abaixo da pauta
        if (staveData.label) {
          context.save()
          context.setFont('DM Sans', 11, 'italic')
          context.setFillStyle(COLORS.label)
          context.fillText(staveData.label, 15, yOffset + STAVE_HEIGHT + 14)
          context.restore()
          yOffset += LABEL_HEIGHT
        }

        yOffset += STAVE_HEIGHT + STAVE_GAP
      })

    } catch (e) {
      console.error('NotationRenderer error:', e)
    }
  }, [notation])

  // Estilo condicional baseado no type
  const isExercise = notation.type === 'exercise_staff' || notation.type === 'rhythm_exercise'

  return (
    <div
      className={`overflow-x-auto bg-white rounded-lg p-4 my-3 border notation-container ${
        isExercise
          ? 'border-l-[3px] border-l-verde border-border'
          : 'border-border'
      }`}
    >
      <div ref={ref} />
    </div>
  )
}
