import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { UserMinus, Plus, Trash2, Calendar, ListChecks, ClipboardList, CheckCircle2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { offboardingApi, employeesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const TYPES = ['استقالة', 'فصل', 'انتهاء عقد', 'تقاعد']
const STATUSES = ['قيد المعالجة', 'مكتملة', 'ملغاة']
const CAT_TONE = { عهدة: 'bg-violet-50 text-violet-700', صلاحيات: 'bg-blue-50 text-blue-700', 'تصفية مالية': 'bg-amber-50 text-amber-700', 'مقابلة خروج': 'bg-emerald-50 text-emerald-700', مستندات: 'bg-slate-100 text-slate-600', أخرى: 'bg-slate-100 text-slate-600' }

function Form({ open, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState({ employee_id: '', type: 'استقالة', reason: '', last_working_day: '', notes: '' })
  const m = useMutation((d) => offboardingApi.create({ ...d, employee_id: Number(d.employee_id) }), {
    onSuccess: () => { toast.success(t('تم إنشاء الطلب')); qc.invalidateQueries('offboarding'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={t('إجراء إنهاء خدمة')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label={t('الموظف')} required>
          <Select value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">{t('اختر')}</option>
            {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('النوع')}><Select value={form.type} onChange={set('type')}>{TYPES.map((tp) => <option key={tp} value={tp}>{t(tp, { context: 'offboarding' })}</option>)}</Select></Field>
          <Field label={t('آخر يوم عمل')}><Input type="date" value={form.last_working_day} onChange={set('last_working_day')} /></Field>
        </div>
        <Field label={t('السبب')}><Input value={form.reason} onChange={set('reason')} /></Field>
        <Field label={t('ملاحظات')}><Textarea value={form.notes} onChange={set('notes')} rows={2} /></Field>
        <p className="text-xs text-slate-400">{t('سيتم إنشاء قائمة إجراءات خروج (تصفية) افتراضية تلقائياً.')}</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function DetailModal({ caseId, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery(['offboarding', caseId], () => offboardingApi.get(caseId), { enabled: !!caseId })
  const invalidate = () => { qc.invalidateQueries(['offboarding', caseId]); qc.invalidateQueries('offboarding') }
  const toggle = useMutation(({ id, is_done }) => offboardingApi.updateTask(id, { is_done }), { onSuccess: invalidate, onError: () => toast.error(t('فشل')) })
  const delTask = useMutation((id) => offboardingApi.removeTask(id), { onSuccess: () => { toast.success(t('تم الحذف')); invalidate() }, onError: () => toast.error(t('فشل')) })

  return (
    <Modal open={!!caseId} onClose={onClose} title={t('قائمة إجراءات الخروج')} size="lg">
      {isLoading || !data ? (
        <div className="py-12"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={data.full_name} src={data.profile_picture} size="md" />
            <div className="flex-1">
              <p className="font-bold text-slate-800">{data.full_name}</p>
              <p className="text-xs text-slate-400">{data.job_title}{data.last_working_day ? <> · {t('آخر يوم عمل {{date}}', { date: formatDate(data.last_working_day) })}</> : ''}</p>
            </div>
            <Badge status={data.status}>{t(data.status)}</Badge>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{t('التقدّم')}</span><span>{data.tasks_done}/{data.tasks_total}</span></div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${data.progress}%` }} /></div>
          </div>
          <div className="space-y-2">
            {data.tasks.map((tk) => (
              <div key={tk.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <input type="checkbox" checked={!!tk.is_done} disabled={toggle.isLoading} onChange={(e) => toggle.mutate({ id: tk.id, is_done: e.target.checked })} className="w-4 h-4 rounded" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${tk.is_done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{tk.title}</p>
                  <p className="text-[11px] text-slate-400">{tk.owner}{tk.due_date ? ` · ${formatDate(tk.due_date)}` : ''}</p>
                </div>
                <span className={`badge ${CAT_TONE[tk.category] || CAT_TONE.أخرى}`}>{t(tk.category)}</span>
                <button onClick={() => window.confirm(t('حذف الإجراء؟')) && delTask.mutate(tk.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Offboarding() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const { data, isLoading } = useQuery('offboarding', offboardingApi.list)
  const upd = useMutation(({ id, status }) => offboardingApi.update(id, { status }), {
    onSuccess: () => { toast.success(t('تم التحديث')); qc.invalidateQueries('offboarding') },
    onError: () => toast.error(t('فشل التحديث')),
  })
  const del = useMutation((id) => offboardingApi.remove(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('offboarding') },
    onError: () => toast.error(t('فشل الحذف')),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.offboarding || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={ClipboardList} label={t('إجمالي الإجراءات')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={Clock} label={t('قيد المعالجة')} value={s.active ?? 0} tone="amber" />
        <StatCard icon={CheckCircle2} label={t('مكتملة')} value={s.completed ?? 0} tone="green" />
      </div>
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> {t('إجراء جديد')}</Button></div>
      {items.length === 0 ? (
        <div className="card"><EmptyState icon={UserMinus} title={t('لا توجد إجراءات إنهاء خدمة')} /></div>
      ) : (
        <div className="space-y-3">
          {items.map((o) => (
            <div key={o.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={o.full_name} src={o.profile_picture} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-slate-800">{o.full_name}</p><span className="badge bg-slate-100 text-slate-600">{t(o.type, { context: 'offboarding' })}</span></div>
                  <p className="text-xs text-slate-400 mt-0.5">{o.job_title} · {o.department_name || '—'}</p>
                  {o.reason && <p className="text-sm text-slate-600 mt-1">{o.reason}</p>}
                  {o.last_working_day && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {t('آخر يوم عمل: {{date}}', { date: formatDate(o.last_working_day) })}</p>}
                  <div className="mt-2 max-w-xs">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1"><span>{t('قائمة الخروج')}</span><span>{o.tasks_done}/{o.tasks_total}</span></div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${o.progress}%` }} /></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge status={o.status}>{t(o.status)}</Badge>
                <Button variant="secondary" onClick={() => setDetailId(o.id)} className="text-xs py-1.5"><ListChecks className="w-3.5 h-3.5" /> {t('القائمة')}</Button>
                <Select value={o.status} onChange={(e) => upd.mutate({ id: o.id, status: e.target.value })} className="text-xs py-1.5 px-2 w-32">
                  {STATUSES.map((st) => <option key={st} value={st}>{t(st)}</option>)}
                </Select>
                <button onClick={() => window.confirm(t('حذف الإجراء؟')) && del.mutate(o.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Form open={showForm} onClose={() => setShowForm(false)} />
      {detailId && <DetailModal caseId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
