import type { ReactNode } from 'react'
import { handleBlockClick, handleBlockDoubleClick, type EditableBlockComponentProps } from './types'

interface BlockFrameProps extends EditableBlockComponentProps {
  isEditing?: boolean
  children: ReactNode
}

export function BlockFrame({
  block,
  mode,
  style,
  blockRef,
  onSelect,
  onPrimaryAction,
  isEditing = false,
  children,
}: BlockFrameProps) {
  const isSelected = mode === 'selected' || mode === 'editing'

  return (
    <div
      data-block-id={block.id}
      data-block-type={block.block_type}
      data-editable-block-mode={mode}
      ref={blockRef}
      className={`canvas-block ${isSelected ? 'selected' : ''} ${isEditing ? 'inline-editing' : ''}`}
      style={style}
      onClick={event => handleBlockClick(event, block, onSelect)}
      onDoubleClick={event => handleBlockDoubleClick(event, block, onPrimaryAction)}
    >
      {children}
    </div>
  )
}
