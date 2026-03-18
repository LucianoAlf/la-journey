import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Guitar, FirstAid, HandPointing, TreeStructure, SmileyWink,
  MusicNotesSimple, Image, BookOpen, Sparkle, UserCircle,
  CircleNotch, Check, X, ImageSquare, MagicWand,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  generateAndSaveImage,
  enhancePrompt,
  enhancePromptWithAI,
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
  UserCircle,
}

const CATEGORY_PLACEHOLDERS: Record<ImageCategory, string> = {
  instrument: 'Ex: Um violão clássico de nylon, corpo em madeira clara, visto de frente, fundo branco limpo...',
  anatomy: 'Ex: Laringe humana em vista superior, mostrando pregas vocais abertas, cartilagem tireóidea e traqueia...',
  technique: 'Ex: Mão direita posicionada no braço do violão, dedos em formato de acorde de Dó maior, vista frontal...',
  diagram: 'Ex: Infográfico mostrando a família dos instrumentos de corda, com ícones e nomes de cada instrumento...',
  mascot: 'Ex: Um personagem simpático de gato tocando guitarra, estilo cartoon infantil, cores vibrantes...',
  notation: 'Ex: Clave de Sol com as notas musicais na pauta, do Dó ao Si, com nomes das notas abaixo...',
  scene: 'Ex: Sala de aula de música com crianças tocando instrumentos, ambiente alegre e colorido...',
  cover: 'Ex: Capa para apostila de violão nível iniciante, com violão e notas musicais, estilo moderno...',
  character: 'Ex: A personagem tocando piano numa sala de aula colorida, sorrindo, com notas musicais ao redor...',
  other: 'Descreva a imagem que deseja gerar...',
}

