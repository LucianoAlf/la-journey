import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'
import type { FloatingIcon } from '@/lib/floatingElements'
import { ICONIFY_ELEMENT_OPTIONS, registerIconifyElementIcons } from '@/lib/iconifyElementCatalog'

registerIconifyElementIcons()

interface FloatingIconPropertiesProps {
  element: FloatingIcon
  onUpdate: (updates: Partial<FloatingIcon>) => void
}

const QUICK_ICON_COLORS = [
  '#1e3a5f', '#111827', '#e11d48', '#f59e0b', '#0f766e', '#7c3aed',
]

export function FloatingIconProperties({ element, onUpdate }: FloatingIconPropertiesProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] text-text3 uppercase tracking-wider">Icone</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {ICONIFY_ELEMENT_OPTIONS.map((option) => (
            <Button
              key={option.icon}
              variant={element.icon === option.icon ? 'default' : 'ghost'}
              size="sm"
              className="h-11 flex flex-col gap-0.5 px-1"
              onClick={() => onUpdate({ icon: option.icon, name: option.label })}
              title={`${option.label} (${option.collection})`}
            >
              <Icon icon={option.icon} className="h-4 w-4" aria-hidden="true" />
              <span className="max-w-full truncate text-[8px]">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-0.5">
        <Label className="text-[9px] text-text3">Cor</Label>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={element.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-6 h-6 rounded border border-border cursor-pointer"
          />
          {QUICK_ICON_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onUpdate({ color })}
              className={`w-4 h-4 rounded-full border transition-all ${element.color === color ? 'ring-2 ring-accent ring-offset-1' : 'border-border/50'}`}
              style={{ backgroundColor: color }}
              aria-label={`Usar cor ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-0.5">
        <Label className="text-[9px] text-text3">Espessura do traço</Label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={4}
            step={0.25}
            value={element.strokeWidth ?? 2}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
            className="flex-1 accent-accent h-1.5"
          />
          <span className="text-[9px] text-text3 w-8 font-mono">{element.strokeWidth ?? 2}px</span>
        </div>
      </div>
    </div>
  )
}
