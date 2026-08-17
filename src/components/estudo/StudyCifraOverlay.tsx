import { useEffect, useRef, useState } from 'react'
import { applyEstudoCifraChip, ESTUDO_CIFRA_CHIPS, type EstudoCifraChipId } from '@/lib/estudoCifra'
import { cifraOverlayFixedStyle, type CifraOverlayAnchor } from '@/lib/estudoCifraOverlay'
import { CIFRA_MAX_LENGTH } from '@/lib/notationCifra'

export function StudyCifraOverlay({
  value,
  anchor,
  onCommit,
  onCancel,
  onNext,
}: {
  value: string
  anchor: CifraOverlayAnchor | null
  onCommit: (next: string) => void
  onCancel: () => void
  onNext: (current: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef(draft)
  const valueRef = useRef(value)
  const onCommitRef = useRef(onCommit)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    setDraft(value)
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [value])

  draftRef.current = draft
  valueRef.current = value
  onCommitRef.current = onCommit
  onCancelRef.current = onCancel

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current
      if (root && event.target instanceof Node && root.contains(event.target)) return
      if (draftRef.current === valueRef.current) onCancelRef.current()
      else onCommitRef.current(draftRef.current)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div
      ref={rootRef}
      className="estudo-no-print rounded-lg border border-border bg-surface p-2 shadow print:hidden"
      style={anchor ? cifraOverlayFixedStyle(anchor) : { position: 'fixed', left: 24, top: 96, zIndex: 40 }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={draft}
        maxLength={CIFRA_MAX_LENGTH}
        aria-label="Cifra"
        className="mb-2 h-8 w-full rounded border border-accent px-2 font-serif text-[14px] font-bold italic outline-none"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            event.preventDefault()
            onCommit(draft)
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
          if (event.key === ' ' || event.code === 'Space') {
            event.preventDefault()
            onNext(draft)
          }
        }}
      />
      <div className="flex flex-wrap gap-1">
        {ESTUDO_CIFRA_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="h-6 rounded border border-border px-1.5 text-[11px] font-semibold hover:border-accent"
            onClick={() => onCommit(applyEstudoCifraChip(draft || value || 'C', chip.id as EstudoCifraChipId))}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
