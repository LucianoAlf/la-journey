import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  BookmarkSimple, Copy, Trash, ArrowsOutSimple, PaintBucket, MagicWand,
  PencilSimple, MusicNotes, Guitar, PianoKeys, Image as ImageIcon, X, ListNumbers,
} from '@phosphor-icons/react'
import type { BlockStyle } from '@/lib/blockStyles'
import { getCanvasToolbarActions, type CanvasToolbarMode, type CanvasToolbarPlacement } from '@/lib/editorCanvasInteraction'

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
  rhythm: 'Ritmo',
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
  position: { top: number; left: number; placement?: CanvasToolbarPlacement }
  mode?: CanvasToolbarMode
  onDuplicate: () => void
  onDelete: () => void
  onStyleChange: (style: Partial<BlockStyle>) => void
  onAIRewrite?: () => void
  isAIProcessing?: boolean
  onSaveReusable?: () => void
  saveReusableDisabled?: boolean
  onEditInline?: () => void
  onEditNotation?: () => void
  onEditTablature?: () => void
  onEditChord?: () => void
  onEditKeyboard?: () => void
  onReplaceImage?: () => void
  onExitEdit?: () => void
}

export function ContextualToolbar({
  blockType, position, onDuplicate, onDelete,
  onStyleChange, onAIRewrite, isAIProcessing,
  onSaveReusable, saveReusableDisabled = false, onEditInline,
  onEditNotation, onEditTablature, onEditChord, onEditKeyboard, onReplaceImage, onExitEdit,
  mode = 'selected',
}: ContextualToolbarProps) {
  const [showBgPicker, setShowBgPicker] = useState(false)
  const actions = getCanvasToolbarActions(blockType)

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
      data-testid="contextual-toolbar"
    >
      {/* Badge tipo do bloco */}
      <span className="text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded font-medium uppercase tracking-wider mr-1 whitespace-nowrap">
        {BLOCK_TYPE_LABELS[blockType] || blockType}
      </span>

      <Separator orientation="vertical" className="h-5" />

      {mode === 'editing' && (
        <>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-accent" onClick={onExitEdit} data-testid="canvas-toolbar-exit-edit">
                  <X size={14} />
                  <span className="text-[10px]">Sair</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Sair da edicao (Esc)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {onAIRewrite && (
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
                  <TooltipContent side="bottom"><p>IA</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </>
      )}

      {mode === 'selected' && (
        <>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-[10px] text-text3 px-1.5 whitespace-nowrap select-none">
              Alt + ↑↓
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Mover bloco</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-5" />

      {/* Background rápido */}
      {actions.includes('edit-inline') && onEditInline && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-accent" onClick={onEditInline} data-testid="canvas-toolbar-edit-inline">
                <PencilSimple size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Editar no canvas (Enter)</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {actions.includes('edit-notation') && onEditNotation && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-master" onClick={onEditNotation} data-testid="canvas-toolbar-edit-notation">
                <MusicNotes size={14} />
                <span className="text-[10px]">Editar notação</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Editar Notação</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {actions.includes('edit-tablature') && onEditTablature && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-foundation" onClick={onEditTablature} data-testid="canvas-toolbar-edit-tablature">
                <ListNumbers size={14} />
                <span className="text-[10px]">Editar tablatura</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Editar Tablatura</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {actions.includes('edit-chord') && onEditChord && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-grow" onClick={onEditChord} data-testid="canvas-toolbar-edit-chord">
                <Guitar size={14} />
                <span className="text-[10px]">Trocar acorde</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Trocar Acorde</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {actions.includes('edit-keyboard') && onEditKeyboard && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-foundation" onClick={onEditKeyboard} data-testid="canvas-toolbar-edit-keyboard">
                <PianoKeys size={14} />
                <span className="text-[10px]">Editar teclado</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Editar Teclado</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {actions.includes('replace-image') && onReplaceImage && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-accent" onClick={onReplaceImage} data-testid="canvas-toolbar-replace-image">
                <ImageIcon size={14} />
                <span className="text-[10px]">Trocar imagem</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Trocar Imagem</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {actions.some(action => ['edit-inline', 'edit-notation', 'edit-tablature', 'edit-chord', 'edit-keyboard', 'replace-image'].includes(action)) && (
        <Separator orientation="vertical" className="h-5" />
      )}

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

      {onSaveReusable && (
        <>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-accent"
                  onClick={onSaveReusable}
                  disabled={saveReusableDisabled}
                >
                  <BookmarkSimple size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Salvar como reutilizável</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Separator orientation="vertical" className="h-5" />
        </>
      )}

      {/* Duplicar */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDuplicate} data-testid="canvas-toolbar-duplicate">
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
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-text3 hover:text-[var(--vermelho)]" onClick={onDelete} data-testid="canvas-toolbar-delete">
              <Trash size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Excluir (Shift+Del)</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
        </>
      )}
    </div>
  )
}
