import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Guitar, FirstAid, HandPointing, TreeStructure, SmileyWink,
  MusicNotesSimple, Image, BookOpen, Sparkle,
  CircleNotch, Check, X,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  generateAndSaveImage,
  IMAGE_CATEGORIES,
  IMAGE_STYLES,
  type ImageCategory,
  type ImageStyle,
  type ImageLibraryItem,
  type GenerateImageRequest,
} from '@/services/imageGenerationService'

// Mapeamento de nome de ícone → componente Phosphor
const ICON_MAP: Record<string, typeof Guitar> = {
  Guitar,
  FirstAid,
  HandPointing,
  TreeStructure,
  SmileyWink,
  MusicNotesSimple,
  Image,
  BookOpen,
  Sparkle,
}

const RESOLUTIONS: { label: string; width: number; height: number }[] = [
  { label: '512×512', width: 512, height: 512 },
  { label: '1024×1024', width: 1024, height: 1024 },
  { label: '1024×768', width: 1024, height: 768 },
  { label: '768×1024', width: 768, height: 1024 },
]

const SCHOOL_ID = 'a1b2c3d4-0001-4000-8000-000000000001'

interface ImageGeneratorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImageGenerated?: (image: ImageLibraryItem) => void
}

export function ImageGeneratorModal({ open, onOpenChange, onImageGenerated }: ImageGeneratorModalProps) {
  const [category, setCategory] = useState<ImageCategory>('instrument')
  const [style, setStyle] = useState<ImageStyle>('realistic')
  const [label, setLabel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [tags, setTags] = useState('')
  const [resolution, setResolution] = useState(1) // index em RESOLUTIONS (1024×1024)

  const [generating, setGenerating] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [generatedImage, setGeneratedImage] = useState<ImageLibraryItem | null>(null)

  const resetForm = useCallback((keepCategory = false) => {
    if (!keepCategory) setCategory('instrument')
    setStyle('realistic')
    setLabel('')
    setPrompt('')
    setTags('')
    setResolution(1)
    setGenerating(false)
    setProgressText('')
    setGeneratedImage(null)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Descreva a imagem que deseja gerar')
      return
    }
    if (!label.trim()) {
      toast.error('Informe um label/nome para a imagem')
      return
    }

    setGenerating(true)
    setProgressText('Preparando...')

    try {
      const res = RESOLUTIONS[resolution]
      const request: GenerateImageRequest = {
        prompt: prompt.trim(),
        category,
        style,
        label: label.trim(),
        subcategory: undefined,
        tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        width: res.width,
        height: res.height,
      }

      const image = await generateAndSaveImage(SCHOOL_ID, request, setProgressText)
      setGeneratedImage(image)
      setProgressText('')
      toast.success('Imagem gerada com sucesso!')
      onImageGenerated?.(image)
    } catch (err: any) {
      console.error('Erro ao gerar imagem:', err)
      toast.error(`Erro: ${err.message || 'Falha na geração'}`)
      setProgressText('')
    } finally {
      setGenerating(false)
    }
  }, [prompt, label, category, style, tags, resolution, onImageGenerated])

  const handleClose = useCallback(() => {
    if (!generating) {
      resetForm()
      onOpenChange(false)
    }
  }, [generating, resetForm, onOpenChange])

  const handleGenerateAnother = useCallback(() => {
    const keepCat = category
    resetForm(true)
    setCategory(keepCat)
  }, [category, resetForm])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            Gerar <span className="text-accent">Imagem</span> com IA
          </DialogTitle>
        </DialogHeader>

        {/* Estado: imagem gerada → preview */}
        {generatedImage ? (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-border bg-black/5 flex items-center justify-center" style={{ maxHeight: 400 }}>
              {generatedImage.svg_code ? (
                <div
                  className="w-full flex items-center justify-center p-4"
                  dangerouslySetInnerHTML={{ __html: generatedImage.svg_code }}
                  style={{ maxHeight: 380 }}
                />
              ) : generatedImage.image_url ? (
                <img
                  src={generatedImage.image_url}
                  alt={generatedImage.label}
                  className="max-h-[380px] object-contain"
                />
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-sm text-grow font-medium">
              <Check size={18} weight="bold" />
              Salvo na biblioteca!
            </div>

            <div className="text-xs text-text3 space-y-0.5">
              <div><strong>Modelo:</strong> {generatedImage.model_used} · <strong>Formato:</strong> {generatedImage.image_format?.toUpperCase()} · {generatedImage.width}×{generatedImage.height}</div>
              <div><strong>Tamanho:</strong> {generatedImage.file_size_bytes ? `${(generatedImage.file_size_bytes / 1024).toFixed(0)}KB` : '—'}</div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleClose}>Fechar</Button>
              <Button onClick={handleGenerateAnother}>
                <Sparkle size={16} weight="fill" /> Gerar Outra
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Estado: formulário de geração */
          <div className="space-y-5">
            {/* Categoria */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text3 mb-2 block">Categoria</Label>
              <div className="grid grid-cols-5 gap-2">
                {IMAGE_CATEGORIES.map(cat => {
                  const Icon = ICON_MAP[cat.icon] || Sparkle
                  const active = category === cat.value
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all text-[11px] leading-tight ${
                        active
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border hover:border-accent/30 text-text2 hover:text-text'
                      }`}
                      title={cat.description}
                    >
                      <Icon size={22} weight={active ? 'fill' : 'regular'} />
                      <span className="font-medium">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Estilo */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text3 mb-2 block">Estilo</Label>
              <div className="flex flex-wrap gap-2">
                {IMAGE_STYLES.map(s => {
                  const active = style === s.value
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStyle(s.value)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        active
                          ? 'border-accent bg-accent/10 text-accent font-semibold'
                          : 'border-border text-text2 hover:border-accent/30'
                      }`}
                      title={s.description}
                    >
                      {s.label} <span className="text-text3 ml-1">{s.cost}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Ex: Violão Clássico, Laringe Vista Superior"
                disabled={generating}
              />
            </div>

            {/* Prompt */}
            <div className="space-y-1.5">
              <Label>Descreva a imagem</Label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Um violão clássico de nylon, corpo em madeira clara, visto de frente, fundo branco limpo, estilo editorial para material didático..."
                className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y disabled:opacity-50"
                disabled={generating}
                rows={3}
              />
              <p className="text-[10px] text-text3">
                O system prompt da categoria selecionada será adicionado automaticamente.
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags <span className="text-text3 font-normal">(opcional, separadas por vírgula)</span></Label>
              <Input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="violão, instrumento, cordas"
                disabled={generating}
              />
            </div>

            {/* Resolução */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text3 mb-2 block">Resolução</Label>
              <div className="flex gap-2">
                {RESOLUTIONS.map((res, idx) => {
                  const active = resolution === idx
                  return (
                    <button
                      key={res.label}
                      type="button"
                      onClick={() => setResolution(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        active
                          ? 'border-accent bg-accent/10 text-accent font-semibold'
                          : 'border-border text-text2 hover:border-accent/30'
                      }`}
                    >
                      {res.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Progresso */}
            {generating && (
              <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl">
                <CircleNotch size={20} className="text-accent animate-spin" />
                <span className="text-sm text-accent font-medium">{progressText || 'Processando...'}</span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleClose} disabled={generating}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={generating || !prompt.trim() || !label.trim()}>
                {generating ? (
                  <><CircleNotch size={16} className="animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkle size={16} weight="fill" /> Gerar Imagem</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
