import { PaintBucket } from '@phosphor-icons/react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { PageBackground } from '@/lib/blockStyles'
import { DEFAULT_PAGE_BACKGROUND } from '@/lib/blockStyles'

interface PageBackgroundPanelProps {
  background: PageBackground
  onChange: (updates: Partial<PageBackground>) => void
}

const PAGE_QUICK_COLORS = ['#ffffff', '#fffbeb', '#f0fdf4', '#eff6ff', '#fdf2f8', '#f5f5f4']

export function PageBackgroundPanel({ background, onChange }: PageBackgroundPanelProps) {
  const wm = background.watermark ?? {
    enabled: false,
    type: 'text' as const,
    text: 'RASCUNHO',
    opacity: 0.08,
    rotation: -30,
    fontSize: 80,
  }

  const updateWatermark = (patch: Partial<typeof wm>) => {
    onChange({
      watermark: { ...wm, ...patch },
    })
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <Label className="text-[11px] text-text3 uppercase tracking-wider flex items-center gap-1.5">
        <PaintBucket size={14} /> Fundo da Página
      </Label>

      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-text3 w-12">Cor</Label>
        <input
          type="color"
          value={background.color || '#ffffff'}
          onChange={(e) => onChange({ color: e.target.value })}
          className="w-8 h-8 rounded border border-border cursor-pointer"
        />
        <div className="flex gap-1">
          {PAGE_QUICK_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ color: c })}
              className="w-5 h-5 rounded-full border border-border/50 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Marca d'água */}
      <Separator />
      <Label className="text-[10px] text-text3">Marca d'água</Label>
      <div className="flex items-center gap-2">
        <Switch
          checked={wm.enabled}
          onCheckedChange={(checked) => updateWatermark({ enabled: checked })}
        />
        <Label className="text-[11px] text-text2">Ativar marca d'água</Label>
      </div>

      {wm.enabled && (
        <div className="space-y-2 pl-2">
          <Select
            value={wm.type}
            onValueChange={(v) => updateWatermark({ type: v as 'text' | 'image' })}
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="image">Imagem</SelectItem>
            </SelectContent>
          </Select>

          {wm.type === 'text' && (
            <Input
              value={wm.text || ''}
              onChange={(e) => updateWatermark({ text: e.target.value })}
              placeholder="Ex: RASCUNHO, CONFIDENCIAL"
              className="h-8 text-[12px]"
            />
          )}

          {wm.type === 'image' && (
            <Input
              value={wm.imageUrl || ''}
              onChange={(e) => updateWatermark({ imageUrl: e.target.value })}
              placeholder="URL da imagem"
              className="h-8 text-[12px]"
            />
          )}

          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-text3 w-16">Opacidade</Label>
            <input
              type="range" min={1} max={30} step={1}
              value={Math.round((wm.opacity ?? 0.08) * 100)}
              onChange={(e) => updateWatermark({ opacity: +e.target.value / 100 })}
              className="flex-1 h-1 accent-accent"
            />
            <span className="text-[10px] text-text3 w-7 text-right font-mono">
              {Math.round((wm.opacity ?? 0.08) * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-text3 w-16">Rotação</Label>
            <input
              type="range" min={-45} max={45} step={5}
              value={wm.rotation ?? -30}
              onChange={(e) => updateWatermark({ rotation: +e.target.value })}
              className="flex-1 h-1 accent-accent"
            />
            <span className="text-[10px] text-text3 w-7 text-right font-mono">
              {wm.rotation ?? -30}°
            </span>
          </div>

          {wm.type === 'text' && (
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-text3 w-16">Tamanho</Label>
              <input
                type="range" min={40} max={120} step={5}
                value={wm.fontSize ?? 80}
                onChange={(e) => updateWatermark({ fontSize: +e.target.value })}
                className="flex-1 h-1 accent-accent"
              />
              <span className="text-[10px] text-text3 w-7 text-right font-mono">
                {wm.fontSize ?? 80}px
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
