import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Users, UserCheck, UserX, Activity, Star, GripVertical, ClipboardList, AlertTriangle, Send, Badge as BadgeIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { applicationsApi, jobsApi, scorecardsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import Modal from '../../components/ui/Modal'
import { Select, Field, Input, Textarea, Button } from '../../components/ui/Form'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../lib/utils'

const STAGE_TONE = {
  'متقدم جديد': 'border-t-slate-400', 'مراجعة أولية': 'border-t-blue-400', اختبار: 'border-t-cyan-400',
  مقابلة: 'border-t-violet-400', 'عرض وظيفي': 'border-t-amber-400', 'تم التوظيف': 'border-t-emerald-500', مرفوض: 'border-t-rose-400',
}
const SOURCE_TONE = { LinkedIn: 'bg-blue-50 text-blue-600', Indeed: 'bg-indigo-50 text-indigo-600', الموقع: 'bg-slate-100 text-slate-600', 'إحالة موظف': 'bg-emerald-50 text-emerald-600' }

function Stars({ value, onRate }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={(e) => { e.stopPropagation(); onRate(n) }} className={`${n <= (value || 0) ? 'text-amber-400' : 'text-slate-200'} hover:scale-110 transition-transform`}>
          <Star className="w-3.5 h-3.5 fill-current" />
        </button>
      ))}
    </div>
  )
}

