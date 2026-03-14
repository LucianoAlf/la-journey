import { Minus, Plus, ArrowCounterClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { transposeKey, semitoneLabel } from '@/lib/transpose'

interface TransposeControlProps {
  /** Tonalidade original da música (ex: "Am", "C", "G") */
  originalKey: string | null
  /** Número de semitons aplicados atualmente */
  semitones: number
  /** Callback quando o número de semitons muda */
  onChange: (semitones: number) => void
  /** Classe CSS adicional */
  className?: string
}

export function TransposeControl({
  originalKey,
  semitones,
  onChange,
  className = '',
}: TransposeControlProps) {
  const newKey = originalKey ? transposeKey(originalKey, semitones) : null
  const isTransposed = semitones !== 0

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-[10px] text-text3/60 uppercase tracking-wider mr-0.5">Tom:</span>

      {/* Botão diminuir */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-accent/15 hover:text-accent"
              onClick={() => onChange(semitones - 1)}
              disabled={semitones <= -11}
            >
              <Minus size={12} weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[11px]">
            <p>Diminuir meio tom</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Display da tonalidade */}
      <div className="flex items-center gap-1">
        {originalKey ? (
          <>
            <span className={`font-mono text-[12px] font-bold px-2 py-0.5 rounded-md ${
              isTransposed
                ? 'bg-accent/15 text-accent'
                : 'bg-[var(--azul-escuro)]/25 text-[var(--azul-claro)]'
            }`}>
              {newKey}
            </span>
            {isTransposed && (
              <Badge
                variant="outline"
                className="text-[9px] h-5 px-1.5 font-mono border-accent/30 text-accent"
              >
                {semitoneLabel(semitones)}
              </Badge>
            )}
          </>
        ) : (
          <span className="text-[11px] text-text3/50 italic">Sem tom</span>
        )}
      </div>

      {/* Botão aumentar */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-accent/15 hover:text-accent"
              onClick={() => onChange(semitones + 1)}
              disabled={semitones >= 11}
            >
              <Plus size={12} weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[11px]">
            <p>Aumentar meio tom</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Botão reset */}
      {isTransposed && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-text3/60 hover:text-accent hover:bg-accent/10"
                onClick={() => onChange(0)}
              >
                <ArrowCounterClockwise size={12} weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              <p>Voltar ao tom original ({originalKey})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
