import { useQuery } from 'react-query'
import { Plug, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { platformApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'

export default function ApiMonitor() {
  const { data, isLoading } = useQuery('platform-api', () => platformApi.apiMonitor())
  if (isLoading) return <Spinner fullscreen />
  const rows = data?.endpoints || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Plug} label="التكاملات المتصلة" value={`${s.connected ?? 0}/${s.total ?? 0}`} tone="green" />
        <StatCard icon={Activity} label="طلبات آخر 24 ساعة" value={(s.calls ?? 0).toLocaleString('ar')} tone="blue" />
        <StatCard icon={AlertTriangle} label="أخطاء 24 ساعة" value={s.errors ?? 0} tone="rose" />
        <StatCard icon={CheckCircle2} label="معدّل النجاح" value={`${s.calls ? (100 - Math.round((s.errors / s.calls) * 1000) / 10) : 100}%`} tone="violet" />
      </div>

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon={Plug} title="لا توجد تكاملات" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-400 border-b border-slate-100">
                <th className="pb-3 font-medium">التكامل</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium">الطلبات (24س)</th>
                <th className="pb-3 font-medium">الأخطاء</th>
                <th className="pb-3 font-medium">معدّل الخطأ</th>
                <th className="pb-3 font-medium">زمن الاستجابة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 font-medium text-slate-700">{r.name}<span className="text-xs text-slate-400 mr-2">{r.category}</span></td>
                  <td className="py-3"><Badge status={r.status} /></td>
                  <td className="py-3 text-slate-600">{r.calls_24h.toLocaleString('ar')}</td>
                  <td className="py-3 text-slate-600">{r.errors_24h}</td>
                  <td className="py-3"><span className={r.error_rate > 1 ? 'text-rose-600' : 'text-slate-600'}>{r.error_rate}%</span></td>
                  <td className="py-3 text-slate-600">{r.avg_latency_ms ? `${r.avg_latency_ms}ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
