import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import type { AIActionType } from '@/components/editor/RichTextEditor'

export type EditableBlockMode = 'idle' | 'selected' | 'editing'

export interface EditableBlockData {
  id: string
  block_type: string
  title?: string | null
  content?: Record<string, unknown> | null
  render_data?: unknown
}

export interface EditableBlockComponentProps {
  block: EditableBlockData
  mode: EditableBlockMode
  style?: CSSProperties
  blockRef?: (element: HTMLDivElement | null) => void
  focusPoint?: { x: number; y: number } | null
  renderPreview: () => ReactNode
  onSelect: (blockId: string) => void
  onPrimaryAction: (block: EditableBlockData, focusPoint: { x: number; y: number } | null) => void
  onExitInlineEdit: () => void
  onTitleChange: (blockId: string, title: string) => void
  onContentChange: (blockId: string, html: string) => void
  onAIAction?: (selectedText: string, action: AIActionType) => Promise<string | null>
}

export function stableSerialize(value: unknown): string {
  try {
    return JSON.stringify(value ?? null)
  } catch {
    return String(value ?? '')
  }
}

export function simpleHash(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

export function getEditableBlockHash(block: EditableBlockData) {
  return simpleHash(stableSerialize({
    type: block.block_type,
    title: block.title,
    content: block.content,
    renderData: block.render_data,
  }))
}

export function areEditableBlockComponentPropsEqual(
  prev: EditableBlockComponentProps,
  next: EditableBlockComponentProps,
) {
  return (
    prev.block.id === next.block.id &&
    getEditableBlockHash(prev.block) === getEditableBlockHash(next.block) &&
    prev.mode === next.mode &&
    prev.focusPoint?.x === next.focusPoint?.x &&
    prev.focusPoint?.y === next.focusPoint?.y
  )
}

export function handleBlockClick(
  event: MouseEvent<HTMLDivElement>,
  block: EditableBlockData,
  onSelect: (blockId: string) => void,
) {
  event.stopPropagation()
  onSelect(block.id)
}

export function handleBlockDoubleClick(
  event: MouseEvent<HTMLDivElement>,
  block: EditableBlockData,
  onPrimaryAction: (block: EditableBlockData, focusPoint: { x: number; y: number } | null) => void,
) {
  event.stopPropagation()
  onPrimaryAction(block, { x: event.clientX, y: event.clientY })
}

export function getBlockHtml(block: EditableBlockData) {
  const content = block.content ?? {}
  return String(content.html ?? content.text ?? '')
}

export function getPlaceholder(blockType: string) {
  if (blockType === 'title') return 'Titulo'
  if (blockType === 'subtitle') return 'Subtitulo'
  if (blockType === 'tip') return 'Digite a dica...'
  if (blockType === 'exercise') return 'Digite o exercicio...'
  return 'Clique para editar...'
}
