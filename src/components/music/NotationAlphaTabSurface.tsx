import { useCallback, useMemo, useRef, useState } from 'react'
import { AlphaTabViewer, type AlphaTabViewerHandle } from './AlphaTabViewer'
import { A4_CANVAS_NOTATION_WIDTH } from '@/lib/notationPreviewWidth'
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

function staffClef(clef: string): 'treble' | 'bass' {
  return clef === 'bass' ? 'bass' : 'treble'
}

function collectBeatRects(api: { boundsLookup?: any } | null): BeatRect[] {
  const rects: BeatRect[] = []
  const systems = api?.boundsLookup?.staffSystems ?? []
  for (const system of systems) {
    for (const masterBar of system.bars ?? []) {
      for (const bar of masterBar.bars ?? []) {
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
  const [staffBox, setStaffBox] = useState<{ top: number; bottom: number } | null>(null)
  const [beatRects, setBeatRects] = useState<BeatRect[]>([])
  const [ghost, setGhost] = useState<GhostNote | null>(null)

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
    setStaffBox(readStaffBox())
    setBeatRects(collectBeatRects(viewerRef.current?.api as { boundsLookup?: any } | null))
  }, [readStaffBox])

  const selectedRect = useMemo(() => {
    if (selectedBeatIdx < 0) return null
    const alphaIdx = indexMap.indexOf(selectedBeatIdx)
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
    if (!api || !container) return
    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const box = staffBox ?? readStaffBox()
    if (!box) return
    const pitch = pitchFromStaffY(y, box.top, box.bottom, staffClef(clef))
    onHoverPitch?.(pitch)
    if (!commit) {
      const snappedY = staffYFromPitch(pitch, box.top, box.bottom, staffClef(clef))
      setGhost({
        x,
        y: snappedY,
        label: pitch.replace('/', ''),
        ledger: ledgerLineYs(snappedY, box.top, box.bottom),
      })
      return
    }

    const lookup = api.boundsLookup
    const hit = lookup?.getBeatAtPos?.(x, y) ?? null
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
        scale={1}
        showTimeSignature={timeSignature != null}
        includeNoteBounds
        minHeight={160}
        grandStaffMode={grandStaffMode}
        onBeatMouseDown={handleBeatMouseDown}
        onRenderFinished={handleRenderFinished}
      />

      {selectedRect && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-accent/15 ring-2 ring-accent"
          style={{
            left: selectedRect.x - 5,
            top: selectedRect.y - 5,
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
