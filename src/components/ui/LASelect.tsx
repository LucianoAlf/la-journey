import { CaretDown, Check } from '@phosphor-icons/react'
import { Select as SelectPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

const EMPTY_VALUE = '__la_select_empty__'

export interface LASelectProps {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export function LASelect({ value, onValueChange, options, placeholder = 'Selecionar', className }: LASelectProps) {
  const normalizedValue = value === '' ? EMPTY_VALUE : value
  const normalizedOptions = options.map(option => ({
    ...option,
    value: option.value === '' ? EMPTY_VALUE : option.value,
  }))

  return (
    <SelectPrimitive.Root
      value={normalizedValue}
      onValueChange={nextValue => onValueChange(nextValue === EMPTY_VALUE ? '' : nextValue)}
    >
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-left text-[13px] text-text shadow-sm outline-none transition-all hover:border-accent/45 hover:bg-bg2/70 focus:border-accent focus:ring-2 focus:ring-accent/18 disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <CaretDown size={14} weight="bold" className="shrink-0 text-text3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-border/80 bg-card p-1.5 text-text shadow-xl"
        >
          <SelectPrimitive.Viewport className="max-h-72 overflow-y-auto pr-1">
            {normalizedOptions.map(option => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex h-9 cursor-default select-none items-center rounded-xl py-1.5 pl-3 pr-8 text-[13px] outline-none transition-colors focus:bg-accent/12 focus:text-accent data-[state=checked]:bg-accent/10 data-[state=checked]:font-semibold data-[state=checked]:text-accent"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center justify-center">
                  <Check size={14} weight="bold" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
