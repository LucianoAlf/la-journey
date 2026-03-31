import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ClipboardText, SpinnerGap, Warning } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useSchool } from '@/hooks/useSchool'
import {
  cloneMaterialFromTemplate,
  getMaterialTemplateDetail,
  listMaterialTemplates,
  type MaterialBlockRow,
  type MaterialTemplateDetail,
  type MaterialTemplateListItem,
} from '@/services/materialService'
import { handleError } from '@/lib/supabase-error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { TemplateCard } from './TemplateCard'
import { UseTemplateDialog } from './UseTemplateDialog'

function stripHtml(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function resolveModuleTitle(block: MaterialBlockRow) {
  const content = block.content as Record<string, unknown> | null
  const html = content?.html
  const text = content?.text
  return stripHtml(html) || stripHtml(text) || block.title || 'Módulo'
}

function buildSummary(blocks: MaterialBlockRow[]) {
  const modules: { title: string; blockCount: number }[] = []
  let current: { title: string; blockCount: number } | null = null
  const blockTypeCount = new Map<string, number>()

  for (const block of blocks) {
    blockTypeCount.set(block.block_type, (blockTypeCount.get(block.block_type) ?? 0) + 1)

    if (block.block_type === 'title') {
      if (current) modules.push(current)
      current = { title: resolveModuleTitle(block), blockCount: 0 }
      continue
    }

    if (block.block_type === 'separator' || block.block_type === 'cover') {
      continue
    }

    if (current) current.blockCount += 1
  }

  if (current) modules.push(current)

  return {
    modules,
    counts: {
      text: (blockTypeCount.get('text') ?? 0) + (blockTypeCount.get('tip') ?? 0),
      notation: blockTypeCount.get('notation') ?? 0,
      exercise: blockTypeCount.get('exercise') ?? 0,
      chord: (blockTypeCount.get('chord_diagram') ?? 0) + (blockTypeCount.get('chord_grid') ?? 0),
      keyboard: (blockTypeCount.get('keyboard') ?? 0) + (blockTypeCount.get('keyboard_grid') ?? 0),
    },
  }
}

export function TemplateGallery() {
  const navigate = useNavigate()
  const { data: school } = useSchool()
  const schoolData = (school ?? null) as { id: string; name?: string | null } | null
  const schoolId = schoolData?.id
  const [templates, setTemplates] = useState<MaterialTemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<MaterialTemplateListItem | null>(null)
  const [previewDetail, setPreviewDetail] = useState<MaterialTemplateDetail | null>(null)
  const [useDialogOpen, setUseDialogOpen] = useState(false)
  const [useTemplate, setUseTemplate] = useState<MaterialTemplateListItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await listMaterialTemplates(schoolId)
        setTemplates(data)
      } catch (err) {
        console.error('Erro ao carregar templates:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [schoolId])

  const handlePreview = async (template: MaterialTemplateListItem) => {
    setPreviewTemplate(template)
    setPreviewOpen(true)
    setPreviewLoading(true)
    try {
      const detail = await getMaterialTemplateDetail(template.id)
      setPreviewDetail(detail)
    } catch (err) {
      console.error('Erro ao carregar preview do template:', err)
      toast.error('Erro ao carregar preview do template')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleUseTemplate = (template: MaterialTemplateListItem) => {
    setUseTemplate(template)
    setUseDialogOpen(true)
  }

  const handleConfirmUse = async (title: string) => {
    if (!schoolId || !useTemplate) return

    const selectedTemplate = useTemplate

    setSubmitting(true)
    try {
      const materialId = await cloneMaterialFromTemplate({
        templateId: selectedTemplate.id,
        schoolId,
        title,
      })
      toast.success('Material criado com sucesso!')
      setUseDialogOpen(false)
      setUseTemplate(null)
      navigate(`/editor/${materialId}`)
    } catch (err) {
      console.error('Erro ao clonar material a partir do template:', err)
      handleError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const previewSummary = useMemo(() => buildSummary(previewDetail?.blocks ?? []), [previewDetail])

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] bg-card border border-border p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-[20px] text-text flex items-center gap-2">
              <ClipboardText size={18} className="text-accent" />
              Usar Template
            </h2>
            <p className="text-[13px] text-text2 mt-1.5">
              Comece a partir de um material completo do banco sem alterar o fluxo de geração com IA.
            </p>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <SpinnerGap size={32} className="animate-spin text-accent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-[14px] bg-muted/30 border border-border p-8 text-center">
          <Warning size={24} className="mx-auto mb-2 text-text3" />
          <p className="text-[14px] text-text2 mb-1">Nenhum template disponível</p>
          <p className="text-[12px] text-text3">Publique um template no banco para usar este fluxo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={handlePreview}
              onUse={handleUseTemplate}
            />
          ))}
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={(open) => {
        setPreviewOpen(open)
        if (!open) {
          setPreviewDetail(null)
          setPreviewTemplate(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] bg-surface border-border overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-[22px] text-text">
              <ClipboardText size={18} className="text-accent" />
              {previewTemplate?.title}
            </DialogTitle>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <SpinnerGap size={28} className="animate-spin text-accent" />
            </div>
          ) : previewTemplate ? (
            <div className="space-y-4 overflow-hidden">
              <div className="flex flex-wrap gap-1.5">
                <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/20">
                  {previewTemplate.template_instrument || 'Universal'}
                </Badge>
                <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/20">
                  {previewTemplate.template_level || 'Sem nível'}
                </Badge>
                <Badge className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
                  Template
                </Badge>
              </div>

              <div className="text-[12px] text-text3">
                {previewDetail?.blocks.length ?? previewTemplate.block_count} blocos · {previewSummary.modules.length} módulo{previewSummary.modules.length !== 1 ? 's' : ''}
              </div>

              <Separator />

              <ScrollArea className="max-h-[48vh] pr-2">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-[13px] font-semibold text-text mb-2 flex items-center gap-2">
                      <BookOpen size={14} className="text-accent" />
                      Sumário dos módulos
                    </h3>
                    <div className="space-y-2">
                      {previewSummary.modules.map((module, index) => (
                        <div key={`${module.title}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-3 py-2">
                          <span className="text-[13px] text-text">{index + 1}. {module.title}</span>
                          <Badge variant="secondary" className="text-[10px]">{module.blockCount} bloco{module.blockCount !== 1 ? 's' : ''}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[13px] font-semibold text-text mb-2">Tipos de conteúdo</h3>
                    <div className="flex flex-wrap gap-2 text-[12px] text-text2">
                      <Badge variant="secondary">📝 {previewSummary.counts.text} textos</Badge>
                      <Badge variant="secondary">🎵 {previewSummary.counts.notation} notações</Badge>
                      <Badge variant="secondary">✏️ {previewSummary.counts.exercise} exercícios</Badge>
                      <Badge variant="secondary">🎸 {previewSummary.counts.chord} acordes</Badge>
                      <Badge variant="secondary">🎹 {previewSummary.counts.keyboard} teclados</Badge>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
            {previewTemplate && (
              <Button onClick={() => {
                setPreviewOpen(false)
                handleUseTemplate(previewTemplate)
              }}>
                <ClipboardText size={14} />
                Usar como Base
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UseTemplateDialog
        open={useDialogOpen}
        onOpenChange={(open) => {
          setUseDialogOpen(open)
          if (!open) setUseTemplate(null)
        }}
        template={useTemplate}
        onConfirm={handleConfirmUse}
        loading={submitting}
      />
    </div>
  )
}
