import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Copy, Trash, ArrowUp, ArrowDown, ArrowsOutSimple, PaintBucket, MagicWand,
} from '@phosphor-icons/react'
import type { BlockStyle } from '@/lib/blockStyles'

const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  tip: 'Dica',
  exercise: 'Exercício',
  title: 'Título',
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  cover: 'Capa',
  columns: 'Colunas',
  notation: 'Partitura',
  chord_diagram: 'Acorde',
  chord_grid: 'Grade Acordes',
  keyboard: 'Teclado',
  keyboard_grid: 'Grade Teclados',
  tablature: 'Tablatura',
  separator: 'Separador',
  page_break: 'Quebra Página',
  badge: 'Badge',
}

const QUICK_BG_COLORS = [
  'transparent', '#ffffff', '#f8fafc', '#fef9c3', '#dcfce7',
  '#dbeafe', '#fce7f3', '#f3e8ff', '#fff7ed', '#fef2f2',
  '#ecfdf5', '#eff6ff', '#fdf4ff', '#f5f5f4',
]

const PADDING_OPTIONS = [
  { label: 'Nenhum', value: 0 },
  { label: 'P', value: 8 },
  { label: 'M', value: 16 },
  { label: 'G', value: 24 },
  { label: 'GG', value: 32 },
]

interface ContextualToolbarProps {
  blockType: string
  position: { top: number; left: number }
  onDuplicate: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onStyleChange: (style: Partial<BlockStyle>) => void
  isFirst: boolean
  isLast: boolean
  onAIRewrite?: () => void
  isAIProcessing?: boolean
}

export function ContextualToolbar({
  blockType, position, onDuplicate, onDelete, onMoveUp, onMoveDown,
  onStyleChange, isFirst, isLast, onAIRewrite, isAIProcessing,
}: ContextualToolbarProps) {
  const [showBgPicker, setShowBgPicker] = useState(false)

  // Não mostrar para cover e page_break
  if (['cover', 'page_break'].includes(blockType)) return null

  const adjustedTop = Math.max(8, position.top)

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 px-1.5 py-1
                 bg-card/95 backdrop-blur-sm border border-border
                 rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: `${adjustedTop}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Badge tipo do bloco */}
      <span className="text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded font-medium uppercase tracking-wider mr-1 whitespace-nowrap">
        {BLOCK_TYPE_LABELS[blockType] || blockType}
      </span>

      <Separator orientation="vertical" className="h-5" />

      {/* Mover ↑ */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isFirst} onClick={onMoveUp}>
              <ArrowUp size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Mover acima</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Mover ↓ */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isLast} onClick={onMoveDown}>
              <ArrowDown size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Mover abaixo</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-5" />

      {/* Background rápido */}
      <Popover open={showBgPicker} onOpenChange={setShowBgPicker}>
        <PopoverTrigger asChild>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <PaintBucket size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Cor de fundo</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="bottom">
          <div className="grid grid-cols-7 gap-1">
            {QUICK_BG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onStyleChange({
                    background: {
                      type: color === 'transparent' ? 'none' : 'solid',
                      color,
                      gradientFrom: '#ffffff',
                      gradientTo: '#f0f0f0',
                      gradientDirection: 'to bottom',
                    },
                  })
                  setShowBgPicker(false)
                }}
                className="w-6 h-6 rounded border border-border/50 hover:scale-110
                           transition-transform hover:ring-2 hover:ring-accent/30"
                style={{
                  backgroundColor: color === 'transparent' ? 'white' : color,
                  backgroundImage: color === 'transparent'
                    ? 'repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%)'
                    : 'none',
                  backgroundSize: '8px 8px',
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Padding rápido */}
      <Popover>
        <PopoverTrigger asChild>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <ArrowsOutSimple size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Espaçamento</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="bottom">
          <div className="flex gap-1">
            {PADDING_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                variant="ghost" size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => onStyleChange({
                  padding: {
                    top: opt.value, right: opt.value,
                    bottom: opt.value, left: opt.value,
                    linked: true,
                  },
                })}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* IA Reescrever — só para blocos de texto */}
      {['text', 'tip', 'exercise', 'title'].includes(blockType) && onAIRewrite && (
        <>
          <Separator orientation="vertical" className="h-5" />
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-roxo"
                  onClick={onAIRewrite}
                  disabled={isAIProcessing}
                >
                  <MagicWand size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Reescrever com IA</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      <Separator orientation="vertical" className="h-5" />

      {/* Duplicar */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDuplicate}>
              <Copy size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Duplicar (Ctrl+D)</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Deletar */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-text3 hover:text-[var(--vermelho)]" onClick={onDelete}>
              <Trash size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Excluir (Shift+Del)</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
