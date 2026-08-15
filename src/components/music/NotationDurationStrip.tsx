import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { BeatDuration } from './NotationSvgEditor'
import { DURATION_OPTIONS } from '@/lib/notationEditorChrome'

export interface NotationDurationStripProps {
  currentDuration: BeatDuration
  currentAccidental: string | null
  dotted: boolean
  doubleDotted: boolean
  onDuration: (d: BeatDuration) => void
  onAccidental: (a: string | null) => void
  onToggleDot: () => void
  onInsertRest: () => void
  /** Indicador vivo: nota/pausa selecionada e posição. null = nada selecionado. */
  selectedInfo?: { label: string; position: string } | null
  onNavigate?: (delta: -1 | 1) => void
}

const BASE_BUTTON = 'inline-flex items-center justify-center h-9 w-9 rounded-md border text-[17px] transition-colors'
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
  selectedInfo,
  onNavigate,
}: NotationDurationStripProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2 py-1.5">
      <div className="flex items-center gap-1">
        {DURATION_OPTIONS.map(d => (
          <button
            key={d.value}
            onClick={() => onDuration(d.value)}
            title={`${d.label} (${d.key})`}
            className={`${BASE_BUTTON} ${currentDuration === d.value ? ACTIVE_BUTTON : IDLE_BUTTON}`}
          >
            {d.symbol}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onInsertRest}
          title="Pausa (0)"
          className={`${BASE_BUTTON} border-orange-500/30 text-orange-500 hover:bg-orange-500/10`}
        >
          𝄽
        </button>
        <button
          onClick={onToggleDot}
          title="Ponto de aumento (.)"
          className={`${BASE_BUTTON} font-bold ${dotted || doubleDotted ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          •{doubleDotted && '•'}
        </button>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          onClick={() => onAccidental('#')}
          title="Sustenido (#)"
          className={`${BASE_BUTTON} ${currentAccidental === '#' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♯
        </button>
        <button
          onClick={() => onAccidental('b')}
          title="Bemol (-)"
          className={`${BASE_BUTTON} ${currentAccidental === 'b' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♭
        </button>
        <button
          onClick={() => onAccidental('n')}
          title="Bequadro (=)"
          className={`${BASE_BUTTON} ${currentAccidental === 'n' ? ACTIVE_BUTTON : IDLE_BUTTON}`}
        >
          ♮
        </button>
      </div>

      <div className="flex items-center justify-end gap-1">
        {onNavigate && (
          <button
            onClick={() => onNavigate(-1)}
            title="Nota anterior (←)"
            className={`${BASE_BUTTON} h-7 w-7 ${IDLE_BUTTON}`}
          >
            <CaretLeft size={13} weight="bold" />
          </button>
        )}
        <span className="whitespace-nowrap rounded-md bg-azul-soft px-2.5 py-1 text-[11px] font-semibold text-master">
          {selectedInfo ? `${selectedInfo.label} · ${selectedInfo.position}` : 'Clique na pauta ou tecle A–G'}
        </span>
        {onNavigate && (
          <button
            onClick={() => onNavigate(1)}
            title="Próxima nota (→)"
            className={`${BASE_BUTTON} h-7 w-7 ${IDLE_BUTTON}`}
          >
            <CaretRight size={13} weight="bold" />
          </button>
        )}
      </div>
    </div>
  )
}
