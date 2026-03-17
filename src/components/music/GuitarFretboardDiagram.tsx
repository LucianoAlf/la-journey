import { useRef, useEffect, memo } from 'react'
import { Fretboard, GUITAR_TUNINGS } from '@moonwave99/fretboard.js'

// ── Tipos ────────────────────────────────────────────────────────────────

export interface FretboardNote {
  string: number   // 1=e (agudo) … 6=E (grave) — padrão fretboard.js
  fret: number     // 0=aberta, 1-22
  finger?: number  // 1-4
  isRoot?: boolean // tônica/fundamental
  note?: string    // nome da nota (C, D, E…)
  interval?: string // '1P', '3M', '5P'…
  degree?: number  // grau na escala (1-7)
}

export interface GuitarFretboardPositions {
  /** Formato horizontal: notas no braço */
  format: 'fretboard_horizontal'
  notes: FretboardNote[]
  muted?: number[]
  fretRange?: [number, number]
  tuning?: string[]
}

export interface GuitarFretboardDiagramProps {
  /** Dados de posição no formato horizontal */
  positions: GuitarFretboardPositions
  /** Nome do acorde/escala */
  name?: string
  /** Largura do SVG (default: 600) */
  width?: number
  /** Altura do SVG (default: 160) */
  height?: number
  /** Número de casas visíveis (default: 15) */
  fretCount?: number
  /** Forçar tema (ignora detecção automática) */
  forceTheme?: 'light' | 'dark'
  /** Classe CSS adicional */
  className?: string
  /** Tamanho do dot (default: 18) */
  dotSize?: number
  /** Mostrar texto nas notas: 'finger' | 'note' | 'degree' | 'none' */
  dotLabel?: 'finger' | 'note' | 'degree' | 'none'
}

// ── Helpers ──────────────────────────────────────────────────────────────

function useTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') ?? 'dark'
}

// Casas que recebem inlay dots (como num braço de guitarra real)
// 12 recebe 2 bolinhas (double dot)
const INLAY_FRETS_SINGLE = [3, 5, 7, 9, 15, 17, 19, 21]
const INLAY_FRETS_DOUBLE = [12]

/**
 * Injeta bolinhas sutis (inlay dots) no SVG do fretboard.js
 * Simula os marcadores reais de um braço de guitarra.
 * 
 * O fretboard.js usa coordenadas percentuais (x1="6.666%") para trastes
 * e coordenadas absolutas para Y das cordas. Os inlays usam o mesmo
 * sistema misto para alinhar corretamente.
 */
