import { useRef, useEffect, useState, type CSSProperties } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import { SpinnerGap } from '@phosphor-icons/react'
import { buildAlphaTabSettings, type AlphaTabPurpose } from '@/lib/alphaTabSettings'

export function normalizeAlphaTex(input: string) {
  let tex = input.trim()

  tex = tex
    .replace(/:w\b/g, ':1')
    .replace(/:h\b/g, ':2')
    .replace(/:q\b/g, ':4')

  tex = tex
    .replace(/\\ts\s+(\d+)\s*[\/xX]\s*(\d+)/g, '\\ts $1 $2')
    .replace(/\\time\s+(\d+)\s*[\/xX]\s*(\d+)/g, '\\ts $1 $2')

  tex = tex
    .replace(/:(1|2|4|8|16|32|64)dd\s+(\([^)]+\)|r|[a-gA-G][#bn]?\d)/g, ':$1 $2{dd}')
    .replace(/:(1|2|4|8|16|32|64)d\s+(\([^)]+\)|r|[a-gA-G][#bn]?\d)/g, ':$1 $2{d}')

  tex = tex
    .replace(/\{t\}/g, '{-}')
    .replace(/\{tie\}/g, '{-}')
    .replace(/\{dot\}/g, '{d}')
    .replace(/\{ddot\}/g, '{dd}')

  if (!/\\title\s+"[^"]+"/.test(tex)) {
    tex = `\\title "Preview" ${tex}`
  }

  if (!/\\tempo\s+\d+/.test(tex)) {
    tex = tex.replace(/^(\\title\s+"[^"]+")\s*/, '$1 \\tempo 80 ')
  }

  if (!/^\s*\.\s*$/m.test(tex)) {
    tex = tex.replace(
      /^(\s*(?:\\title\s+"[^"]+"\s*)?(?:\\subtitle\s+"[^"]+"\s*)?(?:\\tempo\s+\d+\s*)?(?:\\ts\s+\d+\s+\d+\s*)?(?:\\ks\s+[A-G][b#]?\s*)?(?:\\clef\s+\w+\s*)?(?:\\track\b[^\n]*\s*)?(?:\\staff\{[^}]+\}\s*)?(?:\\tuning\s+[^\n]+\s*)?)/,
      '$1.\n',
    )
  }

  return tex
}

export function hasExplicitAlphaTexTimeSignature(input: string) {
  return /\\(?:ts|time)\s+\d+\s*(?:[\/xX]\s*)?\d+/.test(input)
}

export function stripAlphaTexFreeTimeMarker(input: string) {
  return input.replace(/\\ft\b\s*/g, '')
}

export function getAlphaTexInlineRenderTex(
  input: string,
  hasExplicitTimeSignature = hasExplicitAlphaTexTimeSignature(input),
  isTablature = false,
) {
  const normalized = normalizeAlphaTex(input)
  return hasExplicitTimeSignature || isTablature ? normalized : stripAlphaTexFreeTimeMarker(normalized)
}

function isTimeSignatureGlyphText(text: string) {
  return /^[\uE080-\uE089]+$/.test(text.trim())
}

function isFreeTimeGlyphText(text: string) {
  return text.trim() === '\uE241'
}

export function shouldHideAlphaTexInlineText(text: string | null | undefined, hasExplicitTimeSignature: boolean) {
  const value = (text ?? '').trim()
  if (hasExplicitTimeSignature) return false
  return value.toLowerCase().includes('free time')
    || isTimeSignatureGlyphText(value)
    || isFreeTimeGlyphText(value)
}

export function shouldHideAlphaTabSvgGroup(text: string | null | undefined, hasExplicitTimeSignature: boolean) {
  return shouldHideAlphaTexInlineText(text, hasExplicitTimeSignature)
}

export function isFreeTimeSignaturePathData(pathData: string | null | undefined) {
  if (!pathData || !/[,\s]C-?\d/.test(pathData)) return false

  const values = pathData.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)?.map(Number)
  if (!values || values.length !== 14 || values.some(value => Number.isNaN(value))) return false

  const xs = values.filter((_, index) => index % 2 === 0)
  const ys = values.filter((_, index) => index % 2 === 1)
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)

  return width > 0 && width <= 12 && height >= 20
}

function getTranslate(transform: string | null | undefined) {
  const match = transform?.match(/translate\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/)
  if (!match) return null
  return { x: Number(match[1]), y: Number(match[2]) }
}

export function shiftAlphaTabTranslate(transform: string | null | undefined, deltaX: number) {
  const point = getTranslate(transform)
  if (!point) return transform ?? ''
  return `translate(${formatPathNumber(point.x - deltaX)} ${formatPathNumber(point.y)})`
}

function hideSvgElement(element: SVGElement) {
  if (!element.style.display.includes('none')) {
    element.style.display = 'none'
  }
}

function compactFreeTimeSignatureSpace(svg: SVGSVGElement) {
  const glyphGroups = Array.from(svg.querySelectorAll('g[transform]')) as SVGElement[]
  const hiddenSignatureXs = glyphGroups
    .filter(group => shouldHideAlphaTabSvgGroup(group.textContent, false))
    .map(group => getTranslate(group.getAttribute('transform'))?.x)
    .filter((x): x is number => typeof x === 'number')

  if (hiddenSignatureXs.length === 0) return

  const signatureRight = Math.max(...hiddenSignatureXs)
  const movableGroups = glyphGroups
    .map(group => ({
      group,
      point: getTranslate(group.getAttribute('transform')),
      text: group.textContent?.trim() ?? '',
    }))
    .filter(({ point, text }) => point && point.x > signatureRight + 8 && !shouldHideAlphaTabSvgGroup(text, false))

  if (movableGroups.length === 0) return

  const firstMusicX = Math.min(...movableGroups.map(({ point }) => point?.x ?? Infinity))
  const targetFirstMusicX = signatureRight + 12
  const deltaX = Math.max(0, Math.min(26, firstMusicX - targetFirstMusicX))
  if (deltaX < 1) return

  movableGroups.forEach(({ group, point }) => {
    if (!point || point.x < firstMusicX - 0.5) return
    group.setAttribute('transform', shiftAlphaTabTranslate(group.getAttribute('transform'), deltaX))
  })

  const rects = Array.from(svg.querySelectorAll('rect[x][width][height]')) as SVGRectElement[]
  rects.forEach(rect => {
    const x = Number(rect.getAttribute('x'))
    const width = Number(rect.getAttribute('width'))
    const height = Number(rect.getAttribute('height'))
    if (!Number.isFinite(x) || !Number.isFinite(width) || !Number.isFinite(height)) return
    const isStemOrBarline = width <= 3 && height > 8
    const isLedgerLine = width >= 6 && width <= 28 && height <= 2
    if ((isStemOrBarline && x >= firstMusicX - 0.5) || (isLedgerLine && x >= firstMusicX - 8)) {
      rect.setAttribute('x', formatPathNumber(x - deltaX))
    }
  })
}

export function cleanupAlphaTabFreeTimeArtifacts(
  svg: SVGSVGElement,
  hasExplicitTimeSignature: boolean,
  options: { compactSignatureSpace?: boolean } = {},
) {
  if (hasExplicitTimeSignature) return
  const { compactSignatureSpace = true } = options

  const texts = svg.querySelectorAll('text')
  texts.forEach(text => {
    if (shouldHideAlphaTexInlineText(text.textContent, hasExplicitTimeSignature)) {
      hideSvgElement(text)
    }
  })

  const glyphGroups = svg.querySelectorAll('g[transform]')
  glyphGroups.forEach(group => {
    if (shouldHideAlphaTabSvgGroup(group.textContent, hasExplicitTimeSignature)) {
      hideSvgElement(group as SVGElement)
    }
  })

  const paths = svg.querySelectorAll('path[d]')
  paths.forEach(path => {
    if (isFreeTimeSignaturePathData(path.getAttribute('d'))) {
      hideSvgElement(path as SVGElement)
    }
  })

  if (compactSignatureSpace) {
    compactFreeTimeSignatureSpace(svg)
  }
}

function formatPathNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value)
}

function nearlyEqual(a: number, b: number, tolerance = 0.001) {
  return Math.abs(a - b) <= tolerance
}

const TAB_SLUR_VERTICAL_LIFT = 14

export function raiseTabSlurPathData(pathData: string | null | undefined) {
  if (!pathData || !/[,\s]C-?\d/.test(pathData) || /[,\s]L-?\d/.test(pathData)) return null

  const values = pathData.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)?.map(Number)
  if (!values || values.length !== 14 || values.some(value => Number.isNaN(value))) return null

  const [startX, startY, c1X, c1Y, c2X, c2Y, endX, endY, c3X, c3Y, c4X, c4Y, closeX, closeY] = values
  if (!nearlyEqual(startY, endY) || !nearlyEqual(startY, closeY) || !nearlyEqual(startX, closeX)) return null
  if (c1Y <= startY || c2Y <= startY || c3Y <= startY || c4Y <= startY) return null

  const raisedC1Y = startY - (c1Y - startY)
  const raisedC2Y = startY - (c2Y - startY)
  const raisedC3Y = startY - (c3Y - startY)
  const raisedC4Y = startY - (c4Y - startY)
  const liftedStartY = startY - TAB_SLUR_VERTICAL_LIFT
  const liftedEndY = endY - TAB_SLUR_VERTICAL_LIFT
  const liftedCloseY = closeY - TAB_SLUR_VERTICAL_LIFT

  return ` M${formatPathNumber(startX)},${formatPathNumber(liftedStartY)} C${formatPathNumber(c1X)},${formatPathNumber(raisedC1Y - TAB_SLUR_VERTICAL_LIFT)},${formatPathNumber(c2X)},${formatPathNumber(raisedC2Y - TAB_SLUR_VERTICAL_LIFT)},${formatPathNumber(endX)},${formatPathNumber(liftedEndY)} C${formatPathNumber(c3X)},${formatPathNumber(raisedC3Y - TAB_SLUR_VERTICAL_LIFT)},${formatPathNumber(c4X)},${formatPathNumber(raisedC4Y - TAB_SLUR_VERTICAL_LIFT)},${formatPathNumber(closeX)},${formatPathNumber(liftedCloseY)} z`
}

export function raiseTabSlursInSvg(svg: SVGSVGElement) {
  const paths = svg.querySelectorAll('path[d]')
  paths.forEach(path => {
    const raised = raiseTabSlurPathData(path.getAttribute('d'))
    if (raised) {
      path.setAttribute('d', raised)
    }
  })
}

export function getAlphaTexInlineFrameStyle({
  width,
  layout,
}: {
  width?: number
  layout: 'horizontal' | 'page'
}): CSSProperties {
  if (layout === 'page') {
    return {
      width: '100%',
      maxWidth: Math.max(width ?? 0, 620) || '100%',
      overflow: 'visible',
    }
  }

  return {
    maxWidth: width,
    overflow: 'hidden',
  }
}

interface AlphaTexInlineRendererProps {
  tex: string
  width?: number
  minHeight?: number
  staveProfile?: 'tab' | 'score' | 'scoreTab'
  scale?: number
  className?: string
  layout?: 'horizontal' | 'page'
  pointerEvents?: 'auto' | 'none'
  systemPaddingBottom?: number
  purpose?: AlphaTabPurpose
  onStableRender?: (html: string) => void
}

const INLINE_CSS = `
  .at-inline-clean .at-surface > div:last-child { display: none !important; }
`

function cleanupAlphaTexInlineDom(
  container: HTMLDivElement | null,
  hasExplicitTimeSignature: boolean,
  isTablature = false,
) {
  if (!container) return

  const surface = container.querySelector('.at-surface')
  if (surface) {
    const children = surface.children
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i] as HTMLElement
      if (child.textContent?.includes('rendered by alphaTab')) {
        child.style.display = 'none'
      }
    }
  }

  const svgs = container.querySelectorAll('svg')
  svgs.forEach(svg => {
    if (isTablature) {
      raiseTabSlursInSvg(svg)
    }

    cleanupAlphaTabFreeTimeArtifacts(svg, hasExplicitTimeSignature, {
      compactSignatureSpace: !isTablature,
    })

    const svgWidth = parseFloat(svg.getAttribute('width') || '0')
    if (svgWidth > 0) {
      const rects = svg.querySelectorAll(':scope > rect')
      rects.forEach(rect => {
        const x = parseFloat(rect.getAttribute('x') || '0')
        const w = parseFloat(rect.getAttribute('width') || '0')
        const h = parseFloat(rect.getAttribute('height') || '0')
        if (h > 0.3 && h < 2 && w > 30 && x < 100) {
          rect.setAttribute('width', String(svgWidth - x))
        }
      })
    }
  })
}

