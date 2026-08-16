import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowDown,
  ArrowUp,
  Pause,
  PianoKeys,
  Play,
  Timer,
} from '@phosphor-icons/react'
import {
  CLEF_OPTIONS,
  KEY_SIGNATURE_OPTIONS,
  TIME_SIGNATURE_OPTIONS,
  TUPLET_OPTIONS,
} from '@/lib/notationEditorChrome'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

export interface NotationToolsSidebarProps {
  timeSignature: string
  clef: string
  keySignature: string
  currentTuplet: string
  bpm: number
  grandStaffMode: boolean
  activeStaff: 'treble' | 'bass'
  canUndo: boolean
  canRedo: boolean
  isPlaying: boolean
  onTimeSignature: (value: string) => void
  onClef: (value: string) => void
  onKeySignature: (value: string) => void
  onTuplet: (value: string) => void
  onBpm: (value: number) => void
  onGrandStaff: () => void
  onFocusStaff: (staff: 'treble' | 'bass') => void
  onTransposeUp: () => void
  onTransposeDown: () => void
  onUndo: () => void
  onRedo: () => void
  onTogglePlay: () => void
  barsPerSystem: number
  onBarsPerSystem: (value: number) => void
  layout?: 'row' | 'column'
}

export function NotationToolsSidebar({
  timeSignature,
  clef,
  keySignature,
  currentTuplet,
  bpm,
  grandStaffMode,
  activeStaff,
  canUndo,
  canRedo,
  isPlaying,
  onTimeSignature,
  onClef,
  onKeySignature,
  onTuplet,
  onBpm,
  onGrandStaff,
  onFocusStaff,
  onTransposeUp,
  onTransposeDown,
  onUndo,
  onRedo,
  onTogglePlay,
  barsPerSystem,
  onBarsPerSystem,
  layout = 'column',
}: NotationToolsSidebarProps) {
  const isRow = layout === 'row'
  const sectionClassName = isRow ? 'flex flex-wrap items-end gap-2' : 'space-y-3'
  const toolClassName = isRow ? 'flex flex-wrap items-center gap-1' : 'flex flex-wrap items-center gap-1'

  return (
    <div className={sectionClassName}>
      <div className={isRow ? 'contents' : 'space-y-3'}>
        <div className={isRow ? 'flex gap-2 items-end' : 'space-y-3'}>
          <div className={`space-y-1 ${isRow ? 'min-w-[168px]' : 'w-full'}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Modo</span>
            <div className="flex w-full border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => onTimeSignature('free')}
                className={`flex-1 px-3 py-1.5 text-center text-[12px] font-medium transition-colors ${
                  timeSignature === 'free' ? 'bg-accent text-white' : 'text-text3 hover:bg-accent/10 hover:text-accent'
                }`}
              >
                Livre
              </button>
              <button
                onClick={() => onTimeSignature('4/4')}
                className={`flex-1 px-3 py-1.5 text-center text-[12px] font-medium transition-colors ${
                  timeSignature !== 'free' ? 'bg-accent text-white' : 'text-text3 hover:bg-accent/10 hover:text-accent'
                }`}
              >
                Compasso
              </button>
            </div>
          </div>

          <div
            className={
              timeSignature !== 'free'
                ? isRow
                  ? 'flex min-w-0 items-end gap-2'
                  : 'grid w-full grid-cols-2 gap-2'
                : isRow
                  ? 'min-w-[120px]'
                  : 'w-full'
            }
          >
            {timeSignature !== 'free' && (
              <div className="min-w-0 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Compasso</span>
                <Select value={timeSignature} onValueChange={onTimeSignature}>
                  <SelectTrigger className="h-[34px] w-full text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_SIGNATURE_OPTIONS.filter(option => option.value !== 'free').map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Por linha</span>
              <div className="flex h-[34px] w-full items-center overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  title="Menos compassos por sistema"
                  onClick={() => onBarsPerSystem(barsPerSystem - 1)}
                  className="h-full w-8 shrink-0 text-[14px] text-text3 hover:bg-accent/10 hover:text-accent"
                >
                  −
                </button>
                <span className="flex-1 text-center text-[13px] font-semibold text-text">{barsPerSystem}</span>
                <button
                  type="button"
                  title="Mais compassos por sistema"
                  onClick={() => onBarsPerSystem(barsPerSystem + 1)}
                  className="h-full w-8 shrink-0 text-[14px] text-text3 hover:bg-accent/10 hover:text-accent"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className={isRow ? 'flex min-w-0 items-end gap-2' : 'grid w-full grid-cols-2 gap-2'}>
            <div className="min-w-0 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Clave</span>
              <Select value={clef} onValueChange={onClef}>
                <SelectTrigger className="h-[34px] w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLEF_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">Armadura</span>
              <Select value={keySignature} onValueChange={onKeySignature}>
                <SelectTrigger className="h-[34px] w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KEY_SIGNATURE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className={toolClassName}>
          <button
            onClick={onGrandStaff}
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${
              grandStaffMode
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
            }`}
            title="Grande Pauta (Piano)"
          >
            <PianoKeys className="h-4 w-4" />
          </button>

          {grandStaffMode && (
            <>
              <button
                onClick={() => onFocusStaff('treble')}
                className={`h-7 px-2 rounded-md border text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  activeStaff === 'treble'
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
                }`}
                title="Pauta Sol - Mão Direita (Tab para alternar)"
              >
                𝄞 Sol (MD)
              </button>
              <button
                onClick={() => onFocusStaff('bass')}
                className={`h-7 px-2 rounded-md border text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  activeStaff === 'bass'
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-500'
                    : 'border-border text-text3 hover:border-indigo-500/50 hover:text-indigo-500'
                }`}
                title="Pauta Fá - Mão Esquerda (Tab para alternar)"
              >
                𝄢 Fá (ME)
              </button>
            </>
          )}

          <Select value={currentTuplet} onValueChange={onTuplet}>
            <SelectTrigger className={`h-7 w-auto min-w-[70px] text-[11px] px-2 gap-0.5 ${currentTuplet !== 'none' ? 'border-orange-500/50 text-orange-500' : 'border-border text-text3'}`}>
              <SelectValue>
                <span className="font-mono text-[10px]">┌ {currentTuplet !== 'none' ? currentTuplet : '3:2'} ┐</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TUPLET_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value} className="text-[12px]">{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={onTransposeDown}
            title="Transpor ½ tom abaixo (↓)"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-text3 hover:border-accent/50 hover:text-accent transition-colors"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            onClick={onTransposeUp}
            title="Transpor ½ tom acima (↑)"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-text3 hover:border-accent/50 hover:text-accent transition-colors"
          >
            <ArrowUp className="h-4 w-4" />
          </button>

          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${
              !canUndo
                ? 'border-border/50 text-text3/30 cursor-not-allowed'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
            }`}
          >
            <ArrowCounterClockwise className="h-4 w-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Y)"
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${
              !canRedo
                ? 'border-border/50 text-text3/30 cursor-not-allowed'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
            }`}
          >
            <ArrowClockwise className="h-4 w-4" />
          </button>

          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Parar' : 'Tocar (Espaço)'}
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${
              isPlaying
                ? 'border-accent bg-accent text-white'
                : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
            }`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-1 ml-1">
            <Timer className="h-3.5 w-3.5 text-text3" />
            <Slider
              value={[bpm]}
              onValueChange={([value]) => onBpm(value)}
              min={40}
              max={220}
              step={1}
              className="w-16"
            />
            <span className="text-[10px] text-text3 min-w-[24px]">{bpm}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
