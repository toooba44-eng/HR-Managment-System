import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Gauge, Zap, AlertTriangle, Activity, Cpu, MemoryStick, Database } from 'lucide-react'
import { platformApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'

function Meter({ icon: Icon, label, value, unit, tone }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500"><Icon className="w-4 h-4" /> <span className="text-sm">{label}</span></div>
        <span className="text-sm font-bold text-slate-800">{value}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-3"><div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} /></div>
    </div>
  )
}

export default function Performance() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery('platform-performance', () => platformApi.performance())
  if (isLoading) return <Spinner fullscreen />
  const h = data?.health || {}
  const series = data?.series || []

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Gauge className="w-5 h-5" /></div>
        <div className="flex-1">
          <p className="font-bold text-slate-800">{t('حالة النظام')}</p>
          <p className="text-xs text-slate-400">{t('آخر تحديث الآن')}</p>
        </div>
        <Badge status={h.status}>{t(h.status)}</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label={t('نسبة التشغيل')} value={`${h.uptime ?? 0}%`} tone="green" />
        <StatCard icon={Zap} label={t('متوسط الاستجابة')} value={`${h.avg_response_ms ?? 0}ms`} tone="blue" />
        <StatCard icon={AlertTriangle} label={t('معدّل الأخطاء')} value={`${h.error_rate ?? 0}%`} tone="rose" />
        <StatCard icon={Activity} label={t('طلبات اليوم')} value={(h.requests_today ?? 0).toLocaleString('ar')} tone="violet" />
      </div>

      <div className="card">
        <h3 className="font-bold text-slate-800 mb-4">{t('زمن الاستجابة (آخر 12 ساعة)')}</h3>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="resp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip />
              <Area type="monotone" dataKey="response_ms" stroke="#3b82f6" fill="url(#resp)" strokeWidth={2} name="ms" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Meter icon={Cpu} label={t('المعالج')} value={h.cpu ?? 0} unit="%" tone="bg-blue-500" />
        <Meter icon={MemoryStick} label={t('الذاكرة')} value={h.memory ?? 0} unit="%" tone="bg-violet-500" />
        <Meter icon={Database} label={t('اتصالات قاعدة البيانات')} value={h.db_connections ?? 0} unit="" tone="bg-emerald-500" />
      </div>
    </div>
  )
}
