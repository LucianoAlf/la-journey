import { useEffect, useState } from 'react'
import { Check, ClipboardText } from '@phosphor-icons/react'
import type { MaterialTemplateListItem } from '@/services/materialService'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UseTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: MaterialTemplateListItem | null
  onConfirm: (title: string) => Promise<void>
  loading?: boolean
}

export function UseTemplateDialog({ open, onOpenChange, template, onConfirm, loading = false }: UseTemplateDialogProps) {
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!open || !template) return
    setTitle(`${template.title} — Meu Material`)
  }, [open, template])

  const handleConfirm = async () => {
    if (!title.trim()) return
    await onConfirm(title.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[20px]">
            <ClipboardText size={18} className="text-accent" />
            Criar Material a partir do Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card/40 p-4 text-[13px] text-text2 space-y-1.5">
            <p><span className="font-semibold text-text">Template:</span> {template?.title}</p>
            <p>{template?.block_count ?? 0} blocos serão copiados para o novo material.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Nome do novo material</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do material"
              className="h-9 text-[13px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!title.trim() || loading}>
            <Check size={14} />
            {loading ? 'Criando...' : 'Criar Material'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
