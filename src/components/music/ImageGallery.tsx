import { useState, useEffect, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MagnifyingGlass, Heart, Trash, Download, Copy,
  Sparkle, ImageSquare, CircleNotch, Star, X,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  fetchImageLibrary,
  toggleFavorite,
  deleteImage,
  IMAGE_CATEGORIES,
  type ImageCategory,
  type ImageLibraryItem,
} from '@/services/imageGenerationService'

const SCHOOL_ID = 'a1b2c3d4-0001-4000-8000-000000000001'

const MODEL_BADGES: Record<string, { label: string; className: string }> = {
  'recraft-v3': { label: 'Recraft V3', className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' },
  'nano-banana-pro': { label: 'Nano Banana', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  'flux-2-pro': { label: 'Flux 2 Pro', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
}

const FORMAT_BADGES: Record<string, { label: string; className: string }> = {
  svg: { label: 'SVG', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  png: { label: 'PNG', className: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  webp: { label: 'WebP', className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  jpeg: { label: 'JPEG', className: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
}

interface ImageGalleryProps {
  onOpenGenerator: () => void
  /** Imagem recém-gerada para adicionar ao início da lista sem refetch */
  newImage?: ImageLibraryItem | null
}

export function ImageGallery({ onOpenGenerator, newImage }: ImageGalleryProps) {
  const [images, setImages] = useState<ImageLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('todas')
  const [showFavorites, setShowFavorites] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ImageLibraryItem | null>(null)

  // Buscar imagens do banco
  const loadImages = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchImageLibrary(SCHOOL_ID)
      setImages(data)
    } catch (err) {
      console.error('Erro ao carregar imagens:', err)
      toast.error('Erro ao carregar biblioteca de imagens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadImages()
  }, [loadImages])

  // Quando uma nova imagem é gerada, adicionar ao início
  useEffect(() => {
    if (newImage) {
      setImages(prev => {
        // Evitar duplicatas
        if (prev.some(img => img.id === newImage.id)) return prev
        return [newImage, ...prev]
      })
    }
  }, [newImage])

  // Filtrar imagens
  const filteredImages = useMemo(() => {
    let list = images
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(img =>
        img.label.toLowerCase().includes(q) ||
        (img.prompt || '').toLowerCase().includes(q) ||
        (img.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }
    if (categoryFilter !== 'todas') {
      list = list.filter(img => img.category === categoryFilter)
    }
    if (showFavorites) {
      list = list.filter(img => img.is_favorite)
    }
    return list
  }, [images, search, categoryFilter, showFavorites])

  // Toggle favorito
  const handleToggleFavorite = useCallback(async (img: ImageLibraryItem, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const newVal = !img.is_favorite
      await toggleFavorite(img.id, newVal)
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, is_favorite: newVal } : i))
      if (selectedImage?.id === img.id) {
        setSelectedImage(prev => prev ? { ...prev, is_favorite: newVal } : null)
      }
    } catch {
      toast.error('Erro ao atualizar favorito')
    }
  }, [selectedImage])

  // Deletar imagem
  const handleDelete = useCallback(async (img: ImageLibraryItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm(`Deletar "${img.label}"?`)) return
    try {
      await deleteImage(img.id, img.image_url)
      setImages(prev => prev.filter(i => i.id !== img.id))
      if (selectedImage?.id === img.id) setSelectedImage(null)
      toast.success('Imagem deletada')
    } catch {
      toast.error('Erro ao deletar imagem')
    }
  }, [selectedImage])

  // Copiar URL
  const handleCopyUrl = useCallback((img: ImageLibraryItem) => {
    const url = img.image_url || ''
    if (url) {
      navigator.clipboard.writeText(url)
      toast.success('URL copiada!')
    }
  }, [])

  // Download
  const handleDownload = useCallback((img: ImageLibraryItem) => {
    const url = img.image_url
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `${img.label.replace(/\s+/g, '_')}.${img.image_format || 'png'}`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  // Formatar data
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div>
      {/* Banner */}
      <div className="flex items-center gap-2.5 py-3.5 px-5 bg-foundation-soft border border-[rgba(99,102,241,0.2)] rounded-[var(--radius)] mb-4">
        <span className="text-lg">🤖</span>
        <div className="flex-1">
          <div className="font-bold text-foundation">Geração de Imagens via IA (fal.ai)</div>
          <div className="text-sm text-text2">Gere imagens reais para materiais: instrumentos, anatomia vocal, cenas musicais, diagramas</div>
        </div>
        <Button size="sm" onClick={onOpenGenerator}>
          <Sparkle size={16} weight="fill" /> Gerar Imagem
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar imagens..."
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text3 hover:text-text"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {IMAGE_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showFavorites ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setShowFavorites(!showFavorites)}
          className="h-8"
        >
          <Star size={16} weight={showFavorites ? 'fill' : 'regular'} />
          Favoritos
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-text3">
          <CircleNotch size={24} className="animate-spin" />
          <span>Carregando imagens...</span>
        </div>
      ) : filteredImages.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <ImageSquare size={48} className="text-text3" />
          <div className="text-center">
            <div className="font-semibold text-text2 mb-1">
              {images.length === 0 ? 'Nenhuma imagem gerada ainda' : 'Nenhuma imagem encontrada'}
            </div>
            <div className="text-sm text-text3 mb-4">
              {images.length === 0
                ? 'Gere sua primeira imagem com IA para começar'
                : 'Tente ajustar os filtros de busca'}
            </div>
          </div>
          {images.length === 0 && (
            <Button onClick={onOpenGenerator}>
              <Sparkle size={16} weight="fill" /> Gerar Primeira Imagem
            </Button>
          )}
        </div>
      ) : (
        /* Grid de imagens */
        <>
          <div className="grid grid-cols-4 gap-3">
            {filteredImages.map(img => (
              <div
                key={img.id}
                className="card p-0 overflow-hidden cursor-pointer hover:border-accent/30 transition-all group"
                onClick={() => setSelectedImage(img)}
              >
                {/* Thumbnail */}
                <div className="aspect-[4/3] bg-black/5 flex items-center justify-center overflow-hidden relative">
                  {img.svg_code ? (
                    <div
                      className="w-full h-full flex items-center justify-center p-2 [&>svg]:max-w-full [&>svg]:max-h-full"
                      dangerouslySetInnerHTML={{ __html: img.svg_code }}
                    />
                  ) : img.image_url ? (
                    <img
                      src={img.image_url}
                      alt={img.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <ImageSquare size={32} className="text-text3" />
                  )}

                  {/* Overlay com ações */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-start justify-end p-1.5 gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => handleToggleFavorite(img, e)}
                      className="p-1 rounded-md bg-black/40 text-white hover:bg-black/60 transition-colors"
                      title={img.is_favorite ? 'Remover favorito' : 'Favoritar'}
                    >
                      <Heart size={14} weight={img.is_favorite ? 'fill' : 'regular'} className={img.is_favorite ? 'text-red-400' : ''} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(img, e)}
                      className="p-1 rounded-md bg-black/40 text-white hover:bg-red-500/80 transition-colors"
                      title="Deletar"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <div className="font-bold text-xs truncate mb-1">{img.label}</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {MODEL_BADGES[img.model_used] && (
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${MODEL_BADGES[img.model_used].className}`}>
                        {MODEL_BADGES[img.model_used].label}
                      </Badge>
                    )}
                    {FORMAT_BADGES[img.image_format] && (
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${FORMAT_BADGES[img.image_format].className}`}>
                        {FORMAT_BADGES[img.image_format].label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-text3 mt-3">
            Mostrando {filteredImages.length} {filteredImages.length === 1 ? 'imagem' : 'imagens'}
            {filteredImages.length < images.length && ` de ${images.length}`}
          </div>
        </>
      )}

      {/* Dialog de detalhes da imagem */}
      <Dialog open={!!selectedImage} onOpenChange={(v) => { if (!v) setSelectedImage(null) }}>
        {selectedImage && (
          <DialogContent className="sm:max-w-[700px] bg-surface border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-[20px] truncate pr-8">
                {selectedImage.label}
              </DialogTitle>
            </DialogHeader>

            {/* Imagem grande */}
            <div className="rounded-xl overflow-hidden border border-border bg-black/5 flex items-center justify-center" style={{ maxHeight: 400 }}>
              {selectedImage.svg_code ? (
                <div
                  className="w-full flex items-center justify-center p-4 [&>svg]:max-w-full [&>svg]:max-h-[380px]"
                  dangerouslySetInnerHTML={{ __html: selectedImage.svg_code }}
                />
              ) : selectedImage.image_url ? (
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.label}
                  className="max-h-[380px] object-contain"
                />
              ) : null}
            </div>

            {/* Metadados */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-text2 mt-2">
              <div>
                <span className="text-text3">Modelo:</span>{' '}
                <span className="font-medium">{MODEL_BADGES[selectedImage.model_used]?.label || selectedImage.model_used}</span>
              </div>
              <div>
                <span className="text-text3">Formato:</span>{' '}
                <span className="font-medium">{selectedImage.image_format?.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-text3">Resolução:</span>{' '}
                <span className="font-medium">{selectedImage.width}×{selectedImage.height}</span>
              </div>
              <div>
                <span className="text-text3">Tamanho:</span>{' '}
                <span className="font-medium">{selectedImage.file_size_bytes ? `${(selectedImage.file_size_bytes / 1024).toFixed(0)}KB` : '—'}</span>
              </div>
              <div>
                <span className="text-text3">Estilo:</span>{' '}
                <span className="font-medium capitalize">{selectedImage.style || '—'}</span>
              </div>
              <div>
                <span className="text-text3">Categoria:</span>{' '}
                <span className="font-medium">{IMAGE_CATEGORIES.find(c => c.value === selectedImage.category)?.label || selectedImage.category}</span>
              </div>
              <div className="col-span-2">
                <span className="text-text3">Gerado em:</span>{' '}
                <span className="font-medium">{formatDate(selectedImage.created_at)}</span>
              </div>
            </div>

            {/* Prompt */}
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-text3 mb-1">Prompt</div>
              <div className="text-xs text-text2 bg-black/5 rounded-lg p-3 max-h-[80px] overflow-y-auto">
                {selectedImage.prompt}
              </div>
            </div>

            {/* Tags */}
            {selectedImage.tags?.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-wider text-text3 mb-1">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {selectedImage.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => handleDownload(selectedImage)}>
                <Download size={14} /> Download
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleCopyUrl(selectedImage)}>
                <Copy size={14} /> Copiar URL
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleToggleFavorite(selectedImage, { stopPropagation: () => {} } as any)}>
                <Heart size={14} weight={selectedImage.is_favorite ? 'fill' : 'regular'} className={selectedImage.is_favorite ? 'text-red-400' : ''} />
                {selectedImage.is_favorite ? 'Desfavoritar' : 'Favoritar'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedImage)}>
                <Trash size={14} /> Deletar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
