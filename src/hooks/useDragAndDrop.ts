import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getDropInsertIndexFromDropZone,
  getDropInsertIndexByPointerY,
  reorderBlocksById,
  reorderBlocksByInsertIndex,
  type CanvasReorderPatch,
  type ReorderableBlock,
} from '@/lib/canvasBlockReorder'

type DropIndicatorPlacement = 'before' | 'after'
type DropIndicatorState = { blockId: string; placement: DropIndicatorPlacement } | null

type UseDragAndDropParams<TBlock extends ReorderableBlock> = {
  blocks: TBlock[]
  canvasScrollRef?: RefObject<HTMLDivElement | null>
  persistOrder: (blockIds: string[]) => Promise<unknown>
  refetch: () => void
  setBlocksWithHistory: (
    updater: TBlock[] | ((prev: TBlock[]) => TBlock[]),
    action?: CanvasReorderPatch,
  ) => void
  setSelectedBlockId: (blockId: string | null) => void
  onError: (message: string) => void
}

function getCanvasDropLayouts(blockIds: string[], canvas: HTMLDivElement | null) {
  if (!canvas) return []
  const indexById = new Map(blockIds.map((id, index) => [id, index]))

  return Array.from(canvas.querySelectorAll<HTMLElement>('[data-canvas-sortable-block-id]'))
    .map(element => {
      const id = element.dataset.canvasSortableBlockId
      const index = id ? indexById.get(id) : undefined
      if (!id || index == null) return null
      const rect = element.getBoundingClientRect()
      return { id, index, top: rect.top, bottom: rect.bottom }
    })
    .filter((layout): layout is { id: string; index: number; top: number; bottom: number } => Boolean(layout))
}

function getDropIndicatorForInsertIndex(
  blockIds: string[],
  activeId: string,
  insertIndex: number | null,
  visibleLayouts: Array<{ id: string; index: number }>,
): DropIndicatorState {
  if (insertIndex == null) return null

  const activeIndex = blockIds.indexOf(activeId)
  if (activeIndex < 0 || insertIndex === activeIndex || insertIndex === activeIndex + 1) {
    return null
  }

  const nextVisible = visibleLayouts.find(layout => layout.index >= insertIndex)
  if (nextVisible) {
    return { blockId: nextVisible.id, placement: 'before' }
  }

  const previousVisible = [...visibleLayouts].reverse().find(layout => layout.index < insertIndex)
  if (previousVisible) {
    return { blockId: previousVisible.id, placement: 'after' }
  }

  return null
}

function getFallbackInsertIndexFromTarget(blockIds: string[], activeId: string, targetId: string | null) {
  const dropZoneInsertIndex = getDropInsertIndexFromDropZone(blockIds, targetId)
  if (dropZoneInsertIndex != null) return dropZoneInsertIndex

  if (!targetId) return null
  const activeIndex = blockIds.indexOf(activeId)
  const targetIndex = blockIds.indexOf(targetId)
  if (activeIndex < 0 || targetIndex < 0) return null
  if (activeIndex === targetIndex) return activeIndex
  return activeIndex < targetIndex ? targetIndex + 1 : targetIndex
}

function resolveCanvasDropState(
  blockIds: string[],
  canvas: HTMLDivElement | null,
  activeId: string,
  fallbackTargetId: string | null,
  pointerY: number | null,
) {
  const layouts = getCanvasDropLayouts(blockIds, canvas)
  const insertIndex = layouts.length > 0 && pointerY != null
    ? getDropInsertIndexByPointerY(layouts, pointerY)
    : getFallbackInsertIndexFromTarget(blockIds, activeId, fallbackTargetId)

  return {
    insertIndex,
    indicator: getDropIndicatorForInsertIndex(blockIds, activeId, insertIndex, layouts),
  }
}

