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

export function shouldHideAlphaTexInlineText(text: string | null | undefined, hasExplicitTimeSignature: boolean) {
  if (hasExplicitTimeSignature) return false
  return (text ?? '').trim().toLowerCase().includes('free time')
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

function cleanupAlphaTexInlineDom(container: HTMLDivElement | null, hasExplicitTimeSignature: boolean) {
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
    const texts = svg.querySelectorAll('text')
    texts.forEach(text => {
      if (shouldHideAlphaTexInlineText(text.textContent, hasExplicitTimeSignature)) {
        ;(text as SVGElement).style.display = 'none'
      }
    })

    if (!hasExplicitTimeSignature) {
      const signatureGlyphs = svg.querySelectorAll(':scope > g[transform]')
      signatureGlyphs.forEach(g => {
        const transform = g.getAttribute('transform') || ''
        const match = transform.match(/translate\(\s*([\d.]+)/)
        if (!match) return
        const tx = parseFloat(match[1])
        if (tx >= 65 && tx < 110) {
          ;(g as SVGElement).style.display = 'none'
        }
      })
    }

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

    const settings = buildAlphaTabSettings({
      purpose: resolvePurpose(purpose, staveProfile),
      showTimeSignature: hasExplicitTimeSignature,
      layout,
      scale,
      systemPaddingBottom,
    })

    const api = new alphaTabModule.AlphaTabApi(containerRef.current, settings)
    apiRef.current = api

    api.scoreLoaded.on((score: any) => {
      for (const masterBar of score.masterBars) {
        masterBar.isFreeTime = !hasExplicitTimeSignature
        masterBar.tempoAutomations = []
      }
    })

    api.renderFinished.on(() => {
      setLoading(false)
    })

    api.postRenderFinished.on(() => {
      window.requestAnimationFrame(() => {
        cleanupAlphaTexInlineDom(containerRef.current, hasExplicitTimeSignature)
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

    api.tex(normalizedTex)

    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [normalizedTex, staveProfile, scale, systemPaddingBottom, layout, hasExplicitTimeSignature, purpose])

  if (!normalizedTex) return null

  return (
    <div
      className={`relative at-inline-clean notation-container ${className}`}
      style={getAlphaTexInlineFrameStyle({ width, layout })}
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
