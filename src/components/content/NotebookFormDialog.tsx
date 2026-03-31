import { useEffect, useState } from 'react'
import { Books, FloppyDisk } from '@phosphor-icons/react'
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
  onSave: (values: NotebookFormValues) => Promise<void> | void
  loading?: boolean
  notebook?: RepertoireCollection | null
}

const INSTRUMENT_OPTIONS = [
  { value: 'universal', label: 'Universal' },
  { value: 'violão', label: 'Violão' },
  { value: 'guitarra', label: 'Guitarra' },
  { value: 'baixo', label: 'Baixo' },
  { value: 'piano', label: 'Piano' },
  { value: 'canto', label: 'Canto' },
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
  loading = false,
  notebook = null,
}: NotebookFormDialogProps) {
  const [values, setValues] = useState<NotebookFormValues>({
    name: '',
    description: '',
    instrument: 'universal',
    difficulty_level: 'foundation',
    genre: '',
  })

  useEffect(() => {
    if (!open) return

    setValues({
      name: notebook?.name ?? '',
      description: notebook?.description ?? '',
      instrument: notebook?.instrument ?? 'universal',
      difficulty_level: notebook?.difficulty_level ?? 'foundation',
      genre: notebook?.genre ?? '',
    })
  }, [notebook, open])

  const handleSubmit = async () => {
    if (!values.name.trim()) return
    await onSave({
      ...values,
      name: values.name.trim(),
      description: values.description.trim(),
      genre: values.genre.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px]">
            <Books size={18} className="text-accent" />
            {notebook ? 'Editar Caderno' : 'Novo Caderno de Repertório'}
          </DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!values.name.trim() || loading}>
            <FloppyDisk size={14} />
            {loading ? 'Salvando...' : 'Salvar Caderno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
