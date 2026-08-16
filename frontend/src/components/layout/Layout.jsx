import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import NetworkStatus from './NetworkStatus'
import InstallPrompt from './InstallPrompt'
import { useAuthStore } from '../../store/authStore'
import { portalForRole } from '../../config/portals'

export default function Layout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuthStore()
  const portal = portalForRole(user?.role)

  // Title = the matching nav item's label, with a couple of special cases
  const match = portal.nav.find((n) => n.to === location.pathname)
  let title = match?.label || portal.name
  if (location.pathname.startsWith('/employees/')) title = 'ملف الموظف'
  if (location.pathname === '/profile') title = 'ملفي الشخصي'
  if (location.pathname === '/hr/policies') title = 'السياسات'
  title = t(title)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <NetworkStatus />
        <main className="flex-1 p-4 pb-24 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <BottomNav onMenuClick={() => setSidebarOpen(true)} />
      <InstallPrompt />
    </div>
  )
}
