import { memo, type ReactNode } from 'react'

interface PropertiesSidebarProps {
  open: boolean
  children: ReactNode
}

export const PropertiesSidebar = memo(function PropertiesSidebar({
  open,
  children,
}: PropertiesSidebarProps) {
  return (
    <div className={`editor-properties transition-all duration-300 ease-in-out overflow-hidden ${open ? 'w-[360px] border-l border-border' : 'w-0 border-l-0'}`}>
      <div className="w-[360px] h-full overflow-y-auto p-4">
        {children}
      </div>
    </div>
  )
})
