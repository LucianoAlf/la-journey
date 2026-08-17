import { useEffect, useState } from 'react'
import { sanitizeEstudoTitle } from '@/lib/estudoConfig'

export function StudyTitleField({
  value,
  onCommit,
  className,
}: {
  value: string
  onCommit: (next: string) => void
  className?: string
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    const next = sanitizeEstudoTitle(draft, value)
    if (!next) {
      setDraft(value)
      return
    }
    if (next !== value) onCommit(next)
    else setDraft(next)
  }

  return (
    <input
      value={draft}
      aria-label="Nome da faixa"
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
      className={className ?? 'w-full bg-transparent font-semibold text-text outline-none'}
    />
  )
}
