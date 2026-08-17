import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Send, CheckCircle2, XCircle, Briefcase, Building2, Wallet, CalendarClock, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import { candidateApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { Button } from '../../components/ui/Form'
import { formatDate, formatCurrency } from '../../lib/utils'

function Row({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <Icon className="w-4 h-4 text-slate-300 shrink-0" />
      <span className="text-xs text-slate-400 w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  )
}

export default function CandidateOffer() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery('cand-offer', () => candidateApi.offer())
  const respond = useMutation(({ id, status }) => candidateApi.respondOffer(id, status), {
    onSuccess: (_, v) => { toast.success(v.status === 'مقبول' ? t('تم قبول العرض 🎉') : t('تم رفض العرض')); qc.invalidateQueries('cand-offer') },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })

  if (isLoading) return <Spinner fullscreen />
  const offer = data?.offer
  if (!offer) return <div className="card"><EmptyState icon={Send} title={t('لا يوجد عرض عمل حالياً')} description={t('سيظهر عرض العمل هنا عند صدوره')} /></div>

  const pending = offer.status === 'معلّق'
  return (
    <div className="space-y-6">
      <div className={`card ${offer.status === 'مقبول' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${offer.status === 'مقبول' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}><Award className="w-7 h-7" /></div>
            <div>
              <p className={`text-xs ${offer.status === 'مقبول' ? 'text-white/70' : 'text-slate-400'}`}>{t('عرض عمل')}</p>
              <h2 className="text-xl font-bold">{offer.job_title}</h2>
            </div>
          </div>
          <Badge status={offer.status}>{t(offer.status)}</Badge>
        </div>
      </div>

      <div className="card">
        <Row icon={Briefcase} label={t('الوظيفة')} value={offer.job_title} />
        <Row icon={Building2} label={t('القسم')} value={offer.department} />
        <Row icon={Wallet} label={t('الراتب')} value={offer.salary ? formatCurrency(offer.salary) : null} />
        <Row icon={CalendarClock} label={t('تاريخ المباشرة')} value={formatDate(offer.start_date)} />
        {offer.details && <p className="text-sm text-slate-600 leading-relaxed mt-4 pt-4 border-t border-slate-100">{offer.details}</p>}
      </div>

      {pending ? (
        <div className="flex gap-3">
          <Button onClick={() => respond.mutate({ id: offer.id, status: 'مقبول' })} loading={respond.isLoading} className="flex-1"><CheckCircle2 className="w-5 h-5" /> {t('قبول العرض')}</Button>
          <button onClick={() => window.confirm(t('هل أنت متأكد من رفض العرض؟')) && respond.mutate({ id: offer.id, status: 'مرفوض' })} className="flex-1 py-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium flex items-center justify-center gap-2"><XCircle className="w-5 h-5" /> {t('رفض العرض')}</button>
        </div>
      ) : (
        <div className="card flex items-center gap-3">
          {offer.status === 'مقبول' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
          <p className="text-sm text-slate-600">
            {offer.status === 'مقبول'
              ? t('لقد قبلت هذا العرض في {{date}}', { date: formatDate(offer.responded_at) })
              : t('لقد رفضت هذا العرض في {{date}}', { date: formatDate(offer.responded_at) })}
          </p>
        </div>
      )}
    </div>
  )
}
