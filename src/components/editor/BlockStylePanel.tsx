import { Palette, PaintBucket, ArrowsOutSimple, Square } from '@phosphor-icons/react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { BlockStyle } from '@/lib/blockStyles'
import { DEFAULT_BLOCK_STYLE } from '@/lib/blockStyles'

interface BlockStylePanelProps {
  style: BlockStyle
  onChange: (updates: Partial<BlockStyle>) => void
}

const QUICK_COLORS = ['#ffffff', '#f8fafc', '#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3']

export function BlockStylePanel({ style, onChange }: BlockStylePanelProps) {
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <Label className="text-[11px] text-text3 uppercase tracking-wider flex items-center gap-1.5">
        <Palette size={14} /> Estilo do Bloco
      </Label>

      <Tabs defaultValue="background" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="background" className="text-[10px] px-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild><span><PaintBucket size={14} /></span></TooltipTrigger>
                <TooltipContent><p>Fundo</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TabsTrigger>
          <TabsTrigger value="padding" className="text-[10px] px-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild><span><ArrowsOutSimple size={14} /></span></TooltipTrigger>
                <TooltipContent><p>Espaçamento</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TabsTrigger>
          <TabsTrigger value="border" className="text-[10px] px-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild><span><Square size={14} /></span></TooltipTrigger>
                <TooltipContent><p>Bordas</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TabsTrigger>
          <TabsTrigger value="margin" className="text-[10px] px-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild><span><ArrowsOutSimple size={14} weight="bold" /></span></TooltipTrigger>
                <TooltipContent><p>Margens</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB FUNDO ── */}
        <TabsContent value="background" className="space-y-2 mt-2">
          <Select
            value={style.background.type}
            onValueChange={(v) => onChange({
              background: { ...style.background, type: v as 'none' | 'solid' | 'gradient' },
            })}
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Transparente</SelectItem>
              <SelectItem value="solid">Cor sólida</SelectItem>
              <SelectItem value="gradient">Gradiente</SelectItem>
            </SelectContent>
          </Select>

          {style.background.type === 'solid' && (
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-text3 w-8">Cor</Label>
              <input
                type="color"
                value={style.background.color}
                onChange={(e) => onChange({
                  background: { ...style.background, color: e.target.value },
                })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <Input
                value={style.background.color}
                onChange={(e) => onChange({
                  background: { ...style.background, color: e.target.value },
                })}
                className="h-8 text-[11px] font-mono flex-1"
              />
              <div className="flex gap-1">
                {QUICK_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({
                      background: { ...style.background, color: c },
                    })}
                    className="w-5 h-5 rounded-full border border-border/50 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {style.background.type === 'gradient' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-text3 w-8">De</Label>
                <input
                  type="color"
                  value={style.background.gradientFrom}
                  onChange={(e) => onChange({
                    background: { ...style.background, gradientFrom: e.target.value },
                  })}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <Label className="text-[10px] text-text3 w-8 text-center">→</Label>
                <input
                  type="color"
                  value={style.background.gradientTo}
                  onChange={(e) => onChange({
                    background: { ...style.background, gradientTo: e.target.value },
                  })}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
              </div>
              <Select
                value={style.background.gradientDirection}
                onValueChange={(v) => onChange({
                  background: { ...style.background, gradientDirection: v as BlockStyle['background']['gradientDirection'] },
                })}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to bottom">↓ Vertical</SelectItem>
                  <SelectItem value="to right">→ Horizontal</SelectItem>
                  <SelectItem value="to bottom right">↘ Diagonal</SelectItem>
                  <SelectItem value="to top">↑ Vertical inverso</SelectItem>
                </SelectContent>
              </Select>
              {/* Preview do gradiente */}
              <div
                className="h-6 rounded border border-border"
                style={{
                  background: `linear-gradient(${style.background.gradientDirection}, ${style.background.gradientFrom}, ${style.background.gradientTo})`,
                }}
              />
            </div>
          )}
        </TabsContent>

        {/* ── TAB ESPAÇAMENTO (PADDING) ── */}
        <TabsContent value="padding" className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-text3">Espaçamento interno</Label>
            <div className="flex items-center gap-1.5">
              <Switch
                checked={style.padding.linked}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const val = style.padding.top
                    onChange({ padding: { top: val, right: val, bottom: val, left: val, linked: true } })
                  } else {
                    onChange({ padding: { ...style.padding, linked: false } })
                  }
                }}
              />
              <Label className="text-[10px] text-text3">Todos iguais</Label>
            </div>
          </div>

          {style.padding.linked ? (
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-text3 w-12">Todos</Label>
              <input
                type="range" min={0} max={40} step={2}
                value={style.padding.top}
                onChange={(e) => {
                  const v = +e.target.value
                  onChange({ padding: { top: v, right: v, bottom: v, left: v, linked: true } })
                }}
                className="flex-1 h-1 accent-accent"
              />
              <span className="text-[10px] text-text3 w-7 text-right font-mono">
                {style.padding.top}px
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {([
                { key: 'top' as const, label: 'Cima' },
                { key: 'right' as const, label: 'Dir.' },
                { key: 'bottom' as const, label: 'Baixo' },
                { key: 'left' as const, label: 'Esq.' },
              ]).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Label className="text-[10px] text-text3 w-12">{label}</Label>
                  <input
                    type="range" min={0} max={40} step={2}
                    value={style.padding[key]}
                    onChange={(e) => onChange({
                      padding: { ...style.padding, [key]: +e.target.value },
                    })}
                    className="flex-1 h-1 accent-accent"
                  />
                  <span className="text-[10px] text-text3 w-7 text-right font-mono">
                    {style.padding[key]}px
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB BORDAS ── */}
        <TabsContent value="border" className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={style.border.enabled}
              onCheckedChange={(checked) => onChange({
                border: { ...style.border, enabled: checked },
              })}
            />
            <Label className="text-[11px] text-text2">Borda visível</Label>
          </div>

          {style.border.enabled && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px] text-text3">Cor</Label>
                  <input
                    type="color"
                    value={style.border.color}
                    onChange={(e) => onChange({
                      border: { ...style.border, color: e.target.value },
                    })}
                    className="w-7 h-7 rounded border border-border cursor-pointer"
                  />
                </div>
                <Select
                  value={style.border.style}
                  onValueChange={(v) => onChange({
                    border: { ...style.border, style: v as 'solid' | 'dashed' | 'dotted' },
                  })}
                >
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Sólida</SelectItem>
                    <SelectItem value="dashed">Tracejada</SelectItem>
                    <SelectItem value="dotted">Pontilhada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-text3 w-16">Espessura</Label>
                <input
                  type="range" min={1} max={5} step={0.5}
                  value={style.border.width}
                  onChange={(e) => onChange({
                    border: { ...style.border, width: +e.target.value },
                  })}
                  className="flex-1 h-1 accent-accent"
                />
                <span className="text-[10px] text-text3 w-7 text-right font-mono">
                  {style.border.width}px
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-text3 w-16">Arredond.</Label>
                <input
                  type="range" min={0} max={20} step={1}
                  value={style.border.radius}
                  onChange={(e) => onChange({
                    border: { ...style.border, radius: +e.target.value },
                  })}
                  className="flex-1 h-1 accent-accent"
                />
                <span className="text-[10px] text-text3 w-7 text-right font-mono">
                  {style.border.radius}px
                </span>
              </div>

              {/* Preview da borda */}
              <div
                className="h-8 rounded"
                style={{
                  border: `${style.border.width}px ${style.border.style} ${style.border.color}`,
                  borderRadius: `${style.border.radius}px`,
                }}
              />
            </div>
          )}
        </TabsContent>

        {/* ── TAB MARGENS ── */}
        <TabsContent value="margin" className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-text3 w-16">Acima</Label>
            <input
              type="range" min={0} max={40} step={2}
              value={style.margin.top}
              onChange={(e) => onChange({
                margin: { ...style.margin, top: +e.target.value },
              })}
              className="flex-1 h-1 accent-accent"
            />
            <span className="text-[10px] text-text3 w-7 text-right font-mono">
              {style.margin.top}px
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-text3 w-16">Abaixo</Label>
            <input
              type="range" min={0} max={40} step={2}
              value={style.margin.bottom}
              onChange={(e) => onChange({
                margin: { ...style.margin, bottom: +e.target.value },
              })}
              className="flex-1 h-1 accent-accent"
            />
            <span className="text-[10px] text-text3 w-7 text-right font-mono">
              {style.margin.bottom}px
            </span>
          </div>
        </TabsContent>
      </Tabs>

      {/* Botão reset rápido */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-[10px] text-text3"
        onClick={() => onChange(DEFAULT_BLOCK_STYLE)}
      >
        Restaurar estilo padrão
      </Button>
    </div>
  )
}
