import { useState } from 'react'
import {
  Guitar, PianoKeys, MicrophoneStage, Metronome, BookOpen, Sparkle, Check, Layout,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MATERIAL_TEMPLATES, type MaterialTemplate } from '@/lib/materialTemplates'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Guitar, PianoKeys, MicrophoneStage, Metronome, BookOpen, Sparkle,
}

interface MaterialTemplatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (template: MaterialTemplate) => void
}

export function MaterialTemplatesDialog({ open, onOpenChange, onApply }: MaterialTemplatesDialogProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)

  const selectedTemplate = MATERIAL_TEMPLATES.find(t => t.id === selected)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layout size={18} className="text-roxo" />
              Templates de Material
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 p-1">
              {MATERIAL_TEMPLATES.map((template) => {
                const Icon = ICON_MAP[template.iconName] ?? Sparkle
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelected(template.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all 
                               hover:shadow-md ${
                      selected === template.id
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 
                                      flex items-center justify-center shrink-0">
                        <Icon size={20} className="text-accent" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-semibold text-text1">
                          {template.name}
                        </h4>
                        <p className="text-[10px] text-text3">
                          {template.instrument} · {template.level}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-text2 mb-2">{template.description}</p>

                    {/* Preview dos tipos de bloco */}
                    <div className="flex flex-wrap gap-1">
                      {template.blocks.slice(0, 8).map((b, i) => (
                        <Badge key={i} variant="secondary" className="text-[8px]">
                          {b.block_type}
                        </Badge>
                      ))}
                      {template.blocks.length > 8 && (
                        <Badge variant="secondary" className="text-[8px]">
                          +{template.blocks.length - 8}
                        </Badge>
                      )}
                    </div>

                    <p className="text-[9px] text-text3 mt-2">
                      {template.blocks.length} blocos
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selected}
              onClick={() => setConfirmReplace(true)}
            >
              <Check size={14} className="mr-1" /> Aplicar template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação — substituir blocos existentes */}
      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar template?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai SUBSTITUIR todos os blocos atuais pelos blocos do template
              &quot;{selectedTemplate?.name}&quot;. Você pode desfazer com Ctrl+Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (selectedTemplate) {
                onApply(selectedTemplate)
                setConfirmReplace(false)
                onOpenChange(false)
              }
            }}>
              Substituir blocos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
