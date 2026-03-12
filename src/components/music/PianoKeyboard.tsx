import { useMemo, useState, useEffect } from 'react'
import { renderSVG } from 'svg-piano'

/** Observa mudanças no atributo data-theme do <html> */
function useTheme() {
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') ?? 'dark'
      : 'dark'
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') ?? 'dark')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

interface PianoKeyboardProps {
  /** Notas do acorde/escala: ["C4", "E4", "G4"] */
  keys: string[]
  /** Fundamental: "C" */
  root?: string
  /** Dedilhado mão direita: [1, 3, 5] */
  fingeringRH?: number[]
  /** Dedilhado mão esquerda: [5, 3, 1] */
  fingeringLH?: number[]
  /** Nome do acorde/escala */
  label?: string
  /** Range do teclado visível (default: auto) */
  range?: [string, string]
  /** Cor das teclas ativas (default: accent) */
  highlightColor?: string
  /** Mostrar dedilhado nas teclas (default: true) */
  showLabels?: boolean
  /** Qual mão mostrar (default: 'rh') */
  hand?: 'rh' | 'lh'
  /** Escala do SVG */
  scale?: number
  className?: string
}

/** Mapa de bemóis para equivalentes com sustenido */
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
}

const NOTE_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Converte nota MIDI (ex: "Eb4", "C#5") para índice numérico */
function noteToMidi(note: string): number | null {
  const match = note.match(/^([A-G][b#]?)(\d)$/)
  if (!match) return null
  let noteName = match[1]
  const octave = parseInt(match[2])
  // Converter bemol para sustenido
  if (noteName.length === 2 && noteName[1] === 'b') {
    noteName = FLAT_TO_SHARP[noteName] ?? noteName
  }
  const idx = NOTE_ORDER.indexOf(noteName)
  if (idx === -1) return null
  return octave * 12 + idx
}

/** Calcula range de 2 oitavas centrado nas notas reais do acorde */
function calculateRange(keys: string[]): [string, string] {
  if (keys.length === 0) return ['C4', 'C6']

  const midis = keys.map(noteToMidi).filter((m): m is number => m !== null)
  if (midis.length === 0) return ['C4', 'C6']

  const minMidi = Math.min(...midis)
  const maxMidi = Math.max(...midis)

  // Ponto médio das notas
  const center = (minMidi + maxMidi) / 2

  // Oitava central — abrir 1 oitava para cada lado a partir do C
  const centerOctave = Math.floor(center / 12)
  let startOctave = centerOctave - 1
  let endOctave = centerOctave + 1

  // Garantir que TODAS as notas estão dentro do range
  const startMidi = startOctave * 12 // C da oitava start
  const endMidi = endOctave * 12     // C da oitava end

  if (minMidi < startMidi) startOctave = Math.floor(minMidi / 12)
  if (maxMidi >= endMidi) endOctave = Math.floor(maxMidi / 12) + 1

  // Mínimo 2 oitavas
  if (endOctave - startOctave < 2) endOctave = startOctave + 2

  // Clamp para range razoável (C1-C8)
  startOctave = Math.max(1, startOctave)
  endOctave = Math.min(8, endOctave)

  return [`C${startOctave}`, `C${endOctave}`]
}

export function PianoKeyboard({
  keys,
  fingeringRH,
  fingeringLH,
  label,
  range,
  highlightColor = '#FF2D78',
  showLabels = true,
  hand = 'rh',
  scale = 1,
  className,
}: PianoKeyboardProps) {
  const theme = useTheme()
  const isDark = theme === 'dark'
  const effectiveRange = range || calculateRange(keys)
  const fingering = hand === 'rh' ? fingeringRH : fingeringLH

  const rendered = useMemo(() => {
    // Montar labels do dedilhado
    const labelMap: Record<string, string> = {}
    if (showLabels && fingering) {
      keys.forEach((key, i) => {
        if (fingering[i] != null) labelMap[key] = String(fingering[i])
      })
    }

    // palette: [teclas pretas, teclas brancas]
    const palette: [string, string] = isDark
      ? ['#0F172A', '#1E293B']
      : ['#1E293B', '#FFFFFF']

    const stroke = isDark ? '#475569' : '#CBD5E1'

    return renderSVG({
      range: effectiveRange,
      colorize: [{ keys, color: highlightColor }],
      labels: labelMap,
      palette,
      stroke,
      strokeWidth: 1,
      scaleX: scale,
      scaleY: scale,
    })
  }, [keys, effectiveRange, highlightColor, showLabels, fingering, scale, isDark])

  const labelFill = '#FFFFFF'
  const contrastText = isDark ? '#F1F5F9' : '#1E293B'

  return (
    <div className={className}>
      {label && (
        <div className="text-center font-semibold text-sm mb-1">{label}</div>
      )}
      <svg
        viewBox={`0 0 ${rendered.svg.width} ${rendered.svg.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        {rendered.children.map((child, index) => {
          if (!child) return null
          const { polygon, circle, text } = child
          const isHighlighted = child.key.fill === highlightColor

          return (
            <g key={index}>
              {polygon && (
                <polygon
                  points={polygon.points}
                  fill={polygon.style.fill}
                  stroke={polygon.style.stroke}
                  strokeWidth={polygon.style.strokeWidth}
                />
              )}
              {circle && (
                <circle
                  cx={circle.cx}
                  cy={circle.cy}
                  r={circle.r}
                  fill={isHighlighted ? highlightColor : contrastText}
                  stroke={circle.stroke}
                  strokeWidth={circle.strokeWidth}
                />
              )}
              {text && (
                <text
                  x={text.x}
                  y={text.y}
                  textAnchor={text.textAnchor as 'start' | 'middle' | 'end'}
                  fontSize={text.fontSize}
                  fontFamily="'DM Sans', sans-serif"
                  fontWeight={600}
                  fill={labelFill}
                >
                  {text.value}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {showLabels && fingering && fingering.length > 0 && (
        <div className="text-center text-[10px] text-text3 mt-1 font-mono">
          {hand === 'rh' ? 'MD' : 'ME'}: {fingering.join('-')}
        </div>
      )}
    </div>
  )
}
