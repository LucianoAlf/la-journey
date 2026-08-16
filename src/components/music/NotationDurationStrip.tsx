import { SpeakerHigh, SpeakerSlash, Trash } from '@phosphor-icons/react'
import type { BeatDuration } from './NotationSvgEditor'
import { DURATION_OPTIONS } from '@/lib/notationEditorChrome'

export interface NotationDurationStripProps {
  currentDuration: BeatDuration
  currentAccidental: string | null
  dotted: boolean
  doubleDotted: boolean
  noteInputArmed?: boolean
  canDelete?: boolean
  previewSound?: boolean
  onDuration: (d: BeatDuration) => void
  onAccidental: (a: string | null) => void
  onToggleDot: () => void
  onInsertRest: () => void
  onDelete?: () => void
  onTogglePreviewSound?: () => void
}

const BASE_BUTTON = 'inline-flex items-center justify-center h-10 w-10 rounded-md border transition-colors'
const SYMBOL_BUTTON = `${BASE_BUTTON} text-[22px]`
const DOT_BUTTON = `${BASE_BUTTON} text-[17px] font-bold`
const IDLE_BUTTON = 'border-border text-text3 hover:border-accent/50 hover:text-accent'
const ACTIVE_BUTTON = 'border-accent bg-accent text-white'

export function NotationDurationStrip({
  currentDuration,
  currentAccidental,
  dotted,
  doubleDotted,
  onDuration,
  onAccidental,
  onToggleDot,
  onInsertRest,
  noteInputArmed = true,
  canDelete = false,
  previewSound = true,
  onDelete,
  onTogglePreviewSound,
}: NotationDurationStripProps) {
  return (
    <div
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2 py-1.5"
      onPointerDown={event => event.stopPropagation()}
    >
      <div className="flex shrink-0 items-center gap-1">
        {DURATION_OPTIONS.map(d => (
          <button
            key={d.value}
            onClick={() => onDuration(d.value)}
            title={`${d.label} (${d.key})`}
            className={`${SYMBOL_BUTTON} ${noteInputArmed && currentDuration === d.value ? ACTIVE_BUTTON : IDLE_BUTTON}`}
          >
            {d.symbol}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onInsertRest}
          title="Pausa (0)"
          className={`${SYMBOL_BUTTON} border-orange-500/30 text-orange-500 hover:bg-orange-500/10`}
        >
          𝄽
        </button>
        <button
          onClick={onToggleDot}
          title="Ponto de aumento (.)"
          className={`${DOT_BUTTON} ${dotted || doubleDotted ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          •{doubleDotted && '•'}
        </button>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          onClick={() => onAccidental('#')}
          title="Sustenido (#)"
          className={`${SYMBOL_BUTTON} ${currentAccidental === '#' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♯
        </button>
        <button
          onClick={() => onAccidental('b')}
          title="Bemol (-)"
          className={`${SYMBOL_BUTTON} ${currentAccidental === 'b' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♭
        </button>
        <button
          onClick={() => onAccidental('n')}
          title="Bequadro (=)"
          className={`${SYMBOL_BUTTON} ${currentAccidental === 'n' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♮
        </button>
        {onTogglePreviewSound && (
          <button
            type="button"
            onClick={onTogglePreviewSound}
            title={previewSound ? 'Silenciar som da nota (Sibelius/Finale)' : 'Tocar som ao selecionar'}
            className={`${BASE_BUTTON} ${previewSound ? IDLE_BUTTON : 'border-border text-text3/50 hover:border-accent/50 hover:text-accent'}`}
          >
            {previewSound ? <SpeakerHigh size={18} /> : <SpeakerSlash size={18} />}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete}
            title="Apagar nota (Delete / Backspace)"
            className={`${BASE_BUTTON} ${canDelete ? 'border-border text-text3 hover:border-vermelho/50 hover:text-vermelho' : 'cursor-not-allowed border-border/50 text-text3/30'}`}
          >
            <Trash size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
