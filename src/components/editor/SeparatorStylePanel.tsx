import { LineSegment } from '@phosphor-icons/react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { SeparatorStyle } from '@/lib/blockStyles'
import { DEFAULT_SEPARATOR_STYLE, getSeparatorDecoration } from '@/lib/blockStyles'

interface SeparatorStylePanelProps {
  style: SeparatorStyle
  onChange: (updates: Partial<SeparatorStyle>) => void
  pageBackgroundColor?: string
}

const SEP_QUICK_COLORS = ['#e2e8f0', '#94a3b8', '#1e293b', '#6366f1', '#f43f5e', '#eab308']

export function SeparatorStylePanel({ style, onChange, pageBackgroundColor = '#ffffff' }: SeparatorStylePanelProps) {
  const decoration = getSeparatorDecoration(style.decoration)

  return (
    <div className="space-y-3">
      <Label className="text-[11px] text-text3 uppercase tracking-wider flex items-center gap-1.5">
        <LineSegment size={14} /> Separador
      </Label>

      {/* Cor */}
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-text3 w-8">Cor</Label>
        <input
          type="color"
          value={style.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="w-7 h-7 rounded border border-border cursor-pointer"
        />
        <div className="flex gap-1">
          {SEP_QUICK_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ color: c })}
              className="w-4 h-4 rounded-full border border-border/50 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Estilo da linha */}
      <div className="space-y-1">
        <Label className="text-[10px] text-text3">Estilo da linha</Label>
        <Select
          value={style.style}
          onValueChange={(v) => onChange({ style: v as SeparatorStyle['style'] })}
        >
          <SelectTrigger className="h-8 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">─── Sólida</SelectItem>
            <SelectItem value="dashed">- - - Tracejada</SelectItem>
            <SelectItem value="dotted">··· Pontilhada</SelectItem>
            <SelectItem value="double">═══ Dupla</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Espessura */}
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-text3 w-16">Espessura</Label>
        <input
          type="range" min={1} max={5} step={0.5}
          value={style.width}
          onChange={(e) => onChange({ width: +e.target.value })}
          className="flex-1 h-1 accent-accent"
        />
        <span className="text-[10px] text-text3 w-7 font-mono">{style.width}px</span>
      </div>

      {/* Largura */}
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-text3 w-16">Largura</Label>
        <input
          type="range" min={20} max={100} step={5}
          value={style.widthPercent}
          onChange={(e) => onChange({ widthPercent: +e.target.value })}
          className="flex-1 h-1 accent-accent"
        />
        <span className="text-[10px] text-text3 w-7 font-mono">{style.widthPercent}%</span>
      </div>

      {/* Espaçamento */}
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-text3 w-16">Espaço</Label>
        <input
          type="range" min={8} max={40} step={2}
          value={style.spacing}
          onChange={(e) => onChange({ spacing: +e.target.value })}
          className="flex-1 h-1 accent-accent"
        />
        <span className="text-[10px] text-text3 w-7 font-mono">{style.spacing}px</span>
      </div>

      {/* Alinhamento */}
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-text3 w-16">Alinhar</Label>
        <div className="flex gap-0.5">
          {([
            { value: 'left' as const, label: '⇐' },
            { value: 'center' as const, label: '⇔' },
            { value: 'right' as const, label: '⇒' },
          ]).map(({ value, label }) => (
            <Button
              key={value}
              variant={style.align === value ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => onChange({ align: value })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Decoração central */}
      <div className="space-y-1">
        <Label className="text-[10px] text-text3">Decoração</Label>
        <Select
          value={style.decoration}
          onValueChange={(v) => onChange({ decoration: v as SeparatorStyle['decoration'] })}
        >
          <SelectTrigger className="h-8 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem decoração</SelectItem>
            <SelectItem value="notes">♪ ♫ Notas musicais</SelectItem>
            <SelectItem value="star">✦ Estrela</SelectItem>
            <SelectItem value="dot">● Ponto</SelectItem>
            <SelectItem value="diamond">◆ Diamante</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="py-2">
        <div
          style={{
            display: 'flex',
            justifyContent: style.align === 'left' ? 'flex-start' :
                            style.align === 'right' ? 'flex-end' : 'center',
            padding: `${style.spacing}px 0`,
          }}
        >
          <div style={{ position: 'relative', width: `${style.widthPercent}%` }}>
            <hr style={{
              border: 'none',
              borderTop: style.style === 'double'
                ? `${style.width}px double ${style.color}`
                : `${style.width}px ${style.style} ${style.color}`,
              margin: 0,
            }} />
            {decoration && (
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: pageBackgroundColor,
                padding: '0 8px',
                fontSize: '14px',
                color: style.color,
              }}>
                {decoration}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-[10px] text-text3"
        onClick={() => onChange(DEFAULT_SEPARATOR_STYLE)}
      >
        Restaurar separador padrão
      </Button>
    </div>
  )
}
