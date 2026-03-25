import { useEffect, useRef } from 'react'
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Accidental,
  Dot,
  Articulation,
  Beam,
  Tuplet,
  StaveHairpin,
  GraceNote,
  GraceNoteGroup,
  Ornament,
  Curve,
  PedalMarking,
  BarNote,
} from 'vexflow'

interface GraceNoteData {
  pitches: { pitch: string; accidental: string | null }[]
  type: 'acciaccatura' | 'appoggiatura'
  duration?: string
}

interface StaveData {
  clef?: 'treble' | 'bass' | 'alto' | 'percussion'
  key_signature?: string
  time_signature?: string
  notes?: (string | { key: string; duration: string; label?: string })[]
  accidentals?: (string | null)[]
  noteArticulations?: (string[] | null)[]
  noteTuplets?: ({ groupId: string; numNotes: number; notesOccupied: number } | null)[]
  noteDynamics?: (string | null)[]
  hairpins?: { type: 'crescendo' | 'decrescendo'; startNoteIdx: number; endNoteIdx: number }[]
  graceNotes?: (GraceNoteData | null)[]
  ornaments?: (string | null)[]
  slurs?: { startNoteIdx: number; endNoteIdx: number }[]
  voltas?: { number: number; startNoteIdx: number; endNoteIdx: number }[]
  pedals?: { startNoteIdx: number; endNoteIdx: number }[]
  barlineAfterIndices?: number[]
  intervals?: string[]
  degree_names?: string[]
  label?: string
}

interface NotationData {
  type:
    | 'staff'
    | 'multi_staff'
    | 'scale_with_intervals'
    | 'exercise_staff'
    | 'rhythm_figures'
    | 'accidentals'
    | 'time_signatures'
    | 'rhythm_exercise'
  staves: StaveData[]
  width?: number
  height?: number
}

export interface NotationRendererProps {
  notation: NotationData
}

const DURATION_BEATS: Record<string, number> = {
  w: 4,
  h: 2,
  q: 1,
  '8': 0.5,
  '16': 0.25,
  '32': 0.125,
  '64': 0.0625,
}

