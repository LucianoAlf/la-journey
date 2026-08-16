import { MusicNotes, SpeakerHigh, SpeakerSlash, Trash } from '@phosphor-icons/react'
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
  cifraEnabled?: boolean
  cifraOpen?: boolean
  onOpenCifra?: () => void
  slashArmed?: boolean
  onToggleSlash?: () => void
  inputLocked?: boolean
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
  cifraEnabled = false,
  cifraOpen = false,
  onOpenCifra,
  slashArmed = false,
  onToggleSlash,
  inputLocked = false,
}: NotationDurationStripProps) {
  return (
    <div
      className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-surface px-2 py-1.5"
      onPointerDown={event => event.stopPropagation()}
    >
      <div className="flex shrink-0 items-center gap-1">
        {DURATION_OPTIONS.map(d => (
          <button
            key={d.value}
            onClick={() => onDuration(d.value)}
            disabled={inputLocked}
            title={`${d.label} (${d.key})`}
            className={`${SYMBOL_BUTTON} ${inputLocked ? 'cursor-not-allowed border-border/50 text-text3/30' : noteInputArmed && currentDuration === d.value ? ACTIVE_BUTTON : IDLE_BUTTON}`}
          >
            {d.symbol}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onInsertRest}
          disabled={inputLocked}
          title="Pausa (0)"
          className={`${SYMBOL_BUTTON} ${inputLocked ? 'cursor-not-allowed border-border/50 text-text3/30' : 'border-orange-500/30 text-orange-500 hover:bg-orange-500/10'}`}
        >
          𝄽
        </button>
        <button
          onClick={onToggleDot}
          disabled={inputLocked}
          title="Ponto de aumento (.)"
          className={`${DOT_BUTTON} ${inputLocked ? 'cursor-not-allowed border-border/50 text-text3/30' : dotted || doubleDotted ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          •{doubleDotted && '•'}
        </button>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          onClick={() => onAccidental('#')}
          disabled={inputLocked}
          title="Sustenido (#)"
          className={`${SYMBOL_BUTTON} ${inputLocked ? 'cursor-not-allowed border-border/50 text-text3/30' : currentAccidental === '#' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♯
        </button>
        <button
          onClick={() => onAccidental('b')}
          disabled={inputLocked}
          title="Bemol (-)"
          className={`${SYMBOL_BUTTON} ${inputLocked ? 'cursor-not-allowed border-border/50 text-text3/30' : currentAccidental === 'b' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♭
        </button>
        <button
          onClick={() => onAccidental('n')}
          disabled={inputLocked}
          title="Bequadro (=)"
          className={`${SYMBOL_BUTTON} ${inputLocked ? 'cursor-not-allowed border-border/50 text-text3/30' : currentAccidental === 'n' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
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

      {onOpenCifra && (
        <button
          type="button"
          onClick={onOpenCifra}
          disabled={!cifraEnabled || inputLocked}
          title={cifraEnabled ? 'Escrever a cifra acima da nota (K)' : 'Selecione uma nota na pauta'}
          className={`${BASE_BUTTON} w-auto gap-1.5 px-2.5 text-[12px] font-semibold ${
            !cifraEnabled || inputLocked
              ? 'cursor-not-allowed border-border/50 text-text3/30'
              : cifraOpen
                ? ACTIVE_BUTTON
                : IDLE_BUTTON
          }`}
        >
          <MusicNotes size={16} />
          Cifra
        </button>
      )}
      {onToggleSlash && (
        <button
          type="button"
          onClick={onToggleSlash}
          disabled={inputLocked}
          title="Barra rítmica: escreve barra de tempo em vez de nota"
          className={`${BASE_BUTTON} w-auto gap-1.5 px-2.5 text-[12px] font-semibold ${
            inputLocked
              ? 'cursor-not-allowed border-border/50 text-text3/30'
              : slashArmed
                ? ACTIVE_BUTTON
                : IDLE_BUTTON
          }`}
        >
          <span className="text-[16px] leading-none">/</span>
          Ritmo
        </button>
      )}
    </div>
  )
}