export function useDragAndDrop<TBlock extends ReorderableBlock>({
  blocks,
  canvasScrollRef,
  persistOrder,
  refetch,
  setBlocksWithHistory,
  setSelectedBlockId,
  onError,
}: UseDragAndDropParams<TBlock>) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState>(null)
  const activeBlockIdRef = useRef<string | null>(null)
  const overBlockIdRef = useRef<string | null>(null)
  const dropInsertIndexRef = useRef<number | null>(null)
  const lastPointerYRef = useRef<number | null>(null)
  const autoScrollRafRef = useRef<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const blockIds = useMemo(() => blocks.map(block => block.id), [blocks])

  const resetDragState = useCallback(() => {
    activeBlockIdRef.current = null
    overBlockIdRef.current = null
    dropInsertIndexRef.current = null
    lastPointerYRef.current = null
    if (autoScrollRafRef.current != null) {
      window.cancelAnimationFrame(autoScrollRafRef.current)
      autoScrollRafRef.current = null
    }
    setActiveBlockId(null)
    setDropIndicator(null)
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const blockId = String(event.active.id)
    activeBlockIdRef.current = blockId
    overBlockIdRef.current = blockId
    dropInsertIndexRef.current = blockIds.indexOf(blockId)
    setActiveBlockId(blockId)
    setDropIndicator(null)
  }, [blockIds])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const blockId = event.over ? String(event.over.id) : null
    overBlockIdRef.current = blockId
    const activeId = activeBlockIdRef.current
    if (!activeId) return

    const insertIndex = getFallbackInsertIndexFromTarget(blockIds, activeId, blockId)
    const indicator = getDropIndicatorForInsertIndex(
      blockIds,
      activeId,
      insertIndex,
      getCanvasDropLayouts(blockIds, canvasScrollRef?.current ?? null),
    )
    dropInsertIndexRef.current = insertIndex
    setDropIndicator(indicator)
  }, [blockIds, canvasScrollRef])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const pointerEvent = event.activatorEvent
    if (pointerEvent instanceof PointerEvent || pointerEvent instanceof MouseEvent) {
      const canvas = canvasScrollRef?.current
      if (!canvas) return
      const pointerY = pointerEvent.clientY + event.delta.y
      lastPointerYRef.current = pointerY

      const dropState = resolveCanvasDropState(blockIds, canvas, String(event.active.id), event.over ? String(event.over.id) : null, pointerY)
      dropInsertIndexRef.current = dropState.insertIndex
      if (dropState.indicator?.blockId) overBlockIdRef.current = dropState.indicator.blockId
      setDropIndicator(dropState.indicator)

      if (autoScrollRafRef.current != null) {
        window.cancelAnimationFrame(autoScrollRafRef.current)
      }

      autoScrollRafRef.current = window.requestAnimationFrame(() => {
        autoScrollRafRef.current = null
        const rect = canvas.getBoundingClientRect()
        const edgeSize = Math.min(96, Math.max(56, rect.height * 0.12))
        const distanceToBottom = rect.bottom - pointerY
        const distanceToTop = pointerY - rect.top

        if (distanceToBottom < edgeSize) {
          canvas.scrollBy({ top: Math.max(18, edgeSize - distanceToBottom), behavior: 'smooth' })
        } else if (distanceToTop < edgeSize) {
          canvas.scrollBy({ top: -Math.max(18, edgeSize - distanceToTop), behavior: 'smooth' })
        }
      })
    }
  }, [blockIds, canvasScrollRef])

  const handleDragCancel = useCallback((_event?: DragCancelEvent) => {
    resetDragState()
  }, [resetDragState])

  const commitReorder = useCallback(async (activeId: string, targetId: string | null, insertIndex: number | null = null) => {
    resetDragState()

    const result = insertIndex == null
      ? reorderBlocksById(blocks, activeId, targetId)
      : reorderBlocksByInsertIndex(blocks, activeId, insertIndex)
    if (!result.changed || !result.patch) return

    setBlocksWithHistory(result.blocks, result.patch)
    setSelectedBlockId(activeId)

    try {
      if (import.meta.env.DEV) {
        console.log('[DnD] calling reorderMaterialBlocks', {
          fromIndex: result.patch.fromIndex,
          toIndex: result.patch.toIndex,
        })
      }
      const persistResult = await persistOrder(result.blocks.map(block => block.id))
      if (import.meta.env.DEV) {
        console.log('[DnD] reorderMaterialBlocks result', persistResult)
      }
      if (persistResult === false) {
        throw new Error('Banco nao confirmou a reordenacao')
      }
    } catch (error: any) {
      onError(error?.message ?? 'Erro desconhecido')
      refetch()
    }
  }, [blocks, onError, persistOrder, refetch, resetDragState, setBlocksWithHistory, setSelectedBlockId])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (import.meta.env.DEV) {
      console.log('[DnD] onDragEnd called', { active: event.active, over: event.over })
    }
    const activeId = String(event.active.id)
    const dndTargetId = event.over ? String(event.over.id) : overBlockIdRef.current
    if (activeId === dndTargetId && dropInsertIndexRef.current == null) return
    const dropState = resolveCanvasDropState(
      blockIds,
      canvasScrollRef?.current ?? null,
      activeId,
      dndTargetId,
      lastPointerYRef.current,
    )
    await commitReorder(activeId, dndTargetId, dropState.insertIndex)
  }, [blockIds, canvasScrollRef, commitReorder])

  const getDropIndicator = useCallback((blockId: string): DropIndicatorPlacement | null => {
    if (!activeBlockId || dropIndicator?.blockId !== blockId) return null
    return dropIndicator.placement
  }, [activeBlockId, dropIndicator])

  useEffect(() => {
    if (!activeBlockId) return

    const handlePointerUpFallback = () => {
      window.setTimeout(() => {
        const activeId = activeBlockIdRef.current
        if (!activeId) return
        void commitReorder(activeId, overBlockIdRef.current, dropInsertIndexRef.current)
      }, 0)
    }

    window.addEventListener('pointerup', handlePointerUpFallback, true)
    return () => window.removeEventListener('pointerup', handlePointerUpFallback, true)
  }, [activeBlockId, commitReorder])

  return {
    activeBlockId,
    collisionDetection: closestCenter,
    getDropIndicator,
    handleDragCancel,
    handleDragEnd,
    handleDragMove,
    handleDragOver,
    handleDragStart,
    sensors,
  }
}

export function useSortableCanvasBlock(blockId: string, disabled = false) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: blockId,
    disabled,
  })

  return {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
    },
  }
}
