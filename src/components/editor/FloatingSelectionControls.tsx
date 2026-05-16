import type { MouseEvent } from 'react'
import {
  ArrowFatDown,
  ArrowFatUp,
  ArrowsClockwise,
  Copy,
  DotsThree,
  Lock,
  LockOpen,
  Rows,
  Trash,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FloatingElement } from '@/lib/floatingElements'
import {
  formatFloatingRotationForDisplay,
  shouldShowFloatingSelectionFrame,
  type FloatingResizeHandle,
} from '@/lib/floatingElementTransform'

interface FloatingSelectionControlsProps {
  element: FloatingElement
  isRotating?: boolean
  onBringForward: () => void
  onDelete: () => void
  onDuplicate: () => void
  onOpenLayers: () => void
  onResetRotation: () => void
  onResizeStart: (event: MouseEvent<HTMLButtonElement>, handle: FloatingResizeHandle) => void
  onRotateStart: (event: MouseEvent<HTMLButtonElement>) => void
  onSendBackward: () => void
  onToggleLock: () => void
  rotationPreview?: number | null
}

const HANDLE_POSITIONS: Array<{
  handle: FloatingResizeHandle
  className: string
  kind: 'corner' | 'side-x' | 'side-y'
}> = [
  { handle: 'nw', className: '-left-1.5 -top-1.5', kind: 'corner' },
  { handle: 'n', className: 'left-1/2 -top-1 -translate-x-1/2', kind: 'side-y' },
  { handle: 'ne', className: '-right-1.5 -top-1.5', kind: 'corner' },
  { handle: 'e', className: '-right-1 top-1/2 -translate-y-1/2', kind: 'side-x' },
  { handle: 'se', className: '-bottom-1.5 -right-1.5', kind: 'corner' },
  { handle: 's', className: 'left-1/2 -bottom-1 -translate-x-1/2', kind: 'side-y' },
  { handle: 'sw', className: '-bottom-1.5 -left-1.5', kind: 'corner' },
  { handle: 'w', className: '-left-1 top-1/2 -translate-y-1/2', kind: 'side-x' },
]

const HANDLE_LOCAL_ANGLE: Record<FloatingResizeHandle, number> = {
  e: 0,
  w: 0,
  n: 90,
  s: 90,
  nw: 45,
  se: 45,
  ne: 135,
  sw: 135,
}

function getResizeCursor(handle: FloatingResizeHandle, rotation: number) {
  const angle = (((HANDLE_LOCAL_ANGLE[handle] + rotation) % 180) + 180) % 180
  if (angle < 22.5 || angle >= 157.5) return 'ew-resize'
  if (angle < 67.5) return 'nwse-resize'
  if (angle < 112.5) return 'ns-resize'
  return 'nesw-resize'
}

function getHandleClass(kind: 'corner' | 'side-x' | 'side-y') {
  if (kind === 'corner') {
    return 'h-3.5 w-3.5 rounded-full border-2 border-[#a78bfa] bg-white shadow-sm'
  }
  if (kind === 'side-x') {
    return 'h-8 w-2.5 rounded-full border border-[#a78bfa] bg-white shadow-sm'
  }
  return 'h-2.5 w-8 rounded-full border border-[#a78bfa] bg-white shadow-sm'
}

function stopThen(action: () => void) {
  return (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    action()
  }
}

export function FloatingSelectionControls({
  element,
  isRotating = false,
  onBringForward,
  onDelete,
  onDuplicate,
  onOpenLayers,
  onResetRotation,
  onResizeStart,
  onRotateStart,
  onSendBackward,
  onToggleLock,
  rotationPreview,
}: FloatingSelectionControlsProps) {
  const showSelectionFrame = shouldShowFloatingSelectionFrame({ isRotating })

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]">
      {showSelectionFrame && (
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${element.rotation}deg)` }}
        >
          <div className="absolute inset-0 rounded-[2px] border-2 border-[#7c3aed]" />

          {!element.locked && HANDLE_POSITIONS.map(({ handle, className, kind }) => (
            <button
              key={handle}
              type="button"
              aria-label={`Redimensionar ${handle}`}
              className={`pointer-events-auto absolute transition-transform hover:scale-110 ${getHandleClass(kind)} ${className}`}
              style={{ cursor: getResizeCursor(handle, element.rotation) }}
              onMouseDown={(event) => onResizeStart(event, handle)}
            />
          ))}

          {!element.locked && (
            <button
              type="button"
              aria-label="Rotacionar elemento"
              className="pointer-events-auto absolute left-1/2 top-full mt-8 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-white shadow-lg"
              style={{ transform: `translateX(-50%) rotate(${-element.rotation}deg)` }}
              onMouseDown={onRotateStart}
            >
              <ArrowsClockwise size={15} />
            </button>
          )}
        </div>
      )}

      {showSelectionFrame && (
        <div
          className="pointer-events-auto absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[calc(100%+12px)] items-center gap-1 rounded-full border border-border bg-white px-2 py-1 shadow-lg"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Resetar rotação" onClick={stopThen(onResetRotation)}>
            <ArrowsClockwise size={14} />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={element.locked ? 'Desbloquear' : 'Bloquear'} onMouseDown={(event) => event.stopPropagation()} onClick={stopThen(onToggleLock)}>
            {element.locked ? <Lock size={14} /> : <LockOpen size={14} />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Duplicar" onMouseDown={(event) => event.stopPropagation()} onClick={stopThen(onDuplicate)}>
            <Copy size={14} />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-text3 hover:text-vermelho" title="Excluir" onMouseDown={(event) => event.stopPropagation()} onClick={stopThen(onDelete)}>
            <Trash size={14} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Mais ações" onMouseDown={(event) => event.stopPropagation()}>
                <DotsThree size={16} weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44">
              <DropdownMenuItem onClick={onBringForward} className="gap-2 text-[12px]">
                <ArrowFatUp size={14} /> Trazer para frente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendBackward} className="gap-2 text-[12px]">
                <ArrowFatDown size={14} /> Enviar para trás
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenLayers} className="gap-2 text-[12px]">
                <Rows size={14} /> Camadas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {isRotating && rotationPreview != null && (
        <div className="absolute left-full top-1/2 ml-5 -translate-y-1/2 rounded-md bg-neutral-900 px-2 py-1 text-[12px] font-semibold text-white shadow-lg">
          {formatFloatingRotationForDisplay(rotationPreview)}°
        </div>
      )}
    </div>
  )
}
