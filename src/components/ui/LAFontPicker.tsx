import { useCallback, useEffect, useMemo, useState } from 'react'
import { CaretDown, Check, ClockCounterClockwise, Sparkle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  FONT_CONTEXT_LABELS,
  GOOGLE_FONT_CATEGORY_LABELS,
  GOOGLE_FONTS,
  findGoogleFont,
  getRecommendedFonts,
  type GoogleFontCategory,
  type GoogleFontListItem,
  type FontUsageContext,
} from '@/lib/googleFonts'
import { loadGoogleFont } from '@/lib/fontLoader'
import { cn } from '@/lib/utils'

interface LAFontPickerProps {
  value: string
  onValueChange: (family: string) => void
  className?: string
  context?: FontUsageContext
}

const RECENT_FONTS_KEY = 'la-journey-recent-fonts'
const MAX_RECENT_FONTS = 6
const FONT_ITEM_CLASS = 'cursor-pointer rounded-xl px-3 py-2 data-[selected=true]:!bg-accent/10 data-[selected=true]:!text-text data-[selected=true]:shadow-[inset_0_0_0_1px_rgb(255_47_119_/_0.22)]'

function readRecentFonts() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_FONTS_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeRecentFont(family: string) {
  if (typeof window === 'undefined' || !family) return []
  const next = [family, ...readRecentFonts().filter(item => item !== family)].slice(0, MAX_RECENT_FONTS)
  try {
    window.localStorage.setItem(RECENT_FONTS_KEY, JSON.stringify(next))
  } catch {
    // localStorage can be unavailable in private or restricted contexts.
  }
  return next
}

export function LAFontPicker({ value, onValueChange, className, context = 'cover' }: LAFontPickerProps) {
  const [open, setOpen] = useState(false)
  const [recentFamilies, setRecentFamilies] = useState<string[]>(() => readRecentFonts())
  const selectedFont = findGoogleFont(value)
  const label = value || 'DM Sans'
  const contextCopy = FONT_CONTEXT_LABELS[context]

  useEffect(() => {
    if (value) loadGoogleFont(value)
  }, [value])

  const categories = useMemo(() => Object.entries(GOOGLE_FONTS), [])
  const recommendedFonts = useMemo(() => getRecommendedFonts(context), [context])
  const recentFonts = useMemo(
    () => recentFamilies
      .map(family => findGoogleFont(family))
      .filter(Boolean) as Array<NonNullable<ReturnType<typeof findGoogleFont>>>,
    [recentFamilies],
  )

  const selectFont = useCallback((family: string, weights?: string[]) => {
    loadGoogleFont(family, weights)
    setRecentFamilies(writeRecentFont(family))
    onValueChange(family)
    setOpen(false)
  }, [onValueChange])

  const renderFontItem = (font: GoogleFontListItem, valueSuffix = '') => (
    <CommandItem
      key={`${font.family}${valueSuffix}`}
      value={`${font.family} ${font.style} ${font.categoryLabel} ${valueSuffix}`}
      className={`min-h-12 ${FONT_ITEM_CLASS}`}
      onSelect={() => selectFont(font.family, font.weights)}
    >
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[15px] font-semibold text-text"
          style={{ fontFamily: `'${font.family}', sans-serif` }}
        >
          {font.family}
        </div>
        <div className="truncate text-[10px] text-text3">{font.style}</div>
      </div>
      {selectedFont?.family === font.family && (
        <Check size={16} weight="bold" className="text-accent" />
      )}
    </CommandItem>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-9 min-w-0 justify-between rounded-xl border-border bg-card px-3 text-left text-[13px] font-medium text-text shadow-sm hover:border-accent/45 hover:bg-bg2/70',
            className,
          )}
        >
          <span className="min-w-0 truncate" style={{ fontFamily: value ? `'${value}', sans-serif` : undefined }}>
            {label}
          </span>
          <CaretDown size={14} weight="bold" className="ml-2 shrink-0 text-text3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] rounded-2xl border-border/80 bg-card p-0 shadow-xl" align="start">
        <Command className="rounded-2xl bg-card">
          <CommandInput placeholder="Buscar fonte..." className="h-11 text-[13px]" />
          <CommandList className="max-h-80">
            <CommandEmpty>Nenhuma fonte encontrada.</CommandEmpty>
            <div className="px-3 py-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-text2">{contextCopy.title}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-text3">{contextCopy.description}</div>
            </div>
            <CommandGroup heading="Recomendadas">
              {recommendedFonts.map(font => (
                <CommandItem
                  key={`recommended-${font.family}`}
                  value={`${font.family} ${font.style} recomendada ${contextCopy.title}`}
                  className={`min-h-12 ${FONT_ITEM_CLASS}`}
                  onSelect={() => selectFont(font.family, font.weights)}
                >
                  <Sparkle size={15} weight="bold" className="mr-2 shrink-0 text-accent/75" />
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[15px] font-semibold text-text"
                      style={{ fontFamily: `'${font.family}', sans-serif` }}
                    >
                      {font.family}
                    </div>
                    <div className="truncate text-[10px] text-text3">{font.style}</div>
                  </div>
                  {selectedFont?.family === font.family && (
                    <Check size={16} weight="bold" className="text-accent" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {recentFonts.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Recentes">
                  {recentFonts.map(font => (
                    <CommandItem
                      key={`recent-${font.family}`}
                      value={`${font.family} ${font.style} recente`}
                      className={`min-h-11 ${FONT_ITEM_CLASS}`}
                      onSelect={() => selectFont(font.family, font.weights)}
                    >
                      <ClockCounterClockwise size={15} weight="bold" className="mr-2 shrink-0 text-text3" />
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-[14px] font-semibold text-text"
                          style={{ fontFamily: `'${font.family}', sans-serif` }}
                        >
                          {font.family}
                        </div>
                        <div className="truncate text-[10px] text-text3">{font.style}</div>
                      </div>
                      {selectedFont?.family === font.family && (
                        <Check size={16} weight="bold" className="text-accent" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            <CommandSeparator />
            {categories.map(([category, fonts], index) => (
              <div key={category}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={GOOGLE_FONT_CATEGORY_LABELS[category as keyof typeof GOOGLE_FONT_CATEGORY_LABELS]}>
                  {fonts.map(font => renderFontItem({
                    ...font,
                    category: category as GoogleFontCategory,
                    categoryLabel: GOOGLE_FONT_CATEGORY_LABELS[category as GoogleFontCategory],
                  }))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
