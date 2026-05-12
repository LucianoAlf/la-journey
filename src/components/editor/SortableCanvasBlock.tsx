import { memo, type ReactNode } from 'react'
import { DotsSixVertical } from '@phosphor-icons/react'
import { useDroppable } from '@dnd-kit/core'
import { useSortableCanvasBlock } from '@/hooks/useDragAndDrop'
import { createCanvasDropZoneId, type CanvasDropPlacement } from '@/lib/canvasBlockReorder'

type DropIndicatorPlacement = 'before' | 'after'

interface SortableCanvasBlockProps {
  blockId: string
  children: ReactNode
  activeBlockId?: string | null
  disabled?: boolean
  dropIndicator?: DropIndicatorPlacement | null
  showHandle?: boolean
}

function CanvasDropZone({
  blockId,
  disabled,
  placement,
}: {
  blockId: string
  disabled: boolean
  placement: CanvasDropPlacement
}) {
  const { setNodeRef } = useDroppable({
    id: createCanvasDropZoneId(blockId, placement),
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      className={`canvas-drop-zone canvas-drop-zone--${placement}`}
      aria-hidden="true"
    />
  )
}

export const SortableCanvasBlock = memo(function SortableCanvasBlock({
  blockId,
  children,
  activeBlockId = null,
  disabled = false,
  dropIndicator = null,
  showHandle = false,
}: SortableCanvasBlockProps) {
  const { attributes, listeners, setNodeRef, style, isDragging } = useSortableCanvasBlock(blockId, disabled)
  const dropZoneDisabled = disabled || activeBlockId === blockId

  return (
    <div
      ref={setNodeRef}
      className={`canvas-sortable-block ${isDragging ? 'canvas-sortable-block--dragging' : ''}`}
      data-canvas-sortable-block-id={blockId}
      style={style}
    >
      <CanvasDropZone blockId={blockId} disabled={dropZoneDisabled} placement="before" />
      {dropIndicator === 'before' && <div className="canvas-drop-indicator" aria-hidden="true" />}
      {showHandle && !disabled && (
        <button
          type="button"
          className="canvas-drag-handle"
          aria-label="Arrastar bloco"
          title="Arrastar bloco"
          onClick={event => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical size={18} weight="bold" />
        </button>
      )}
      {children}
      {dropIndicator === 'after' && <div className="canvas-drop-indicator canvas-drop-indicator--after" aria-hidden="true" />}
      <CanvasDropZone blockId={blockId} disabled={dropZoneDisabled} placement="after" />
    </div>
  )
})
