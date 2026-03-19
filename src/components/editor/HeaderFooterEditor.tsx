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
import { supabase } from '@/lib/supabase'

interface HeaderFooterEditorProps {
  config: HeaderFooterConfig
  type: 'header' | 'footer'
  onChange: (config: HeaderFooterConfig) => void
  onApplyTemplate: (template: HeaderFooterConfig) => void
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
          {/* ── Templates ── */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-text3">Template</Label>
            <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <div className="flex gap-2 pb-2">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onApplyTemplate(template.config)}
                    className="shrink-0 w-[140px] h-[40px] rounded-md border border-border
                               overflow-hidden hover:ring-2 hover:ring-accent/50 transition-all
                               relative bg-white"
                  >
                    {/* Mini preview do template */}
                    <div
                      className="absolute inset-0 flex items-center justify-between px-2"
                      style={{
                        borderBottom: type === 'header' ? template.config.borderBottom || 'none' : 'none',
                        borderTop: type === 'footer' ? template.config.borderTop || 'none' : 'none',
                        backgroundColor: template.config.backgroundColor || 'transparent',
                      }}
                    >
                      <span className="text-[6px] text-gray-400 truncate max-w-[35px]">
                        {template.config.left.type === 'text'
                          ? template.config.left.text
                          : template.config.left.type === 'placeholder'
                            ? template.config.left.placeholder
                            : template.config.left.type === 'image'
                              ? '🖼'
                              : ''}
                      </span>
                      <span className="text-[6px] text-gray-400 truncate max-w-[35px]">
                        {template.config.center.type === 'text'
                          ? template.config.center.text
                          : template.config.center.type === 'placeholder'
                            ? template.config.center.placeholder
                            : ''}
                      </span>
                      <span className="text-[6px] text-gray-400 truncate max-w-[35px]">
                        {template.config.right.type === 'text'
                          ? template.config.right.text
                          : template.config.right.type === 'placeholder'
                            ? template.config.right.placeholder
                            : ''}
                      </span>
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 text-[7px] text-center bg-white/80 text-gray-500">
                      {template.name}
                    </span>
                  </button>
                ))}
              </div>
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

            {/* Altura */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-text3 w-16">Altura</Label>
              <input type="range" min={24} max={60} step={2}
                value={config.height}
                onChange={(e) => update({ height: Number(e.target.value) })}
                className="flex-1 accent-accent h-1.5"
              />
              <span className="text-[10px] text-text3 w-7 font-mono">{config.height}px</span>
            </div>

            {/* Padding horizontal */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-text3 w-16">Margem H</Label>
              <input type="range" min={8} max={40} step={2}
                value={config.paddingX}
                onChange={(e) => update({ paddingX: Number(e.target.value) })}
                className="flex-1 accent-accent h-1.5"
              />
              <span className="text-[10px] text-text3 w-7 font-mono">{config.paddingX}px</span>
            </div>

            {/* Background */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-text3 w-16">Fundo</Label>
              <input
                type="color"
                value={config.backgroundColor === 'transparent' ? '#ffffff' : config.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="w-6 h-6 rounded border border-border cursor-pointer"
              />
              <Button
                variant={config.backgroundColor === 'transparent' ? 'default' : 'ghost'}
                size="sm" className="h-6 text-[9px]"
                onClick={() => update({ backgroundColor: 'transparent' })}
              >
                Transparente
              </Button>
            </div>

            {/* Linha separadora */}
            <div className="flex items-center gap-2">
              <Switch
                checked={!!(type === 'header' ? config.borderBottom : config.borderTop)}
                onCheckedChange={(checked) => {
                  if (type === 'header') {
                    update({ borderBottom: checked ? '1px solid #e2e8f0' : undefined })
                  } else {
                    update({ borderTop: checked ? '1px solid #e2e8f0' : undefined })
                  }
                }}
              />
              <Label className="text-[11px] text-text2">
                {type === 'header' ? 'Linha abaixo' : 'Linha acima'}
              </Label>
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
