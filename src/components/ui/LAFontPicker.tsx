import { useEffect, useMemo, useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'

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
import { GOOGLE_FONT_CATEGORY_LABELS, GOOGLE_FONTS, findGoogleFont } from '@/lib/googleFonts'
import { loadGoogleFont } from '@/lib/fontLoader'
import { cn } from '@/lib/utils'

interface LAFontPickerProps {
  value: string
  onValueChange: (family: string) => void
  className?: string
}

export function LAFontPicker({ value, onValueChange, className }: LAFontPickerProps) {
  const [open, setOpen] = useState(false)
  const selectedFont = findGoogleFont(value)
  const label = value || 'DM Sans'

  useEffect(() => {
    if (value) loadGoogleFont(value)
  }, [value])

  const categories = useMemo(() => Object.entries(GOOGLE_FONTS), [])

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
            {categories.map(([category, fonts], index) => (
              <div key={category}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={GOOGLE_FONT_CATEGORY_LABELS[category as keyof typeof GOOGLE_FONT_CATEGORY_LABELS]}>
                  {fonts.map(font => (
                    <CommandItem
                      key={font.family}
                      value={`${font.family} ${font.style} ${GOOGLE_FONT_CATEGORY_LABELS[category as keyof typeof GOOGLE_FONT_CATEGORY_LABELS]}`}
                      className="min-h-12 cursor-pointer rounded-xl px-3 py-2"
                      onSelect={() => {
                        loadGoogleFont(font.family, font.weights)
                        onValueChange(font.family)
                        setOpen(false)
                      }}
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
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
