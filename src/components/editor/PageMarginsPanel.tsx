import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { LinkSimple, LinkBreak } from '@phosphor-icons/react'
import { useState } from 'react'
import type { PageMargins } from '@/lib/blockStyles'

interface PageMarginsPanelProps {
  margins: PageMargins
  onChange: (margins: PageMargins) => void
}

export function PageMarginsPanel({ margins, onChange }: PageMarginsPanelProps) {
  const [linked, setLinked] = useState(true)

  const updateMargin = (key: keyof PageMargins, value: number) => {
    if (linked) {
      // Atualiza todas as margens juntas
      onChange({ top: value, right: value, bottom: value, left: value })
    } else {
      onChange({ ...margins, [key]: value })
    }
  }

  const presets = [
    { label: 'Estreita', value: 40 },
    { label: 'Normal', value: 60 },
    { label: 'Larga', value: 80 },
  ]

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="flex gap-1.5">
        {presets.map(preset => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-[10px]"
            onClick={() => onChange({ top: preset.value, right: preset.value, bottom: preset.value, left: preset.value })}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Link toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-text3 uppercase tracking-wider">Margens</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setLinked(!linked)}
          title={linked ? 'Desvincular margens' : 'Vincular margens'}
        >
          {linked ? <LinkSimple size={14} /> : <LinkBreak size={14} />}
        </Button>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        {/* Topo */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-text2">Topo</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={margins.top}
                onChange={e => updateMargin('top', Number(e.target.value))}
                className="h-6 w-14 text-[10px] text-center"
                min={20}
                max={120}
              />
              <span className="text-[9px] text-text3">px</span>
            </div>
          </div>
          <Slider
            value={[margins.top]}
            onValueChange={([v]) => updateMargin('top', v)}
            min={20}
            max={120}
            step={4}
            className="h-4"
          />
        </div>

        {/* Direita */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-text2">Direita</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={margins.right}
                onChange={e => updateMargin('right', Number(e.target.value))}
                className="h-6 w-14 text-[10px] text-center"
                min={20}
                max={120}
              />
              <span className="text-[9px] text-text3">px</span>
            </div>
          </div>
          <Slider
            value={[margins.right]}
            onValueChange={([v]) => updateMargin('right', v)}
            min={20}
            max={120}
            step={4}
            className="h-4"
          />
        </div>

        {/* Inferior */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-text2">Inferior</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={margins.bottom}
                onChange={e => updateMargin('bottom', Number(e.target.value))}
                className="h-6 w-14 text-[10px] text-center"
                min={20}
                max={120}
              />
              <span className="text-[9px] text-text3">px</span>
            </div>
          </div>
          <Slider
            value={[margins.bottom]}
            onValueChange={([v]) => updateMargin('bottom', v)}
            min={20}
            max={120}
            step={4}
            className="h-4"
          />
        </div>

        {/* Esquerda */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-text2">Esquerda</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={margins.left}
                onChange={e => updateMargin('left', Number(e.target.value))}
                className="h-6 w-14 text-[10px] text-center"
                min={20}
                max={120}
              />
              <span className="text-[9px] text-text3">px</span>
            </div>
          </div>
          <Slider
            value={[margins.left]}
            onValueChange={([v]) => updateMargin('left', v)}
            min={20}
            max={120}
            step={4}
            className="h-4"
          />
        </div>
      </div>
    </div>
  )
}
