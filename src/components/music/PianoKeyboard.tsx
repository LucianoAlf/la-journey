import { useMemo } from 'react'

interface PianoKeyboardProps {
  /** Notas da mao direita: ["C4", "E4", "G4"] */
  keys: string[]
  /** Notas da mao esquerda: ["G3"] */
  keysLh?: string[]
  /** Nota fundamental sem oitava: "C" */
  rootNote?: string
  /** Oitava da fundamental */
  rootOctave?: number
  /** Fundamental legado: "C" ou "C4" */
  root?: string
  /** Dedilhado mao direita */
  fingeringRH?: number[]
  /** Dedilhado mao esquerda */
  fingeringLH?: number[]
  /** Nome do acorde/escala */
  label?: string
  /** Range visivel. O fim e exclusivo: C3-C5 renderiza C3-B4. */
  range?: [string, string]
  /** Cor das teclas ativas */
  highlightColor?: string
  /** Marcacoes pedagogicas entre teclas, ex: semitons */
  highlights?: Array<{ from: string; to: string; label?: string }>
  /** Mostrar dedilhado nas teclas */
  showLabels?: boolean
  /** Qual mao destacar como principal */
  hand?: 'rh' | 'lh'
  /** Escala visual do desenho */
  scale?: number
  /** Mantido por compatibilidade com PDF */
  forceTheme?: 'light' | 'dark'
  /** Cor dos textos externos */
  labelColor?: string
  className?: string
}

const NOTE_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const WHITE_NOTES = [
  { note: 'C', semitone: 0, label: 'Do' },
  { note: 'D', semitone: 2, label: 'Re' },
  { note: 'E', semitone: 4, label: 'Mi' },
  { note: 'F', semitone: 5, label: 'Fa' },
  { note: 'G', semitone: 7, label: 'Sol' },
  { note: 'A', semitone: 9, label: 'La' },
  { note: 'B', semitone: 11, label: 'Si' },
]
const BLACK_KEYS = [
  { note: 'C#', semitone: 1, label: 'Do#', afterWhite: 0 },
  { note: 'D#', semitone: 3, label: 'Re#', afterWhite: 1 },
  { note: 'F#', semitone: 6, label: 'Fa#', afterWhite: 3 },
  { note: 'G#', semitone: 8, label: 'Sol#', afterWhite: 4 },
  { note: 'A#', semitone: 10, label: 'La#', afterWhite: 5 },
]

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cb: 'B',
}

const COLOR_RH = '#FF2D78'
const COLOR_LH = '#6366F1'
const COLOR_ROOT = '#F97316'
const COLOR_BLACK = '#171827'
const COLOR_BORDER = '#CBD5E1'

function normalizeNoteName(noteName: string): string {
  return FLAT_TO_SHARP[noteName] ?? noteName
}

