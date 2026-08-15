import { useCallback, useMemo, useRef, useState } from 'react'
import { AlphaTabViewer, type AlphaTabViewerHandle } from './AlphaTabViewer'
import { A4_CANVAS_NOTATION_WIDTH } from '@/lib/notationPreviewWidth'
import { NOTATION_DIDACTIC_SCALE } from '@/lib/alphaTabSettings'
import { emptyStaffAlphaTex, ledgerLineYs, pitchFromStaffY, staffYFromPitch } from '@/lib/notationStaffPitch'
import { resolveInsertAfterIndex, resolveModelBeatIndex } from '@/lib/notationBeatHit'

export interface NotationAlphaTabSurfaceProps {
  tex: string
  variant?: 'modal' | 'canvas'
  indexMap: number[]
  selectedBeatIdx: number
  clef: string
  keySignature: string
  timeSignature: string | null
  grandStaffMode?: boolean
  onSelectBeat: (idx: number) => void
  onInsertNote: (pitch: string, afterIdx: number) => void
  onReplaceNote: (pitch: string, atIdx: number) => void
  inputRef?: React.Ref<HTMLInputElement>
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onHoverPitch?: (pitch: string | null) => void
}

interface BeatRect { x: number; y: number; w: number; h: number }
interface GhostNote { x: number; y: number; label: string; ledger: number[] }
interface OverlayOrigin { x: number; y: number }

function staffClef(clef: string): 'treble' | 'bass' {
  return clef === 'bass' ? 'bass' : 'treble'
}

function resolveAlphaBeatIndex(modelIdx: number, indexMap: number[]): number {
  for (let i = indexMap.length - 1; i >= 0; i -= 1) {
    if (indexMap[i] === modelIdx) return i
  }
  return -1
}

function localScale(el: HTMLElement) {
  const box = el.getBoundingClientRect()
  const sx = el.offsetWidth === 0 ? 1 : box.width / el.offsetWidth
  const sy = el.offsetHeight === 0 ? 1 : box.height / el.offsetHeight
  return { sx: sx || 1, sy: sy || 1 }
}

function overlayOffset(wrapper: HTMLElement, container: HTMLElement) {
  const wrap = wrapper.getBoundingClientRect()
  const host = container.getBoundingClientRect()
  const { sx, sy } = localScale(wrapper)
  return {
    x: (host.left - wrap.left) / sx + container.scrollLeft,
    y: (host.top - wrap.top) / sy + container.scrollTop,
  }
}

function collectBeatRects(
  api: { boundsLookup?: any } | null,
  grandStaffMode = false,
): BeatRect[] {
  const rects: BeatRect[] = []
  const systems = api?.boundsLookup?.staffSystems ?? []
  for (const system of systems) {
    for (const masterBar of system.bars ?? []) {
      // Grand staff: beatsToAlphaTexWithMap returns an identity map of model length
      // and does not merge staves. Walking both staves would ~2× the rects vs indexMap.
      // Keep the first bar (typically treble). Bass-staff highlight stays imperfect.
      const bars = grandStaffMode
        ? masterBar.bars?.slice(0, 1) ?? []
        : masterBar.bars ?? []
      for (const bar of bars) {
        for (const beat of bar.beats ?? []) {
          const bounds = beat.visualBounds ?? beat.realBounds
          if (bounds) rects.push({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h })
        }
      }
    }
  }
  return rects
}

