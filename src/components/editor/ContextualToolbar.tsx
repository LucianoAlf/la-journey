import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  BookmarkSimple, Copy, Trash, ArrowsOutSimple, PaintBucket, MagicWand,
  PencilSimple, MusicNotes, Guitar, PianoKeys, Image as ImageIcon, X, ListNumbers, ArrowCounterClockwise,
} from '@phosphor-icons/react'
import type { BlockStyle } from '@/lib/blockStyles'
import type { BlockPaginationPolicy } from '@/lib/sharedPagination'
import {
  CANVAS_BLOCK_SPACING_MAX,
  CANVAS_BLOCK_SPACING_MIN,
  createCanvasBlockLayoutReset,
  createCanvasBlockMarginUpdate,
  hasCanvasBlockLayoutAdjustments,
} from '@/lib/canvasSpacingControls'
import { getCanvasToolbarActions, type CanvasToolbarMode, type CanvasToolbarPlacement } from '@/lib/editorCanvasInteraction'
import { cn } from '@/lib/utils'

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
  { label: 'Sem fundo', color: 'transparent' },
  { label: 'Branco', color: '#ffffff' },
  { label: 'Neve', color: '#f8fafc' },
  { label: 'Pauta', color: '#fef9c3' },
  { label: 'Estudo', color: '#dcfce7' },
  { label: 'Teoria', color: '#dbeafe' },
  { label: 'Destaque', color: '#fce7f3' },
  { label: 'Criativo', color: '#f3e8ff' },
  { label: 'Aquecido', color: '#fff7ed' },
  { label: 'Alerta', color: '#fef2f2' },
  { label: 'Verde', color: '#ecfdf5' },
  { label: 'Azul', color: '#eff6ff' },
  { label: 'Roxo', color: '#fdf4ff' },
  { label: 'Cinza', color: '#f5f5f4' },
]

const PADDING_OPTIONS = [
  { label: 'Nenhum', value: 0 },
  { label: 'P', value: 8 },
  { label: 'M', value: 16 },
  { label: 'G', value: 24 },
  { label: 'GG', value: 32 },
]

const toolbarIconButtonClass = 'h-7 w-7 p-0 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-95'

