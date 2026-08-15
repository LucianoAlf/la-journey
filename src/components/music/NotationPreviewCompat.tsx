import { AlphaTabViewer } from './AlphaTabViewer'
import { hasExplicitAlphaTexTimeSignature } from './AlphaTexInlineRenderer'
import { StaffNotation } from './StaffNotation'
import {
  resolveNotationPreviewItem,
  type LegacyNotationData,
} from '@/lib/notationCompat'
import { NOTATION_DIDACTIC_SCALE } from '@/lib/alphaTabSettings'

interface NotationPreviewCompatProps {
  notation?: LegacyNotationData | null
  notationData?: any
  notes?: Array<string | { key: string; duration?: string; label?: string }>
  onLegacyStavePointerDown?: (staveIndex: number) => void
  accidentals?: (string | null)[]
  clef?: string
  keySignature?: string
  timeSignature?: string | null
  width?: number
  minHeight?: number
  className?: string
  showLabels?: boolean
  scale?: number
  onStableRender?: (html: string) => void
}

export function NotationPreviewCompat({
  notation,
  notationData,
  notes,
  onLegacyStavePointerDown,
  accidentals,
  clef = 'treble',
  keySignature = 'C',
  timeSignature = null,
  width,
  minHeight = 84,
  className = '',
  showLabels = true,
  scale = NOTATION_DIDACTIC_SCALE,
  onStableRender,
}: NotationPreviewCompatProps) {
  const hasLegacyNotes = Boolean(notes?.length)

  const resolvedStructuredPreview = resolveNotationPreviewItem({
    notation,
    notationData,
    fallback: {
      clef,
      keySignature,
      timeSignature,
      width,
    },
  })

  if (resolvedStructuredPreview) {
    const { item: previewItem, source } = resolvedStructuredPreview

    return (
      <div className={`w-full min-w-0 space-y-1.5 ${className}`}>
        <div className="w-full min-w-0 overflow-x-auto" onMouseDown={() => source === 'legacy_notation' && onLegacyStavePointerDown?.(0)}>
          <AlphaTabViewer
            tex={previewItem.tex}
            minHeight={minHeight}
            scale={scale}
            staveProfile="score"
            purpose="canvas-notation-score"
            layout="page"
            showTimeSignature={hasExplicitAlphaTexTimeSignature(previewItem.tex)}
            className="notation-container"
            onStableRender={onStableRender}
          />
          {showLabels && previewItem.label && (
            <div className="text-[11px] text-text3 italic px-2 -mt-1">
              {previewItem.label}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (hasLegacyNotes && notes) {
    const normalizedNotes = notes
      .map((note) => typeof note === 'string' ? note : `${note.key}:${note.duration || 'q'}`)
      .filter(Boolean)

    if (!normalizedNotes.length) return null

    return (
      <div className={`w-full min-w-0 overflow-x-auto ${className}`}>
        <StaffNotation
          notes={normalizedNotes}
          clef={clef === 'bass' ? 'bass' : 'treble'}
          timeSignature={timeSignature ?? undefined}
          keySignature={keySignature}
          width={width}
          height={Math.max(minHeight, 120)}
        />
      </div>
    )
  }

  return null
}
