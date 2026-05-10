import { forwardRef, memo, type ReactNode, type WheelEvent } from 'react'

interface EditorCanvasProps {
  children: ReactNode
  onCanvasClick: () => void
  onCanvasWheel: (event: WheelEvent<HTMLDivElement>) => void
}

export const EditorCanvas = memo(forwardRef<HTMLDivElement, EditorCanvasProps>(function EditorCanvas({
  children,
  onCanvasClick,
  onCanvasWheel,
}, ref) {
  return (
    <div
      ref={ref}
      className="editor-canvas relative"
      onClick={onCanvasClick}
      onWheel={onCanvasWheel}
    >
      {children}
    </div>
  )
}))
