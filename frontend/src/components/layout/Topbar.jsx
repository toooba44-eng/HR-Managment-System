import { Link } from 'react-router-dom'
import { Menu, Bell } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../ui/Avatar'

export default function Topbar({ onMenuClick, title }) {
  const { user } = useAuthStore()

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 left-2 w-2 h-2 bg-rose-500 rounded-full" />
          </button>
          <Link to="/profile" className="hidden sm:flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors" title="ملفي الشخصي">
            <Avatar name={user?.full_name} src={user?.profile_picture} size="sm" />
            <span className="text-sm font-medium text-slate-700">{user?.full_name}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
