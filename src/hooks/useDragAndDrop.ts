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
import { reorderBlocksById, type CanvasReorderPatch, type ReorderableBlock } from '@/lib/canvasBlockReorder'

type DropIndicatorPlacement = 'before' | 'after'

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
  const [overBlockId, setOverBlockId] = useState<string | null>(null)
  const activeBlockIdRef = useRef<string | null>(null)
  const overBlockIdRef = useRef<string | null>(null)
  const autoScrollRafRef = useRef<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const blockIds = useMemo(() => blocks.map(block => block.id), [blocks])

  const resetDragState = useCallback(() => {
    activeBlockIdRef.current = null
    overBlockIdRef.current = null
    if (autoScrollRafRef.current != null) {
      window.cancelAnimationFrame(autoScrollRafRef.current)
      autoScrollRafRef.current = null
    }
    setActiveBlockId(null)
    setOverBlockId(null)
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const blockId = String(event.active.id)
    activeBlockIdRef.current = blockId
    overBlockIdRef.current = blockId
    setActiveBlockId(blockId)
    setOverBlockId(blockId)
    setSelectedBlockId(blockId)
  }, [setSelectedBlockId])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const blockId = event.over ? String(event.over.id) : null
    overBlockIdRef.current = blockId
    setOverBlockId(blockId)
  }, [])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const pointerEvent = event.activatorEvent
    if (pointerEvent instanceof PointerEvent || pointerEvent instanceof MouseEvent) {
      const canvas = canvasScrollRef?.current
      if (!canvas) return
      const pointerY = pointerEvent.clientY + event.delta.y

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
  }, [canvasScrollRef])

  const handleDragCancel = useCallback((_event?: DragCancelEvent) => {
    resetDragState()
  }, [resetDragState])

  const commitReorder = useCallback(async (activeId: string, targetId: string | null) => {
    resetDragState()

    const result = reorderBlocksById(blocks, activeId, targetId)
    if (!result.changed || !result.patch) return

    setBlocksWithHistory(result.blocks, result.patch)
    setSelectedBlockId(activeId)

    try {
      await persistOrder(result.blocks.map(block => block.id))
    } catch (error: any) {
      onError(error?.message ?? 'Erro desconhecido')
      refetch()
    }
  }, [blocks, onError, persistOrder, refetch, resetDragState, setBlocksWithHistory, setSelectedBlockId])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const targetId = event.over ? String(event.over.id) : overBlockIdRef.current
    await commitReorder(activeId, targetId)
  }, [commitReorder])

  const getDropIndicator = useCallback((blockId: string): DropIndicatorPlacement | null => {
    if (!activeBlockId || !overBlockId || blockId !== overBlockId || activeBlockId === overBlockId) {
      return null
    }

    const activeIndex = blockIds.indexOf(activeBlockId)
    const overIndex = blockIds.indexOf(overBlockId)
    if (activeIndex < 0 || overIndex < 0) return null
    return activeIndex < overIndex ? 'after' : 'before'
  }, [activeBlockId, blockIds, overBlockId])

  useEffect(() => {
    if (!activeBlockId) return

    const handlePointerUpFallback = () => {
      window.setTimeout(() => {
        const activeId = activeBlockIdRef.current
        if (!activeId) return
        void commitReorder(activeId, overBlockIdRef.current)
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
