import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Activity, Building, Users, HardDrive } from 'lucide-react'
import { platformApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'

function Bar({ value, max, tone = 'bg-blue-500' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} /></div>
      <span className="text-xs text-slate-400 w-10 text-left">{pct}%</span>
    </div>
  )
}

export default function Usage() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery('platform-usage', () => platformApi.usage())
  if (isLoading) return <Spinner fullscreen />
  const rows = data?.usage || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building} label={t('المؤسسات النشطة')} value={`${s.active ?? 0}/${s.companies ?? 0}`} tone="blue" />
        <StatCard icon={Users} label={t('المقاعد المستخدمة')} value={`${s.seatsUsed ?? 0}/${s.seats ?? 0}`} tone="green" />
        <StatCard icon={HardDrive} label={t('التخزين المستخدم')} value={`${s.storageUsed ?? 0}/${s.storage ?? 0} GB`} tone="violet" />
        <StatCard icon={Activity} label={t('نسبة الإشغال')} value={`${s.seats ? Math.round((s.seatsUsed / s.seats) * 100) : 0}%`} tone="amber" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-slate-400 border-b border-slate-100">
              <th className="pb-3 font-medium">{t('المؤسسة')}</th>
              <th className="pb-3 font-medium">{t('الباقة')}</th>
              <th className="pb-3 font-medium w-48">{t('المستخدمون')}</th>
              <th className="pb-3 font-medium w-48">{t('التخزين')}</th>
              <th className="pb-3 font-medium">{t('الحالة')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-3 font-medium text-slate-700">{r.name}</td>
                <td className="py-3 text-slate-500">{t(r.plan)}</td>
                <td className="py-3">
                  <p className="text-xs text-slate-500 mb-1">{r.users_used}/{r.users_limit}</p>
                  <Bar value={r.users_used} max={r.users_limit} />
                </td>
                <td className="py-3">
                  <p className="text-xs text-slate-500 mb-1">{r.storage_used_gb}/{r.storage_limit_gb} GB</p>
                  <Bar value={r.storage_used_gb} max={r.storage_limit_gb} tone="bg-violet-500" />
                </td>
                <td className="py-3"><Badge status={r.status}>{t(r.status)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
