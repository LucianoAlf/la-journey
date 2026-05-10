import { AlphaTabViewer } from './AlphaTabViewer'
import { hasExplicitAlphaTexTimeSignature } from './AlphaTexInlineRenderer'
import { StaffNotation } from './StaffNotation'
import {
  legacyNotationToCombinedPreviewItem,
  notationDataToPreviewItem,
  type LegacyNotationData,
} from '@/lib/notationCompat'

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
  scale = 0.9,
  onStableRender,
}: NotationPreviewCompatProps) {
  const hasLegacyNotation = Boolean(notation?.staves?.length)
  const hasLegacyNotes = Boolean(notes?.length)

  if (hasLegacyNotation && notation) {
    const previewItem = legacyNotationToCombinedPreviewItem(notation, {
      clef,
      keySignature,
      timeSignature,
      width,
    })

    if (!previewItem) return null

    return (
      <div className={`space-y-1.5 ${className}`}>
        <div onMouseDown={() => onLegacyStavePointerDown?.(0)}>
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
      <div className={className}>
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

  const directNotationDataItem = notationDataToPreviewItem(notationData, {
    clef,
    keySignature,
    timeSignature,
    width,
  })

  if (!directNotationDataItem) return null
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="space-y-0.5">
        <AlphaTabViewer
          tex={directNotationDataItem.tex}
          minHeight={minHeight}
          scale={scale}
          staveProfile="score"
          purpose="canvas-notation-score"
          layout="page"
          showTimeSignature={hasExplicitAlphaTexTimeSignature(directNotationDataItem.tex)}
          className="notation-container"
          onStableRender={onStableRender}
        />
        {showLabels && directNotationDataItem.label && (
          <div className="text-[11px] text-text3 italic px-2 -mt-1">
            {directNotationDataItem.label}
          </div>
        )}
      </div>
    </div>
  )
}
