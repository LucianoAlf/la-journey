import { useEffect, useRef, useState } from 'react'
import { SVGuitarChord, ChordStyle } from 'svguitar'
import { svguitarFretOffset } from '@/lib/svguitarChord'

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
  /** Tamanho: 'compact' para inline, 'dense' para grades com 5 colunas, 'full' para editor/biblioteca */
  size?: 'compact' | 'dense' | 'full'
  /** Forçar tema (ignora detecção automática) — útil para PDF */
  forceTheme?: 'light' | 'dark'
  /** Número de cordas do instrumento (default: 6) */
  strings?: number
}

function isPrintSurface(node: HTMLElement | null) {
  return Boolean(node?.closest('.a4-page, .print-view, [data-print-root], .songbook-cifra'))
}

function getStyle(forcedDark?: boolean) {
  const isDark = forcedDark ?? (typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark')))
  if (isDark) {
    return {
      backgroundColor: 'transparent',
      color: '#e2e8f0',
      nutColor: '#e2e8f0',
      fingerColor: '#FF2D78',
      fingerTextColor: '#ffffff',
      barreChordStrokeColor: '#cbd5e1',
      stringColor: '#94a3b8',
      fretColor: '#475569',
      titleColor: '#f1f5f9',
      fretLabelColor: '#94a3b8',
      strokeColor: '#94a3b8',
    }
  }
  return {
    backgroundColor: 'transparent',
    color: '#111111',
    nutColor: '#111111',
    fingerColor: '#FF2D78',
    fingerTextColor: '#ffffff',
    barreChordStrokeColor: '#111111',
    stringColor: '#111111',
    fretColor: '#111111',
    titleColor: '#111111',
    fretLabelColor: '#111111',
    strokeColor: '#111111',
  }
}

function isPink(value: string | null) {
  return Boolean(value && /ff2d78|ff2d79|e11d48|f43f5e/i.test(value))
}

function hardenPrintSvg(svg: SVGElement, ink = '#111111') {
  svg.querySelectorAll('line, path').forEach((node) => {
    const stroke = node.getAttribute('stroke')
    if (!stroke || stroke === 'none' || stroke === 'transparent' || isPink(stroke)) return
    node.setAttribute('stroke', ink)
    const width = parseFloat(node.getAttribute('stroke-width') || '1')
    if (width > 0 && width < 1.4) node.setAttribute('stroke-width', '1.4')
  })

  svg.querySelectorAll('circle').forEach((node) => {
    const fill = node.getAttribute('fill') || ''
    if (isPink(fill)) return
    node.setAttribute('stroke', ink)
    if (!fill || fill === 'none' || fill === 'transparent' || /fff|white|#f[8-9a-f]{5}/i.test(fill)) {
      node.setAttribute('fill', 'none')
      node.setAttribute('stroke-width', '1.8')
    }
  })

  svg.querySelectorAll('text').forEach((node) => {
    const fill = node.getAttribute('fill') || ''
    if (fill === '#ffffff' || fill === '#fff' || fill === 'white') return
    node.setAttribute('fill', ink)
  })
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

function inferDisplayPosition(positions: ChordPositions, position: number) {
  if (position > 1) return position

  const frets = [
    ...(positions.fingers ?? [])
      .map((finger: any) => finger?.[1])
      .filter((fret): fret is number => typeof fret === 'number' && fret > 0),
    ...(positions.barres ?? [])
      .map((barre: any) => barre?.fret)
      .filter((fret): fret is number => typeof fret === 'number' && fret > 0),
  ]

  if (frets.length === 0) return position
  return Math.max(...frets) > 5 ? Math.min(...frets) : position
}

export function ChordDiagram({ name, positions, position = 1, size = 'full', forceTheme, strings = 6 }: ChordDiagramProps) {
  const ref = useRef<HTMLDivElement>(null)
  const theme = useTheme()
  const [printSurface, setPrintSurface] = useState(false)
  const effectiveIsDark = forceTheme
    ? forceTheme === 'dark'
    : printSurface
      ? false
      : theme === 'dark'
  const effectivePosition = inferDisplayPosition(positions, position)

  useEffect(() => {
    if (!ref.current) return
    const onPrintSurface = isPrintSurface(ref.current)
    if (onPrintSurface !== printSurface) {
      setPrintSurface(onPrintSurface)
      return
    }
    ref.current.innerHTML = ''

    const offset = svguitarFretOffset(effectivePosition, positions.fingers ?? [], positions.barres ?? [])

    // Mesclar fingers normais + cordas mudas (fret='x') no formato SVGuitar
    const allFingers: Array<[number, number | 'x', (string | undefined)?]> = [
      ...(positions.fingers ?? [])
        .filter((f: any) => typeof f?.[1] === 'number' && f[1] >= 0)
        .map((f: any) => {
          const [str, fret, label] = f
          if (typeof fret === 'number' && fret > 0 && offset > 0) {
            return [str, fret - offset, label] as [number, number, string | undefined]
          }
          return f
        })
        .filter((f: any) => f[1] === 'x' || f[1] === 0 || (typeof f[1] === 'number' && f[1] > 0)),
      ...(positions.muted ?? []).map(s => [s, 'x'] as [number, 'x']),
    ]

    const style = getStyle(effectiveIsDark)

    // Injetar cor da pestana em cada barre (senão herda fingerColor rosa)
    const barreColor = style.barreChordStrokeColor
    const styledBarres = (positions.barres ?? [])
      .filter(b => typeof b.fret === 'number' && b.fret > 0)
      .map(b => ({
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
        position: effectivePosition,
        style: ChordStyle.normal,
        titleFontSize: size === 'compact' ? 36 : size === 'dense' ? 42 : 48,
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
        rects.forEach((r, index) => {
          if (index === 0) return
          const w = parseFloat(r.getAttribute('width') || '0')
          const h = parseFloat(r.getAttribute('height') || '0')
          const fill = r.getAttribute('fill')
          if (w > 50 && h > 0 && h < 48 && fill && fill !== 'transparent' && fill !== 'none') {
            r.setAttribute('fill', barreColor as string)
          }
        })
        if (!effectiveIsDark) hardenPrintSvg(svg, barreColor as string)
      }
    }
  }, [name, positions, effectivePosition, size, theme, forceTheme, effectiveIsDark, printSurface, strings])

  const is4 = strings <= 4
  const dimensions = size === 'compact'
    ? { width: is4 ? 70 : 90, height: 120 }
    : size === 'dense'
      ? { width: is4 ? 92 : 116, height: 154 }
      : { width: is4 ? 110 : 140, height: 180 }

  return (
    <div
      ref={ref}
      style={dimensions}
      className="flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
    />
  )
}
