import { useState, useEffect } from 'react'
import {
  ClockCounterClockwise, ArrowCounterClockwise, Trash, SpinnerGap, Calendar,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  listVersions, deleteVersion, type MaterialVersion,
} from '@/services/materialVersionService'

interface VersionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId: string
  onRestore: (snapshot: { blocks: any[]; page_config: any }) => void
}

export function VersionHistoryDialog({ open, onOpenChange, materialId, onRestore }: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<MaterialVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmRestore, setConfirmRestore] = useState<MaterialVersion | null>(null)

  useEffect(() => {
    if (open) {
      setLoading(true)
      listVersions(materialId)
        .then(setVersions)
        .finally(() => setLoading(false))
    }
  }, [open, materialId])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClockCounterClockwise size={18} className="text-roxo" />
              Histórico de Versões
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <SpinnerGap size={24} className="animate-spin text-text3" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8">
                <ClockCounterClockwise size={32} className="text-text3/30 mx-auto mb-2" />
                <p className="text-[12px] text-text3">Nenhuma versão salva ainda.</p>
                <p className="text-[10px] text-text3/60">
                  Versões são criadas ao salvar manualmente (Ctrl+S).
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border 
                               hover:bg-card/50 transition-colors"
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] shrink-0">
                          v{version.version_number}
                        </Badge>
                        <span className="text-[12px] text-text1 font-medium truncate">
                          {version.label || `Versão ${version.version_number}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar size={10} className="text-text3" />
                        <span className="text-[10px] text-text3">
                          {new Date(version.created_at).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className="text-[9px] text-text3/50">
                          {version.snapshot?.blocks?.length || 0} blocos
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-1 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setConfirmRestore(version)}
                            >
                              <ArrowCounterClockwise size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Restaurar esta versão</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-text3 hover:text-vermelho"
                              onClick={async () => {
                                await deleteVersion(version.id)
                                setVersions(prev => prev.filter(v => v.id !== version.id))
                                toast.success('Versão excluída')
                              }}
                            >
                              <Trash size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Excluir versão</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de restauração */}
      <AlertDialog
        open={!!confirmRestore}
        onOpenChange={(o) => { if (!o) setConfirmRestore(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai substituir todos os blocos atuais pela versão{' '}
              {confirmRestore?.version_number} ({confirmRestore?.label}).
              O estado atual será salvo como nova versão antes de restaurar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmRestore?.snapshot) {
                onRestore(confirmRestore.snapshot)
                setConfirmRestore(null)
                onOpenChange(false)
                toast.success(`Versão ${confirmRestore.version_number} restaurada`)
              }
            }}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