function resolvePurpose(
  purpose: AlphaTabPurpose | undefined,
  staveProfile: 'tab' | 'score' | 'scoreTab',
): AlphaTabPurpose {
  if (purpose) return purpose
  return staveProfile === 'tab' ? 'canvas-tablature-tab' : 'canvas-notation-score'
}

export function AlphaTexInlineRenderer({
  tex,
  width,
  minHeight = 80,
  staveProfile = 'score',
  scale = 0.7,
  className = '',
  layout = 'horizontal',
  pointerEvents = 'auto',
  systemPaddingBottom = 10,
  purpose,
  onStableRender,
}: AlphaTexInlineRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)
  const onStableRenderRef = useRef(onStableRender)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const normalizedTex = normalizeAlphaTex(tex)
  const hasExplicitTimeSignature = hasExplicitAlphaTexTimeSignature(normalizedTex)
  const alphaTabPurpose = resolvePurpose(purpose, staveProfile)
  const effectiveLayout = alphaTabPurpose.includes('tablature') ? 'horizontal' : layout
  const isTablaturePurpose = alphaTabPurpose.includes('tablature')
  const renderTex = getAlphaTexInlineRenderTex(normalizedTex, hasExplicitTimeSignature, isTablaturePurpose)

  onStableRenderRef.current = onStableRender

  useEffect(() => {
    const id = 'at-inline-clean-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = INLINE_CSS
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || !normalizedTex) return

    setLoading(true)
    setError(null)

    if (apiRef.current) {
      apiRef.current.destroy()
      apiRef.current = null
    }

    const isTablature = alphaTabPurpose.includes('tablature')
    let cleanupObserver: MutationObserver | null = null
    let cleanupFrame: number | null = null
    const queueDomCleanup = () => {
      if (cleanupFrame !== null) return
      cleanupFrame = window.requestAnimationFrame(() => {
        cleanupFrame = null
        cleanupAlphaTexInlineDom(containerRef.current, hasExplicitTimeSignature, isTablature)
      })
    }

    const settings = buildAlphaTabSettings({
      purpose: alphaTabPurpose,
      showTimeSignature: hasExplicitTimeSignature,
      layout: effectiveLayout,
      scale,
      systemPaddingBottom,
    })

    const api = new alphaTabModule.AlphaTabApi(containerRef.current, settings)
    apiRef.current = api

    if (containerRef.current) {
      cleanupObserver = new MutationObserver(queueDomCleanup)
      cleanupObserver.observe(containerRef.current, {
        attributes: true,
        attributeFilter: ['d', 'style'],
        childList: true,
        subtree: true,
      })
    }

    api.scoreLoaded.on((score: any) => {
      for (const masterBar of score.masterBars) {
        masterBar.isFreeTime = !hasExplicitTimeSignature && !isTablature
        masterBar.tempoAutomations = []
      }
    })

    api.renderFinished.on(() => {
      setLoading(false)
    })

    api.postRenderFinished.on(() => {
      window.requestAnimationFrame(() => {
        cleanupAlphaTexInlineDom(containerRef.current, hasExplicitTimeSignature, isTablature)
        setLoading(false)
        const html = containerRef.current?.innerHTML
        if (html) onStableRenderRef.current?.(html)
      })
    })

    api.error.on((e: any) => {
      console.error('[AlphaTexInlineRenderer] Erro:', e)
      setError(e?.message || String(e) || 'Erro ao renderizar')
      setLoading(false)
    })

    api.tex(renderTex)

    return () => {
      cleanupObserver?.disconnect()
      if (cleanupFrame !== null) {
        window.cancelAnimationFrame(cleanupFrame)
      }
      api.destroy()
      apiRef.current = null
    }
  }, [renderTex, scale, systemPaddingBottom, effectiveLayout, hasExplicitTimeSignature, alphaTabPurpose])

  if (!renderTex) return null

  return (
    <div
      className={`relative at-inline-clean notation-container ${className}`}
      style={getAlphaTexInlineFrameStyle({ width, layout: effectiveLayout })}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10 rounded-lg">
          <SpinnerGap size={18} className="animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="text-[10px] text-destructive p-1">{error}</div>
      )}
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight, pointerEvents }}
      />
    </div>
  )
}
