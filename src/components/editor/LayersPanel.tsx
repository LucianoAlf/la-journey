import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TextT, ImageSquare, Rectangle, Eye, EyeSlash,
  Lock, LockOpen, X, Sparkle,
} from '@phosphor-icons/react'
import type { FloatingElement } from '@/lib/floatingElements'

interface LayersPanelProps {
  elements: FloatingElement[]
  currentPageIndex: number
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, updates: Record<string, unknown>) => void
  onClose: () => void
}

export function LayersPanel({
  elements,
  currentPageIndex,
  selectedId,
  onSelect,
  onUpdate,
  onClose,
}: LayersPanelProps) {
  const pageElements = elements
    .filter((el) => el.pageIndex === currentPageIndex)
    .sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="border-t border-border pt-2 mt-2">
      <div className="flex items-center justify-between px-3 mb-2">
        <Label className="text-[11px] text-text3 uppercase tracking-wider">
          Camadas — Página {currentPageIndex + 1}
        </Label>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
          onClick={onClose}
        >
          <X size={12} />
        </Button>
      </div>

      <ScrollArea className="max-h-[300px]">
        <div className="space-y-0.5 px-2">
          {pageElements.map((el) => (
            <div
              key={el.id}
              className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors ${
                selectedId === el.id
                  ? 'bg-accent/10 border border-accent/20'
                  : 'hover:bg-card'
              }`}
              onClick={() => onSelect(el.id)}
            >
              {/* Ícone do tipo */}
              {el.type === 'floating_text' && <TextT size={12} className="text-text3 shrink-0" />}
              {el.type === 'floating_image' && <ImageSquare size={12} className="text-text3 shrink-0" />}
              {el.type === 'shape' && <Rectangle size={12} className="text-text3 shrink-0" />}
              {el.type === 'iconify_icon' && <Sparkle size={12} className="text-text3 shrink-0" />}

              {/* Nome */}
              <span className={`text-[11px] truncate flex-1 ${!el.visible ? 'text-text3/40 line-through' : 'text-text2'}`}>
                {el.name}
              </span>

              {/* Visibilidade */}
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdate(el.id, { visible: !el.visible })
                }}
              >
                {el.visible
                  ? <Eye size={12} className="text-text3" />
                  : <EyeSlash size={12} className="text-text3/40" />}
              </Button>

              {/* Lock */}
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdate(el.id, { locked: !el.locked })
                }}
              >
                {el.locked
                  ? <Lock size={10} className="text-dourado" />
                  : <LockOpen size={10} className="text-text3/30" />}
              </Button>
            </div>
          ))}

          {pageElements.length === 0 && (
            <p className="text-[10px] text-text3/50 text-center py-4">
              Nenhum elemento nesta página.
              <br />Use os botões acima para adicionar.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
