import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ClipboardList, Plus, Trash2, Star, CheckCircle2, BarChart3, MessageSquare, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { surveysApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Button } from '../../components/ui/Form'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']

function Stars({ value, onChange, readOnly }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={readOnly} onClick={() => !readOnly && onChange(n)}
          className={`${readOnly ? '' : 'hover:scale-110'} transition-transform ${n <= value ? 'text-amber-400' : 'text-slate-200'}`}>
          <Star className="w-6 h-6 fill-current" />
        </button>
      ))}
    </div>
  )
}

function RespondModal({ survey, onClose }) {
  const qc = useQueryClient()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const m = useMutation(() => surveysApi.respond(survey.id, { rating, comment }), {
    onSuccess: () => { toast.success('شكراً لمشاركتك'); qc.invalidateQueries('surveys'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  return (
    <Modal open={!!survey} onClose={onClose} title={survey.title}>
      <div className="space-y-4">
        {survey.description && <p className="text-sm text-slate-500">{survey.description}</p>}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">تقييمك</p>
          <Stars value={rating} onChange={setRating} />
        </div>
        <Field label="ملاحظاتك (اختياري)"><Input value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => rating && m.mutate()} loading={m.isLoading} disabled={!rating}>إرسال</Button>
        </div>
      </div>
    </Modal>
  )
}

function ResultsModal({ surveyId, onClose }) {
  const { data, isLoading } = useQuery(['survey-results', surveyId], () => surveysApi.results(surveyId), { enabled: !!surveyId })
  return (
    <Modal open={!!surveyId} onClose={onClose} title="نتائج الاستطلاع" size="lg">
      {isLoading || !data ? <div className="py-12"><Spinner /></div> : (
        <div className="space-y-4">
          {data.survey.anonymous ? (
            <p className="text-xs text-slate-400 flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5" /> استطلاع مجهول — لا تُعرض هوية المشاركين</p>
          ) : null}
          <div className="flex items-center gap-6">
            <div className="text-center"><p className="text-3xl font-extrabold text-amber-500">{data.stats.avg_rating ?? '—'}</p><p className="text-xs text-slate-400">متوسط التقييم</p></div>
            <div className="text-center"><p className="text-3xl font-extrabold text-slate-800">{data.stats.count}</p><p className="text-xs text-slate-400">عدد المشاركات</p></div>
          </div>
          {data.distribution && data.stats.count > 0 && (
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = data.distribution[n] || 0
                const pct = data.stats.count ? Math.round((count / data.stats.count) * 100) : 0
                return (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-slate-500 flex items-center gap-0.5">{n} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                    <span className="w-6 text-slate-400 text-left">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {data.responses.map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                {r.full_name && <Avatar name={r.full_name} size="sm" />}
                <div className="flex-1 min-w-0">
                  {r.full_name && <p className="text-sm font-medium text-slate-700">{r.full_name}</p>}
                  {r.comment && <p className="text-xs text-slate-500">{r.comment}</p>}
                </div>
                <Stars value={r.rating} readOnly />
              </div>
            ))}
            {data.responses.length === 0 && <p className="text-sm text-slate-400 text-center py-4">لا توجد مشاركات بعد</p>}
          </div>
        </div>
      )}
    </Modal>
  )
}

function CreateModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', description: '', anonymous: false })
  const m = useMutation((d) => surveysApi.create(d), {
    onSuccess: () => { toast.success('تم إنشاء الاستطلاع'); qc.invalidateQueries('surveys'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  return (
    <Modal open onClose={onClose} title="استطلاع جديد">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="عنوان الاستطلاع" required><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></Field>
        <Field label="الوصف"><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm((f) => ({ ...f, anonymous: e.target.checked }))} className="w-4 h-4 rounded" />
          استطلاع مجهول (لا تُعرض هوية المشاركين في النتائج)
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>إنشاء</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Surveys() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [respond, setRespond] = useState(null)
  const [results, setResults] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useQuery('surveys', () => surveysApi.list())
  const del = useMutation((id) => surveysApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('surveys') }, onError: () => toast.error('فشل'),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.surveys || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={ClipboardList} label="الاستطلاعات" value={s.total ?? 0} tone="blue" />
        <StatCard icon={CheckCircle2} label="نشطة" value={s.active ?? 0} tone="green" />
        <StatCard icon={MessageSquare} label="إجمالي المشاركات" value={s.responses ?? 0} tone="violet" />
      </div>

      {canManage && <div className="flex justify-end"><Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> استطلاع جديد</Button></div>}

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardList} title="لا توجد استطلاعات" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((sv) => (
            <div key={sv.id} className={`card ${!sv.is_active ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{sv.title}</h3>
                    {!!sv.anonymous && <span className="badge bg-violet-50 text-violet-600 inline-flex items-center gap-1"><EyeOff className="w-3 h-3" /> مجهول</span>}
                  </div>
                  {sv.description && <p className="text-sm text-slate-500 mt-1">{sv.description}</p>}
                </div>
                <span className={`badge ${sv.is_active ? 'badge-success' : 'bg-slate-100 text-slate-500'}`}>{sv.is_active ? 'نشط' : 'مغلق'}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50 text-xs text-slate-500">
                <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4 text-slate-300" /> {sv.responses_count} مشاركة</span>
                {sv.avg_rating != null && <span className="flex items-center gap-1 text-amber-500"><Star className="w-4 h-4 fill-current" /> {sv.avg_rating}</span>}
              </div>
              <div className="flex gap-2 mt-3">
                {sv.responded ? (
                  <Button variant="secondary" disabled className="flex-1"><CheckCircle2 className="w-4 h-4" /> شاركت</Button>
                ) : sv.is_active ? (
                  <Button onClick={() => setRespond(sv)} className="flex-1"><Star className="w-4 h-4" /> شارك</Button>
                ) : (
                  <Button variant="secondary" disabled className="flex-1">مغلق</Button>
                )}
                {canManage && <button onClick={() => setResults(sv.id)} className="w-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center"><BarChart3 className="w-4 h-4" /></button>}
                {canManage && <button onClick={() => window.confirm('حذف الاستطلاع؟') && del.mutate(sv.id)} className="w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {respond && <RespondModal survey={respond} onClose={() => setRespond(null)} />}
      {results && <ResultsModal surveyId={results} onClose={() => setResults(null)} />}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
