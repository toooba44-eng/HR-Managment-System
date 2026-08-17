import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { ArrowUpDown, Check, X, Trash2, Clock, TrendingUp, Ban } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'

const TYPE_TONE = { ترقية: 'bg-emerald-50 text-emerald-700', تخفيض: 'bg-amber-50 text-amber-700', إلغاء: 'bg-rose-50 text-rose-700' }

export default function Requests() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery('sub-requests', () => platformApi.requests())
  const setStatus = useMutation(({ id, status }) => platformApi.setRequestStatus(id, status), {
    onSuccess: () => { toast.success(t('تم التحديث')); qc.invalidateQueries('sub-requests') }, onError: () => toast.error(t('فشل')),
  })
  const del = useMutation((id) => platformApi.removeRequest(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('sub-requests') }, onError: () => toast.error(t('فشل')),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.requests || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={ArrowUpDown} label={t('إجمالي الطلبات')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={Clock} label={t('قيد المراجعة')} value={s.pending ?? 0} tone="amber" />
        <StatCard icon={Ban} label={t('طلبات إلغاء')} value={s.cancellations ?? 0} tone="rose" />
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={ArrowUpDown} title={t('لا توجد طلبات')} /></div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0"><TrendingUp className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800">{r.company_name}</p>
                  <span className={`badge ${TYPE_TONE[r.type] || 'bg-slate-100 text-slate-600'}`}>{t(r.type, { context: 'subscription' })}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {r.current_plan}{r.requested_plan ? ` ← ${r.requested_plan}` : ''}{r.reason ? ` · ${r.reason}` : ''}
                </p>
              </div>
              <Badge status={r.status}>{t(r.status, { context: 'subscription' })}</Badge>
              <div className="flex gap-1">
                {r.status === 'معلق' && (
                  <>
                    <button onClick={() => setStatus.mutate({ id: r.id, status: 'موافق عليه' })} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setStatus.mutate({ id: r.id, status: 'مرفوض' })} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </>
                )}
                <button onClick={() => window.confirm(t('حذف الطلب؟')) && del.mutate(r.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
