import { NavLink } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { portalForRole } from '../../config/portals'
import { ROLE_LABELS, cn } from '../../lib/utils'
import Avatar from '../ui/Avatar'

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuthStore()
  const portal = portalForRole(user?.role)

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 right-0 w-72 bg-white border-l border-slate-100 z-40 flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand + portal name */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shrink-0"
              style={{ background: `linear-gradient(135deg, ${portal.color}, ${portal.color}cc)` }}
            >
              Q
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-slate-800 leading-tight truncate">{portal.name}</h1>
              <p className="text-xs text-slate-400">Quant HR · {portal.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav from the portal config */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide pb-4">
          {portal.nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={onClose}
              className={({ isActive }) => cn('nav-item', isActive && 'active')}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3 px-2">
            <Avatar name={user?.full_name || user?.email} src={user?.profile_picture} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 text-sm truncate">{user?.full_name || user?.email}</p>
              <p className="text-xs text-slate-400">{ROLE_LABELS[user?.role] || user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="nav-item w-full text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  )
}
