import { AlphaTexInlineRenderer } from './AlphaTexInlineRenderer'
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
          <AlphaTexInlineRenderer
            tex={previewItem.tex}
            width={previewItem.width}
            minHeight={minHeight}
            scale={scale}
            pointerEvents="none"
            systemPaddingBottom={0}
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
        <AlphaTexInlineRenderer
          tex={directNotationDataItem.tex}
          width={directNotationDataItem.width}
          minHeight={minHeight}
          scale={scale}
          pointerEvents="none"
          systemPaddingBottom={0}
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
