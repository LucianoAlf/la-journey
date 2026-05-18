import { Badge } from '@/components/ui/badge'
import { groupChordsByCagedShape } from '@/lib/chordLibraryDisplay'
import type { Chord } from '@/services/contentBrowserService'
import { ChordPickerResultCard } from './ChordPickerResultCard'

export function ChordPickerCagedResults({
  chords,
  primaryLabel,
  secondaryLabel,
  selectingKey,
  onPrimary,
  onSecondary,
}: {
  chords: Chord[]
  primaryLabel: string
  secondaryLabel?: string
  selectingKey: string | null
  onPrimary: (chord: Chord) => void | Promise<void>
  onSecondary?: (chord: Chord) => void | Promise<void>
}) {
  const groups = groupChordsByCagedShape(chords)

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {groups.map(group => (
        <section key={group.shape} className="overflow-hidden rounded-xl border border-border bg-card/70">
          <div className="flex items-center gap-2 border-b border-border bg-surface/60 px-3 py-2">
            <span className="font-mono text-[16px] font-black text-accent">{group.shape}</span>
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-text">{group.label}</div>
              {group.description && <div className="truncate text-[10px] text-text3">{group.description}</div>}
            </div>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {group.chords.length}
            </Badge>
          </div>

          {group.chords.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12px] italic text-text3">
              Nenhum acorde neste formato.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-3">
              {group.chords.map(chord => (
                <ChordPickerResultCard
                  key={chord.id}
                  chord={chord}
                  primaryLabel={primaryLabel}
                  secondaryLabel={secondaryLabel}
                  diagramSize="full"
                  primaryBusy={selectingKey === `${chord.id}:primary`}
                  secondaryBusy={selectingKey === `${chord.id}:secondary`}
                  onPrimary={() => onPrimary(chord)}
                  onSecondary={onSecondary ? () => onSecondary(chord) : undefined}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
