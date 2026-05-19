export type CanvasToolbarAction =
  | 'move-up'
  | 'move-down'
  | 'duplicate'
  | 'delete'
  | 'edit-inline'
  | 'ai-rewrite'
  | 'edit-notation'
  | 'edit-tablature'
  | 'edit-chord'
  | 'edit-keyboard'
  | 'replace-image'

export type CanvasToolbarMode = 'selected' | 'editing'

export type CanvasToolbarPlacement = 'above' | 'below'

const INLINE_EDIT_BLOCK_TYPES = new Set(['text', 'title', 'subtitle', 'tip', 'exercise'])

export function canEnterInlineEdit(blockType: string): boolean {
  return INLINE_EDIT_BLOCK_TYPES.has(blockType)
}

export function shouldEnterInlineEditAfterInsert(blockType: string): boolean {
  return canEnterInlineEdit(blockType)
}

export function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName
  return tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"], .rich-text-editor'))
}

export function canDeleteSelectedBlock({
  selectedBlockId,
  inlineEditingBlockId,
  isTextInputTarget,
}: {
  selectedBlockId: string | null
  inlineEditingBlockId: string | null
  isTextInputTarget: boolean
}): boolean {
  return Boolean(selectedBlockId && !inlineEditingBlockId && !isTextInputTarget)
}

export type FloatingTextCanvasClickAction = 'select' | 'edit'

export type FloatingElementNudgeKeyLike = {
  key: string
  altKey?: boolean
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
}

export function getFloatingTextCanvasClickAction({
  clickCount,
  isEditing,
  isLocked,
  isSelected,
}: {
  clickCount: number
  isEditing: boolean
  isLocked: boolean
  isSelected: boolean
}): FloatingTextCanvasClickAction {
  if (isSelected && !isEditing && !isLocked) return 'edit'
  return 'select'
}

export function shouldNudgeFloatingElementFromKey(event: FloatingElementNudgeKeyLike): boolean {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) &&
    !event.ctrlKey &&
    !event.metaKey
}

export function getFloatingElementNudgeStep(event: FloatingElementNudgeKeyLike): number {
  if (event.altKey && event.shiftKey) return 5
  if (event.altKey) return 1
  if (event.shiftKey) return 1.5
  return 0.3
}

export function getInlineEditingBlockAfterCanvasBlockClick({
  inlineEditingBlockId,
  clickedBlockId,
}: {
  inlineEditingBlockId: string | null
  clickedBlockId: string
}): string | null {
  if (!inlineEditingBlockId) return null
  return inlineEditingBlockId === clickedBlockId ? inlineEditingBlockId : null
}

export function getCanvasToolbarMode({
  selectedBlockId,
  inlineEditingBlockId,
}: {
  selectedBlockId: string | null
  inlineEditingBlockId: string | null
}): CanvasToolbarMode | null {
  if (!selectedBlockId) return null
  return inlineEditingBlockId === selectedBlockId ? 'editing' : 'selected'
}

export function getCanvasToolbarPosition({
  blockTop,
  blockBottom,
  blockLeft,
  blockWidth,
  toolbarHeight = 36,
  viewportTop = 0,
  safeGap = 8,
}: {
  blockTop: number
  blockBottom: number
  blockLeft: number
  blockWidth: number
  toolbarHeight?: number
  viewportTop?: number
  safeGap?: number
}): { top: number; left: number; placement: CanvasToolbarPlacement } {
  const topAbove = blockTop - toolbarHeight - safeGap
  const left = blockLeft + blockWidth / 2

  if (topAbove < viewportTop + safeGap) {
    return {
      top: blockBottom + safeGap,
      left,
      placement: 'below',
    }
  }

  return {
    top: topAbove,
    left,
    placement: 'above',
  }
}

export function getCanvasToolbarActions(blockType: string): CanvasToolbarAction[] {
  const actions: CanvasToolbarAction[] = ['move-up', 'move-down', 'duplicate', 'delete']

  if (canEnterInlineEdit(blockType)) {
    actions.push('edit-inline', 'ai-rewrite')
  } else if (blockType === 'notation' || blockType === 'rhythm') {
    actions.push('edit-notation')
  } else if (blockType === 'tablature') {
    actions.push('edit-tablature')
  } else if (blockType === 'chord_diagram' || blockType === 'chord_grid') {
    actions.push('edit-chord')
  } else if (blockType === 'keyboard' || blockType === 'keyboard_grid') {
    actions.push('edit-keyboard')
  } else if (blockType === 'image') {
    actions.push('replace-image')
  }

  return actions
}
