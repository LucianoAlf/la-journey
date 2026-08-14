import { useEffect, useState } from 'react'
import { Books, FilePdf, FloppyDisk } from '@phosphor-icons/react'
import { CoverTemplatePicker } from '@/components/content/CoverTemplatePicker'
import { COVER_TEMPLATES, type CoverTemplate } from '@/lib/notebookMaterialAssembler'
import type { RepertoireCollection } from '@/services/repertoireCollectionService'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface NotebookFormValues {
  name: string
  description: string
  instrument: string
  difficulty_level: string
  genre: string
}

interface NotebookFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: NotebookFormValues) => Promise<RepertoireCollection | void>
  onGenerateAfterCreate?: (
    notebook: RepertoireCollection,
    cover: { coverTemplate: CoverTemplate; coverImageUrl: string | null }
  ) => Promise<boolean | void>
  onPersistCover?: (
    notebook: RepertoireCollection,
    cover: { coverTemplate: CoverTemplate; coverImageUrl: string | null }
  ) => Promise<void>
  loading?: boolean
  notebook?: RepertoireCollection | null
  schoolId?: string
}

const INSTRUMENT_OPTIONS = [
  { value: 'universal', label: 'Universal' },
  { value: 'violão', label: 'Violão' },
  { value: 'guitarra', label: 'Guitarra' },
  { value: 'baixo', label: 'Baixo' },
  { value: 'piano', label: 'Piano' },
  { value: 'canto', label: 'Canto' },
  { value: 'ukulele', label: 'Ukulele' },
]

const LEVEL_OPTIONS = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'grow', label: 'Grow' },
  { value: 'advance', label: 'Advance' },
  { value: 'master', label: 'Master' },
]

export function NotebookFormDialog({
  open,
  onOpenChange,
  onSave,
  onGenerateAfterCreate,
  onPersistCover,
  loading = false,
  notebook = null,
  schoolId,
}: NotebookFormDialogProps) {
  const [values, setValues] = useState<NotebookFormValues>({
    name: '',
    description: '',
    instrument: 'universal',
    difficulty_level: 'foundation',
    genre: '',
  })
  const [step, setStep] = useState<'form' | 'cover'>('form')
  const [created, setCreated] = useState<RepertoireCollection | null>(null)
  const [coverTemplate, setCoverTemplate] = useState<CoverTemplate>(COVER_TEMPLATES[0])
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!open) {
      setStep('form')
      setCreated(null)
      setCoverTemplate(COVER_TEMPLATES[0])
      setCoverImageUrl(null)
      setSaving(false)
      setGenerating(false)
      return
    }

    setValues({
      name: notebook?.name ?? '',
      description: notebook?.description ?? '',
      instrument: notebook?.instrument ?? 'universal',
      difficulty_level: notebook?.difficulty_level ?? 'foundation',
      genre: notebook?.genre ?? '',
    })
  }, [notebook, open])

  const handleSubmit = async () => {
    if (!values.name.trim() || saving) return
    setSaving(true)
    try {
      const result = await onSave({
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
        genre: values.genre.trim(),
      })
      if (!notebook && result && 'id' in result) {
        setCreated(result)
        setStep('cover')
      }
    } finally {
      setSaving(false)
    }
  }

  const busy = loading || saving || generating
  const showCover = step === 'cover' && !notebook

  const persistCover = async () => {
    if (!created || !onPersistCover) return
    await onPersistCover(created, {
      coverTemplate,
      coverImageUrl,
    })
  }

  const persistCoverAndClose = async () => {
    if (busy) return
    setSaving(true)
    try {
      await persistCover()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && step === 'cover' && created) {
      void persistCoverAndClose()
      return
    }
    onOpenChange(nextOpen)
  }

  const handleGenerate = async () => {
    if (!created || generating) return
    setGenerating(true)
    try {
      await persistCover()
      const result = await onGenerateAfterCreate?.(created, {
        coverTemplate,
        coverImageUrl,
      })
      if (result === false) return
      onOpenChange(false)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-xl bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px]">
            <Books size={18} className="text-accent" />
            {notebook ? 'Editar Caderno' : showCover ? 'Capa do caderno' : 'Novo Caderno de Repertório'}
          </DialogTitle>
        </DialogHeader>

        {showCover ? (
          <div className="space-y-3 py-1">
            <p className="text-[12px] text-text3">
              Escolha um layout e, se quiser, uma imagem da biblioteca.
            </p>
            <CoverTemplatePicker
              schoolId={schoolId}
              template={coverTemplate}
              imageUrl={coverImageUrl}
              onTemplateChange={setCoverTemplate}
              onImageUrlChange={setCoverImageUrl}
            />
            <p className="text-[11px] text-text3">
              Adicione músicas ao caderno para gerar o PDF.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Nome *</Label>
              <Input
                value={values.name}
                onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Primeiros Acordes — Violão"
                className="h-9 text-[13px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Descrição</Label>
              <Textarea
                value={values.description}
                onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Resumo pedagógico do caderno"
                className="min-h-[88px] text-[13px]"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Instrumento</Label>
                <Select
                  value={values.instrument}
                  onValueChange={(value) => setValues((prev) => ({ ...prev, instrument: value }))}
                >
                  <SelectTrigger className="h-9 text-[12px] w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Nível</Label>
                <Select
                  value={values.difficulty_level}
                  onValueChange={(value) => setValues((prev) => ({ ...prev, difficulty_level: value }))}
                >
                  <SelectTrigger className="h-9 text-[12px] w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Gênero</Label>
                <Input
                  value={values.genre}
                  onChange={(e) => setValues((prev) => ({ ...prev, genre: e.target.value }))}
                  placeholder="Pop/Rock"
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {showCover ? (
            <>
              <Button variant="outline" onClick={persistCoverAndClose} disabled={busy}>
                Agora não
              </Button>
              <Button onClick={handleGenerate} disabled>
                <FilePdf size={14} />
                Gerar PDF
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!values.name.trim() || busy}>
                <FloppyDisk size={14} />
                {saving ? 'Salvando...' : 'Salvar Caderno'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
