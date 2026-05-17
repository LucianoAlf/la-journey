import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@iconify/react'
import {
  Image as ImageIcon,
  MagnifyingGlass,
  Shapes,
  Sparkle,
  SpinnerGap,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { deleteImage, generateAndSaveElement } from '@/services/imageGenerationService'
import { supabase } from '@/lib/supabase'
import { FloatingElementLibraryPanel } from '@/components/editor/FloatingElementLibraryPanel'
import { ICONIFY_ELEMENT_OPTIONS } from '@/lib/iconifyElementCatalog'
import {
  convertSvgColorsToCurrentColor,
  getElementAssetDisplaySvg,
  getElementPickerVisibleAssets,
  sanitizeSvg,
  type ElementLibraryAsset,
  type ElementTypeFilter,
  type GeneratedElementType,
} from '@/lib/elementPicker'
import type { FloatingShapeKind } from '@/lib/floatingElements'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 24

const GENERATOR_TYPES: Array<{ value: GeneratedElementType; label: string }> = [
  { value: 'musica', label: 'Musica' },
  { value: 'instrumento', label: 'Instrumento' },
  { value: 'forma', label: 'Forma' },
  { value: 'decorativo', label: 'Decorativo' },
]

type ElementsDrawerTab = 'add' | ElementTypeFilter | 'iconify'

const DRAWER_TABS: Array<{ value: ElementsDrawerTab; label: string }> = [
  { value: 'add', label: 'Criar' },
  { value: 'todos', label: 'Todos' },
  { value: 'musica', label: 'Musica' },
  { value: 'instrumento', label: 'Instrumentos' },
  { value: 'forma', label: 'Formas' },
  { value: 'iconify', label: 'Icones' },
  { value: 'decorativo', label: 'Decorativo' },
]

const SHAPE_OPTIONS: Array<{ shape: FloatingShapeKind; label: string }> = [
  { shape: 'rectangle', label: 'Retangulo' },
  { shape: 'circle', label: 'Circulo' },
  { shape: 'line', label: 'Linha' },
  { shape: 'arrow', label: 'Seta' },
  { shape: 'star', label: 'Estrela' },
  { shape: 'callout', label: 'Callout' },
]

interface ElementsPickerProps {
  open: boolean
  schoolId: string | null | undefined
  layersPanel?: ReactNode
  onAddIcon: (icon: string, label: string) => void
  onAddShape: (shape: FloatingShapeKind) => void
  onAddText: () => void
  onOpenImagePicker: () => void
  onOpenChange: (open: boolean) => void
  onSelectElement: (asset: ElementLibraryAsset) => void
  onToggleLayers: () => void
}

function getImageFormat(file: File) {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) return 'svg'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/jpeg') return 'jpeg'
  return 'png'
}