const CATEGORY_LABEL_PLACEHOLDERS: Record<ImageCategory, string> = {
  instrument: 'Ex: Violão Clássico, Guitarra Elétrica, Piano de Cauda',
  anatomy: 'Ex: Laringe Vista Superior, Aparelho Fonador, Diafragma',
  technique: 'Ex: Posição Mão Direita Violão, Postura Pianista',
  diagram: 'Ex: Família das Cordas, Ciclo de Quintas',
  mascot: 'Ex: Gato Guitarrista, Urso Baterista',
  notation: 'Ex: Clave de Sol, Figuras Rítmicas, Armaduras',
  scene: 'Ex: Sala de Aula Musical, Palco de Recital',
  cover: 'Ex: Capa Apostila Violão Foundation',
  character: 'Ex: Anne Tocando Piano, Felipe com Maracas',
  other: 'Ex: Dê um nome para a imagem',
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
  const [style, setStyle] = useState<ImageStyle>('illustration')
  const [label, setLabel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [tags, setTags] = useState('')
  const [resolution, setResolution] = useState(1) // index em RESOLUTIONS (1024×1024)

  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [referencePreviews, setReferencePreviews] = useState<string[]>([])

  const [useAIEnhance, setUseAIEnhance] = useState(false)
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [generatedImage, setGeneratedImage] = useState<ImageLibraryItem | null>(null)
  const [transparentBg, setTransparentBg] = useState(false)

  const resetForm = useCallback((keepCategory = false) => {
    if (!keepCategory) setCategory('instrument')
    setStyle('illustration')
    setLabel('')
    setPrompt('')
    setTags('')
    setResolution(1)
    setReferenceFiles([])
    setReferencePreviews([])
    setUseAIEnhance(false)
    setEnhancedPrompt(null)
    setGenerating(false)
    setProgressText('')
    setGeneratedImage(null)
    setTransparentBg(false)
  }, [])

  const handleCategoryChange = useCallback((newCategory: ImageCategory) => {
    setCategory(newCategory)
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
      // Melhorar o prompt
      let finalPrompt: string

      if (useAIEnhance) {
        setProgressText('Melhorando prompt com IA...')
        finalPrompt = await enhancePromptWithAI(prompt.trim(), category, style)
        setEnhancedPrompt(finalPrompt)
      } else {
        finalPrompt = enhancePrompt(prompt.trim(), category, style)
      }

      const res = RESOLUTIONS[resolution]
      const request: GenerateImageRequest = {
        prompt: finalPrompt,
        category,
        style,
        label: label.trim(),
        subcategory: undefined,
        tags: [
          ...tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          ...(transparentBg ? ['fundo-transparente'] : []),
        ],
        width: res.width,
        height: res.height,
        referenceFiles: referenceFiles.length > 0 ? referenceFiles : undefined,
        transparentBackground: transparentBg,
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
  }, [prompt, label, category, style, tags, resolution, referenceFiles, useAIEnhance, transparentBg, onImageGenerated])

  const handleClose = useCallback(() => {
    if (!generating) {
      resetForm()
      onOpenChange(false)
    }
  }, [generating, resetForm, onOpenChange])

  const handleGenerateAnother = useCallback(() => {
    const keepCat = category
    const keepTransparent = transparentBg
    resetForm(true)
    setCategory(keepCat)
    setTransparentBg(keepTransparent)
  }, [category, transparentBg, resetForm])

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
            <div
              className="rounded-xl overflow-hidden border border-border flex items-center justify-center"
              style={{
                maxHeight: 400,
                ...(generatedImage.tags?.includes('fundo-transparente') ? {
                  backgroundImage: 'repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)',
                  backgroundSize: '16px 16px',
                } : { background: 'rgba(0,0,0,0.05)' }),
              }}
            >
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
              <div><strong>Formato:</strong> {generatedImage.image_format?.toUpperCase()} · {generatedImage.width}×{generatedImage.height}</div>
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
                      onClick={() => handleCategoryChange(cat.value)}
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
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Imagem de referência — SEMPRE visível, SEMPRE opcional, múltiplas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-text3 uppercase tracking-wider">
                  Imagens de Referência
                </Label>
                <span className="text-[10px] text-text3/50">(opcional · até 10 imagens)</span>
              </div>
              <p className="text-[11px] text-text3/70">
                Envie imagens para que a IA mantenha o estilo, personagem ou referência visual.
              </p>

              {/* Grid de previews das imagens já adicionadas */}
              {referencePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {referencePreviews.map((preview, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={preview}
                        alt={`Referência ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(preview)
                          setReferenceFiles(prev => prev.filter((_, i) => i !== idx))
                          setReferencePreviews(prev => prev.filter((_, i) => i !== idx))
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-vermelho text-white rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Área de upload com drag & drop */}
              {referenceFiles.length < 10 && (
                <label
                  className="flex items-center gap-3 w-full h-16 border border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors px-4"
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.classList.add('bg-accent/10', 'border-accent')
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.classList.remove('bg-accent/10', 'border-accent')
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.classList.remove('bg-accent/10', 'border-accent')
                    const droppedFiles = Array.from(e.dataTransfer.files).filter(
                      f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
                    )
                    if (droppedFiles.length === 0) {
                      toast.error('Envie imagens válidas (PNG, JPG, WebP até 5MB)')
                      return
                    }
                    const remaining = 10 - referenceFiles.length
                    const toAdd = droppedFiles.slice(0, remaining)
                    setReferenceFiles(prev => [...prev, ...toAdd])
                    setReferencePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
                  }}
                >
                  <ImageSquare size={24} className="text-text3/40" />
                  <div>
                    <span className="text-[12px] text-text3/60">Clique ou arraste imagens</span>
                    <span className="text-[10px] text-text3/40 block">PNG, JPG, WebP até 5MB cada</span>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      const valid = files.filter(f => f.size <= 5 * 1024 * 1024)
                      if (valid.length < files.length) {
                        toast.error('Algumas imagens excederam 5MB e foram ignoradas.')
                      }
                      const remaining = 10 - referenceFiles.length
                      const toAdd = valid.slice(0, remaining)
                      setReferenceFiles(prev => [...prev, ...toAdd])
                      setReferencePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder={CATEGORY_LABEL_PLACEHOLDERS[category]}
                disabled={generating}
              />
            </div>

            {/* Prompt */}
            <div className="space-y-1.5">
              <Label>Descreva a imagem</Label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={CATEGORY_PLACEHOLDERS[category]}
                className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y disabled:opacity-50"
                disabled={generating}
                rows={3}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-text3">
                  O system prompt da categoria selecionada será adicionado automaticamente.
                </p>
                <div className="flex items-center gap-4 shrink-0">
                  {/* Toggle Fundo Transparente */}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transparentBg}
                      onChange={(e) => setTransparentBg(e.target.checked)}
                      className="rounded border-border text-green-500 focus:ring-green-500 h-3.5 w-3.5"
                      disabled={generating}
                    />
                    <span className="text-[11px] text-text3">
                      🟩 Fundo Transparente
                    </span>
                  </label>

                  {/* Toggle Melhorar Prompt */}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAIEnhance}
                      onChange={(e) => {
                        setUseAIEnhance(e.target.checked)
                        if (!e.target.checked) setEnhancedPrompt(null)
                      }}
                      className="rounded border-border text-accent focus:ring-accent h-3.5 w-3.5"
                      disabled={generating}
                    />
                    <MagicWand size={14} className="text-text3" />
                    <span className="text-[11px] text-text3">
                      Melhorar Prompt
                    </span>
                  </label>
                </div>
              </div>

              {enhancedPrompt && (
                <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-accent font-semibold uppercase tracking-wider">
                      Prompt Melhorado pela IA
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnhancedPrompt(null)}
                      className="text-[10px] text-text3 hover:text-text"
                    >
                      Descartar
                    </button>
                  </div>
                  <p className="text-[11px] text-text2 leading-relaxed">
                    {enhancedPrompt}
                  </p>
                </div>
              )}
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
              <Button onClick={handleGenerate} disabled={
                generating ||
                !prompt.trim() ||
                !label.trim()
              }>
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
