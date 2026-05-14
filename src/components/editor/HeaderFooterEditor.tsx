import { useState } from 'react'
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
  type PlaceholderContext,
  PLACEHOLDER_OPTIONS,
  HEADER_FOOTER_TEMPLATES,
  resolvePlaceholder,
} from '@/lib/headerFooter'
import {
  buildHeaderFooterLine,
  getHeaderFooterLineConfig,
  type HeaderFooterLineConfig,
  type HeaderFooterLineStyle,
} from '@/lib/headerFooterLine'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface HeaderFooterEditorProps {
  config: HeaderFooterConfig
  type: 'header' | 'footer'
  placeholderContext: PlaceholderContext
  onChange: (config: HeaderFooterConfig) => void
  onApplyTemplate: (template: HeaderFooterConfig) => void
}

const zoneNames = {
  left: 'Esquerda',
  center: 'Centro',
  right: 'Direita',
} as const

const zoneShortNames = {
  left: 'Esq.',
  center: 'Centro',
  right: 'Dir.',
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

export function HeaderFooterEditor({ config, type, placeholderContext, onChange, onApplyTemplate }: HeaderFooterEditorProps) {
  const [activeZone, setActiveZone] = useState<'left' | 'center' | 'right'>('left')
  const [uploadingZone, setUploadingZone] = useState<'left' | 'center' | 'right' | null>(null)

  const update = (partial: Partial<HeaderFooterConfig>) => {
    onChange({ ...config, ...partial })
  }

  const updateZone = (zone: 'left' | 'center' | 'right', partial: Partial<HeaderFooterZone>) => {
    onChange({ ...config, [zone]: { ...config[zone], ...partial } })
  }

  const resolveZoneText = (zoneConfig: HeaderFooterZone) => {
    if (zoneConfig.type === 'placeholder' && zoneConfig.placeholder) {
      return resolvePlaceholder(zoneConfig.placeholder, placeholderContext)
    }
    return zoneConfig.text || ''
  }

  const updateZoneType = (zone: 'left' | 'center' | 'right', nextType: HeaderFooterZone['type']) => {
    const currentZone = config[zone]

    if (nextType === 'text') {
      updateZone(zone, {
        type: 'text',
        text: resolveZoneText(currentZone),
      })
      return
    }

    updateZone(zone, { type: nextType })
  }

  const handleImageUpload = (zone: 'left' | 'center' | 'right') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/svg+xml'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const fileName = `header-footer/${Date.now()}_${file.name}`
      setUploadingZone(zone)

      try {
        const { error } = await supabase.storage
          .from('content-images')
          .upload(fileName, file, { contentType: file.type })

        if (error) throw error

        const { data } = supabase.storage
          .from('content-images')
          .getPublicUrl(fileName)
        updateZone(zone, { imageUrl: data.publicUrl })
        toast.success('Logo enviada para este cabeçalho/rodapé')
      } catch (error) {
        console.error('Erro ao enviar logo do cabeçalho/rodapé:', error)
        toast.error('Não foi possível enviar a logo')
      } finally {
        setUploadingZone(null)
      }
    }
    input.click()
  }

  const filteredTemplates = HEADER_FOOTER_TEMPLATES.filter((t) => t.type === type)
  const lineConfig = getHeaderFooterLineConfig(config, type)
  const activeZoneConfig = config[activeZone]

  const updateLine = (partial: Partial<HeaderFooterLineConfig>) => {
    const nextLine = { ...lineConfig, ...partial }
    const nextBorder = buildHeaderFooterLine(nextLine)

    if (type === 'header') {
      update({ borderBottom: nextBorder })
    } else {
      update({ borderTop: nextBorder })
    }
  }

  const renderZoneEditor = (zone: 'left' | 'center' | 'right') => {
    const zoneConfig = config[zone]
    const isUploading = uploadingZone === zone

    return (
      <div className="space-y-2 rounded-lg border border-border bg-card/50 p-2.5">
        <Select
          value={zoneConfig.type}
          onValueChange={(value) => updateZoneType(zone, value as HeaderFooterZone['type'])}
        >
          <SelectTrigger className="h-8 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="empty">Vazio</SelectItem>
            <SelectItem value="text">Texto</SelectItem>
            <SelectItem value="placeholder">Campo automático</SelectItem>
            <SelectItem value="image">Logo / Imagem</SelectItem>
          </SelectContent>
        </Select>

        {zoneConfig.type === 'text' && (
          <Input
            value={zoneConfig.text || ''}
            onChange={(event) => updateZone(zone, { text: event.target.value })}
            placeholder="Ex: LA Music School"
            className="h-8 text-[11px]"
          />
        )}

        {zoneConfig.type === 'placeholder' && (
          <div className="space-y-2">
            <Select
              value={zoneConfig.placeholder || '{titulo}'}
              onValueChange={(value) => updateZone(zone, { placeholder: value as HeaderFooterZone['placeholder'] })}
            >
              <SelectTrigger className="h-8 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLACEHOLDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon size={12} className="text-text3" />
                      <span>{option.label}</span>
                      <span className="ml-1 text-[9px] text-text3/50">{option.value}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="rounded-md border border-border bg-white p-2">
              <div className="mb-1 text-[9px] font-medium uppercase tracking-wide text-text3">
                Texto gerado agora
              </div>
              <div className="truncate text-[11px] font-semibold text-text2">
                {resolveZoneText(zoneConfig) || 'Vazio'}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7 w-full justify-center text-[10px]"
                onClick={() => updateZoneType(zone, 'text')}
              >
                Editar como texto personalizado
              </Button>
            </div>
          </div>
        )}

        {zoneConfig.type === 'image' && (
          <div className="space-y-2">
            {zoneConfig.imageUrl ? (
              <>
                <div className="flex items-center gap-2 rounded-md border border-border bg-white p-2">
                  <img src={zoneConfig.imageUrl} alt="Logo" className="h-7 max-w-[96px] object-contain" />
                  <div className="min-w-0 flex-1 text-[10px] text-text3">Logo atual</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-text3"
                    onClick={() => updateZone(zone, { imageUrl: '', type: 'empty' })}
                  >
                    <Trash size={12} />
                    Remover
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-center gap-2 text-[10px]"
                  onClick={() => handleImageUpload(zone)}
                  disabled={isUploading}
                >
                  <Upload size={12} />
                  {isUploading ? 'Enviando...' : 'Trocar logo personalizada'}
                </Button>
                <div className="flex items-center gap-2">
                  <Label className="w-12 text-[9px] text-text3">Altura</Label>
                  <input
                    type="range"
                    min={16}
                    max={40}
                    step={2}
                    value={zoneConfig.imageHeight || 24}
                    onChange={(event) => updateZone(zone, { imageHeight: Number(event.target.value) })}
                    className="h-1.5 flex-1 accent-accent"
                  />
                  <span className="w-8 text-right text-[9px] font-mono text-text3">{zoneConfig.imageHeight || 24}px</span>
                </div>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full justify-center gap-2 text-[10px]"
                onClick={() => handleImageUpload(zone)}
                disabled={isUploading}
              >
                <Upload size={12} />
                {isUploading ? 'Enviando...' : 'Enviar logo personalizada'}
              </Button>
            )}
          </div>
        )}

        {(zoneConfig.type === 'text' || zoneConfig.type === 'placeholder') && (
          <details className="rounded-md border border-border bg-white px-2 py-1.5">
            <summary className="cursor-pointer text-[10px] font-medium text-text3">Tipografia</summary>
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="range"
                min={7}
                max={14}
                step={1}
                value={zoneConfig.fontSize || 10}
                onChange={(event) => updateZone(zone, { fontSize: Number(event.target.value) })}
                className="w-16 accent-accent h-1.5"
              />
              <span className="w-5 text-[8px] text-text3">{zoneConfig.fontSize || 10}</span>
              <input
                type="color"
                value={zoneConfig.color || '#94a3b8'}
                onChange={(event) => updateZone(zone, { color: event.target.value })}
                className="h-5 w-5 cursor-pointer rounded border border-border"
              />
              <Button
                variant={(zoneConfig.fontWeight || 400) >= 600 ? 'default' : 'ghost'}
                size="sm"
                className="h-6 w-6 p-0 text-[10px] font-bold"
                onClick={() => updateZone(zone, {
                  fontWeight: (zoneConfig.fontWeight || 400) >= 600 ? 400 : 700,
                })}
              >
                B
              </Button>
              <Button
                variant={zoneConfig.uppercase ? 'default' : 'ghost'}
                size="sm"
                className="h-6 w-6 p-0 text-[9px] font-bold"
                onClick={() => updateZone(zone, { uppercase: !zoneConfig.uppercase })}
              >
                AA
              </Button>
            </div>
          </details>
        )}
      </div>
    )
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-text3 uppercase tracking-wider">Layout</Label>
              <span className="text-[9px] text-text3">{filteredTemplates.length} modelos</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onApplyTemplate(template.config)}
                    className="min-w-0 rounded-lg border border-border bg-white p-2 text-left shadow-sm transition-all hover:border-accent/70 hover:bg-accent-soft/40 hover:shadow-md"
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
                            {zoneShortNames[zone]}
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

          <div className="space-y-2">
            <Label className="text-[10px] text-text3 uppercase tracking-wider">Conteúdo</Label>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg2 p-1">
              {(['left', 'center', 'right'] as const).map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setActiveZone(zone)}
                  className={[
                    'rounded-md px-2 py-1.5 text-[10px] font-medium transition-all',
                    activeZone === zone
                      ? 'bg-white text-text shadow-sm'
                      : 'text-text3 hover:bg-white/60 hover:text-text2',
                  ].join(' ')}
                >
                  {zoneNames[zone]}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-white p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-text2">{zoneNames[activeZone]}</div>
                  <div className="text-[9px] text-text3">{zoneSummary(activeZoneConfig)}</div>
                </div>
                <span className="rounded-full bg-bg2 px-2 py-0.5 text-[9px] font-medium text-text3">
                  {activeZoneConfig.type === 'placeholder' ? 'Automático' : activeZoneConfig.type === 'image' ? 'Logo' : activeZoneConfig.type === 'text' ? 'Texto' : 'Vazio'}
                </span>
              </div>
              {renderZoneEditor(activeZone)}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-[10px] text-text3 uppercase tracking-wider">Aparência</Label>

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
                      <SelectItem value="solid">Sólida</SelectItem>
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

            {/* Mostrar na primeira pagina interna */}
            <div className="flex items-center gap-2">
              <Switch
                checked={config.showOnFirstPage}
                onCheckedChange={(checked) => update({ showOnFirstPage: checked })}
              />
              <Label className="text-[11px] text-text2">
                Mostrar na 1ª página interna
              </Label>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
