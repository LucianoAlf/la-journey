import { useCallback, useEffect, useRef, useState } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import { AlphaTabViewer, type AlphaTabViewerHandle } from './AlphaTabViewer'
import { A4_CANVAS_NOTATION_WIDTH } from '@/lib/notationPreviewWidth'
import { NOTATION_DIDACTIC_SCALE } from '@/lib/alphaTabSettings'
import { isStaffLineRect } from '@/lib/extendAlphaTabStaffLines'
import { emptyStaffAlphaTex, ledgerLineYs, modelPitchFromStaffY, pickStaffBox, pitchFromStaffY, staffBoxesFromLineYs, staffYFromPitch } from '@/lib/notationStaffPitch'
import { applySelectionColor, beatBodyHitIndex, collectScoreBeatsFromLookup, insertAfterFromBeatRects, resolveStaffClick } from '@/lib/notationBeatHit'

const SELECTED_NOTE_COLOR = '#c41e3a'

function selectedEngravingStyles() {
  const color = alphaTabModule.model.Color.fromJson(SELECTED_NOTE_COLOR)
  const note = new alphaTabModule.model.NoteStyle()
  note.colors.set(alphaTabModule.model.NoteSubElement.StandardNotationNoteHead, color)
  note.colors.set(alphaTabModule.model.NoteSubElement.StandardNotationAccidentals, color)
  const beat = new alphaTabModule.model.BeatStyle()
  beat.colors.set(alphaTabModule.model.BeatSubElement.StandardNotationStem, color)
  beat.colors.set(alphaTabModule.model.BeatSubElement.StandardNotationFlags, color)
  beat.colors.set(alphaTabModule.model.BeatSubElement.StandardNotationRests, color)
  return { note, beat }
}

