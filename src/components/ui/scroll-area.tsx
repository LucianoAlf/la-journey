import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * ScrollArea com scrollbar nativa estilizada via CSS.
 * Substitui o Radix ScrollArea que não funciona em containers com overflow-hidden.
 */
function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="scroll-area"
      className={cn(
        "relative overflow-y-auto overflow-x-hidden",
        // Scrollbar estilizada via CSS
        "[&::-webkit-scrollbar]:w-2",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20",
        "[&::-webkit-scrollbar-thumb:hover]:bg-white/35",
        // Firefox
        "scrollbar-width-thin scrollbar-color-white/20",
        className
      )}
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
      {...props}
    >
      {children}
    </div>
  )
}

// ScrollBar mantido como no-op para compatibilidade de imports existentes
function ScrollBar() {
  return null
}

export { ScrollArea, ScrollBar }
