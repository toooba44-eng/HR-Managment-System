import { useState } from 'react'
import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { ScrollText, Info, AlertTriangle, ShieldAlert } from 'lucide-react'
import { platformApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { Select } from '../../components/ui/Form'
import { formatDate, formatTime } from '../../lib/utils'

const SEV_ICON = { معلومة: Info, تحذير: AlertTriangle, حرج: ShieldAlert }
const SEV_TONE = { معلومة: 'bg-blue-50 text-blue-600', تحذير: 'bg-amber-50 text-amber-600', حرج: 'bg-rose-50 text-rose-600' }

export default function Audit() {
  const { t } = useTranslation()
  const [sev, setSev] = useState('')
  const { data, isLoading } = useQuery(['platform-audit', sev], () => platformApi.audit(sev ? { severity: sev } : {}))
  if (isLoading) return <Spinner fullscreen />
  const logs = data?.logs || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={ScrollText} label={t('إجمالي العمليات')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={AlertTriangle} label={t('تحذيرات')} value={s.warnings ?? 0} tone="amber" />
        <StatCard icon={ShieldAlert} label={t('حرجة')} value={s.critical ?? 0} tone="rose" />
      </div>

      <div className="flex justify-end">
        <Select value={sev} onChange={(e) => setSev(e.target.value)} className="max-w-[200px]">
          <option value="">{t('كل المستويات')}</option>
          <option value="معلومة">{t('معلومة')}</option>
          <option value="تحذير">{t('تحذير')}</option>
          <option value="حرج">{t('حرج')}</option>
        </Select>
      </div>

      {logs.length === 0 ? (
        <div className="card"><EmptyState icon={ScrollText} title={t('لا توجد عمليات مسجّلة')} /></div>
      ) : (
        <div className="card">
          <div className="space-y-1">
            {logs.map((l) => {
              const Icon = SEV_ICON[l.severity] || Info
              return (
                <div key={l.id} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${SEV_TONE[l.severity]}`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-700">{l.action}</p>
                      <Badge status={l.severity}>{t(l.severity)}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{l.actor} · {l.entity}{l.details ? ` · ${l.details}` : ''}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-xs text-slate-500">{formatDate(l.created_at)}</p>
                    <p className="text-[10px] text-slate-400">{formatTime(l.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