export interface NotationAlphaTabSurfaceProps {
  tex: string
  variant?: 'modal' | 'canvas'
  indexMap: number[]
  selectedBeatIdx: number
  clef: string
  keySignature: string
  timeSignature: string | null
  grandStaffMode?: boolean
  barsPerRow?: number
  noteInputArmed?: boolean
  onSelectBeat: (idx: number) => void
  onInsertNote: (pitch: string, afterIdx: number) => void
  /** Mantido por compatibilidade — o clique não substitui mais nota. */
  onReplaceNote?: (pitch: string, atIdx: number) => void
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
          if (bounds) rects.push({
            x: bounds.x,
            y: bounds.y,
            w: bounds.w,
            h: bounds.h,
          })
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
  barsPerRow,
  noteInputArmed = true,
  onSelectBeat,
  onInsertNote,
  inputRef,
  onKeyDown,
  onHoverPitch,
}: NotationAlphaTabSurfaceProps) {
  const viewerRef = useRef<AlphaTabViewerHandle>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [staffBoxes, setStaffBoxes] = useState<Array<{ top: number; bottom: number }>>([])
  const [beatRects, setBeatRects] = useState<BeatRect[]>([])
  const [ghost, setGhost] = useState<GhostNote | null>(null)
  const [origin, setOrigin] = useState<OverlayOrigin>({ x: 0, y: 0 })

  const displayTex = tex || emptyStaffAlphaTex({ clef, keySignature, timeSignature })

  const readStaffBoxes = useCallback(() => {
    const wrapper = wrapperRef.current
    const container = viewerRef.current?.container
    if (!wrapper || !container) return []
    const host = container.getBoundingClientRect()
    const { sy } = localScale(wrapper)
    const ys: number[] = []
    container.querySelectorAll('rect').forEach(rect => {
      const width = parseFloat(rect.getAttribute('width') || '0')
      const height = parseFloat(rect.getAttribute('height') || '0')
      if (!isStaffLineRect(height, width)) return
      const box = rect.getBoundingClientRect()
      ys.push((box.top + box.height / 2 - host.top) / sy + container.scrollTop)
    })
    const fromLines = staffBoxesFromLineYs(ys)
    if (fromLines.length > 0) return fromLines
    const api = viewerRef.current?.api as { boundsLookup?: any } | null
    const lookup = api?.boundsLookup
    const firstBar = lookup?.staffSystems?.[0]?.bars?.[0]?.bars?.[0]
    const bounds = firstBar?.visualBounds ?? firstBar?.realBounds
    if (!bounds) return []
    return [{ top: bounds.y, bottom: bounds.y + bounds.h }]
  }, [])

  const colorPassRef = useRef(false)

  const paintScoreSelection = useCallback((api: { boundsLookup?: any; render?: () => void } | null, rerender: boolean) => {
    if (!api) return
    const alphaIdx = resolveAlphaBeatIndex(selectedBeatIdx, indexMap)
    applySelectionColor(collectScoreBeatsFromLookup(api, grandStaffMode), alphaIdx, selectedEngravingStyles())
    if (rerender && selectedBeatIdx >= 0 && typeof api.render === 'function') {
      colorPassRef.current = true
      api.render()
    }
  }, [grandStaffMode, indexMap, selectedBeatIdx])

  const handleRenderFinished = useCallback(() => {
    const wrapper = wrapperRef.current
    const container = viewerRef.current?.container
    if (wrapper && container) setOrigin(overlayOffset(wrapper, container))
    setStaffBoxes(readStaffBoxes())
    const api = viewerRef.current?.api as { boundsLookup?: any; render?: () => void } | null
    setBeatRects(collectBeatRects(api, grandStaffMode))
    if (colorPassRef.current) {
      colorPassRef.current = false
      return
    }
    paintScoreSelection(api, true)
  }, [grandStaffMode, paintScoreSelection, readStaffBoxes])

  useEffect(() => {
    const api = viewerRef.current?.api as { boundsLookup?: any; render?: () => void } | null
    if (!api?.boundsLookup) return
    paintScoreSelection(api, true)
  }, [paintScoreSelection, tex])

  // getBeatAtPos do alphaTab é guloso: atribui o vão inteiro do compasso ao beat
  // mais próximo, o que mataria a inserção em vãos. Só a coluna do beat conta.
  const hitModelBeat = useCallback((atX: number, atY: number): number => {
    return beatBodyHitIndex(beatRects, indexMap, atX, atY)
  }, [beatRects, indexMap])

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
    const box = pickStaffBox(staffBoxes.length > 0 ? staffBoxes : readStaffBoxes(), atY)
    if (!box) return
    const writtenPitch = pitchFromStaffY(atY, box.top, box.bottom, staffClef(clef))
    const pitch = modelPitchFromStaffY(atY, box.top, box.bottom, staffClef(clef))
    const overBeatIdx = hitModelBeat(atX, atY)
    onHoverPitch?.(writtenPitch)
    if (!commit) {
      // Sobre uma nota existente o clique seleciona — fantasma esconderia a intenção.
      if (!noteInputArmed || overBeatIdx >= 0) {
        setGhost(null)
        return
      }
      const snappedY = staffYFromPitch(writtenPitch, box.top, box.bottom, staffClef(clef))
      setGhost({
        x: wrapX,
        y: snappedY + offset.y,
        label: writtenPitch.replace('/', ''),
        ledger: ledgerLineYs(snappedY, box.top, box.bottom).map(lineY => lineY + offset.y),
      })
      return
    }

    const insertAfter = insertAfterFromBeatRects(beatRects, indexMap, atX, atY)
    const action = resolveStaffClick({
      armed: noteInputArmed,
      noteHitIndex: -1,
      beatHitIndex: overBeatIdx,
      insertAfterIndex: insertAfter >= 0 ? insertAfter : selectedBeatIdx,
    })
    if (action.type === 'insert') onInsertNote(pitch, action.afterIndex)
    else if (action.type === 'select') onSelectBeat(action.index)
    else onSelectBeat(-1)
  }, [beatRects, clef, hitModelBeat, indexMap, noteInputArmed, onHoverPitch, onInsertNote, onSelectBeat, readStaffBoxes, selectedBeatIdx, staffBoxes])

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
        key={`bars-${barsPerRow ?? 0}`}
        ref={viewerRef}
        tex={displayTex}
        purpose={variant === 'canvas' || !grandStaffMode ? 'canvas-notation-score' : 'editor-notation-grand-staff'}
        staveProfile="score"
        layout={grandStaffMode ? 'horizontal' : 'page'}
        scale={NOTATION_DIDACTIC_SCALE}
        showTimeSignature={timeSignature != null}
        includeNoteBounds
        barsPerRow={barsPerRow}
        minHeight={200}
        grandStaffMode={grandStaffMode}
        onRenderFinished={handleRenderFinished}
        onStableRender={handleRenderFinished}
      />

      {ghost && noteInputArmed && (
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
