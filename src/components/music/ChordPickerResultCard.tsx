import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChordDiagram } from '@/components/music/ChordDiagram'
import { chordFooterText, getChordPosition } from '@/lib/chordLibraryDisplay'
import type { Chord } from '@/services/contentBrowserService'

export function ChordPickerResultCard({
  chord,
  primaryLabel,
  secondaryLabel,
  diagramSize = 'full',
  onPrimary,
  onSecondary,
  primaryBusy = false,
  secondaryBusy = false,
}: {
  chord: Chord
  primaryLabel: string
  secondaryLabel?: string
  diagramSize?: 'compact' | 'full'
  onPrimary: () => void | Promise<void>
  onSecondary?: () => void | Promise<void>
  primaryBusy?: boolean
  secondaryBusy?: boolean
}) {
  const positions = (chord.positions ?? {}) as any
  const hasSecondary = Boolean(secondaryLabel && onSecondary)
  const visibleSecondaryLabel = secondaryLabel === 'Adicionar ao lado' ? 'Adicionar acorde' : secondaryLabel

  return (
    <article className="flex min-h-[320px] flex-col rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-text">{chord.name}</h3>
          <p className="truncate text-[11px] text-text3">{chordFooterText(chord) || 'Violão'}</p>
        </div>
        {chord.caged_shape && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            CAGED {chord.caged_shape}
          </Badge>
        )}
      </div>

      <div className="mt-3 flex flex-1 items-center justify-center rounded-lg bg-surface/60 py-4">
        <ChordDiagram
          name={chord.name}
          positions={positions}
          position={getChordPosition(positions)}
          size={diagramSize}
          strings={6}
        />
      </div>

      <div className={hasSecondary ? 'mt-3 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)] gap-2' : 'mt-3 grid grid-cols-1'}>
        <Button
          size="sm"
          variant={hasSecondary ? 'outline' : 'default'}
          className="h-8 min-w-0 px-2 text-[11px] leading-none"
          disabled={primaryBusy || secondaryBusy}
          onClick={onPrimary}
        >
          {primaryBusy ? 'Aplicando...' : primaryLabel}
        </Button>
        {hasSecondary && (
          <Button
            size="sm"
            className="h-8 min-w-0 px-2 text-[11px] leading-none"
            disabled={primaryBusy || secondaryBusy}
            onClick={onSecondary}
            title={secondaryLabel}
            aria-label={secondaryLabel}
          >
            {secondaryBusy ? 'Aplicando...' : visibleSecondaryLabel}
          </Button>
        )}
      </div>
    </article>
  )
}
