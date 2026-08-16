import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Menu, Bell, CheckCheck } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { notificationsApi } from '../../api/endpoints'
import { timeAgo } from '../../lib/utils'
import Avatar from '../ui/Avatar'
import GlobalSearch from './GlobalSearch'
import LanguageToggle from './LanguageToggle'

const TYPE_DOT = { success: 'bg-emerald-500', error: 'bg-rose-500', warning: 'bg-amber-500', info: 'bg-blue-500' }

function NotificationsBell() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data } = useQuery('notifications', () => notificationsApi.list(), { refetchInterval: 20000 })
  const notifications = data?.notifications || []
  const unreadCount = data?.unread_count || 0

  const markRead = useMutation((id) => notificationsApi.markRead(id), {
    onSuccess: () => qc.invalidateQueries('notifications'),
  })
  const markAllRead = useMutation(() => notificationsApi.markAllRead(), {
    onSuccess: () => qc.invalidateQueries('notifications'),
  })

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const onClickNotification = (n) => {
    if (!n.is_read) markRead.mutate(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 left-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-lg border border-slate-100 z-30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-700">{t('الإشعارات')}</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> {t('تعليم الكل كمقروء')}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{t('لا توجد إشعارات')}</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onClickNotification(n)}
                  className={`w-full text-right px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex gap-2.5 ${n.is_read ? '' : 'bg-blue-50/40'}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${n.is_read ? 'bg-transparent' : TYPE_DOT[n.type] || 'bg-blue-500'}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-slate-700 truncate">{n.title}</span>
                    {n.message && <span className="block text-xs text-slate-500 truncate mt-0.5">{n.message}</span>}
                    <span className="block text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Topbar({ onMenuClick, title }) {
  const { t } = useTranslation()
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
          <GlobalSearch />
          <LanguageToggle />
          <NotificationsBell />
          <Link to="/profile" className="hidden sm:flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors" title={t('ملفي الشخصي')}>
            <Avatar name={user?.full_name} src={user?.profile_picture} size="sm" />
            <span className="text-sm font-medium text-slate-700">{user?.full_name}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
