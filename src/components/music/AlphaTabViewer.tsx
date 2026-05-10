import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import { SpinnerGap } from '@phosphor-icons/react'
import { buildAlphaTabSettings, type AlphaTabPurpose } from '@/lib/alphaTabSettings'
import { raiseTabSlursInSvg, shouldHideAlphaTabSvgGroup } from './AlphaTexInlineRenderer'
import type { FretboardNote } from './GuitarFretboardDiagram'

export function notesToAlphaTex(
  notes: FretboardNote[],
  _title?: string,
): string {
  if (notes.length === 0) return ''

  const sorted = [...notes].sort((a, b) => {
    if (a.string !== b.string) return b.string - a.string
    return a.fret - b.fret
  })

  const lines: string[] = []
  lines.push('\\tempo 120')
  lines.push('\\staff{tabs}')
  lines.push('\\tuning E4 B3 G3 D3 A2 E2')
  lines.push('\\instrument AcousticGuitarSteel')
  lines.push('\\ts 32 4')
  lines.push('.')

  const texBeats = sorted.map(n => `${n.fret}.${n.string}.4`)
  const bars: string[] = []
  for (let i = 0; i < texBeats.length; i += 32) {
    bars.push(texBeats.slice(i, i + 32).join(' '))
  }
  lines.push(bars.join(' | \n'))

  return lines.join('\n')
}

export interface AlphaTabViewerHandle {
  api: alphaTabModule.AlphaTabApi | null
  container: HTMLDivElement | null
}

export type AlphaTabState = 'idle' | 'loading' | 'rendering' | 'ready' | 'error'

interface AlphaTabViewerProps {
  tex: string
  minHeight?: number
  className?: string
  layout?: 'horizontal' | 'page'
  scale?: number
  showTimeSignature?: boolean
  staveProfile?: 'tab' | 'score' | 'scoreTab'
  grandStaffMode?: boolean
  includeNoteBounds?: boolean
  purpose?: AlphaTabPurpose
  onBeatMouseDown?: (beat: alphaTabModule.model.Beat) => void
  onBeatMouseMove?: (beat: alphaTabModule.model.Beat) => void
  onNoteMouseDown?: (note: alphaTabModule.model.Note) => void
  onRenderFinished?: () => void
  onStableRender?: (html: string) => void
  onStateChange?: (state: AlphaTabState) => void
}

const CLEAN_TAB_CSS = `
  .at-viewer-clean .at-surface > div:last-child { display: none !important; }
`

function cleanupAlphaTabDom(
  container: HTMLDivElement | null,
  showTimeSignature = false,
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

    const gElements = svg.querySelectorAll('g[transform]')
    gElements.forEach(g => {
      if (shouldHideAlphaTabSvgGroup(g.textContent, showTimeSignature)) {
        ;(g as SVGElement).style.display = 'none'
      }
    })

    const texts = svg.querySelectorAll('text')
    texts.forEach(t => {
      const content = t.textContent?.trim() || ''
      const fill = t.getAttribute('fill') || ''
      if (fill.includes('C80000') || fill.includes('c80000')) {
        ;(t as SVGElement).style.display = 'none'
      }
      if (!showTimeSignature && content.toLowerCase().includes('free time')) {
        ;(t as SVGElement).style.display = 'none'
      }
      if (shouldHideAlphaTabSvgGroup(content, showTimeSignature)) {
        ;(t as SVGElement).style.display = 'none'
      }
    })

    const svgWidth = parseFloat(svg.getAttribute('width') || '0')
    if (svgWidth > 0) {
      const rects = svg.querySelectorAll(':scope > rect')
      rects.forEach(r => {
        const x = parseFloat(r.getAttribute('x') || '0')
        const w = parseFloat(r.getAttribute('width') || '0')
        const h = parseFloat(r.getAttribute('height') || '0')
        if (h > 0.3 && h < 2 && w > 30 && x < 100) {
          const rightEdge = x + w
          if (rightEdge < svgWidth - 5) {
            r.setAttribute('width', String(svgWidth - x))
          }
        }
      })
    }
  })
}

function resolvePurpose(
  purpose: AlphaTabPurpose | undefined,
  staveProfile: 'tab' | 'score' | 'scoreTab',
  grandStaffMode: boolean,
): AlphaTabPurpose {
  if (purpose) return purpose
  if (staveProfile === 'tab') return 'canvas-tablature-tab'
  if (grandStaffMode) return 'editor-notation-grand-staff'
  return 'canvas-notation-score'
}

