import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sparkle, SpinnerGap, ArrowsClockwise, Check,
} from '@phosphor-icons/react'

interface AIVariationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variations: string[]
  isGenerating: boolean
  onRegenerate: () => void
  onApply: (variationIndex: number) => void
  originalContent?: string
}

export function AIVariationsDialog({
  open, onOpenChange, variations, isGenerating,
  onRegenerate, onApply, originalContent,
}: AIVariationsDialogProps) {
  const [selectedVariation, setSelectedVariation] = useState(-1)
  const [showOriginal, setShowOriginal] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle size={18} className="text-roxo" />
            Variações do bloco
          </DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <SpinnerGap size={32} className="animate-spin text-roxo" />
            <span className="text-[13px] text-text3">Gerando 3 variações com IA...</span>
          </div>
        ) : showOriginal && originalContent ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="text-[9px]">Original</Badge>
              <Button variant="ghost" size="sm" className="text-[10px]" onClick={() => setShowOriginal(false)}>
                Voltar às variações
              </Button>
            </div>
            <div
              className="text-[12px] text-text2 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: originalContent }}
            />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-3 gap-3 p-1">
              {variations.map((variation, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedVariation === i
                      ? 'border-roxo bg-roxo/5 ring-2 ring-roxo/20'
                      : 'border-border hover:border-roxo/30'
                  }`}
                  onClick={() => setSelectedVariation(i)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-[9px]">
                      Variação {i + 1}
                    </Badge>
                    {selectedVariation === i && (
                      <Check size={14} className="text-roxo" />
                    )}
                  </div>
                  <div
                    className="text-[11px] text-text2 prose prose-sm max-w-none line-clamp-[12] overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: variation }}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            {originalContent && !showOriginal && (
              <Button
                variant="ghost" size="sm"
                className="text-[10px]"
                onClick={() => setShowOriginal(true)}
              >
                Ver original
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => {
                setSelectedVariation(-1)
                onRegenerate()
              }}
              disabled={isGenerating}
            >
              <ArrowsClockwise size={14} className="mr-1" /> Regenerar
            </Button>
            <Button
              size="sm"
              disabled={selectedVariation < 0 || !variations[selectedVariation]}
              onClick={() => {
                if (selectedVariation >= 0 && variations[selectedVariation]) {
                  onApply(selectedVariation)
                  setSelectedVariation(-1)
                }
              }}
            >
              <Check size={14} className="mr-1" />
              {selectedVariation >= 0 ? `Aplicar variação ${selectedVariation + 1}` : 'Selecione uma variação'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
