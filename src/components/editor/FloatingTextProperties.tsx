import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  TextAlignLeft, TextAlignCenter, TextAlignRight, TextItalic, TextT,
} from '@phosphor-icons/react'
import type { FloatingText } from '@/lib/floatingElements'
import { COVER_FONTS } from '@/components/material/MaterialPreview'

interface FloatingTextPropertiesProps {
  element: FloatingText
  onUpdate: (updates: Partial<FloatingText>) => void
}

const QUICK_COLORS = [
  '#1e293b', '#ffffff', '#dc2626', '#ea580c', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
]

export function FloatingTextProperties({ element, onUpdate }: FloatingTextPropertiesProps) {
  return (
    <div className="space-y-3">
      <Label className="text-[10px] text-text3 uppercase tracking-wider flex items-center gap-1">
        <TextT size={12} /> Tipografia
      </Label>

      {/* Fonte */}
      <div className="space-y-1">
        <Label className="text-[9px] text-text3">Fonte</Label>
        <Select value={element.fontFamily} onValueChange={(v) => onUpdate({ fontFamily: v })}>
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COVER_FONTS.map(f => (
              <SelectItem key={f.value} value={f.value}>
                <span style={{ fontFamily: `'${f.value}', sans-serif` }}>{f.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tamanho e Peso */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[9px] text-text3">Tamanho</Label>
          <div className="flex items-center gap-1">
            <input type="range" min={10} max={120} step={1}
              value={element.fontSize}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
              className="flex-1 accent-accent h-1.5"
            />
            <span className="text-[9px] text-text3 w-6 font-mono text-right">{element.fontSize}</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <Label className="text-[9px] text-text3">Peso</Label>
          <Select value={String(element.fontWeight)} onValueChange={(v) => onUpdate({ fontWeight: Number(v) })}>
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="300">Light</SelectItem>
              <SelectItem value="400">Normal</SelectItem>
              <SelectItem value="600">Semi-bold</SelectItem>
              <SelectItem value="700">Bold</SelectItem>
              <SelectItem value="900">Black</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cor */}
      <div className="space-y-0.5">
        <Label className="text-[9px] text-text3">Cor do texto</Label>
        <div className="flex items-center gap-1.5">
          <input type="color"
            value={element.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-6 h-6 rounded border border-border cursor-pointer"
          />
          {QUICK_COLORS.map(c => (
            <button key={c}
              onClick={() => onUpdate({ color: c })}
              className={`w-4 h-4 rounded-full border transition-all ${element.color === c ? 'ring-2 ring-accent ring-offset-1' : 'border-border/50'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Alinhamento */}
      <div className="flex gap-1">
        {([
          { value: 'left' as const, icon: <TextAlignLeft size={14} /> },
          { value: 'center' as const, icon: <TextAlignCenter size={14} /> },
          { value: 'right' as const, icon: <TextAlignRight size={14} /> },
        ]).map(a => (
          <Button key={a.value}
            variant={element.align === a.value ? 'default' : 'ghost'}
            size="sm" className="h-7 flex-1"
            onClick={() => onUpdate({ align: a.value })}
          >
            {a.icon}
          </Button>
        ))}
      </div>

      {/* Uppercase */}
      <div className="flex items-center gap-2">
        <Switch checked={element.uppercase}
          onCheckedChange={(c) => onUpdate({ uppercase: c })}
        />
        <Label className="text-[11px]">Maiúsculas</Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={(element.fontStyle ?? 'normal') === 'italic'}
          onCheckedChange={(c) => onUpdate({ fontStyle: c ? 'italic' : 'normal' })}
        />
        <Label className="flex items-center gap-1 text-[11px]"><TextItalic size={12} /> ItÃ¡lico</Label>
      </div>

      {/* Line height e Letter spacing */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[9px] text-text3">Entrelinhas</Label>
          <div className="flex items-center gap-1">
            <input type="range" min={80} max={250} step={5}
              value={Math.round(element.lineHeight * 100)}
              onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) / 100 })}
              className="flex-1 accent-accent h-1.5"
            />
            <span className="text-[9px] text-text3 w-6 font-mono text-right">{element.lineHeight}</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <Label className="text-[9px] text-text3">Espaço letras</Label>
          <div className="flex items-center gap-1">
            <input type="range" min={0} max={10} step={0.5}
              value={element.letterSpacing}
              onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })}
              className="flex-1 accent-accent h-1.5"
            />
            <span className="text-[9px] text-text3 w-6 font-mono text-right">{element.letterSpacing}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Background */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Switch checked={element.background.enabled}
            onCheckedChange={(c) => onUpdate({ background: { ...element.background, enabled: c } })}
          />
          <Label className="text-[11px]">Fundo</Label>
        </div>
        {element.background.enabled && (
          <div className="space-y-1.5 pl-2 border-l-2 border-accent/20">
            <div className="flex items-center gap-2">
              <Label className="text-[9px] text-text3 w-10">Cor</Label>
              <input type="color"
                value={element.background.color.slice(0, 7)}
                onChange={(e) => onUpdate({ background: { ...element.background, color: e.target.value + '80' } })}
                className="w-6 h-6 rounded border border-border cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[9px] text-text3 w-10">Pad</Label>
              <input type="range" min={0} max={24} step={2}
                value={element.background.padding}
                onChange={(e) => onUpdate({ background: { ...element.background, padding: Number(e.target.value) } })}
                className="flex-1 accent-accent h-1.5"
              />
              <span className="text-[9px] text-text3 w-5 font-mono">{element.background.padding}</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[9px] text-text3 w-10">Raio</Label>
              <input type="range" min={0} max={24} step={2}
                value={element.background.borderRadius}
                onChange={(e) => onUpdate({ background: { ...element.background, borderRadius: Number(e.target.value) } })}
                className="flex-1 accent-accent h-1.5"
              />
              <span className="text-[9px] text-text3 w-5 font-mono">{element.background.borderRadius}</span>
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
              <input type="range" min={1} max={4} step={1}
                value={element.border.width}
                onChange={(e) => onUpdate({ border: { ...element.border, width: Number(e.target.value) } })}
                className="flex-1 accent-accent h-1.5"
              />
              <span className="text-[9px] text-text3 w-5 font-mono">{element.border.width}px</span>
            </div>
          </div>
        )}
      </div>

      {/* Sombra */}
      <div className="flex items-center gap-2">
        <Switch checked={element.shadow.enabled}
          onCheckedChange={(c) => onUpdate({ shadow: { ...element.shadow, enabled: c } })}
        />
        <Label className="text-[11px]">Sombra</Label>
      </div>
    </div>
  )
}
