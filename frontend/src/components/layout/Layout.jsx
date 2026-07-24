import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const TITLES = {
  '/': 'لوحة التحكم',
  '/employees': 'الموظفون',
  '/departments': 'الإدارات',
  '/attendance': 'الحضور والانصراف',
  '/leaves': 'الإجازات',
  '/profile': 'ملفي الشخصي',
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const title =
    TITLES[location.pathname] ||
    (location.pathname.startsWith('/employees/') ? 'ملف الموظف' : 'Quant HR')

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
