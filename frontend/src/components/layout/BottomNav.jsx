import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { portalForRole } from '../../config/portals'
import { cn } from '../../lib/utils'

// A native-app-style tab bar for small screens: the portal's home page plus
// a curated shortlist of its most-used destinations (portal.primaryNav),
// with a final tab that opens the full sidebar for everything else.
export default function BottomNav({ onMenuClick }) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const portal = portalForRole(user?.role)

  const homeItem = portal.nav.find((item) => item.to === portal.home)
  const primaryItems = (portal.primaryNav || [])
    .map((to) => portal.nav.find((item) => item.to === to))
    .filter(Boolean)

  const tabs = [homeItem, ...primaryItems].filter(Boolean)

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-100 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-slate-400',
              isActive && 'text-primary-700'
            )
          }
        >
          <item.icon className="w-5 h-5" />
          <span className="truncate max-w-full px-1">{t(item.label)}</span>
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-slate-400"
      >
        <Menu className="w-5 h-5" />
        <span>{t('المزيد')}</span>
      </button>
    </nav>
  )
}