function parseNote(note: string): { name: string; octave: number } | null {
  const match = note.match(/^([A-G][b#]?)(\d)$/)
  if (!match) return null
  return {
    name: normalizeNoteName(match[1]),
    octave: Number(match[2]),
  }
}

function noteToMidi(note: string): number | null {
  const parsed = parseNote(note)
  if (!parsed) return null
  const idx = NOTE_ORDER.indexOf(parsed.name)
  if (idx === -1) return null
  return idx + (parsed.octave + 1) * 12
}

function noteLabel(note: string): string {
  const parsed = parseNote(note)
  if (!parsed) return note
  const white = WHITE_NOTES.find(item => item.note === parsed.name)
  const black = BLACK_KEYS.find(item => item.note === parsed.name)
  return `${white?.label ?? black?.label ?? parsed.name}${parsed.octave}`
}

function rangeOctaves(range: [string, string] | undefined, keys: string[], keysLh?: string[]): [number, number] {
  if (range) {
    const start = parseNote(range[0])
    const end = parseNote(range[1])
    if (start && end) return [start.octave, Math.max(start.octave + 1, end.octave)]
  }

  const allKeys = [...keys, ...(keysLh ?? [])]
  const midis = allKeys.map(noteToMidi).filter((midi): midi is number => midi !== null)
  if (midis.length === 0) return [4, 6]

  const minOctave = Math.floor(Math.min(...midis) / 12) - 1
  const maxOctave = Math.floor(Math.max(...midis) / 12) - 1
  const start = Math.max(1, minOctave)
  const end = Math.min(8, Math.max(start + 2, maxOctave + 1))
  return [start, end]
}

function samePitch(a: string, b: string): boolean {
  const pa = parseNote(a)
  const pb = parseNote(b)
  return !!pa && !!pb && pa.name === pb.name && pa.octave === pb.octave
}

export function PianoKeyboard({
  keys,
  keysLh,
  rootNote,
  rootOctave,
  root,
  fingeringRH,
  fingeringLH,
  label,
  range,
  highlightColor = COLOR_RH,
  highlights = [],
  showLabels = true,
  scale = 1,
  labelColor,
  className,
}: PianoKeyboardProps) {
  const lhKeys = keysLh ?? []
  const [startOctave, endOctave] = rangeOctaves(range, keys, lhKeys)
  const octaveCount = endOctave - startOctave
  const totalWhiteKeys = octaveCount * 7

  const dims = useMemo(() => {
    const whiteWidth = 38 * scale
    const whiteHeight = 132 * scale
    const blackWidth = 22 * scale
    const blackHeight = 86 * scale
    const topPad = 6 * scale
    const bottomPad = 26 * scale
    return {
      whiteWidth,
      whiteHeight,
      blackWidth,
      blackHeight,
      topPad,
      bottomPad,
      width: totalWhiteKeys * whiteWidth,
      height: topPad + whiteHeight + bottomPad,
    }
  }, [scale, totalWhiteKeys])

  const renderedKeys = useMemo(() => {
    const whites: Array<{ note: string; label: string; octave: number; x: number; y: number; midi: number }> = []
    const blacks: Array<{ note: string; label: string; octave: number; x: number; y: number; midi: number }> = []

    for (let octave = startOctave; octave < endOctave; octave++) {
      const octaveOffset = (octave - startOctave) * 7
      WHITE_NOTES.forEach((white, index) => {
        whites.push({
          note: `${white.note}${octave}`,
          label: white.label,
          octave,
          midi: white.semitone + (octave + 1) * 12,
          x: (octaveOffset + index) * dims.whiteWidth,
          y: dims.topPad,
        })
      })

      BLACK_KEYS.forEach((black) => {
        blacks.push({
          note: `${black.note}${octave}`,
          label: black.label,
          octave,
          midi: black.semitone + (octave + 1) * 12,
          x: (octaveOffset + black.afterWhite + 1) * dims.whiteWidth - dims.blackWidth / 2,
          y: dims.topPad,
        })
      })
    }

    return { whites, blacks }
  }, [dims.blackWidth, dims.topPad, dims.whiteWidth, endOctave, startOctave])

  const fundamentalKey = useMemo(() => {
    const rawRoot = rootNote ?? root
    if (!rawRoot) return null
    const rootMatch = rawRoot.match(/^([A-G][b#]?)(\d?)$/)
    const rootName = rootMatch ? normalizeNoteName(rootMatch[1]) : normalizeNoteName(rawRoot)
    const rootOct = rootOctave ?? (rootMatch?.[2] ? Number(rootMatch[2]) : null)
    const allKeys = [...keys, ...lhKeys]
    if (rootOct != null) {
      const exact = `${rootName}${rootOct}`
      if (allKeys.some(key => samePitch(key, exact))) return exact
    }
    return allKeys.find(key => parseNote(key)?.name === rootName) ?? null
  }, [keys, lhKeys, root, rootNote, rootOctave])

  const activeState = useMemo(() => {
    const map = new Map<string, { color: string; finger?: number; role: 'rh' | 'lh' | 'root' }>()

    keys.forEach((key, index) => {
      map.set(key, {
        color: highlightColor || COLOR_RH,
        finger: fingeringRH?.[index],
        role: 'rh',
      })
    })

    lhKeys.forEach((key, index) => {
      map.set(key, {
        color: COLOR_LH,
        finger: fingeringLH?.[index],
        role: 'lh',
      })
    })

    if (fundamentalKey) {
      const existing = [...map.entries()].find(([key]) => samePitch(key, fundamentalKey))
      map.set(existing?.[0] ?? fundamentalKey, {
        color: COLOR_ROOT,
        finger: existing?.[1]?.finger,
        role: 'root',
      })
    }

    return map
  }, [fingeringLH, fingeringRH, fundamentalKey, highlightColor, keys, lhKeys])

  function getState(note: string) {
    return [...activeState.entries()].find(([key]) => samePitch(key, note))?.[1] ?? null
  }

  function keyCenter(note: string) {
    const white = renderedKeys.whites.find(item => samePitch(item.note, note))
    if (white) return white.x + dims.whiteWidth / 2
    const black = renderedKeys.blacks.find(item => samePitch(item.note, note))
    if (black) return black.x + dims.blackWidth / 2
    return null
  }

  const highlightMarkers = highlights
    .map((highlight) => {
      const x1 = keyCenter(highlight.from)
      const x2 = keyCenter(highlight.to)
      if (x1 == null || x2 == null) return null
      return { ...highlight, x1, x2, midX: (x1 + x2) / 2 }
    })
    .filter((item): item is { from: string; to: string; label?: string; x1: number; x2: number; midX: number } => item !== null)

  return (
    <div className={className} style={{ width: '100%', maxWidth: `${dims.width}px` }}>
      {label && (
        <div className="text-center font-semibold text-sm mb-1" style={labelColor ? { color: labelColor } : undefined}>{label}</div>
      )}
      <svg
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        <defs>
          <filter id="piano-black-shadow" x="-30%" y="-10%" width="160%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.26" />
          </filter>
        </defs>

        {highlightMarkers.map((marker, index) => (
          <g key={`highlight-${marker.from}-${marker.to}-${index}`}>
            <line
              x1={marker.x1}
              x2={marker.x2}
              y1={dims.topPad + 8}
              y2={dims.topPad + 8}
              stroke={COLOR_ROOT}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            {marker.label && (
              <text
                x={marker.midX}
                y={dims.topPad + 20}
                textAnchor="middle"
                fontSize={10}
                fontFamily="'DM Sans', sans-serif"
                fontWeight={800}
                fill={COLOR_ROOT}
              >
                {marker.label}
              </text>
            )}
          </g>
        ))}

        {renderedKeys.whites.map((key) => {
          const state = getState(key.note)
          const isActive = !!state
          const fill = state?.color ?? '#FFFFFF'
          const textColor = isActive ? '#FFFFFF' : '#94A3B8'

          return (
            <g key={key.note}>
              <rect
                x={key.x}
                y={key.y}
                width={dims.whiteWidth}
                height={dims.whiteHeight}
                rx={4}
                fill={fill}
                stroke={COLOR_BORDER}
                strokeWidth={1.2}
              />
              {showLabels && state?.finger != null && (
                <text
                  x={key.x + dims.whiteWidth / 2}
                  y={key.y + dims.whiteHeight - 46 * scale}
                  textAnchor="middle"
                  fontSize={18 * scale}
                  fontFamily="'DM Sans', sans-serif"
                  fontWeight={900}
                  fill="#FFFFFF"
                >
                  {state.finger}
                </text>
              )}
              <text
                x={key.x + dims.whiteWidth / 2}
                y={key.y + dims.whiteHeight - 24 * scale}
                textAnchor="middle"
                fontSize={10 * scale}
                fontFamily="'DM Sans', sans-serif"
                fontWeight={isActive ? 800 : 500}
                fill={textColor}
              >
                {key.label}
              </text>
              <text
                x={key.x + dims.whiteWidth / 2}
                y={key.y + dims.whiteHeight - 9 * scale}
                textAnchor="middle"
                fontSize={8 * scale}
                fontFamily="'DM Mono', monospace"
                fontWeight={600}
                fill={isActive ? 'rgba(255,255,255,0.72)' : '#CBD5E1'}
              >
                {key.note}
              </text>
            </g>
          )
        })}

        {renderedKeys.blacks.map((key) => {
          const state = getState(key.note)
          const isActive = !!state
          const fill = state?.color ?? COLOR_BLACK

          return (
            <g key={key.note}>
              <rect
                x={key.x}
                y={key.y}
                width={dims.blackWidth}
                height={dims.blackHeight}
                rx={4}
                fill={fill}
                filter="url(#piano-black-shadow)"
              />
              {showLabels && state?.finger != null && (
                <text
                  x={key.x + dims.blackWidth / 2}
                  y={key.y + dims.blackHeight * 0.45}
                  textAnchor="middle"
                  fontSize={14 * scale}
                  fontFamily="'DM Sans', sans-serif"
                  fontWeight={900}
                  fill="#FFFFFF"
                >
                  {state.finger}
                </text>
              )}
              <text
                x={key.x + dims.blackWidth / 2}
                y={key.y + dims.blackHeight - 11 * scale}
                textAnchor="middle"
                fontSize={8 * scale}
                fontFamily="'DM Sans', sans-serif"
                fontWeight={700}
                fill={isActive ? '#FFFFFF' : '#64748B'}
              >
                {key.label}
              </text>
            </g>
          )
        })}
      </svg>
      {showLabels && fingeringRH && fingeringRH.length > 0 && (
        <div className="text-center text-[10px] text-text3 mt-1 font-mono" style={labelColor ? { color: labelColor } : undefined}>
          MD: {fingeringRH.join('-')}
        </div>
      )}
    </div>
  )
}
