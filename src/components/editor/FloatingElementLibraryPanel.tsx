import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { Hash, Image as ImageIcon, Rows, TextT } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { FloatingShapeKind } from '@/lib/floatingElements'
import { ICONIFY_ELEMENT_OPTIONS, registerIconifyElementIcons } from '@/lib/iconifyElementCatalog'

registerIconifyElementIcons()

interface FloatingElementLibraryPanelProps {
  layersPanel?: ReactNode
  title?: string
  layersLabel?: string
  onAddIcon: (icon: string, label: string) => void
  onAddShape: (shape: FloatingShapeKind) => void
  onAddText: () => void
  onOpenImagePicker: () => void
  onToggleLayers: () => void
}

const SHAPE_OPTIONS: Array<{ shape: FloatingShapeKind; label: string }> = [
  { shape: 'rectangle', label: 'Retângulo' },
  { shape: 'circle', label: 'Círculo' },
  { shape: 'line', label: 'Linha' },
  { shape: 'arrow', label: 'Seta' },
  { shape: 'star', label: 'Estrela' },
  { shape: 'callout', label: 'Callout' },
]

export function FloatingElementLibraryPanel({
  layersPanel,
  title = 'Elementos livres do material',
  layersLabel = 'Camadas',
  onAddIcon,
  onAddShape,
  onAddText,
  onOpenImagePicker,
  onToggleLayers,
}: FloatingElementLibraryPanelProps) {
  return (
    <div className="space-y-3 rounded-[var(--radius-sm)] border border-border bg-card/60 p-2.5">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-medium uppercase tracking-wider text-text3">
          {title}
        </label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={onToggleLayers}
        >
          <Rows size={12} className="mr-1" /> {layersLabel}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Button variant="outline" size="sm" className="h-8 px-2 text-[10px]" onClick={onAddText}>
          <TextT size={13} className="mr-1" /> Texto
        </Button>
        <Button variant="outline" size="sm" className="h-8 px-2 text-[10px]" onClick={onOpenImagePicker}>
          <ImageIcon size={13} className="mr-1" /> Imagem
        </Button>
        <Button variant="outline" size="sm" className="h-8 px-2 text-[10px]" onClick={() => onAddShape('rectangle')}>
          <Hash size={13} className="mr-1" /> Forma
        </Button>
      </div>

      <div className="space-y-1.5">
        <span className="block px-1 text-[10px] uppercase tracking-wider text-text3">Formas básicas</span>
        <div className="grid grid-cols-3 gap-1.5">
          {SHAPE_OPTIONS.map((item) => (
            <Button
              key={item.shape}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => onAddShape(item.shape)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-wider text-text3">Ícones</span>
          <span className="text-[9px] text-text3">Iconify</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {ICONIFY_ELEMENT_OPTIONS.map((option) => (
            <TooltipProvider key={option.icon}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-1"
                    onClick={() => onAddIcon(option.icon, option.label)}
                  >
                    <Icon icon={option.icon} className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{option.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{option.label} ({option.collection})</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {layersPanel}
    </div>
  )
}
