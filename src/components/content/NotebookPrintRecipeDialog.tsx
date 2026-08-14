import { useEffect, useState } from 'react'
import { Guitar, PianoKeys, FilePdf } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  printRecipeFromTags,
  type NotebookPrintRecipe,
} from '@/lib/notebookPrintRecipe'
import type { RepertoireCollection } from '@/services/repertoireCollectionService'

interface NotebookPrintRecipeDialogProps {
  notebook: RepertoireCollection | null
  open: boolean
  confirming?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (recipe: NotebookPrintRecipe) => void
}

const TOGGLES: Array<{ key: keyof NotebookPrintRecipe; label: string; hint: string }> = [
  { key: 'guitar', label: 'Violão', hint: 'Diagramas de braço (6 cordas)' },
  { key: 'piano', label: 'Teclado', hint: 'Diagramas de teclas' },
  { key: 'ukulele', label: 'Ukulele', hint: 'Braço de 4 cordas' },
  { key: 'tab', label: 'Tablatura', hint: 'Mantém as tabs da cifra' },
]

export function NotebookPrintRecipeDialog({
  notebook,
  open,
  confirming,
  onOpenChange,
  onConfirm,
}: NotebookPrintRecipeDialogProps) {
  const [recipe, setRecipe] = useState<NotebookPrintRecipe>(
    printRecipeFromTags(notebook?.tags, notebook?.instrument),
  )

  useEffect(() => {
    if (!open || !notebook) return
    setRecipe(printRecipeFromTags(notebook.tags, notebook.instrument))
  }, [open, notebook])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-text">
            O que entra no caderno
          </DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-text2">
          Mesmo motor da folha de repertório. Liga o que o aluno vai ver neste PDF.
        </p>
        <div className="space-y-2 py-2">
          {TOGGLES.map((item) => {
            const on = recipe[item.key]
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setRecipe((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`flex w-full items-start justify-between rounded-[12px] border px-3 py-2.5 text-left transition-colors ${
                  on
                    ? 'border-accent/40 bg-accent/10'
                    : 'border-border bg-card/40 text-text3'
                }`}
              >
                <span>
                  <span className="block text-[13px] font-semibold text-text">{item.label}</span>
                  <span className="block text-[11px] text-text3">{item.hint}</span>
                </span>
                <span className={`text-[11px] font-semibold ${on ? 'text-accent' : 'text-text3'}`}>
                  {on ? 'Ligado' : 'Off'}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={confirming || !notebook}
            onClick={() => onConfirm(recipe)}
          >
            {confirming ? 'Gerando...' : (
              <>
                <FilePdf size={14} />
                Montar e abrir no editor
              </>
            )}
          </Button>
        </div>
        <p className="text-[11px] text-text3 flex items-center gap-2">
          <Guitar size={12} />
          <PianoKeys size={12} />
          Ajeite a cifra na lista do caderno antes, se precisar.
        </p>
      </DialogContent>
    </Dialog>
  )
}
