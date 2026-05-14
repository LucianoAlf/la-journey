import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Trash, Upload } from '@phosphor-icons/react'
import {
  type HeaderFooterConfig,
  type HeaderFooterZone,
  PLACEHOLDER_OPTIONS,
  HEADER_FOOTER_TEMPLATES,
} from '@/lib/headerFooter'
import {
  buildHeaderFooterLine,
  getHeaderFooterLineConfig,
  type HeaderFooterLineConfig,
  type HeaderFooterLineStyle,
} from '@/lib/headerFooterLine'
import { supabase } from '@/lib/supabase'

interface HeaderFooterEditorProps {
  config: HeaderFooterConfig
  type: 'header' | 'footer'
  onChange: (config: HeaderFooterConfig) => void
  onApplyTemplate: (template: HeaderFooterConfig) => void
}

const zoneNames = {
  left: 'Esquerda',
  center: 'Centro',
  right: 'Direita',
} as const

function zoneSummary(zone: HeaderFooterZone): string {
  if (zone.type === 'image') return 'Logo'
  if (zone.type === 'text') return zone.text || 'Texto'
  if (zone.type === 'placeholder') {
    const option = PLACEHOLDER_OPTIONS.find(item => item.value === zone.placeholder)
    return option?.label || zone.placeholder || 'Campo dinamico'
  }
  return 'Vazio'
}