const STAVE_HEIGHT = 120
const STAVE_GAP = 24
const LABEL_HEIGHT = 28
const INTERVAL_HEIGHT = 28

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

  const isDoubleDotted = rawDuration.includes('dd')
  const isDotted = !isDoubleDotted && rawDuration.includes('d')
  const isRest = rawDuration.includes('r')
  const duration = rawDuration.replace(/[dr]/g, '') + (isRest ? 'r' : '')

  const match = key.match(/^([a-g])(#|b)?\/([\d])$/i)
  const basePitch = match ? `${match[1]}/${match[3]}` : key
  const accidental = match ? match[2] : null

  return { basePitch, duration, accidental, isDotted, isDoubleDotted, isRest }
}

const COLORS = {
  label: '#64748b',
  interval: '#b45309',
}

function renderStave(context: any, staveData: StaveData, yOffset: number, staveWidth: number) {
  const stave = new Stave(10, yOffset, staveWidth)
  if (staveData.clef) stave.addClef(staveData.clef)
  if (staveData.key_signature) stave.addKeySignature(staveData.key_signature)
  if (staveData.time_signature) stave.addTimeSignature(staveData.time_signature)
  stave.setContext(context).draw()

  const notes = staveData.notes ?? []
  if (notes.length === 0) return

  const staveNotes = notes.map((noteStr, i) => {
    const { basePitch, duration, accidental, isDotted, isDoubleDotted, isRest } = parseNote(noteStr)
    const note = new StaveNote({
      keys: [isRest ? 'b/4' : basePitch],
      duration,
      clef: staveData.clef || 'treble',
    })

    if (isDoubleDotted) {
      Dot.buildAndAttach([note], { all: true })
      Dot.buildAndAttach([note], { all: true })
    } else if (isDotted) {
      Dot.buildAndAttach([note], { all: true })
    }

    if (!isRest) {
      if (accidental) {
        note.addModifier(new Accidental(accidental))
      } else if (staveData.accidentals?.[i]) {
        note.addModifier(new Accidental(staveData.accidentals[i]!))
      }
    }

    const arts = staveData.noteArticulations?.[i]
    if (arts?.length) {
      arts.forEach((artCode) => note.addModifier(new Articulation(artCode)))
    }

    const graceData = staveData.graceNotes?.[i]
    if (graceData?.pitches.length) {
      try {
        const graceNotes = graceData.pitches.map((gp) => {
          const gn = new GraceNote({
            keys: [gp.pitch],
            duration: graceData.duration || '8',
            slash: graceData.type === 'acciaccatura',
          })
          if (gp.accidental) gn.addModifier(new Accidental(gp.accidental))
          return gn
        })
        note.addModifier(new GraceNoteGroup(graceNotes))
      } catch {
      }
    }

    const ornCode = staveData.ornaments?.[i]
    if (ornCode) {
      try {
        note.addModifier(new Ornament(ornCode))
      } catch {
      }
    }

    return note
  })

  const totalBeats = notes.reduce((sum, n) => {
    const rawDur = typeof n === 'string' ? (n.split(':')[1] || 'q') : (n.duration || 'q')
    const isDblDot = rawDur.includes('dd')
    const isDot = !isDblDot && rawDur.includes('d')
    const baseDur = rawDur.replace(/[dr]/g, '')
    const base = DURATION_BEATS[baseDur] ?? 1
    return sum + (isDblDot ? base * 1.75 : isDot ? base * 1.5 : base)
  }, 0)

  const barlineSet = new Set(staveData.barlineAfterIndices ?? [])
  const tickables: (StaveNote | BarNote)[] = []
  staveNotes.forEach((note, i) => {
    tickables.push(note)
    if (barlineSet.has(i)) {
      const barNote = new BarNote()
      barNote.setWidth(0)
      barNote.setIgnoreTicks(true)
      tickables.push(barNote)
    }
  })

  const voice = new Voice({ numBeats: totalBeats, beatValue: 4 })
  voice.setStrict(false)
  voice.addTickables(tickables)

  new Formatter().joinVoices([voice]).format([voice], staveWidth - 80)
  voice.draw(context, stave)

  try {
    const beamableIndices: number[] = []
    staveNotes.forEach((n, i) => {
      const dur = n.getDuration()
      if (['8', '16', '32', '64'].includes(dur.replace('r', '')) && !dur.includes('r')) {
        beamableIndices.push(i)
      }
    })
    const groups: number[][] = []
    let currentGroup: number[] = []
    beamableIndices.forEach((idx, i) => {
      if (i === 0 || idx === beamableIndices[i - 1] + 1) currentGroup.push(idx)
      else {
        if (currentGroup.length >= 2) groups.push(currentGroup)
        currentGroup = [idx]
      }
    })
    if (currentGroup.length >= 2) groups.push(currentGroup)
    groups.forEach((group) => {
      const notesToBeam = group.map((i) => staveNotes[i])
      Beam.generateBeams(notesToBeam).forEach((beam) => beam.setContext(context).draw())
    })
  } catch {
  }

  if (staveData.noteTuplets?.length) {
    try {
      const groups = new Map<string, { noteIndices: number[]; numNotes: number; notesOccupied: number }>()
      staveData.noteTuplets.forEach((t, i) => {
        if (!t) return
        if (!groups.has(t.groupId)) {
          groups.set(t.groupId, { noteIndices: [], numNotes: t.numNotes, notesOccupied: t.notesOccupied })
        }
        groups.get(t.groupId)!.noteIndices.push(i)
      })
      groups.forEach(({ noteIndices, numNotes, notesOccupied }) => {
        if (noteIndices.length < 2) return
        const tupletNotes = noteIndices.map((i) => staveNotes[i]).filter(Boolean)
        if (tupletNotes.length < 2) return
        new Tuplet(tupletNotes, { numNotes, notesOccupied }).setContext(context).draw()
      })
    } catch {
    }
  }

  if (staveData.hairpins?.length) {
    staveData.hairpins.forEach((hairpin) => {
      try {
        const first = staveNotes[hairpin.startNoteIdx]
        const last = staveNotes[hairpin.endNoteIdx]
        if (!first || !last) return
        new StaveHairpin(
          { firstNote: first, lastNote: last },
          hairpin.type === 'crescendo' ? StaveHairpin.type.CRESC : StaveHairpin.type.DECRESC,
        ).setContext(context).draw()
      } catch {
      }
    })
  }

  if (staveData.slurs?.length) {
    staveData.slurs.forEach((slur) => {
      try {
        const first = staveNotes[slur.startNoteIdx]
        const last = staveNotes[slur.endNoteIdx]
        if (!first || !last) return
        new Curve(first, last, {}).setContext(context).draw()
      } catch {
      }
    })
  }

  if (staveData.voltas?.length) {
    staveData.voltas.forEach((volta) => {
      try {
        const startX = staveNotes[volta.startNoteIdx]?.getAbsoluteX()
        const endX = staveNotes[volta.endNoteIdx]?.getAbsoluteX()
        if (!startX || !endX) return

        // VexFlow 5 removeu Volta.drawVolta. Mantemos o mesmo efeito visual
        // desenhando o bracket manualmente no contexto atual.
        const y = stave.getY() - 18
        const height = 10
        context.save()
        context.beginPath()
        context.moveTo(startX, y + height)
        context.lineTo(startX, y)
        context.lineTo(endX, y)
        context.lineTo(endX, y + height)
        context.stroke()
        context.setFont('Arial', 12, 'bold')
        context.fillText(`${volta.number}.`, startX + 2, y - 2)
        context.restore()
      } catch {
      }
    })
  }

  if (staveData.pedals?.length) {
    staveData.pedals.forEach((pedal) => {
      try {
        const start = staveNotes[pedal.startNoteIdx]
        const end = staveNotes[pedal.endNoteIdx]
        if (!start || !end) return
        new PedalMarking([start, end]).setContext(context).draw()
      } catch {
      }
    })
  }

  staveData.noteDynamics?.forEach((dyn, i) => {
    if (!dyn) return
    try {
      context.save()
      context.setFont('Times New Roman', 16, 'italic')
      context.fillStyle = COLORS.interval
      const note = staveNotes[i]
      if (!note) return
      context.fillText(dyn, note.getAbsoluteX() - 6, yOffset + 70)
      context.restore()
    } catch {
    }
  })

  if (staveData.intervals?.length) {
    context.save()
    context.setFont('Arial', 12, '')
    context.fillStyle = COLORS.interval
    staveData.intervals.forEach((interval, i) => {
      const note = staveNotes[i]
      if (!note) return
      context.fillText(interval, note.getAbsoluteX() - 8, yOffset - 8)
    })
    context.restore()
  }

  if (staveData.degree_names?.length) {
    context.save()
    context.setFont('Arial', 11, '')
    context.fillStyle = COLORS.label
    staveData.degree_names.forEach((degree, i) => {
      const note = staveNotes[i]
      if (!note) return
      context.fillText(degree, note.getAbsoluteX() - 10, yOffset + STAVE_HEIGHT - 12)
    })
    context.restore()
  }

  if (staveData.label) {
    context.save()
    context.setFont('Georgia', 12, 'italic')
    context.fillStyle = COLORS.label
    context.fillText(staveData.label, 12, yOffset + STAVE_HEIGHT + 14)
    context.restore()
  }
}

export function NotationRenderer({ notation }: NotationRendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !notation?.staves?.length) return
    ref.current.innerHTML = ''

    try {
      const width = notation.width ?? 560
      const extraLabelHeight = notation.staves.reduce((sum, stave) => sum + (stave.label ? LABEL_HEIGHT : 0), 0)
      const extraIntervalHeight = notation.staves.reduce(
        (sum, stave) => sum + ((stave.intervals?.length || stave.degree_names?.length) ? INTERVAL_HEIGHT : 0),
        0,
      )
      const height = notation.height
        ?? (notation.staves.length * STAVE_HEIGHT
          + (notation.staves.length - 1) * STAVE_GAP
          + extraLabelHeight
          + extraIntervalHeight
          + 20)

      const renderer = new Renderer(ref.current, Renderer.Backends.SVG)
      renderer.resize(width, height)
      const context = renderer.getContext()

      let currentY = 10
      notation.staves.forEach((stave) => {
        renderStave(context, stave, currentY, width - 20)
        currentY += STAVE_HEIGHT
        if (stave.label) currentY += LABEL_HEIGHT
        if (stave.intervals?.length || stave.degree_names?.length) currentY += INTERVAL_HEIGHT
        currentY += STAVE_GAP
      })
    } catch (e) {
      console.error('NotationRenderer render error:', e)
    }
  }, [notation])

  return <div ref={ref} className="overflow-x-auto notation-container bg-white rounded-lg" />
}