interface ContextualToolbarProps {
  blockType: string
  position: { top: number; left: number; placement?: CanvasToolbarPlacement }
  mode?: CanvasToolbarMode
  onDuplicate: () => void
  onDelete: () => void
  onStyleChange: (style: Partial<BlockStyle>) => void
  blockStyle?: BlockStyle
  paginationPolicy?: BlockPaginationPolicy | null
  canSplitBlock?: boolean
  onPaginationChange?: (updates: Partial<BlockPaginationPolicy>) => void
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
  onStyleChange, blockStyle, paginationPolicy, canSplitBlock = false, onPaginationChange,
  onAIRewrite, isAIProcessing,
  onSaveReusable, saveReusableDisabled = false, onEditInline,
  onEditNotation, onEditTablature, onEditChord, onEditKeyboard, onReplaceImage, onExitEdit,
  mode = 'selected',
}: ContextualToolbarProps) {
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [showPaddingPicker, setShowPaddingPicker] = useState(false)
  const [showLayoutPanel, setShowLayoutPanel] = useState(false)
  const actions = getCanvasToolbarActions(blockType)
  const showLayoutControls = mode === 'selected' && blockStyle && paginationPolicy && onPaginationChange
  const layoutPanelPosition = position.placement === 'below' ? 'bottom-full mb-2' : 'top-full mt-2'
  const hasLayoutAdjustments = hasCanvasBlockLayoutAdjustments(blockStyle, paginationPolicy)
  const chordActionLabel = blockType === 'chord_grid' ? 'Adicionar acorde' : 'Trocar acorde'
  const chordActionTooltip = blockType === 'chord_grid' ? 'Adicionar acorde na grade' : 'Trocar acorde'

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

      {showLayoutControls && (
        <>
          <div className="relative flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'relative h-7 w-7 p-0',
                hasLayoutAdjustments && 'bg-accent/10 text-accent hover:bg-accent/15',
              )}
              title="Layout e paginacao"
              data-testid="canvas-toolbar-layout-controls"
              onClick={() => setShowLayoutPanel((value) => !value)}
            >
              <ListNumbers size={14} />
              {hasLayoutAdjustments && (
                <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" />
              )}
            </Button>

            {showLayoutPanel && (
              <div
                className={`absolute left-0 z-[60] w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md ${layoutPanelPosition}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                data-testid="canvas-toolbar-layout-panel"
              >
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-text">Layout do bloco</p>
                  <p className="mt-0.5 text-[9px] leading-snug text-text3">Ajustes deste bloco aparecem no PDF.</p>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[64px_1fr_38px] items-center gap-2">
                    <Label className="text-[10px] text-text3">Espaco antes</Label>
                    <input
                      type="range"
                      min={CANVAS_BLOCK_SPACING_MIN}
                      max={CANVAS_BLOCK_SPACING_MAX}
                      step={4}
                      value={blockStyle.margin.top}
                      onChange={(event) => onStyleChange(
                        createCanvasBlockMarginUpdate(blockStyle, 'top', Number(event.target.value)),
                      )}
                      className="h-1 accent-accent"
                    />
                    <span className="text-right font-mono text-[10px] text-text3">{blockStyle.margin.top}px</span>
                  </div>
                  <div className="grid grid-cols-[64px_1fr_38px] items-center gap-2">
                    <Label className="text-[10px] text-text3">Espaco depois</Label>
                    <input
                      type="range"
                      min={CANVAS_BLOCK_SPACING_MIN}
                      max={CANVAS_BLOCK_SPACING_MAX}
                      step={4}
                      value={blockStyle.margin.bottom}
                      onChange={(event) => onStyleChange(
                        createCanvasBlockMarginUpdate(blockStyle, 'bottom', Number(event.target.value)),
                      )}
                      className="h-1 accent-accent"
                    />
                    <span className="text-right font-mono text-[10px] text-text3">{blockStyle.margin.bottom}px</span>
                  </div>
                </div>

                <Separator className="bg-border/70" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-[10px] font-semibold text-text">Comecar em nova pagina</Label>
                      <p className="mt-0.5 text-[9px] text-text3">Abre este bloco no topo da proxima A4.</p>
                    </div>
                    <Switch
                      size="sm"
                      checked={paginationPolicy.startOnNewPage}
                      onCheckedChange={(checked) => onPaginationChange({ startOnNewPage: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-[10px] font-semibold text-text">Manter junto</Label>
                      <p className="mt-0.5 text-[9px] text-text3">Evita separar este bloco do proximo.</p>
                    </div>
                    <Switch
                      size="sm"
                      checked={paginationPolicy.keepWithNext}
                      onCheckedChange={(checked) => onPaginationChange({ keepWithNext: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-[10px] font-semibold text-text">Permitir quebra</Label>
                      <p className="mt-0.5 text-[9px] text-text3">
                        {canSplitBlock ? 'Divide textos longos quando seguro.' : 'Blocos visuais ficam inteiros no PDF.'}
                      </p>
                    </div>
                    <Switch
                      size="sm"
                      checked={paginationPolicy.allowSplit}
                      disabled={!canSplitBlock}
                      onCheckedChange={(checked) => onPaginationChange({
                        allowSplit: checked,
                        behavior: checked ? 'breakable' : 'unbreakable',
                      })}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full justify-center gap-1.5 border border-border/70 text-[10px] text-text3 hover:bg-bg2 hover:text-text"
                  disabled={!hasLayoutAdjustments}
                  onClick={() => {
                    const reset = createCanvasBlockLayoutReset(blockType)
                    onStyleChange(reset.style)
                    onPaginationChange(reset.pagination)
                  }}
                >
                  <ArrowCounterClockwise size={12} />
                  Remover ajustes deste bloco
                </Button>
              </div>
              </div>
            )}
          </div>
          <Separator orientation="vertical" className="h-5" />
        </>
      )}

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
              Alt + ↑↓←→ · Shift+Alt = 40px · Alt+0
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Mover bloco: 8px ou 40px com Shift</p></TooltipContent>
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
                <span className="text-[10px]">{chordActionLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>{chordActionTooltip}</p></TooltipContent>
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

      <div className="relative flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Cor de fundo"
          data-testid="canvas-toolbar-background"
          onClick={() => setShowBgPicker((value) => !value)}
        >
          <PaintBucket size={14} />
        </Button>
        {showBgPicker && (
          <div
            className="absolute left-1/2 top-full z-[60] mt-2 w-[260px] -translate-x-1/2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            data-testid="canvas-toolbar-background-panel"
          >
            <div className="mb-2">
              <div className="text-[11px] font-semibold text-text1">Cor de fundo</div>
              <div className="text-[10px] text-text3">Aparece no canvas e no PDF.</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_BG_COLORS.map(({ label, color }) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color === 'transparent' ? 'Sem fundo' : `Fundo ${label}`}
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
                  className="flex h-8 items-center gap-2 rounded-md border border-transparent px-2 text-left text-[10px] text-text2 transition-colors hover:border-accent/30 hover:bg-accent/5 hover:text-text1"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-border/60 shadow-sm"
                    style={{
                      backgroundColor: color === 'transparent' ? 'white' : color,
                      backgroundImage: color === 'transparent'
                        ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)'
                        : 'none',
                      backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                      backgroundSize: '12px 12px',
                    }}
                  />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Padding rápido */}
      <div className="relative flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Espacamento interno"
          data-testid="canvas-toolbar-padding"
          onClick={() => setShowPaddingPicker((value) => !value)}
        >
          <ArrowsOutSimple size={14} />
        </Button>
        {showPaddingPicker && (
          <div
            className="absolute left-0 top-full z-[60] mt-2 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            data-testid="canvas-toolbar-padding-panel"
          >
            <div className="flex gap-1">
              {PADDING_OPTIONS.map((opt) => (
                <Button
                  key={opt.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => {
                    onStyleChange({
                      padding: {
                        top: opt.value, right: opt.value,
                        bottom: opt.value, left: opt.value,
                        linked: true,
                      },
                    })
                    setShowPaddingPicker(false)
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

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
            <Button variant="ghost" size="sm" className={toolbarIconButtonClass} onClick={onDuplicate} data-testid="canvas-toolbar-duplicate">
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
            <Button variant="ghost" size="sm" className={cn(toolbarIconButtonClass, 'text-text3 hover:text-[var(--vermelho)]')} onClick={onDelete} data-testid="canvas-toolbar-delete">
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
