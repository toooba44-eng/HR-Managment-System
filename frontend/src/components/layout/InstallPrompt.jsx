import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'quant-hr-install-dismissed-at'
const DISMISS_COOLDOWN_DAYS = 14

function isDismissedRecently() {
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY))
  if (!dismissedAt) return false
  const days = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
  return days < DISMISS_COOLDOWN_DAYS
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// Chrome/Edge/Android fire `beforeinstallprompt` only when their own install
// heuristics are satisfied (engagement, not already installed, etc.) — we
// just capture that event and surface it as a banner instead of relying on
// the browser's own mini-infobar, so it matches the app's look and can be
// dismissed with a cooldown instead of reappearing every load.
export default function InstallPrompt() {
  const { t } = useTranslation()
  const [deferredEvent, setDeferredEvent] = useState(null)

  useEffect(() => {
    if (isStandalone()) return

    const onBeforeInstall = (e) => {
      e.preventDefault()
      if (isDismissedRecently()) return
      setDeferredEvent(e)
    }
    const onInstalled = () => setDeferredEvent(null)

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDeferredEvent(null)
  }

  const install = async () => {
    if (!deferredEvent) return
    deferredEvent.prompt()
    const { outcome } = await deferredEvent.userChoice
    if (outcome !== 'accepted') localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDeferredEvent(null)
  }

  if (!deferredEvent) return null

  return (
    <div className="fixed bottom-20 lg:bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-sm">{t('ثبّت تطبيق YASME HR')}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {t('أضِف التطبيق إلى شاشتك الرئيسية للوصول السريع والعمل حتى مع اتصال ضعيف.')}
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={install}
            className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors"
          >
            {t('تثبيت')}
          </button>
          <button
            onClick={dismiss}
            className="px-3 py-1.5 rounded-lg text-slate-500 text-xs font-semibold hover:bg-slate-100"
          >
            {t('لاحقاً')}
          </button>
        </div>
      </div>
      <button onClick={dismiss} className="text-slate-300 hover:text-slate-500 shrink-0" aria-label={t('إغلاق')}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
