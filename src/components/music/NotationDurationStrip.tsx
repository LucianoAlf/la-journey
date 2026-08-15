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

export function NotationDurationStrip({
  currentDuration,
  currentAccidental,
  dotted,
  doubleDotted,
  onDuration,
  onAccidental,
  onToggleDot,
  onInsertRest,
}: NotationDurationStripProps) {
  return (
    <>
      {DURATION_OPTIONS.map(d => (
        <button
          key={d.value}
          onClick={() => onDuration(d.value)}
          title={`${d.label} (${d.key})`}
          className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-[15px] transition-colors
            ${currentDuration === d.value
              ? 'border-accent bg-accent text-white'
              : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
            }`}
        >
          {d.symbol}
        </button>
      ))}

      <button
        onClick={onInsertRest}
        title="Pausa (0)"
        className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 transition-colors"
      >
        🔇
      </button>

      <button
        onClick={onToggleDot}
        title="Ponto de aumento (.)"
        className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-[15px] font-bold transition-colors
          ${dotted || doubleDotted
            ? 'border-accent bg-accent text-white'
            : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
          }`}
      >
        •{doubleDotted && '•'}
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      <button
        onClick={() => onAccidental('#')}
        title="Sustenido (#)"
        className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-[14px] transition-colors
          ${currentAccidental === '#'
            ? 'border-accent bg-accent text-white'
            : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
          }`}
      >
        ♯
      </button>
      <button
        onClick={() => onAccidental('b')}
        title="Bemol (B)"
        className={`inline-flex items-center justify-center h-7 w-7 rounded-md border text-[14px] transition-colors
          ${currentAccidental === 'b'
            ? 'border-accent bg-accent text-white'
            : 'border-border text-text3 hover:border-accent/50 hover:text-accent'
          }`}
      >
        ♭
      </button>
    </>
  )
}
