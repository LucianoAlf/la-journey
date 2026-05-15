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
import type { FloatingResizeHandle } from '@/lib/floatingElementTransform'

interface FloatingSelectionControlsProps {
  element: FloatingElement
  onBringForward: () => void
  onDelete: () => void
  onDuplicate: () => void
  onOpenLayers: () => void
  onResetRotation: () => void
  onResizeStart: (event: MouseEvent<HTMLButtonElement>, handle: FloatingResizeHandle) => void
  onRotateStart: (event: MouseEvent<HTMLButtonElement>) => void
  onSendBackward: () => void
  onToggleLock: () => void
}

const HANDLE_POSITIONS: Array<{
  handle: FloatingResizeHandle
  className: string
  cursor: string
}> = [
  { handle: 'nw', className: '-left-1.5 -top-1.5', cursor: 'nwse-resize' },
  { handle: 'n', className: 'left-1/2 -top-1.5 -translate-x-1/2', cursor: 'ns-resize' },
  { handle: 'ne', className: '-right-1.5 -top-1.5', cursor: 'nesw-resize' },
  { handle: 'e', className: '-right-1.5 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { handle: 'se', className: '-bottom-1.5 -right-1.5', cursor: 'nwse-resize' },
  { handle: 's', className: 'left-1/2 -bottom-1.5 -translate-x-1/2', cursor: 'ns-resize' },
  { handle: 'sw', className: '-bottom-1.5 -left-1.5', cursor: 'nesw-resize' },
  { handle: 'w', className: '-left-1.5 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
]

function stopThen(action: () => void) {
  return (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    action()
  }
}

export function FloatingSelectionControls({
  element,
  onBringForward,
  onDelete,
  onDuplicate,
  onOpenLayers,
  onResetRotation,
  onResizeStart,
  onRotateStart,
  onSendBackward,
  onToggleLock,
}: FloatingSelectionControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2]">
      <div className="absolute inset-0 rounded-[2px] border-2 border-[#7c3aed]" />

      <div
        className="pointer-events-auto absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[calc(100%+12px)] items-center gap-1 rounded-full border border-border bg-white px-2 py-1 shadow-lg"
        style={{ transform: `translateX(-50%) translateY(calc(-100% - 12px)) rotate(${-element.rotation}deg)` }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Resetar rotação" onClick={stopThen(onResetRotation)}>
          <ArrowsClockwise size={14} />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={element.locked ? 'Desbloquear' : 'Bloquear'} onClick={stopThen(onToggleLock)}>
          {element.locked ? <Lock size={14} /> : <LockOpen size={14} />}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Duplicar" onClick={stopThen(onDuplicate)}>
          <Copy size={14} />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-text3 hover:text-vermelho" title="Excluir" onClick={stopThen(onDelete)}>
          <Trash size={14} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Mais ações">
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

      {!element.locked && HANDLE_POSITIONS.map(({ handle, className, cursor }) => (
        <button
          key={handle}
          type="button"
          aria-label={`Redimensionar ${handle}`}
          className={`pointer-events-auto absolute h-3 w-3 rounded-full border border-[#a78bfa] bg-white shadow-sm ${className}`}
          style={{ cursor }}
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
  )
}
