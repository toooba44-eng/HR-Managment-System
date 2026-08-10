import { Fragment, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LogOut, X, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { portalForRole } from '../../config/portals'
import { ROLE_LABELS, cn } from '../../lib/utils'
import Avatar from '../ui/Avatar'

// Nav items already arrive grouped by section (contiguous runs sharing the
// same `section` value) — fold that into { section, items } chunks so each
// section can be rendered as its own collapsible group.
function groupNav(nav) {
  const groups = []
  for (const item of nav) {
    const last = groups[groups.length - 1]
    const section = item.section || null
    if (last && last.section === section) last.items.push(item)
    else groups.push({ section, items: [item] })
  }
  return groups
}

function isItemActive(item, pathname) {
  if (item.exact) return pathname === item.to
  return pathname === item.to || pathname.startsWith(item.to + '/')
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuthStore()
  const portal = portalForRole(user?.role)
  const location = useLocation()
  const groups = groupNav(portal.nav)

  const activeSection = groups.find(
    (g) => g.section && g.items.some((item) => isItemActive(item, location.pathname))
  )?.section

  // Sections collapse by default; whichever one holds the current page
  // starts (and stays) open so navigating never hides the active link.
  const [openSections, setOpenSections] = useState(() => new Set(activeSection ? [activeSection] : []))

  useEffect(() => {
    if (activeSection) {
      setOpenSections((prev) => (prev.has(activeSection) ? prev : new Set(prev).add(activeSection)))
    }
  }, [activeSection])

  const toggleSection = (name) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

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

        {/* Nav from the portal config — ungrouped items stay as plain links,
            sectioned items collapse into accordion groups. */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide pb-4">
          {groups.map((group) =>
            group.section ? (
              <div key={group.section} className="pt-1">
                <button
                  type="button"
                  onClick={() => toggleSection(group.section)}
                  aria-expanded={openSections.has(group.section)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors"
                >
                  <span className="truncate">{group.section}</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
                      openSections.has(group.section) && 'rotate-180'
                    )}
                  />
                </button>
                {openSections.has(group.section) && (
                  <div className="space-y-1">
                    {group.items.map((item) => (
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
                  </div>
                )}
              </div>
            ) : (
              <Fragment key={group.items[0].to}>
                {group.items.map((item) => (
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
              </Fragment>
            )
          )}
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
