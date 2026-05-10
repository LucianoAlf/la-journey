import { memo, type ReactNode } from 'react'

interface BlockListSidebarProps {
  open: boolean
  children: ReactNode
}

export const BlockListSidebar = memo(function BlockListSidebar({
  open,
  children,
}: BlockListSidebarProps) {
  return (
    <div className={`editor-sidebar transition-all duration-300 ease-in-out overflow-hidden ${open ? 'w-[260px] border-r border-border' : 'w-0 border-r-0'}`}>
      <div className="w-[260px] h-full flex flex-col">
        {children}
      </div>
    </div>
  )
})
