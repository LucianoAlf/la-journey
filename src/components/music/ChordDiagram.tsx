import { useEffect, useRef, useState } from 'react'
import { SVGuitarChord, ChordStyle } from 'svguitar'

export interface ChordPositions {
  /** Formato nativo SVGuitar: [string, fret, label?] — string 1=E grave, 6=E agudo. Fret 0=aberta */
  fingers: Array<[number, number, (string | undefined)?]>
  barres?: Array<{ fromString: number; toString: number; fret: number }>
  /** Cordas mudas (X acima) */
  muted?: number[]
}

export interface ChordDiagramProps {
  name: string
  /** Objeto positions direto do banco {fingers, barres, muted} */
  positions: ChordPositions
  position?: number
  /** Tamanho: 'compact' para inline, 'full' para editor/biblioteca */
  size?: 'compact' | 'full'
  /** Forçar tema (ignora detecção automática) — útil para PDF */
  forceTheme?: 'light' | 'dark'
  /** Número de cordas do instrumento (default: 6) */
  strings?: number
}

function getStyle(forcedDark?: boolean) {
  const isDark = forcedDark ?? (typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark')))
  return {
    backgroundColor: 'transparent',
    color: isDark ? '#e2e8f0' : '#1a1a2e',
    nutColor: isDark ? '#e2e8f0' : '#1a1a2e',
    fingerColor: '#FF2D78',
    fingerTextColor: '#ffffff',
    barreChordStrokeColor: isDark ? '#cbd5e1' : '#1a1a2e',
    stringColor: isDark ? '#94a3b8' : '#374151',
    fretColor: isDark ? '#475569' : '#9ca3af',
    titleColor: isDark ? '#f1f5f9' : '#1a1a2e',
    fretLabelColor: isDark ? '#94a3b8' : '#6b7280',
    strokeColor: isDark ? '#94a3b8' : '#374151',
  }
}

function useTheme() {
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') ?? 'dark' : 'dark'
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

export function ChordDiagram({ name, positions, position = 1, size = 'full', forceTheme, strings = 6 }: ChordDiagramProps) {
  const ref = useRef<HTMLDivElement>(null)
  const theme = useTheme()
  const effectiveIsDark = forceTheme ? forceTheme === 'dark' : theme === 'dark'

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''

    // Normalizar frets: se position > 1 e os frets são absolutos, converter para relativos
    // SVGuitar espera frets relativos ao position (ex: position=5, fret 5→1, fret 7→3)
    const needsNormalization = position > 1 && (positions.fingers ?? []).some(
      (f: any) => typeof f[1] === 'number' && f[1] >= position
    )
    const offset = needsNormalization ? position - 1 : 0

    // Mesclar fingers normais + cordas mudas (fret='x') no formato SVGuitar
    const allFingers: Array<[number, number | 'x', (string | undefined)?]> = [
      ...(positions.fingers ?? []).map((f: any) => {
        const [str, fret, label] = f
        if (typeof fret === 'number' && fret > 0 && offset > 0) {
          return [str, fret - offset, label] as [number, number, string | undefined]
        }
        return f
      }),
      ...(positions.muted ?? []).map(s => [s, 'x'] as [number, 'x']),
    ]

    const style = getStyle(effectiveIsDark)

    // Injetar cor da pestana em cada barre (senão herda fingerColor rosa)
    const barreColor = style.barreChordStrokeColor
    const styledBarres = (positions.barres ?? []).map(b => ({
      ...b,
      fret: offset > 0 ? b.fret - offset : b.fret,
      color: barreColor,
      textColor: style.fingerTextColor,
    }))

    const chart = new SVGuitarChord(ref.current)
      .configure({
        title: name,
        strings,
        frets: 5,
        position,
        style: ChordStyle.normal,
        titleFontSize: size === 'compact' ? 36 : 48,
        fingerSize: 0.65,
        ...style,
      })
      .chord({
        fingers: allFingers,
        barres: styledBarres,
      })

    chart.draw()

    // Forçar cor da pestana nos rects do SVG (SVGuitar usa fingerColor como fallback)
    if (ref.current) {
      const svg = ref.current.querySelector('svg')
      if (svg) {
        const rects = svg.querySelectorAll('rect')
        rects.forEach(r => {
          const w = parseFloat(r.getAttribute('width') || '0')
          const fill = r.getAttribute('fill')
          if (w > 50 && fill && fill !== 'transparent' && fill !== 'none') {
            r.setAttribute('fill', barreColor as string)
          }
        })
      }
    }
  }, [name, positions, position, size, theme, forceTheme, effectiveIsDark, strings])

  const is4 = strings <= 4
  const dimensions = size === 'compact'
    ? { width: is4 ? 70 : 90, height: 120 }
    : { width: is4 ? 110 : 140, height: 180 }

  return (
    <div
      ref={ref}
      style={dimensions}
      className="flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
    />
  )
}
