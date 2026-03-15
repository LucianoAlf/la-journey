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
  /** Notas da mão direita: ["C4", "E4", "G4"] */
  keys: string[]
  /** Notas da mão esquerda: ["G3"] */
  keysLh?: string[]
  /** Nota fundamental (nome sem oitava): "C" — será pintada de laranja */
  rootNote?: string
  /** Oitava da fundamental (para identificar a tecla exata) */
  rootOctave?: number
  /** Fundamental: "C" (legado, usado se rootNote não definido) */
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
  /** Forçar tema (ignora detecção automática) — útil para PDF */
  forceTheme?: 'light' | 'dark'
  /** Cor dos textos (label, dedilhado) — útil para PDF com fundo branco */
  labelColor?: string
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

// Cores padrão para mão direita, esquerda e fundamental
const COLOR_RH = '#FF2D78'
const COLOR_LH = '#6366F1'
const COLOR_ROOT = '#F97316'

/** Calcula range fixo de 2 oitavas começando na oitava da nota mais grave */
function calculateRange(keys: string[], keysLh?: string[]): [string, string] {
  const allKeys = [...keys, ...(keysLh ?? [])]
  if (allKeys.length === 0) return ['C4', 'C6']

  const midis = allKeys.map(noteToMidi).filter((m): m is number => m !== null)
  if (midis.length === 0) return ['C4', 'C6']

  const minMidi = Math.min(...midis)
  const maxMidi = Math.max(...midis)

  // Começar na oitava da nota mais grave (baixo fica na extrema esquerda)
  let startOctave = Math.floor(minMidi / 12)
  let endOctave = startOctave + 2

  // Se a nota mais aguda não couber em 2 oitavas, expandir para 3
  if (maxMidi >= endOctave * 12) {
    endOctave = startOctave + 3
  }

  // Clamp para range razoável (C1-C8)
  startOctave = Math.max(1, startOctave)
  endOctave = Math.min(8, endOctave)

  return [`C${startOctave}`, `C${endOctave}`]
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
  showLabels = true,
  hand = 'rh',
  scale = 1,
  forceTheme,
  labelColor,
  className,
}: PianoKeyboardProps) {
  const detectedTheme = useTheme()
  const isDark = forceTheme ? forceTheme === 'dark' : detectedTheme === 'dark'
  const effectiveRange = range || calculateRange(keys, keysLh)
  const fingering = hand === 'rh' ? fingeringRH : fingeringLH
  const lhKeys = keysLh ?? []

  // Identificar a nota fundamental (laranja) entre as teclas
  const fundamentalKey = useMemo(() => {
    let rn = rootNote ?? root
    if (!rn) return null
    // root pode vir como "C4" (com oitava) ou "C" (sem oitava) — extrair só o nome
    const rootMatch = rn.match(/^([A-G][b#]?)(\d?)$/)
    const rootName = rootMatch ? rootMatch[1] : rn
    const rootOct = rootOctave ?? (rootMatch?.[2] ? parseInt(rootMatch[2]) : null)
    // Procurar a fundamental nas keys (MR) e keysLh (ME)
    const allK = [...keys, ...lhKeys]
    // Fundamental exata: nome + oitava
    if (rootOct != null) {
      const exact = `${rootName}${rootOct}`
      if (allK.includes(exact)) return exact
    }
    // Fallback: primeira nota que começa com o nome da fundamental
    return allK.find(k => {
      const m = k.match(/^([A-G][b#]?)/)
      return m && m[1] === rootName
    }) ?? null
  }, [rootNote, root, rootOctave, keys, lhKeys])

  // Separar keys por cor: fundamental (laranja) > MR (rosa) > ME (azul)
  const { rhOnly, lhOnly, rootKey } = useMemo(() => {
    const rootK = fundamentalKey
    const rh = keys.filter(k => k !== rootK)
    const lh = lhKeys.filter(k => k !== rootK)
    return { rhOnly: rh, lhOnly: lh, rootKey: rootK }
  }, [keys, lhKeys, fundamentalKey])

  const rendered = useMemo(() => {
    // Montar labels do dedilhado (MR + ME)
    const labelMap: Record<string, string> = {}
    if (showLabels) {
      if (fingeringRH) {
        keys.forEach((key, i) => {
          if (fingeringRH[i] != null) labelMap[key] = String(fingeringRH[i])
        })
      }
      if (fingeringLH) {
        lhKeys.forEach((key, i) => {
          if (fingeringLH[i] != null) labelMap[key] = String(fingeringLH[i])
        })
      }
    }

    // palette: [teclas pretas, teclas brancas]
    const palette: [string, string] = isDark
      ? ['#0F172A', '#1E293B']
      : ['#1E293B', '#FFFFFF']

    const stroke = isDark ? '#475569' : '#CBD5E1'

    // Colorize por prioridade: fundamental (laranja) > ME (azul) > MR (rosa)
    const colorize: { keys: string[]; color: string }[] = []
    if (rhOnly.length > 0) colorize.push({ keys: rhOnly, color: COLOR_RH })
    if (lhOnly.length > 0) colorize.push({ keys: lhOnly, color: COLOR_LH })
    if (rootKey) colorize.push({ keys: [rootKey], color: COLOR_ROOT })

    return renderSVG({
      range: effectiveRange,
      colorize,
      labels: labelMap,
      palette,
      stroke,
      strokeWidth: 1,
      scaleX: scale,
      scaleY: scale,
    })
  }, [keys, lhKeys, rhOnly, lhOnly, rootKey, effectiveRange, showLabels, fingeringRH, fingeringLH, scale, isDark])

  // Mapa de nota → cor para usar nos circles/texts
  const keyColorMap = useMemo(() => {
    const map = new Map<string, string>()
    rhOnly.forEach(k => map.set(k, COLOR_RH))
    lhOnly.forEach(k => map.set(k, COLOR_LH))
    if (rootKey) map.set(rootKey, COLOR_ROOT)
    return map
  }, [rhOnly, lhOnly, rootKey])

  const labelFill = '#FFFFFF'
  const contrastText = isDark ? '#F1F5F9' : '#1E293B'

  // Set de todas as cores usadas para detecção de highlight
  const allColors = new Set([COLOR_RH, COLOR_LH, COLOR_ROOT, highlightColor])

  return (
    <div className={className}>
      {label && (
        <div className="text-center font-semibold text-sm mb-1" style={labelColor ? { color: labelColor } : undefined}>{label}</div>
      )}
      <svg
        viewBox={`0 0 ${rendered.svg.width} ${rendered.svg.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        {rendered.children.map((child, index) => {
          if (!child) return null
          const { polygon, circle, text } = child
          const fillColor = child.key.fill
          const isHighlighted = allColors.has(fillColor)

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
                  fill={isHighlighted ? fillColor : contrastText}
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
      {showLabels && fingeringRH && fingeringRH.length > 0 && (
        <div className="text-center text-[10px] text-text3 mt-1 font-mono" style={labelColor ? { color: labelColor } : undefined}>
          MD: {fingeringRH.join('-')}
        </div>
      )}
    </div>
  )
}
