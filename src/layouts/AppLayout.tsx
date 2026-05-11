import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Modals } from '@/components/Modals'

export function AppLayout() {
  const location = useLocation()
  const isMaterialEditor = /^\/editor\/[^/]+/.test(location.pathname)

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('la-journey-theme') || 'light'
    }
    return 'light'
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('la-journey-theme', theme)
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
        <div className={isMaterialEditor ? 'h-screen overflow-hidden p-0' : 'h-screen overflow-y-auto p-7'}>
          <Outlet />
        </div>
      </main>
      <Modals />
    </div>
  )
}
