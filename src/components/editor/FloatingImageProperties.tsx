import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { FlipHorizontal, FlipVertical } from '@phosphor-icons/react'
import type { FloatingImage } from '@/lib/floatingElements'

interface FloatingImagePropertiesProps {
  element: FloatingImage
  onUpdate: (updates: Partial<FloatingImage>) => void
}

export function FloatingImageProperties({ element, onUpdate }: FloatingImagePropertiesProps) {
  return (
    <div className="space-y-3">
      <Label className="text-[10px] text-text3 uppercase tracking-wider">Imagem</Label>

      {/* Fit */}
      <div className="space-y-0.5">
        <Label className="text-[9px] text-text3">Ajuste</Label>
        <Select value={element.objectFit} onValueChange={(v) => onUpdate({ objectFit: v as FloatingImage['objectFit'] })}>
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Conter (sem cortar)</SelectItem>
            <SelectItem value="cover">Cobrir (pode cortar)</SelectItem>
            <SelectItem value="fill">Esticar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Arredondamento */}
      <div className="space-y-0.5">
        <Label className="text-[9px] text-text3">Arredondamento</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={50} step={1}
            value={element.borderRadius}
            onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })}
            className="flex-1 accent-accent h-1.5"
          />
          <span className="text-[9px] text-text3 w-7 font-mono">{element.borderRadius}px</span>
        </div>
      </div>

      <Separator />

      {/* Flip */}
      <div className="flex gap-1">
        <Button
          variant={element.flipX ? 'default' : 'ghost'}
          size="sm" className="flex-1 h-7 text-[10px] gap-1"
          onClick={() => onUpdate({ flipX: !element.flipX })}
        >
          <FlipHorizontal size={14} /> Espelhar H
        </Button>
        <Button
          variant={element.flipY ? 'default' : 'ghost'}
          size="sm" className="flex-1 h-7 text-[10px] gap-1"
          onClick={() => onUpdate({ flipY: !element.flipY })}
        >
          <FlipVertical size={14} /> Espelhar V
        </Button>
      </div>

      <Separator />

      {/* Sombra */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Switch checked={element.shadow.enabled}
            onCheckedChange={(c) => onUpdate({ shadow: { ...element.shadow, enabled: c } })}
          />
          <Label className="text-[11px]">Sombra</Label>
        </div>
        {element.shadow.enabled && (
          <div className="space-y-1.5 pl-2 border-l-2 border-accent/20">
            <div className="flex items-center gap-2">
              <Label className="text-[9px] text-text3 w-10">Blur</Label>
              <input type="range" min={0} max={30} step={1}
                value={element.shadow.blur}
                onChange={(e) => onUpdate({ shadow: { ...element.shadow, blur: Number(e.target.value) } })}
                className="flex-1 accent-accent h-1.5"
              />
              <span className="text-[9px] text-text3 w-5 font-mono">{element.shadow.blur}</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[9px] text-text3 w-10">Cor</Label>
              <input type="color"
                value={element.shadow.color.slice(0, 7)}
                onChange={(e) => onUpdate({ shadow: { ...element.shadow, color: e.target.value + '30' } })}
                className="w-6 h-6 rounded border border-border cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Borda */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Switch checked={element.border.enabled}
            onCheckedChange={(c) => onUpdate({ border: { ...element.border, enabled: c } })}
          />
          <Label className="text-[11px]">Borda</Label>
        </div>
        {element.border.enabled && (
          <div className="space-y-1.5 pl-2 border-l-2 border-accent/20">
            <div className="flex items-center gap-2">
              <input type="color"
                value={element.border.color}
                onChange={(e) => onUpdate({ border: { ...element.border, color: e.target.value } })}
                className="w-6 h-6 rounded border border-border cursor-pointer"
              />
              <input type="range" min={1} max={6} step={1}
                value={element.border.width}
                onChange={(e) => onUpdate({ border: { ...element.border, width: Number(e.target.value) } })}
                className="flex-1 accent-accent h-1.5"
              />
              <span className="text-[9px] text-text3 w-5 font-mono">{element.border.width}px</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
