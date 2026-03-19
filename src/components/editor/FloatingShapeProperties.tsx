import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Rectangle, Circle, LineSegment, ArrowRight,
} from '@phosphor-icons/react'
import type { FloatingShape } from '@/lib/floatingElements'

interface FloatingShapePropertiesProps {
  element: FloatingShape
  onUpdate: (updates: Partial<FloatingShape>) => void
}

const QUICK_FILL_COLORS = [
  '#6366f1', '#f43f5e', '#22c55e', '#eab308', '#3b82f6', '#000000',
]

export function FloatingShapeProperties({ element, onUpdate }: FloatingShapePropertiesProps) {
  return (
    <div className="space-y-3">
      <Label className="text-[10px] text-text3 uppercase tracking-wider">Forma</Label>

      {/* Tipo de forma */}
      <div className="grid grid-cols-4 gap-1">
        {([
          { value: 'rectangle' as const, icon: <Rectangle size={16} />, label: 'Retâng.' },
          { value: 'circle' as const, icon: <Circle size={16} />, label: 'Círculo' },
          { value: 'line' as const, icon: <LineSegment size={16} />, label: 'Linha' },
          { value: 'arrow' as const, icon: <ArrowRight size={16} />, label: 'Seta' },
        ]).map((s) => (
          <Button
            key={s.value}
            variant={element.shape === s.value ? 'default' : 'ghost'}
            size="sm"
            className="h-9 flex flex-col gap-0.5"
            onClick={() => onUpdate({ shape: s.value })}
          >
            {s.icon}
            <span className="text-[8px]">{s.label}</span>
          </Button>
        ))}
      </div>

      {/* Cor de preenchimento */}
      <div className="space-y-0.5">
        <Label className="text-[9px] text-text3">Cor de preenchimento</Label>
        <div className="flex items-center gap-1.5">
          <input type="color"
            value={element.fill.color === 'transparent' ? '#ffffff' : element.fill.color}
            onChange={(e) => onUpdate({ fill: { ...element.fill, color: e.target.value, type: 'solid' } })}
            className="w-6 h-6 rounded border border-border cursor-pointer"
          />
          {QUICK_FILL_COLORS.map((c) => (
            <button key={c}
              onClick={() => onUpdate({ fill: { ...element.fill, color: c, type: 'solid' } })}
              className={`w-4 h-4 rounded-full border transition-all ${element.fill.color === c ? 'ring-2 ring-accent ring-offset-1' : 'border-border/50'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* Transparente */}
          <button
            onClick={() => onUpdate({ fill: { ...element.fill, color: 'transparent', type: 'none' } })}
            className={`w-4 h-4 rounded-full border transition-all ${element.fill.type === 'none' ? 'ring-2 ring-accent ring-offset-1' : 'border-border/50'}`}
            style={{
              backgroundImage: 'repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%)',
              backgroundSize: '6px 6px',
            }}
          />
        </div>
      </div>

      {/* Contorno */}
      <div className="space-y-0.5">
        <Label className="text-[9px] text-text3">Contorno</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={10} step={1}
            value={element.stroke.width}
            onChange={(e) => onUpdate({ stroke: { ...element.stroke, width: Number(e.target.value) } })}
            className="flex-1 accent-accent h-1.5"
          />
          <input type="color"
            value={element.stroke.color}
            onChange={(e) => onUpdate({ stroke: { ...element.stroke, color: e.target.value } })}
            className="w-6 h-6 rounded border border-border cursor-pointer"
          />
          <span className="text-[9px] text-text3 w-5 font-mono">{element.stroke.width}px</span>
        </div>
      </div>

      {/* Arredondamento (só pra retângulo) */}
      {element.shape === 'rectangle' && (
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
      )}

      {/* Altura */}
      <div className="space-y-0.5">
        <Label className="text-[9px] text-text3">Altura</Label>
        <div className="flex items-center gap-2">
          <input type="range" min={5} max={80} step={1}
            value={element.height || 20}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
            className="flex-1 accent-accent h-1.5"
          />
          <span className="text-[9px] text-text3 w-7 font-mono">{element.height || 20}%</span>
        </div>
      </div>
    </div>
  )
}