export function NotationAlphaTabSurface({
  tex,
  variant = 'modal',
  indexMap,
  selectedBeatIdx,
  clef,
  keySignature,
  timeSignature,
  grandStaffMode = false,
  onSelectBeat,
  onInsertNote,
  onReplaceNote,
  inputRef,
  onKeyDown,
  onHoverPitch,
}: NotationAlphaTabSurfaceProps) {
  const viewerRef = useRef<AlphaTabViewerHandle>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [staffBox, setStaffBox] = useState<{ top: number; bottom: number } | null>(null)
  const [beatRects, setBeatRects] = useState<BeatRect[]>([])
  const [ghost, setGhost] = useState<GhostNote | null>(null)
  const [origin, setOrigin] = useState<OverlayOrigin>({ x: 0, y: 0 })

  const displayTex = tex || emptyStaffAlphaTex({ clef, keySignature, timeSignature })

  const readStaffBox = useCallback(() => {
    const api = viewerRef.current?.api as { boundsLookup?: any } | null
    const lookup = api?.boundsLookup
    const first = lookup?.staffSystems?.[0]?.bars?.[0]
    const bounds = first?.visualBounds ?? first?.realBounds
    if (!bounds) return null
    return { top: bounds.y, bottom: bounds.y + bounds.h }
  }, [])

  const handleRenderFinished = useCallback(() => {
    const wrapper = wrapperRef.current
    const container = viewerRef.current?.container
    if (wrapper && container) setOrigin(overlayOffset(wrapper, container))
    setStaffBox(readStaffBox())
    setBeatRects(collectBeatRects(viewerRef.current?.api as { boundsLookup?: any } | null, grandStaffMode))
  }, [grandStaffMode, readStaffBox])

  const selectedRect = useMemo(() => {
    if (selectedBeatIdx < 0) return null
    const alphaIdx = resolveAlphaBeatIndex(selectedBeatIdx, indexMap)
    if (alphaIdx < 0 || alphaIdx >= beatRects.length) return null
    return beatRects[alphaIdx]
  }, [beatRects, indexMap, selectedBeatIdx])

  const handleBeatMouseDown = useCallback((beat: { index?: number; voice?: { beats?: unknown[] } }) => {
    const alphaIdx = typeof beat.index === 'number' ? beat.index : -1
    const modelIdx = resolveModelBeatIndex(alphaIdx, indexMap)
    if (modelIdx >= 0) onSelectBeat(modelIdx)
  }, [indexMap, onSelectBeat])

  const handlePointer = useCallback((event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const api = viewerRef.current?.api as { boundsLookup?: any } | null
    const container = viewerRef.current?.container
    const wrapper = wrapperRef.current
    if (!api || !container || !wrapper) return
    const offset = overlayOffset(wrapper, container)
    setOrigin(offset)
    const wrap = wrapper.getBoundingClientRect()
    const host = container.getBoundingClientRect()
    const { sx, sy } = localScale(wrapper)
    const wrapX = (event.clientX - wrap.left) / sx
    const atX = (event.clientX - host.left) / sx + container.scrollLeft
    const atY = (event.clientY - host.top) / sy + container.scrollTop
    const box = staffBox ?? readStaffBox()
    if (!box) return
    const pitch = pitchFromStaffY(atY, box.top, box.bottom, staffClef(clef))
    onHoverPitch?.(pitch)
    if (!commit) {
      const snappedY = staffYFromPitch(pitch, box.top, box.bottom, staffClef(clef))
      setGhost({
        x: wrapX,
        y: snappedY + offset.y,
        label: pitch.replace('/', ''),
        ledger: ledgerLineYs(snappedY, box.top, box.bottom).map(lineY => lineY + offset.y),
      })
      return
    }

    const lookup = api.boundsLookup
    const hit = lookup?.getBeatAtPos?.(atX, atY) ?? null
    if (hit && tex) {
      const voiceBeats = hit.voice?.beats ?? []
      const alphaIdx = voiceBeats.indexOf(hit)
      const modelIdx = resolveModelBeatIndex(alphaIdx >= 0 ? alphaIdx : hit.index, indexMap)
      if (modelIdx >= 0) {
        if (event.altKey) {
          onReplaceNote(pitch, modelIdx)
        } else {
          onSelectBeat(modelIdx)
        }
        return
      }
    }
    const after = resolveInsertAfterIndex(selectedBeatIdx, false)
    onInsertNote(pitch, after)
  }, [clef, indexMap, onHoverPitch, onInsertNote, onReplaceNote, onSelectBeat, readStaffBox, selectedBeatIdx, staffBox, tex])

  return (
    <div
      ref={wrapperRef}
      className={variant === 'canvas'
        ? 'relative w-full min-w-0'
        : 'relative mx-auto overflow-hidden rounded-xl border border-border bg-white'}
      style={variant === 'modal' ? { width: A4_CANVAS_NOTATION_WIDTH } : undefined}
      onPointerMove={(event) => handlePointer(event, false)}
      onPointerLeave={() => { onHoverPitch?.(null); setGhost(null) }}
      onPointerDown={(event) => {
        if (variant === 'canvas') event.stopPropagation()
        handlePointer(event, true)
        if (inputRef && 'current' in inputRef) inputRef.current?.focus()
      }}
    >
      <AlphaTabViewer
        ref={viewerRef}
        tex={displayTex}
        purpose={variant === 'canvas' || !grandStaffMode ? 'canvas-notation-score' : 'editor-notation-grand-staff'}
        staveProfile="score"
        layout={grandStaffMode ? 'horizontal' : 'page'}
        scale={NOTATION_DIDACTIC_SCALE}
        showTimeSignature={timeSignature != null}
        includeNoteBounds
        minHeight={200}
        grandStaffMode={grandStaffMode}
        onBeatMouseDown={handleBeatMouseDown}
        onRenderFinished={handleRenderFinished}
      />

      {selectedRect && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-accent/15 ring-2 ring-accent"
          style={{
            left: selectedRect.x + origin.x - 5,
            top: selectedRect.y + origin.y - 5,
            width: selectedRect.w + 10,
            height: selectedRect.h + 10,
          }}
        />
      )}

      {ghost && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {ghost.ledger.map(lineY => (
            <div
              key={lineY}
              className="absolute h-[1.5px] w-[22px] bg-text3/50"
              style={{ left: ghost.x - 11, top: lineY }}
            />
          ))}
          <svg className="absolute" width="16" height="12" style={{ left: ghost.x - 8, top: ghost.y - 6 }}>
            <ellipse cx="8" cy="6" rx="7" ry="5" className="fill-text3/45" />
          </svg>
          <span
            className="absolute rounded bg-master px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ left: ghost.x + 12, top: ghost.y - 24 }}
          >
            {ghost.label}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        className="sr-only"
        onKeyDown={onKeyDown}
        aria-label="Atalhos da pauta"
      />
    </div>
  )
}
