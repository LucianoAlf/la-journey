import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  applyCifraAccidental,
  applyCifraRoot,
  cifraRootLabel,
  cifraSuggestions,
  CIFRA_MAX_LENGTH,
  CIFRA_ROOTS,
} from '@/lib/notationCifra'

export interface NotationCifraOverlayProps {
  beatIdx: number
  /** Centro da coluna do beat, em coordenadas do wrapper da pauta. */
  left: number
  /** Faixa em que o AlphaTab grava a cifra, acima da primeira linha. */
  top: number
  value: string
  editing: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onCommit: (value: string) => void
  onStartEditing: () => void
  onStopEditing: () => void
  onNavigateBeat?: (delta: -1 | 1) => void
}

const CHIP = 'h-6 rounded border border-border px-1.5 text-[11px] font-semibold leading-none text-text3 transition-colors hover:border-accent hover:text-accent'
const CHIP_ACTIVE = 'h-6 rounded border border-accent bg-accent px-1.5 text-[11px] font-semibold leading-none text-white'

export function NotationCifraOverlay({
  beatIdx,
  left,
  top,
  value,
  editing,
  inputRef,
  onCommit,
  onStartEditing,
  onStopEditing,
  onNavigateBeat,
}: NotationCifraOverlayProps) {
  const [draft, setDraft] = useState(value)
  const draftRef = useRef(value)

  useEffect(() => {
    draftRef.current = value
    setDraft(value)
  }, [beatIdx, editing, value])

  useEffect(() => {
    if (!editing) return
    const frame = requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus({ preventScroll: true })
      input.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [beatIdx, editing, inputRef])

  // Enquanto compõe, o texto fica local: cada tecla no modelo re-gravaria a pauta.
  const setDraftOnly = (next: string) => {
    draftRef.current = next
    setDraft(next)
    inputRef.current?.focus({ preventScroll: true })
  }

  const commit = () => onCommit(draftRef.current)

  const stopPointer = (event: { stopPropagation: () => void }) => event.stopPropagation()

  return (
    <div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left, top }}
      onPointerDown={stopPointer}
      onPointerMove={stopPointer}
      onBlur={event => {
        if (!editing) return
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        commit()
        onStopEditing()
      }}
    >
      {editing ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={CIFRA_MAX_LENGTH}
            spellCheck={false}
            autoComplete="off"
            aria-label="Cifra desta nota"
            onChange={event => setDraftOnly(event.target.value)}
            onKeyDown={event => {
              event.stopPropagation()
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
                onStopEditing()
                return
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                onStopEditing()
                return
              }
              if (event.key === 'Tab') {
                event.preventDefault()
                commit()
                onNavigateBeat?.(event.shiftKey ? -1 : 1)
              }
            }}
            style={{ width: `${Math.max(3, draft.length + 1)}ch` }}
            className="cifra-inline-input h-[18px] rounded-sm border border-accent bg-white px-0.5 text-center font-serif text-[14px] font-bold italic leading-none text-text shadow-[0_0_0_3px_rgba(236,72,153,0.14)] outline-none"
          />

          <div className="absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 rounded-lg border border-border bg-surface p-2 shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
            <div className="mb-1.5 flex items-center gap-1">
              {CIFRA_ROOTS.map(root => (
                <button
                  key={root}
                  type="button"
                  className={cifraRootLabel(draft).startsWith(root) ? CHIP_ACTIVE : CHIP}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => setDraftOnly(applyCifraRoot(draft, root))}
                >
                  {root}
                </button>
              ))}
              <span className="mx-0.5 h-4 w-px bg-border" />
              <button
                type="button"
                title="Sustenido"
                className={cifraRootLabel(draft).endsWith('#') ? CHIP_ACTIVE : CHIP}
                onMouseDown={event => event.preventDefault()}
                onClick={() => setDraftOnly(applyCifraAccidental(draft || 'C', '#'))}
              >
                ♯
              </button>
              <button
                type="button"
                title="Bemol"
                className={cifraRootLabel(draft).endsWith('b') ? CHIP_ACTIVE : CHIP}
                onMouseDown={event => event.preventDefault()}
                onClick={() => setDraftOnly(applyCifraAccidental(draft || 'C', 'b'))}
              >
                ♭
              </button>
            </div>

            <div className="flex max-w-[19rem] flex-wrap items-center gap-1">
              {cifraSuggestions(draft).map(chord => (
                <button
                  key={chord}
                  type="button"
                  className={draft === chord ? CHIP_ACTIVE : CHIP}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => setDraftOnly(chord)}
                >
                  {chord}
                </button>
              ))}
            </div>

            <div className="mt-1.5 text-center text-[10px] text-text3">
              Enter grava · Tab vai pra próxima nota · Esc cancela
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          title={value ? `Editar a cifra ${value} (K)` : 'Clique para escrever a cifra desta nota (K)'}
          onClick={onStartEditing}
          className={`flex h-[18px] items-center justify-center rounded-sm border border-dashed px-1 transition-colors ${
            value
              ? 'min-w-[2.25rem] border-transparent hover:border-accent/60 hover:bg-accent/5'
              : 'border-accent/50 bg-accent/5 hover:border-accent hover:bg-accent/10'
          }`}
        >
          {value
            ? <span className="sr-only">Editar cifra {value}</span>
            : <span className="font-serif text-[12px] italic leading-none text-accent/70">cifra</span>}
        </button>
      )}
    </div>
  )
}
