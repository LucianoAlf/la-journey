import { useEffect, useRef } from 'react'
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot, Articulation, Beam, Tuplet, StaveHairpin, GraceNote, GraceNoteGroup, Ornament, Curve, Volta, PedalMarking } from 'vexflow'

// --- Tipos ---

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
  noteDynamics?: (string | null)[]  // Fase 3: dinâmicas por nota
  hairpins?: { type: 'crescendo' | 'decrescendo'; startNoteIdx: number; endNoteIdx: number }[]  // Fase 3
  graceNotes?: (GraceNoteData | null)[]  // Fase 3: grace notes por nota
  ornaments?: (string | null)[]  // Fase 3: ornamentos por nota
  slurs?: { startNoteIdx: number; endNoteIdx: number }[]  // Fase 3: slurs (ligaduras de expressão)
  voltas?: { number: number; startNoteIdx: number; endNoteIdx: number }[]  // Fase 3: volta brackets
  pedals?: { startNoteIdx: number; endNoteIdx: number }[]  // Fase 3: pedal markings
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
  w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125, '64': 0.0625,
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

  // Extrair sufixos: 'dd' = doubleDotted, 'd' = dotted, 'r' = rest
  const isDoubleDotted = rawDuration.includes('dd')
  const isDotted = !isDoubleDotted && rawDuration.includes('d')
  const isRest = rawDuration.includes('r')
  const duration = rawDuration.replace(/[dr]/g, '') + (isRest ? 'r' : '')

  // Extrair acidental: "f#/4" → base="f/4", acc="#"
  // "eb/4" → base="e/4", acc="b"
  // "b/4" → base="b/4", acc=null (B natural)
  const match = key.match(/^([a-g])(#|b)?\/([\d])$/i)
  const basePitch = match ? `${match[1]}/${match[3]}` : key
  const accidental = match ? match[2] : null

  return { basePitch, duration, accidental, isDotted, isDoubleDotted, isRest }
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
    const { basePitch, duration, accidental, isDotted, isDoubleDotted, isRest } = parseNote(noteStr)
    const note = new StaveNote({
      keys: [isRest ? 'b/4' : basePitch],
      duration,
      clef: staveData.clef || 'treble',
    })

    // Ponto de aumento (simples ou duplo)
    if (isDoubleDotted) {
      Dot.buildAndAttach([note], { all: true })
      Dot.buildAndAttach([note], { all: true })
    } else if (isDotted) {
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

    // Articulações (staccato, acento, tenuto, marcato, fermata)
    const arts = staveData.noteArticulations?.[i]
    if (arts && arts.length > 0) {
      arts.forEach(artCode => {
        note.addModifier(new Articulation(artCode))
      })
    }

    // Grace notes (Fase 3)
    const graceData = staveData.graceNotes?.[i]
    if (graceData && graceData.pitches.length > 0) {
      try {
        const graceNotes = graceData.pitches.map(gp => {
          const gn = new GraceNote({
            keys: [gp.pitch],
            duration: graceData.duration || '8',
            slash: graceData.type === 'acciaccatura',
          })
          if (gp.accidental) {
            gn.addModifier(new Accidental(gp.accidental))
          }
          return gn
        })
        const graceGroup = new GraceNoteGroup(graceNotes)
        note.addModifier(graceGroup)
      } catch {
        // Silenciar erros de grace note
      }
    }

    // Ornamentos (Fase 3)
    const ornCode = staveData.ornaments?.[i]
    if (ornCode) {
      try {
        note.addModifier(new Ornament(ornCode))
      } catch {
        // Silenciar erros de ornamento
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
    const isDblDot = rawDur.includes('dd')
    const isDot = !isDblDot && rawDur.includes('d')
    const baseDur = rawDur.replace(/[dr]/g, '')
    const base = DURATION_BEATS[baseDur] ?? 1
    return sum + (isDblDot ? base * 1.75 : isDot ? base * 1.5 : base)
  }, 0)

  const voice = new Voice({ numBeats: totalBeats, beatValue: 4 })
  voice.setStrict(false)
  voice.addTickables(staveNotes)

  new Formatter().joinVoices([voice]).format([voice], staveWidth - 80)
  voice.draw(context, stave)

  // Beams automáticos — agrupar notas com duração ≤ colcheia
  try {
    const beamableNotes = staveNotes.filter(n => {
      const dur = n.getDuration()
      // Notas beamable: 8, 16, 32, 64 (excluir pausas)
      return ['8', '16', '32', '64'].includes(dur.replace('r', '')) && !dur.includes('r')
    })
    if (beamableNotes.length >= 2) {
      const beams = Beam.generateBeams(beamableNotes)
      beams.forEach(beam => beam.setContext(context).draw())
    }
  } catch {
    // Silenciar erros de beam (notas isoladas, etc.)
  }

  // Tuplets — agrupar notas com mesmo groupId
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
        const tupletNotes = noteIndices.map(i => staveNotes[i]).filter(Boolean)
        if (tupletNotes.length < 2) return
        const tuplet = new Tuplet(tupletNotes, { numNotes, notesOccupied })
        tuplet.setContext(context).draw()
      })
    } catch {
      // Silenciar erros de tuplet
    }
  }

  // Dinâmicas — renderizar texto abaixo da pauta (Fase 3)
  if (staveData.noteDynamics?.length) {
    try {
      staveNotes.forEach((staveNote, i) => {
        const dyn = staveData.noteDynamics?.[i]
        if (!dyn) return
        const x = staveNote.getAbsoluteX()
        const y = stave.getYForLine(6) + 10 // abaixo da pauta
        context.save()
        context.setFont('Times New Roman', 14, 'italic')
        context.fillText(dyn, x - 8, y)
        context.restore()
      })
    } catch {
      // Silenciar erros de dinâmica
    }
  }

  // Hairpins — crescendo/decrescendo (Fase 3)
  if (staveData.hairpins?.length) {
    try {
      staveData.hairpins.forEach(hp => {
        const firstNote = staveNotes[hp.startNoteIdx]
        const lastNote = staveNotes[hp.endNoteIdx]
        if (firstNote && lastNote) {
          const hairpin = new StaveHairpin(
            { first_note: firstNote, last_note: lastNote },
            hp.type === 'crescendo' ? StaveHairpin.type.CRESC : StaveHairpin.type.DECRESC
          )
          hairpin.setContext(context).setPosition(4).draw() // position 4 = abaixo
        }
      })
    } catch {
      // Silenciar erros de hairpin
    }
  }

  // Slurs — ligaduras de expressão (Fase 3)
  if (staveData.slurs?.length) {
    try {
      staveData.slurs.forEach(sl => {
        const firstNote = staveNotes[sl.startNoteIdx]
        const lastNote = staveNotes[sl.endNoteIdx]
        if (firstNote && lastNote) {
          const curve = new Curve(firstNote, lastNote, {
            cps: [{ x: 0, y: 20 }, { x: 0, y: 20 }],
          })
          curve.setContext(context).draw()
        }
      })
    } catch {
      // Silenciar erros de slur
    }
  }

  // Volta brackets — 1ª vez, 2ª vez (Fase 3)
  if (staveData.voltas?.length) {
    try {
      staveData.voltas.forEach(vt => {
        const firstNote = staveNotes[vt.startNoteIdx]
        const lastNote = staveNotes[vt.endNoteIdx]
        if (firstNote && lastNote) {
          const volta = new Volta(
            Volta.type.BEGIN_END,
            `${vt.number}.`,
            firstNote.getAbsoluteX(),
            lastNote.getAbsoluteX() - firstNote.getAbsoluteX() + 40
          )
          volta.setContext(context).setStave(stave).draw()
        }
      })
    } catch {
      // Silenciar erros de volta
    }
  }

  // Pedal markings — Ped. ... * (Fase 3)
  if (staveData.pedals?.length) {
    try {
      staveData.pedals.forEach(pd => {
        const firstNote = staveNotes[pd.startNoteIdx]
        const lastNote = staveNotes[pd.endNoteIdx]
        if (firstNote && lastNote) {
          const pedal = new PedalMarking([firstNote, lastNote])
          pedal.setContext(context).draw()
        }
      })
    } catch {
      // Silenciar erros de pedal
    }
  }
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