export const AlphaTabViewer = forwardRef<AlphaTabViewerHandle, AlphaTabViewerProps>(
  function AlphaTabViewerInner({
    tex,
    minHeight = 120,
    className = '',
    layout = 'page',
    scale = 0.8,
    showTimeSignature = false,
    staveProfile = 'tab',
    grandStaffMode = false,
    includeNoteBounds = false,
    purpose,
    onBeatMouseDown,
    onBeatMouseMove,
    onNoteMouseDown,
    onRenderFinished,
    onStableRender,
    onStateChange,
  }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const onBeatMouseDownRef = useRef(onBeatMouseDown)
    const onBeatMouseMoveRef = useRef(onBeatMouseMove)
    const onNoteMouseDownRef = useRef(onNoteMouseDown)
    const onRenderFinishedRef = useRef(onRenderFinished)
    const onStableRenderRef = useRef(onStableRender)
    const onStateChangeRef = useRef(onStateChange)
    const configKeyRef = useRef('')

    onBeatMouseDownRef.current = onBeatMouseDown
    onBeatMouseMoveRef.current = onBeatMouseMove
    onNoteMouseDownRef.current = onNoteMouseDown
    onRenderFinishedRef.current = onRenderFinished
    onStableRenderRef.current = onStableRender
    onStateChangeRef.current = onStateChange

    const setPhase = (state: AlphaTabState) => {
      onStateChangeRef.current?.(state)
    }

    useImperativeHandle(ref, () => ({
      get api() { return apiRef.current },
      get container() { return containerRef.current },
    }), [])

    useEffect(() => {
      const id = 'at-viewer-clean-css'
      if (!document.getElementById(id)) {
        const style = document.createElement('style')
        style.id = id
        style.textContent = CLEAN_TAB_CSS
        document.head.appendChild(style)
      }
    }, [])

    const alphaTabPurpose = resolvePurpose(purpose, staveProfile, grandStaffMode)
    const effectiveLayout = alphaTabPurpose.includes('tablature') ? 'horizontal' : layout
    const renderTex = showTimeSignature ? tex : tex.replace(/\\ft\b/g, '')
    const configKey = `${effectiveLayout}|${scale}|${showTimeSignature}|${staveProfile}|${grandStaffMode}|${includeNoteBounds}|${alphaTabPurpose}`

    useEffect(() => {
      if (!containerRef.current) return

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
          cleanupAlphaTabDom(containerRef.current, showTimeSignature, isTablature)
        })
      }

      const settings = buildAlphaTabSettings({
        purpose: alphaTabPurpose,
        showTimeSignature,
        layout: effectiveLayout,
        scale,
        includeNoteBounds,
      })

      const api = new alphaTabModule.AlphaTabApi(containerRef.current, settings)
      apiRef.current = api

      if (isTablature && containerRef.current) {
        cleanupObserver = new MutationObserver(queueDomCleanup)
        cleanupObserver.observe(containerRef.current, {
          attributes: true,
          attributeFilter: ['d', 'style'],
          childList: true,
          subtree: true,
        })
      }

      api.scoreLoaded.on((score: any) => {
        setPhase('rendering')
        for (const mb of score.masterBars) {
          mb.tempoAutomations = []
        }
        for (const track of score.tracks) {
          for (const staff of track.staves) {
            for (const bar of staff.bars) {
              for (const voice of bar.voices) {
                for (const beat of voice.beats) {
                  beat.dynamics = alphaTabModule.model.DynamicValue.N
                }
              }
            }
          }
        }
      })

      api.renderFinished.on(() => {
        setPhase('rendering')
        setLoading(false)
        onRenderFinishedRef.current?.()
      })

      api.postRenderFinished.on(() => {
        window.requestAnimationFrame(() => {
          cleanupAlphaTabDom(containerRef.current, showTimeSignature, isTablature)
          setLoading(false)
          setPhase('ready')
          const html = containerRef.current?.innerHTML
          if (html) onStableRenderRef.current?.(html)
        })
      })

      api.error.on((e: any) => {
        console.error('[AlphaTabViewer] Erro:', e)
        setError(e?.message || String(e) || 'Erro ao renderizar')
        setLoading(false)
        setPhase('error')
      })

      api.beatMouseDown.on((beat) => {
        onBeatMouseDownRef.current?.(beat)
      })
      api.beatMouseMove.on((beat) => {
        onBeatMouseMoveRef.current?.(beat)
      })
      api.noteMouseDown.on((note) => {
        onNoteMouseDownRef.current?.(note)
      })

      if (renderTex) {
        setLoading(true)
        setError(null)
        setPhase('loading')
        api.tex(renderTex)
      } else {
        setPhase('idle')
      }

      configKeyRef.current = configKey

      return () => {
        cleanupObserver?.disconnect()
        if (cleanupFrame !== null) {
          window.cancelAnimationFrame(cleanupFrame)
        }
        api.destroy()
        apiRef.current = null
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configKey])

    useEffect(() => {
      if (configKeyRef.current !== configKey) return
      const api = apiRef.current
      if (!api || !renderTex) return

      setLoading(true)
      setError(null)
      setPhase('loading')
      api.tex(renderTex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderTex])

    if (!renderTex) return null

    return (
      <div
        className={`relative at-viewer-clean ${effectiveLayout === 'horizontal' ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden'} ${className}`}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10 rounded-xl">
            <SpinnerGap size={24} className="animate-spin text-accent" />
          </div>
        )}
        {error && (
          <div className="text-[11px] text-destructive p-2">{error}</div>
        )}
        <div
          ref={containerRef}
          className="w-full"
          style={{ minHeight }}
        />
      </div>
    )
  },
)