export function HeaderFooterEditor({ config, type, onChange, onApplyTemplate }: HeaderFooterEditorProps) {
  const update = (partial: Partial<HeaderFooterConfig>) => {
    onChange({ ...config, ...partial })
  }

  const updateZone = (zone: 'left' | 'center' | 'right', partial: Partial<HeaderFooterZone>) => {
    onChange({ ...config, [zone]: { ...config[zone], ...partial } })
  }

  const handleImageUpload = (zone: 'left' | 'center' | 'right') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/svg+xml'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const fileName = `header-footer/${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from('content-images')
        .upload(fileName, file, { contentType: file.type })
      if (!error) {
        const { data } = supabase.storage
          .from('content-images')
          .getPublicUrl(fileName)
        updateZone(zone, { imageUrl: data.publicUrl })
      }
    }
    input.click()
  }

  const filteredTemplates = HEADER_FOOTER_TEMPLATES.filter((t) => t.type === type)
  const lineConfig = getHeaderFooterLineConfig(config, type)

  const updateLine = (partial: Partial<HeaderFooterLineConfig>) => {
    const nextLine = { ...lineConfig, ...partial }
    const nextBorder = buildHeaderFooterLine(nextLine)

    if (type === 'header') {
      update({ borderBottom: nextBorder })
    } else {
      update({ borderTop: nextBorder })
    }
  }

  return (
    <div className="space-y-3">
      {/* On/Off */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => update({ enabled: checked })}
          />
          <Label className="text-[11px] text-text2">
            {type === 'header' ? 'Cabeçalho visível' : 'Rodapé visível'}
          </Label>
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Templates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-text3 uppercase tracking-wider">Templates</Label>
              <span className="text-[9px] text-text3">{filteredTemplates.length} opcoes</span>
            </div>
            <div className="grid gap-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onApplyTemplate(template.config)}
                  className="w-full rounded-lg border border-border bg-white p-2 text-left shadow-sm transition-all hover:border-accent/70 hover:bg-accent-soft/40 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-text2">{template.name}</span>
                    <span className="rounded-full bg-bg2 px-2 py-0.5 text-[9px] font-medium text-text3">
                      {template.config.height}px
                    </span>
                  </div>
                  <div
                    className="flex h-14 items-center gap-2 rounded-md border border-border/70 px-2"
                    style={{
                      borderBottom: type === 'header' ? template.config.borderBottom || '1px solid transparent' : undefined,
                      borderTop: type === 'footer' ? template.config.borderTop || '1px solid transparent' : undefined,
                      backgroundColor: template.config.backgroundColor || 'transparent',
                    }}
                  >
                    {(['left', 'center', 'right'] as const).map((zone) => (
                      <div key={zone} className="min-w-0 flex-1">
                        <div className="mb-0.5 text-[8px] font-medium uppercase tracking-wide text-text3">
                          {zoneNames[zone]}
                        </div>
                        <div className="truncate text-[10px] font-semibold text-text2">
                          {zoneSummary(template.config[zone])}
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── 3 Zonas ── */}
          <div className="space-y-3">
            <Label className="text-[10px] text-text3 uppercase tracking-wider">Zonas</Label>

            {(['left', 'center', 'right'] as const).map((zone) => (
              <div key={zone} className="space-y-1.5 p-2 bg-card/50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-text3 font-medium">
                    {zone === 'left' ? '◀ Esquerda' : zone === 'center' ? '◆ Centro' : '▶ Direita'}
                  </Label>
                </div>

                {/* Tipo da zona */}
                <Select
                  value={config[zone].type}
                  onValueChange={(v) => updateZone(zone, { type: v as HeaderFooterZone['type'] })}
                >
                  <SelectTrigger className="h-7 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empty">Vazio</SelectItem>
                    <SelectItem value="text">Texto livre</SelectItem>
                    <SelectItem value="placeholder">Placeholder dinâmico</SelectItem>
                    <SelectItem value="image">Logo / Imagem</SelectItem>
                  </SelectContent>
                </Select>

                {/* Conteúdo baseado no tipo */}
                {config[zone].type === 'text' && (
                  <Input
                    value={config[zone].text || ''}
                    onChange={(e) => updateZone(zone, { text: e.target.value })}
                    placeholder="Ex: LA Music School"
                    className="h-7 text-[11px]"
                  />
                )}

                {config[zone].type === 'placeholder' && (
                  <Select
                    value={config[zone].placeholder || '{titulo}'}
                    onValueChange={(v) => updateZone(zone, { placeholder: v as HeaderFooterZone['placeholder'] })}
                  >
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLACEHOLDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon size={12} className="text-text3" />
                            <span>{opt.label}</span>
                            <span className="text-text3/50 text-[9px] ml-1">{opt.value}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {config[zone].type === 'image' && (
                  <div className="space-y-1.5">
                    {config[zone].imageUrl ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={config[zone].imageUrl}
                          alt="Logo"
                          className="h-6 object-contain rounded"
                        />
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 text-[10px] text-text3"
                          onClick={() => updateZone(zone, { imageUrl: '', type: 'empty' })}
                        >
                          <Trash size={12} /> Remover
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline" size="sm"
                        className="w-full h-7 text-[10px]"
                        onClick={() => handleImageUpload(zone)}
                      >
                        <Upload size={12} className="mr-1" /> Enviar logo
                      </Button>
                    )}
                    {config[zone].imageUrl && (
                      <div className="flex items-center gap-2">
                        <Label className="text-[9px] text-text3 w-10">Altura</Label>
                        <input type="range" min={16} max={40} step={2}
                          value={config[zone].imageHeight || 24}
                          onChange={(e) => updateZone(zone, { imageHeight: Number(e.target.value) })}
                          className="flex-1 accent-accent h-1.5"
                        />
                        <span className="text-[9px] text-text3 w-6 font-mono">
                          {config[zone].imageHeight || 24}px
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Estilo da zona (texto/placeholder) */}
                {(config[zone].type === 'text' || config[zone].type === 'placeholder') && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {/* Tamanho */}
                    <input type="range" min={7} max={14} step={1}
                      value={config[zone].fontSize || 10}
                      onChange={(e) => updateZone(zone, { fontSize: Number(e.target.value) })}
                      className="w-16 accent-accent h-1.5"
                    />
                    <span className="text-[8px] text-text3 w-5">{config[zone].fontSize || 10}</span>

                    {/* Cor */}
                    <input
                      type="color"
                      value={config[zone].color || '#94a3b8'}
                      onChange={(e) => updateZone(zone, { color: e.target.value })}
                      className="w-5 h-5 rounded border border-border cursor-pointer"
                    />

                    {/* Bold */}
                    <Button
                      variant={(config[zone].fontWeight || 400) >= 600 ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 w-6 p-0 text-[10px] font-bold"
                      onClick={() => updateZone(zone, {
                        fontWeight: (config[zone].fontWeight || 400) >= 600 ? 400 : 700,
                      })}
                    >
                      B
                    </Button>

                    {/* Uppercase */}
                    <Button
                      variant={config[zone].uppercase ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 w-6 p-0 text-[9px] font-bold"
                      onClick={() => updateZone(zone, { uppercase: !config[zone].uppercase })}
                    >
                      AA
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* ── Configurações gerais ── */}
          <div className="space-y-2">
            <Label className="text-[10px] text-text3 uppercase tracking-wider">Configuração</Label>

            <div className="space-y-2 rounded-lg border border-border bg-card/50 p-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-text3">Altura</Label>
                <span className="text-[10px] font-mono text-text3">{config.height}px</span>
              </div>
              <input
                type="range"
                min={24}
                max={60}
                step={2}
                value={config.height}
                onChange={(e) => update({ height: Number(e.target.value) })}
                className="w-full accent-accent h-1.5"
              />

              <div className="flex items-center justify-between pt-1">
                <Label className="text-[10px] text-text3">Recuo lateral</Label>
                <span className="text-[10px] font-mono text-text3">{config.paddingX || 24}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={80}
                step={4}
                value={config.paddingX || 24}
                onChange={(e) => update({ paddingX: Number(e.target.value) })}
                className="w-full accent-accent h-1.5"
              />
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-card/50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[10px] text-text3">Fundo</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.backgroundColor === 'transparent' ? '#ffffff' : config.backgroundColor}
                    onChange={(e) => update({ backgroundColor: e.target.value })}
                    className="h-6 w-8 cursor-pointer rounded border border-border"
                  />
                  <Button
                    variant={config.backgroundColor === 'transparent' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-6 text-[9px]"
                    onClick={() => update({ backgroundColor: 'transparent' })}
                  >
                    Transparente
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-card/50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-[10px] text-text3">
                    {type === 'header' ? 'Linha abaixo' : 'Linha acima'}
                  </Label>
                  <div className="text-[9px] text-text3">Cor, espessura e estilo</div>
                </div>
                <Switch
                  checked={lineConfig.enabled}
                  onCheckedChange={(checked) => updateLine({ enabled: checked })}
                />
              </div>

              <div className={lineConfig.enabled ? 'space-y-2' : 'pointer-events-none space-y-2 opacity-45'}>
                <div className="flex items-center gap-2">
                  <Label className="w-16 text-[10px] text-text3">Cor</Label>
                  <input
                    type="color"
                    value={lineConfig.color}
                    onChange={(e) => updateLine({ color: e.target.value })}
                    className="h-6 w-8 cursor-pointer rounded border border-border"
                  />
                  <Select
                    value={lineConfig.style}
                    onValueChange={(value) => updateLine({ style: value as HeaderFooterLineStyle })}
                  >
                    <SelectTrigger className="h-7 flex-1 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solida</SelectItem>
                      <SelectItem value="dashed">Tracejada</SelectItem>
                      <SelectItem value="dotted">Pontilhada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-16 text-[10px] text-text3">Espessura</Label>
                  <input
                    type="range"
                    min={0.5}
                    max={4}
                    step={0.5}
                    value={lineConfig.width}
                    onChange={(e) => updateLine({ width: Number(e.target.value) })}
                    className="flex-1 accent-accent h-1.5"
                  />
                  <span className="w-8 text-right text-[10px] font-mono text-text3">{lineConfig.width}px</span>
                </div>
              </div>
            </div>

            {/* Mostrar na primeira página */}
            <div className="flex items-center gap-2">
              <Switch
                checked={config.showOnFirstPage}
                onCheckedChange={(checked) => update({ showOnFirstPage: checked })}
              />
              <Label className="text-[11px] text-text2">
                Mostrar na 1ª página (capa)
              </Label>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
