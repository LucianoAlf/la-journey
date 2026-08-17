import { useEffect, useRef, useState } from 'react'
import { applyEstudoCifraChip, ESTUDO_CIFRA_CHIPS, type EstudoCifraChipId } from '@/lib/estudoCifra'
import { CIFRA_MAX_LENGTH } from '@/lib/notationCifra'

export function StudyCifraOverlay({
  value,
  onCommit,
  onCancel,
  onNext,
}: {
  value: string
  onCommit: (next: string) => void
  onCancel: () => void
  onNext: (current: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [value])

  return (
    <div
      className="estudo-no-print absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-lg border border-border bg-surface p-2 shadow print:hidden"
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
