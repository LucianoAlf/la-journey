import { memo, type ReactNode } from 'react'
import { DotsSixVertical } from '@phosphor-icons/react'
import { useSortableCanvasBlock } from '@/hooks/useDragAndDrop'

type DropIndicatorPlacement = 'before' | 'after'

interface SortableCanvasBlockProps {
  blockId: string
  children: ReactNode
  disabled?: boolean
  dropIndicator?: DropIndicatorPlacement | null
  showHandle?: boolean
}

export const SortableCanvasBlock = memo(function SortableCanvasBlock({
  blockId,
  children,
  disabled = false,
  dropIndicator = null,
  showHandle = false,
}: SortableCanvasBlockProps) {
  const { attributes, listeners, setNodeRef, style, isDragging } = useSortableCanvasBlock(blockId, disabled)

  return (
    <div
      ref={setNodeRef}
      className={`canvas-sortable-block ${isDragging ? 'canvas-sortable-block--dragging' : ''}`}
      data-canvas-sortable-block-id={blockId}
      style={style}
    >
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
    </div>
  )
})