const RECOMMENDATIONS = [
  { v: 'يوصى بشدة', tone: 'bg-emerald-600 text-white border-emerald-600' },
  { v: 'يوصى', tone: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { v: 'محايد', tone: 'bg-slate-100 text-slate-600 border-slate-200' },
  { v: 'لا يوصى', tone: 'bg-rose-50 text-rose-600 border-rose-200' },
]
const CRITERIA = [
  { key: 'technical', label: 'الجانب التقني' },
  { key: 'communication', label: 'التواصل' },
  { key: 'problem_solving', label: 'حل المشكلات' },
  { key: 'culture_fit', label: 'التوافق الثقافي' },
]

function ScoreRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-600 w-32 shrink-0">{label}</span>
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${value === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function ScorecardModal({ application, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery(['scorecard', application.id], () => scorecardsApi.get(application.id))
  const [form, setForm] = useState({ technical: 3, communication: 3, problem_solving: 3, culture_fit: 3, recommendation: 'محايد', notes: '' })
  const [dirty, setDirty] = useState(false)

  const mine = data?.mine
  const active = dirty ? form : (mine ? { ...mine, notes: mine.notes || '' } : form)

  const submit = useMutation(() => scorecardsApi.submit(application.id, active), {
    onSuccess: () => { toast.success(t('تم حفظ التقييم')); qc.invalidateQueries(['scorecard', application.id]); setDirty(false) },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل الحفظ')),
  })
  const withdraw = useMutation(() => scorecardsApi.remove(application.id), {
    onSuccess: () => { toast.success(t('تم سحب التقييم')); qc.invalidateQueries(['scorecard', application.id]); setDirty(false) },
    onError: () => toast.error(t('فشل')),
  })
  const set = (k, v) => { setDirty(true); setForm((f) => ({ ...(dirty ? f : (mine || f)), [k]: v })) }

  const scorecards = data?.scorecards || []
  const avg = data?.averages

  return (
    <Modal open onClose={onClose} title={t('بطاقات تقييم المقابلة — {{name}}', { name: application.candidate_name })}>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          {avg && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">{t('المتوسط العام: {{avg}} / 5', { avg: avg.overall })}</span>
                {data.disagreement && (
                  <span className="badge bg-amber-50 text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {t('تباين كبير بين المقيّمين')}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                {CRITERIA.map((c) => <div key={c.key} className="flex justify-between"><span>{t(c.label)}</span><span className="font-medium text-slate-700">{avg[c.key]}</span></div>)}
              </div>
            </div>
          )}

          {scorecards.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">{t('تقييمات المقابلين ({{count}})', { count: scorecards.length })}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="text-right p-1.5 font-medium">{t('المقابل')}</th>
                      {CRITERIA.map((c) => <th key={c.key} className="p-1.5 font-medium text-center min-w-[60px]">{t(c.label)}</th>)}
                      <th className="p-1.5 font-medium text-center">{t('التوصية')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecards.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="p-1.5">
                          <div className="flex items-center gap-1.5">
                            <Avatar name={s.interviewer_name} src={s.interviewer_picture} size="sm" />
                            <span className="text-slate-700 truncate">{s.interviewer_name}</span>
                          </div>
                        </td>
                        {CRITERIA.map((c) => <td key={c.key} className="p-1.5 text-center text-slate-600">{s[c.key]}</td>)}
                        <td className="p-1.5 text-center">
                          <span className={`badge ${RECOMMENDATIONS.find((r) => r.v === s.recommendation)?.tone || ''}`}>{t(s.recommendation)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {scorecards.filter((s) => s.notes).map((s) => (
                <p key={s.id} className="text-xs text-slate-500"><b className="text-slate-600">{s.interviewer_name}:</b> {s.notes}</p>
              ))}
            </div>
          )}

          {user?.employee_id && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-sm font-bold text-slate-700">{mine ? t('تقييمي') : t('أضف تقييمك')}</p>
              {CRITERIA.map((c) => (
                <ScoreRow key={c.key} label={t(c.label)} value={active[c.key]} onChange={(v) => set(c.key, v)} />
              ))}
              <div className="flex gap-2">
                {RECOMMENDATIONS.map((r) => (
                  <button key={r.v} type="button" onClick={() => set('recommendation', r.v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${active.recommendation === r.v ? r.tone : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                    {t(r.v)}
                  </button>
                ))}
              </div>
              <Field label={t('ملاحظات')}><Textarea rows={2} value={active.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
              <div className="flex justify-between gap-3">
                {mine ? <Button variant="secondary" onClick={() => withdraw.mutate()} loading={withdraw.isLoading} className="text-rose-500">{t('سحب التقييم')}</Button> : <span />}
                <Button onClick={() => submit.mutate()} loading={submit.isLoading}>{mine ? t('تحديث التقييم') : t('حفظ التقييم')}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

const OFFER_STATUS_TONE = { 'معلّق': 'bg-amber-50 text-amber-600', مقبول: 'bg-emerald-50 text-emerald-600', مرفوض: 'bg-rose-50 text-rose-600' }

function OfferModal({ application, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery(['application-offer', application.id], () => applicationsApi.getOffer(application.id))
  const [form, setForm] = useState({ job_title: application.job_title || '', department: application.job_department || '', salary: '', start_date: '', details: '' })

  const create = useMutation(() => applicationsApi.createOffer(application.id, { ...form, salary: form.salary ? Number(form.salary) : null }), {
    onSuccess: () => { toast.success(t('تم إرسال العرض للمرشّح')); qc.invalidateQueries(['application-offer', application.id]); qc.invalidateQueries(['pipeline']) },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل إنشاء العرض')),
  })
  const withdraw = useMutation((offerId) => applicationsApi.withdrawOffer(offerId), {
    onSuccess: () => { toast.success(t('تم سحب العرض')); qc.invalidateQueries(['application-offer', application.id]) },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل السحب')),
  })

  const offer = data?.offer

  return (
    <Modal open onClose={onClose} title={t('العرض الوظيفي — {{name}}', { name: application.candidate_name })}>
      {isLoading ? <Spinner /> : offer ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{offer.job_title}</h3>
            <span className={`badge ${OFFER_STATUS_TONE[offer.status] || ''}`}>{t(offer.status)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {offer.department && <div><p className="text-slate-400 text-xs">{t('الإدارة')}</p><p className="text-slate-700">{offer.department}</p></div>}
            {offer.salary != null && <div><p className="text-slate-400 text-xs">{t('الراتب المعروض')}</p><p className="text-slate-700 font-medium">{formatCurrency(offer.salary)}</p></div>}
            {offer.start_date && <div><p className="text-slate-400 text-xs">{t('تاريخ المباشرة')}</p><p className="text-slate-700">{formatDate(offer.start_date)}</p></div>}
          </div>
          {offer.details && <p className="text-sm text-slate-600 leading-relaxed">{offer.details}</p>}
          {offer.status === 'معلّق' && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="secondary" className="text-rose-500" onClick={() => withdraw.mutate(offer.id)} loading={withdraw.isLoading}>{t('سحب العرض')}</Button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-4">
          <Field label={t('المسمى الوظيفي')} required>
            <Input value={form.job_title} onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('الإدارة')}><Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></Field>
            <Field label={t('الراتب المعروض')}><Input type="number" min="0" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} /></Field>
            <Field label={t('تاريخ المباشرة')}><Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} /></Field>
          </div>
          <Field label={t('تفاصيل إضافية')}><Textarea rows={3} value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} /></Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
            <Button type="submit" loading={create.isLoading}><Send className="w-4 h-4" /> {t('إرسال العرض')}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default function Pipeline() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [jobId, setJobId] = useState('')
  const [dragId, setDragId] = useState(null)
  const [overStage, setOverStage] = useState(null)
  const [scoring, setScoring] = useState(null)
  const [offering, setOffering] = useState(null)
  const { data: jobsData } = useQuery('jobs', () => jobsApi.list())
  const { data, isLoading } = useQuery(['pipeline', jobId], () => applicationsApi.pipeline(jobId ? { job_id: jobId } : {}))
  const move = useMutation(({ id, stage }) => applicationsApi.moveStage(id, stage), {
    onSuccess: () => { qc.invalidateQueries(['pipeline', jobId]) }, onError: () => toast.error(t('فشل النقل')),
  })
  const rate = useMutation(({ id, rating }) => applicationsApi.rate(id, rating), {
    onSuccess: () => { qc.invalidateQueries(['pipeline', jobId]) }, onError: () => toast.error(t('فشل')),
  })

  if (isLoading) return <Spinner fullscreen />
  const columns = data?.columns || []
  const s = data?.summary || {}
  const jobs = jobsData?.jobs || jobsData || []

  const onDrop = (stage) => {
    setOverStage(null)
    if (dragId == null) return
    const card = columns.flatMap((c) => c.cards).find((x) => x.id === dragId)
    if (card && card.stage !== stage) { move.mutate({ id: dragId, stage }); toast.success(t('نُقل إلى: {{stage}}', { stage: t(stage) })) }
    setDragId(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('إجمالي المرشحين')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={Activity} label={t('قيد المعالجة')} value={s.active ?? 0} tone="violet" />
        <StatCard icon={UserCheck} label={t('تم التوظيف')} value={s.hired ?? 0} tone="green" />
        <StatCard icon={UserX} label={t('مرفوض')} value={s.rejected ?? 0} tone="rose" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={jobId} onChange={(e) => setJobId(e.target.value)} className="max-w-[280px]">
          <option value="">{t('كل الوظائف')}</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
        <p className="text-xs text-slate-400">{t('اسحب البطاقة لنقل المرشّح، أو انقر عليها لبطاقة تقييم المقابلة')}</p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => (
            <div
              key={col.stage}
              onDragOver={(e) => { e.preventDefault(); setOverStage(col.stage) }}
              onDragLeave={() => setOverStage((s2) => (s2 === col.stage ? null : s2))}
              onDrop={() => onDrop(col.stage)}
              className={`w-64 shrink-0 rounded-2xl bg-slate-50/70 border-t-4 ${STAGE_TONE[col.stage] || 'border-t-slate-300'} ${overStage === col.stage ? 'ring-2 ring-blue-300' : ''}`}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-bold text-slate-700">{t(col.stage)}</span>
                <span className="text-xs bg-white text-slate-500 rounded-full px-2 py-0.5 border border-slate-100">{col.cards.length}</span>
              </div>
              <div className="px-2 pb-2 space-y-2 min-h-[120px]">
                {col.cards.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setScoring(c)}
                    className={`bg-white rounded-xl border border-slate-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm ${dragId === c.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                      <Avatar name={c.candidate_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{c.candidate_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{c.job_title}</p>
                      </div>
                      <ClipboardList className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1" />
                      {c.stage !== 'متقدم جديد' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setOffering(c) }}
                          title={t('العرض الوظيفي')}
                          className="text-amber-400 hover:text-amber-500 shrink-0 mt-1"
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                      <Stars value={c.rating} onRate={(rating) => rate.mutate({ id: c.id, rating })} />
                      {c.source && <span className={`badge ${SOURCE_TONE[c.source] || 'bg-slate-100 text-slate-500'}`}>{c.source === 'الموقع' ? t(c.source, { context: 'website' }) : t(c.source)}</span>}
                    </div>
                  </div>
                ))}
                {col.cards.length === 0 && <p className="text-[11px] text-slate-300 text-center py-6">{t('اسحب مرشّحاً هنا')}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {scoring && <ScorecardModal application={scoring} onClose={() => setScoring(null)} />}
      {offering && <OfferModal application={offering} onClose={() => setOffering(null)} />}
    </div>
  )
}