export function injectInlayDots(
  container: HTMLElement,
  fretCount: number,
  inlayColor: string,
  inlayOpacity: number = 0.18,
  inlayRadius: number = 4,
) {
  const svg = container.querySelector('svg')
  if (!svg) return

  // Remover inlays anteriores
  svg.querySelectorAll('.fretboard-inlay').forEach(el => el.remove())

  // Ler posições X dos trastes do grupo g.frets (percentuais: "0%", "6.666%", ...)
  const fretsGroup = svg.querySelector('g.frets')
  if (!fretsGroup) return

  const fretLines = fretsGroup.querySelectorAll('line')
  const fretXPercents: number[] = []
  fretLines.forEach(line => {
    const x1Str = line.getAttribute('x1') || '0'
    fretXPercents.push(parseFloat(x1Str)) // "6.666%" → 6.666
  })

  if (fretXPercents.length < 2) return

  // Ler posições Y das cordas do grupo g.strings (absolutas: 0.5, 36, 72, ...)
  const stringsGroup = svg.querySelector('g.strings')
  if (!stringsGroup) return

  const stringLines = stringsGroup.querySelectorAll('line')
  const stringYs: number[] = []
  stringLines.forEach(line => {
    stringYs.push(parseFloat(line.getAttribute('y1') || '0'))
  })

  if (stringYs.length < 2) return
  stringYs.sort((a, b) => a - b)

  const yMin = stringYs[0]
  const yMax = stringYs[stringYs.length - 1]
  const yCenter = (yMin + yMax) / 2

  // Criar grupo SVG para inlays
  const ns = 'http://www.w3.org/2000/svg'
  const g = document.createElementNS(ns, 'g')
  g.classList.add('fretboard-inlay')

  // Centro X percentual de um traste (entre traste N-1 e N)
  // fretXPercents[0]=nut(0%), fretXPercents[1]=traste 1, etc.
  const getFretCenterPct = (fretNum: number): number | null => {
    if (fretNum < 1 || fretNum >= fretXPercents.length) return null
    return (fretXPercents[fretNum - 1] + fretXPercents[fretNum]) / 2
  }

  // Helper: criar círculo inlay com cx em percentagem
  const addCircle = (cxPct: number, cy: number) => {
    const circle = document.createElementNS(ns, 'circle')
    circle.setAttribute('cx', cxPct + '%')
    circle.setAttribute('cy', String(cy))
    circle.setAttribute('r', String(inlayRadius))
    circle.setAttribute('fill', inlayColor)
    circle.setAttribute('opacity', String(inlayOpacity))
    g.appendChild(circle)
  }

  // Inlays simples (1 bolinha no centro vertical)
  INLAY_FRETS_SINGLE.forEach(fret => {
    if (fret > fretCount) return
    const cx = getFretCenterPct(fret)
    if (cx === null) return
    addCircle(cx, yCenter)
  })

  // Inlays duplos — 12ª casa: 2 bolinhas entre cordas específicas
  // Cordas (afinação padrão, string 1=E agudo … string 6=E grave):
  //   stringYs[0]=string 1 (Mi agudo), [1]=string 2 (Si), [2]=string 3 (Sol),
  //   [3]=string 4 (Ré), [4]=string 5 (Lá), [5]=string 6 (Mi grave)
  // Bolinha de cima: entre Si (string 2) e Sol (string 3) = entre stringYs[1] e stringYs[2]
  // Bolinha de baixo: entre Ré (string 4) e Lá (string 5) = entre stringYs[3] e stringYs[4]
  INLAY_FRETS_DOUBLE.forEach(fret => {
    if (fret > fretCount) return
    const cx = getFretCenterPct(fret)
    if (cx === null) return
    if (stringYs.length >= 5) {
      const yTop = (stringYs[1] + stringYs[2]) / 2
      const yBot = (stringYs[3] + stringYs[4]) / 2
      addCircle(cx, yTop)
      addCircle(cx, yBot)
    } else {
      // Fallback para instrumentos com menos cordas
      const yGap = (yMax - yMin) * 0.28
      addCircle(cx, yCenter - yGap)
      addCircle(cx, yCenter + yGap)
    }
  })

  // Inserir no início do SVG (atrás de tudo)
  const wrapper = svg.querySelector('g.fretboard-wrapper')
  if (wrapper) {
    wrapper.insertBefore(g, wrapper.firstChild)
  } else if (svg.firstChild) {
    svg.insertBefore(g, svg.firstChild)
  } else {
    svg.appendChild(g)
  }
}

// Cores do design system LA Journey
const COLORS = {
  dark: {
    dotFill: '#FF2D78',       // accent
    dotStroke: '#1E293B',     // surface
    rootFill: '#F97316',      // grow (laranja)
    fretColor: '#475569',
    stringColor: '#64748B',
    nutColor: '#CBD5E1',
    fretNumbersColor: '#64748B',
    disabledFill: '#334155',
    fontFill: '#FFFFFF',
  },
  light: {
    dotFill: '#FF2D78',
    dotStroke: '#FFFFFF',
    rootFill: '#F97316',
    fretColor: '#CBD5E1',
    stringColor: '#9CA3AF',
    nutColor: '#1a1a2e',
    fretNumbersColor: '#94A3B8',
    disabledFill: '#E2E8F0',
    fontFill: '#FFFFFF',
  },
}