export function ElementsPicker({
  open,
  schoolId,
  layersPanel,
  onAddIcon,
  onAddShape,
  onAddText,
  onOpenImagePicker,
  onOpenChange,
  onSelectElement,
  onToggleLayers,
}: ElementsPickerProps) {
  const [assets, setAssets] = useState<ElementLibraryAsset[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<ElementsDrawerTab>('add')
  const [elementType, setElementType] = useState<ElementTypeFilter>('todos')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ElementLibraryAsset | null>(null)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generateFormat, setGenerateFormat] = useState<'svg' | 'png'>('svg')
  const [generateElementType, setGenerateElementType] = useState<GeneratedElementType>('musica')
  const [generateLabel, setGenerateLabel] = useState('')
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generateTags, setGenerateTags] = useState('')
  const [generatingElement, setGeneratingElement] = useState(false)
  const [generateProgress, setGenerateProgress] = useState('')
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const loadElements = useCallback(async (mode: 'reset' | 'more' = 'reset') => {
    if (!open) return
    if (mode === 'more' && (!hasMore || loadingMore || loading)) return

    const offset = mode === 'reset' ? 0 : assets.length
    if (mode === 'reset') setLoading(true)
    if (mode === 'more') setLoadingMore(true)
    if (mode === 'reset') setLoadError(null)

    try {
      let query = supabase
        .from('image_library' as any)
        .select('id, image_url, svg_code, label, category, image_format, element_type, tags')
        .eq('is_element', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (elementType !== 'todos') {
        query = query.eq('element_type', elementType)
      }

      const { data, error } = await query
      if (error) throw error

      const nextAssets = (data ?? []) as unknown as ElementLibraryAsset[]
      setAssets(prev => mode === 'reset' ? nextAssets : [...prev, ...nextAssets])
      setHasMore(nextAssets.length === PAGE_SIZE)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha desconhecida'
      setLoadError(message)
      toast.error(`Erro ao carregar elementos: ${message.slice(0, 80)}`)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [assets.length, elementType, hasMore, loading, loadingMore, open])

  useEffect(() => {
    if (!open) return
    setAssets([])
    setHasMore(true)
    void loadElements('reset')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, elementType])

  useEffect(() => {
    if (activeTab === 'add' || activeTab === 'iconify') return
    setElementType(activeTab)
  }, [activeTab])

  const visibleAssets = useMemo(
    () => getElementPickerVisibleAssets(assets, { search, elementType }),
    [assets, elementType, search],
  )

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight
    if (distanceFromBottom < 240) {
      void loadElements('more')
    }
  }, [loadElements])

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!schoolId) {
      toast.error('Escola nao carregada para salvar o elemento.')
      return
    }
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
    const isSupportedRaster = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    if (!isSupportedRaster && !isSvg) {
      toast.error('Use SVG, PNG, JPG ou WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Elemento deve ter no maximo 5MB.')
      return
    }

    setUploading(true)
    try {
      const rawSvg = isSvg ? await file.text() : null
      const sanitizedSvg = rawSvg ? sanitizeSvg(rawSvg) : null
      if (isSvg && !sanitizedSvg) {
        toast.error('SVG invalido ou com conteudo inseguro.')
        return
      }
      const recolorableSvg = sanitizedSvg ? convertSvgColorsToCurrentColor(sanitizedSvg) : null

      const ext = isSvg ? 'svg' : file.name.split('.').pop()?.toLowerCase() || 'png'
      const id = crypto.randomUUID()
      const path = `elements/${schoolId}/${id}.${ext}`
      const uploadBody = recolorableSvg
        ? new Blob([recolorableSvg], { type: 'image/svg+xml' })
        : file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(path, uploadBody, { contentType: isSvg ? 'image/svg+xml' : file.type, upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('content-images')
        .getPublicUrl(uploadData.path)

      const label = file.name.replace(/\.[^/.]+$/, '')
      const format = getImageFormat(file)
      const { data, error } = await supabase
        .from('image_library' as any)
        .insert({
          school_id: schoolId,
          label,
          prompt: `Upload manual: ${label}`,
          image_url: urlData.publicUrl,
          svg_code: recolorableSvg,
          image_format: format,
          width: null,
          height: null,
          file_size_bytes: file.size,
          category: format === 'svg' || format === 'png' ? 'notation' : 'other',
          model_used: 'upload',
          tags: [],
          is_element: true,
          element_type: 'decorativo',
          source: 'upload',
          metadata: {},
        })
        .select('id, image_url, svg_code, label, category, image_format, element_type, tags')
        .single()
      if (error) throw error

      const asset = data as unknown as ElementLibraryAsset
      setAssets(prev => [asset, ...prev])
      toast.success('Elemento enviado para a biblioteca.')
    } catch (error) {
      toast.error(`Erro ao enviar elemento: ${error instanceof Error ? error.message.slice(0, 90) : 'falha desconhecida'}`)
    } finally {
      setUploading(false)
    }
  }, [schoolId])

  const handleGenerateElement = useCallback(async () => {
    if (!schoolId) {
      toast.error('Escola nao carregada para gerar o elemento.')
      return
    }

    const label = generateLabel.trim()
    const prompt = generatePrompt.trim()

    if (!label || !prompt) {
      toast.error('Preencha nome e descricao do elemento.')
      return
    }

    const tags = generateTags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)

    setGeneratingElement(true)
    setGenerateProgress('Preparando geracao...')

    try {
      const asset = await generateAndSaveElement(
        schoolId,
        {
          label,
          prompt,
          format: generateFormat,
          elementType: generateElementType,
          tags,
        },
        setGenerateProgress,
      )

      setAssets(prev => [asset, ...prev.filter(item => item.id !== asset.id)])
      setSearch('')
      setElementType('todos')
      setActiveTab('todos')
      setGeneratorOpen(false)
      setGenerateLabel('')
      setGeneratePrompt('')
      setGenerateTags('')
      toast.success('Elemento gerado na biblioteca.')
    } catch (error) {
      toast.error(`Erro ao gerar elemento: ${error instanceof Error ? error.message.slice(0, 100) : 'falha desconhecida'}`)
    } finally {
      setGeneratingElement(false)
      setGenerateProgress('')
    }
  }, [
    generateElementType,
    generateFormat,
    generateLabel,
    generatePrompt,
    generateTags,
    schoolId,
  ])

  const handleDeleteElement = useCallback(async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await deleteImage(deleteTarget.id, deleteTarget.image_url ?? undefined)
      setAssets(prev => prev.filter(asset => asset.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Elemento excluido da biblioteca.')
    } catch (error) {
      toast.error(`Erro ao excluir elemento: ${error instanceof Error ? error.message.slice(0, 90) : 'falha desconhecida'}`)
    } finally {
      setDeletingId(null)
    }
  }, [deleteTarget])

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[360px] border-r border-border bg-surface p-0 sm:max-w-[360px]">
        <SheetHeader className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Shapes size={17} weight="bold" />
            </div>
            <div>
              <SheetTitle className="font-serif text-[18px] text-text">Elementos</SheetTitle>
              <SheetDescription className="text-[11px] text-text3">
                Insira SVG, PNG, JPG ou WebP como elementos livres da pagina.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-3 border-b border-border px-4 py-3">
          <div className="relative">
            <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por nome ou tag..."
              className="h-9 pl-9 text-[12px]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DRAWER_TABS.map(tab => (
              <Button
                key={tab.value}
                type="button"
                variant={activeTab === tab.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 shrink-0 px-2 text-[10px]"
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 text-[12px]"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploading || generatingElement}
            >
              {uploading ? <SpinnerGap size={14} className="animate-spin" /> : <UploadSimple size={14} />}
              Enviar
            </Button>
            <Button
              type="button"
              variant={generatorOpen ? 'default' : 'outline'}
              className="h-9 gap-2 text-[12px]"
              onClick={() => setGeneratorOpen(value => !value)}
              disabled={uploading || generatingElement}
            >
              {generatingElement ? <SpinnerGap size={14} className="animate-spin" /> : <Sparkle size={14} />}
              Gerar
            </Button>
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/svg+xml,.svg,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUpload}
          />

          {generatorOpen && (
            <div className="space-y-3 rounded-md border border-border bg-card p-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={generateFormat === 'svg' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-[10px]"
                  onClick={() => setGenerateFormat('svg')}
                  disabled={generatingElement}
                >
                  SVG editavel
                </Button>
                <Button
                  type="button"
                  variant={generateFormat === 'png' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-[10px]"
                  onClick={() => setGenerateFormat('png')}
                  disabled={generatingElement}
                >
                  PNG transp.
                </Button>
              </div>

              <Input
                value={generateLabel}
                onChange={event => setGenerateLabel(event.target.value)}
                placeholder="Nome: clave de sol"
                className="h-9 text-[12px]"
                disabled={generatingElement}
              />

              <textarea
                value={generatePrompt}
                onChange={event => setGeneratePrompt(event.target.value)}
                placeholder="Descreva o elemento: icone monocromatico de uma caixa de bateria com duas baquetas cruzadas"
                className="min-h-[74px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-[12px] outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                disabled={generatingElement}
              />

              <div className="flex flex-wrap gap-1.5">
                {GENERATOR_TYPES.map(type => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={generateElementType === type.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => setGenerateElementType(type.value)}
                    disabled={generatingElement}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>

              <Input
                value={generateTags}
                onChange={event => setGenerateTags(event.target.value)}
                placeholder="Tags opcionais: clave, sol, notacao"
                className="h-8 text-[11px]"
                disabled={generatingElement}
              />

              {generateProgress && (
                <div className="flex items-center gap-2 rounded-md bg-accent/5 px-2.5 py-2 text-[10px] text-text2">
                  <SpinnerGap size={13} className="animate-spin text-accent" />
                  {generateProgress}
                </div>
              )}

              <Button
                type="button"
                className="h-9 w-full gap-2 text-[12px]"
                onClick={() => void handleGenerateElement()}
                disabled={generatingElement}
              >
                {generatingElement ? <SpinnerGap size={14} className="animate-spin" /> : <Sparkle size={14} />}
                Gerar elemento
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-4 py-4" onScroll={handleScroll}>
          {activeTab === 'add' ? (
            <FloatingElementLibraryPanel
              title="Criar elemento na pagina"
              layersLabel="Camadas"
              onAddText={onAddText}
              onOpenImagePicker={onOpenImagePicker}
              onAddShape={onAddShape}
              onAddIcon={onAddIcon}
              onToggleLayers={onToggleLayers}
              layersPanel={layersPanel}
            />
          ) : activeTab === 'forma' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {SHAPE_OPTIONS.map(item => (
                  <Button
                    key={item.shape}
                    variant="outline"
                    className="h-16 flex-col gap-1 text-[11px]"
                    onClick={() => onAddShape(item.shape)}
                  >
                    <Shapes size={18} />
                    {item.label}
                  </Button>
                ))}
              </div>
              {visibleAssets.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="mb-2 text-[10px] uppercase tracking-wider text-text3">Formas salvas</div>
                  <div className="grid grid-cols-4 gap-2 pb-4">
                    {visibleAssets.map(asset => {
                      const canInsert = Boolean(asset.image_url)
                      const displaySvg = getElementAssetDisplaySvg(asset)
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          className={cn('min-h-[112px] rounded-md border border-border bg-card text-left transition hover:border-accent hover:shadow-sm', !canInsert && 'cursor-not-allowed opacity-50')}
                          onClick={() => canInsert ? onSelectElement(asset) : toast.info('SVG inline entra na proxima passada. Use assets com image_url agora.')}
                        >
                          <div className="flex h-20 items-center justify-center rounded-t-md border-b border-border bg-bg2 p-1.5">
                            {displaySvg ? <div className="flex h-full w-full items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full" dangerouslySetInnerHTML={{ __html: displaySvg }} /> : asset.image_url ? <img src={asset.image_url} alt={asset.label} className="h-full w-full object-contain" loading="lazy" /> : <ImageIcon size={18} className="text-text3" />}
                          </div>
                          <div className="truncate px-1.5 py-1.5 text-[9px] font-semibold text-text">{asset.label}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'iconify' ? (
            <div className="grid grid-cols-4 gap-2 pb-4">
              {ICONIFY_ELEMENT_OPTIONS
                .filter(option => !search.trim() || `${option.label} ${option.collection}`.toLowerCase().includes(search.trim().toLowerCase()))
                .map(option => (
                  <Button
                    key={option.icon}
                    type="button"
                    variant="outline"
                    className="h-20 flex-col gap-2 text-[10px]"
                    onClick={() => onAddIcon(option.icon, option.label)}
                  >
                    <Icon icon={option.icon} className="h-6 w-6" aria-hidden="true" />
                    <span className="max-w-full truncate">{option.label}</span>
                  </Button>
                ))}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-[12px] text-text3">
              <SpinnerGap size={18} className="animate-spin" />
              Carregando elementos...
            </div>
          ) : loadError && visibleAssets.length === 0 ? (
            <div className="rounded-md border border-dashed border-dourado/40 bg-dourado/5 px-4 py-10 text-center">
              <Shapes size={30} className="mx-auto mb-2 text-dourado" />
              <p className="text-[12px] font-medium text-text">Biblioteca de elementos ainda nao ativada</p>
              <p className="mt-1 text-[10px] leading-relaxed text-text3">
                A migration de elementos precisa estar aplicada no Supabase para buscar por is_element.
              </p>
            </div>
          ) : visibleAssets.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-bg2/40 px-4 py-10 text-center">
              <ImageIcon size={30} className="mx-auto mb-2 text-text3/50" />
              <p className="text-[12px] font-medium text-text">Nenhum elemento encontrado</p>
              <p className="mt-1 text-[10px] leading-relaxed text-text3">
                Envie um arquivo ou gere um SVG/PNG novo aqui pelo picker.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 pb-4">
              {visibleAssets.map(asset => {
                const canInsert = Boolean(asset.image_url)
                const isCurated = asset.id.startsWith('curated-music-')
                const displaySvg = getElementAssetDisplaySvg(asset)
                return (
                  <div
                    key={asset.id}
                    className={cn(
                      'group relative flex min-h-[112px] flex-col rounded-md border border-border bg-card text-left transition hover:border-accent hover:shadow-sm',
                      !canInsert && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-h-[112px] w-full flex-col text-left"
                      onClick={() => {
                        if (!canInsert) {
                          toast.info('SVG inline entra na proxima passada. Use assets com image_url agora.')
                          return
                        }
                        onSelectElement(asset)
                      }}
                    >
                      <div
                        className="flex h-20 w-full items-center justify-center rounded-t-md border-b border-border bg-bg2 p-1.5"
                        style={asset.tags?.includes('fundo-transparente') ? {
                          backgroundImage: 'repeating-conic-gradient(#d7dce4 0% 25%, #ffffff 0% 50%)',
                          backgroundSize: '10px 10px',
                        } : undefined}
                      >
                        {displaySvg ? (
                          <div
                            className="flex h-full w-full items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                            dangerouslySetInnerHTML={{ __html: displaySvg }}
                          />
                        ) : asset.image_url ? (
                          <img
                            src={asset.image_url}
                            alt={asset.label}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon size={18} className="text-text3" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 px-1.5 py-1.5">
                        <div className="truncate text-[9px] font-semibold text-text">{asset.label}</div>
                        <Badge variant="outline" className="mt-1 max-w-full truncate px-1 py-0 text-[8px]">
                          {asset.element_type || asset.category || asset.image_format || 'elemento'}
                        </Badge>
                      </div>
                    </button>
                    {!isCurated && (
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-text3 opacity-0 shadow-sm ring-1 ring-border transition hover:text-vermelho group-hover:opacity-100"
                        title="Excluir elemento"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setDeleteTarget(asset)
                        }}
                      >
                        {deletingId === asset.id ? <SpinnerGap size={12} className="animate-spin" /> : <Trash size={12} />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {loadingMore && (
            <div className="flex items-center justify-center gap-2 pb-4 text-[11px] text-text3">
              <SpinnerGap size={14} className="animate-spin" />
              Carregando mais...
            </div>
          )}
        </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(openAlert) => { if (!openAlert) setDeleteTarget(null) }}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove o item da biblioteca de elementos. Se ele foi enviado para o bucket content-images,
              o arquivo tambem sera removido do Storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-vermelho hover:bg-vermelho/80"
              disabled={!!deletingId}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteElement()
              }}
            >
              {deletingId ? <SpinnerGap size={14} className="animate-spin" /> : <Trash size={14} />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
