import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'

// The Workbox NetworkFirst caching from the PWA setup silently falls back to
// cached data when offline, which is good for uptime but bad for trust — the
// app can keep looking "normal" while showing stale data with no signal that
// anything is wrong. This makes the offline state visible instead of silent.
export default function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      toast.success('تم استعادة الاتصال بالإنترنت')
    }
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="bg-amber-500 text-white text-sm font-medium px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4 shrink-0" />
      أنت غير متصل بالإنترنت — البيانات المعروضة قد تكون غير محدَّثة
    </div>
  )
}
