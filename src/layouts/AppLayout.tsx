import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Modals } from '@/components/Modals'

export function AppLayout() {
  const [theme, setTheme] = useState('dark')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev)
  }

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-300">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className={`transition-all duration-300 ${isSidebarCollapsed ? 'ml-[64px]' : 'ml-[240px]'}`}>
        <div className="h-screen overflow-y-auto p-7">
          <Outlet />
        </div>
      </main>
      <Modals />
    </div>
  )
}