// ── Componente ───────────────────────────────────────────────────────────

export const GuitarFretboardDiagram = memo(function GuitarFretboardDiagram({
  positions,
  name,
  width = 600,
  height = 160,
  fretCount = 15,
  forceTheme,
  className = '',
  dotSize = 18,
  dotLabel = 'finger',
}: GuitarFretboardDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fbRef = useRef<Fretboard | null>(null)
  const detectedTheme = useTheme()
  const isDark = forceTheme ? forceTheme === 'dark' : detectedTheme === 'dark'
  const colors = isDark ? COLORS.dark : COLORS.light

  const tuning = positions.tuning ?? GUITAR_TUNINGS.default

  // Determinar se precisa crop
  const hasFretRange = positions.fretRange && positions.fretRange[0] > 0

  useEffect(() => {
    if (!containerRef.current) return

    // Limpar conteúdo anterior
    containerRef.current.innerHTML = ''

    const effectiveFretCount = hasFretRange ? (positions.fretRange![1] - positions.fretRange![0] + 2) : fretCount

    const fb = new Fretboard({
      el: containerRef.current,
      tuning,
      stringCount: tuning.length,
      fretCount: effectiveFretCount,
      width,
      height,
      dotSize,
      dotFill: colors.dotFill,
      dotStrokeColor: 'transparent',
      dotStrokeWidth: 0,
      fretColor: colors.fretColor,
      stringColor: colors.stringColor,
      showFretNumbers: true,
      fretNumbersColor: colors.fretNumbersColor,
      middleFretColor: colors.fretColor,
      middleFretWidth: 1,
      scaleFrets: false,
      font: 'DM Sans, sans-serif',
      dotTextSize: dotSize * 0.55,
      crop: !!hasFretRange,
      dotText: (dot: any) => {
        if (dotLabel === 'none') return ''
        if (dotLabel === 'note') return dot.note ?? ''
        if (dotLabel === 'degree') return dot.degree ? String(dot.degree) : ''
        // finger
        return dot.finger ? String(dot.finger) : ''
      },
    })

    fbRef.current = fb

    // Converter notas para formato fretboard.js
    const dots = positions.notes.map(n => ({
      string: n.string,
      fret: n.fret,
      finger: n.finger ?? 0,
      isRoot: n.isRoot ?? false,
      note: n.note ?? '',
      interval: n.interval ?? '',
      degree: n.degree ?? 0,
    }))

    fb.setDots(dots).render()

    // Estilizar tônicas
    fb.style({
      filter: { isRoot: true },
      fill: colors.rootFill,
      stroke: colors.rootFill,
      fontFill: colors.fontFill,
    })

    // Estilizar notas normais
    fb.style({
      filter: (dot: any) => !dot.isRoot,
      fill: colors.dotFill,
      fontFill: colors.fontFill,
    })

    // Forçar texto branco em todas as notas (fretboard.js não aplica fontFill corretamente)
    containerRef.current.querySelectorAll('.dot-text').forEach(t => {
      t.setAttribute('fill', '#FFFFFF')
    })

    // Injetar inlay dots (marcadores de traste)
    const inlayColor = isDark ? '#94A3B8' : '#64748B'
    injectInlayDots(containerRef.current, effectiveFretCount, inlayColor, 0.21, dotSize * 0.25)

    return () => {
      fbRef.current = null
    }
  }, [positions, width, height, fretCount, isDark, dotSize, dotLabel, tuning, hasFretRange, colors])

  return (
    <div className={`guitar-fretboard-diagram w-full ${className}`}>
      <div
        ref={containerRef}
        className="w-full [&_svg]:w-full [&_svg]:h-auto"
      />
    </div>
  )
})

export default GuitarFretboardDiagram
