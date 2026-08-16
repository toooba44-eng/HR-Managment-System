import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Star, Plus, Trash2, Pencil, AlertTriangle, CheckCircle2, UserX, Network, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { successionApi, employeesApi, departmentsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']
const READINESS = ['جاهز الآن', 'خلال سنة', 'خلال سنتين', 'غير جاهز']
const RISKS = ['مرتفع', 'متوسط', 'منخفض']
const POTENTIALS = ['نجم صاعد', 'أداء عالٍ', 'موثوق', 'يحتاج تطوير']

const RISK_TONE = { مرتفع: 'bg-rose-50 text-rose-700', متوسط: 'bg-amber-50 text-amber-700', منخفض: 'bg-emerald-50 text-emerald-700' }
const READY_TONE = { 'جاهز الآن': 'bg-emerald-50 text-emerald-700', 'خلال سنة': 'bg-blue-50 text-blue-700', 'خلال سنتين': 'bg-violet-50 text-violet-700', 'غير جاهز': 'bg-slate-100 text-slate-600' }
const POT_TONE = { 'نجم صاعد': 'bg-amber-50 text-amber-700', 'أداء عالٍ': 'bg-blue-50 text-blue-700', موثوق: 'bg-emerald-50 text-emerald-700', 'يحتاج تطوير': 'bg-slate-100 text-slate-600' }

function Form({ open, onClose, editing }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const { data: depts } = useQuery('departments', () => departmentsApi.list(), { enabled: open })
  const [form, setForm] = useState(() => editing || {
    position_title: '', department_id: '', incumbent_id: '', successor_id: '',
    readiness: 'خلال سنة', risk_level: 'متوسط', potential: 'أداء عالٍ', notes: '', status: 'نشط',
  })
  const m = useMutation(
    (d) => (editing ? successionApi.update(editing.id, d) : successionApi.create(d)),
    {
      onSuccess: () => { toast.success(editing ? t('تم التحديث') : t('تمت الإضافة')); qc.invalidateQueries('succession'); onClose() },
      onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
    },
  )
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const empOptions = emps?.employees || []
  return (
    <Modal open={open} onClose={onClose} title={editing ? t('تعديل خطة التعاقب') : t('خطة تعاقب جديدة')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label={t('المنصب الحيوي')} required><Input value={form.position_title} onChange={set('position_title')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('القسم')}>
            <Select value={form.department_id || ''} onChange={set('department_id')}>
              <option value="">—</option>
              {(depts || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label={t('شاغل المنصب الحالي')}>
            <Select value={form.incumbent_id || ''} onChange={set('incumbent_id')}>
              <option value="">—</option>
              {empOptions.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
          <Field label={t('المرشح للخلافة')}>
            <Select value={form.successor_id || ''} onChange={set('successor_id')}>
              <option value="">{t('لا يوجد')}</option>
              {empOptions.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
          <Field label={t('الجاهزية')}><Select value={form.readiness} onChange={set('readiness')}>{READINESS.map((r) => <option key={r} value={r}>{t(r)}</option>)}</Select></Field>
          <Field label={t('مستوى المخاطر')}><Select value={form.risk_level} onChange={set('risk_level')}>{RISKS.map((r) => <option key={r} value={r}>{t(r)}</option>)}</Select></Field>
          <Field label={t('تقييم الإمكانات')}><Select value={form.potential} onChange={set('potential')}>{POTENTIALS.map((r) => <option key={r} value={r}>{t(r)}</option>)}</Select></Field>
        </div>
        <Field label={t('ملاحظات')}><Input value={form.notes || ''} onChange={set('notes')} /></Field>
        {editing && <Field label={t('الحالة')}><Select value={form.status} onChange={set('status')}><option value="نشط">{t('نشط')}</option><option value="مؤرشف">{t('مؤرشف')}</option></Select></Field>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function Chip({ label, tone }) {
  return <span className={`badge ${tone || 'bg-slate-100 text-slate-600'}`}>{label}</span>
}

export default function Talent() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const { data, isLoading } = useQuery('succession', () => successionApi.list())
  const del = useMutation((id) => successionApi.remove(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('succession') },
    onError: () => toast.error(t('فشل الحذف')),
  })

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (r) => { setEditing(r); setShowForm(true) }

  if (isLoading) return <Spinner fullscreen />
  const items = data?.succession || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Network} label={t('مناصب حيوية')} value={s.count ?? 0} tone="blue" />
        <StatCard icon={AlertTriangle} label={t('مخاطر مرتفعة')} value={s.atRisk ?? 0} tone="rose" />
        <StatCard icon={CheckCircle2} label={t('جاهزون الآن')} value={s.readyNow ?? 0} tone="green" />
        <StatCard icon={UserX} label={t('بدون خليفة')} value={s.noSuccessor ?? 0} tone="amber" />
      </div>

      {canManage && <div className="flex justify-end"><Button onClick={openNew}><Plus className="w-5 h-5" /> {t('خطة تعاقب')}</Button></div>}

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Star} title={t('لا توجد خطط تعاقب')} description={t('خطط التعاقب الوظيفي متاحة للإدارة فقط')} /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((r) => (
            <div key={r.id} className={`card ${r.status === 'مؤرشف' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{r.position_title}</h3>
                  {r.department_name && <p className="text-xs text-slate-400">{r.department_name}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => window.confirm(t('حذف الخطة؟')) && del.mutate(r.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 min-w-0 text-center">
                  <Avatar name={r.incumbent_name} size="md" className="mx-auto" />
                  <p className="text-xs font-medium text-slate-700 mt-1 truncate">{r.incumbent_name || '—'}</p>
                  <p className="text-[10px] text-slate-400">{t('الشاغل الحالي')}</p>
                </div>
                <ArrowLeft className="w-5 h-5 text-slate-300 shrink-0" />
                <div className="flex-1 min-w-0 text-center">
                  {r.successor_name ? (
                    <>
                      <Avatar name={r.successor_name} size="md" className="mx-auto" />
                      <p className="text-xs font-medium text-slate-700 mt-1 truncate">{r.successor_name}</p>
                      <p className="text-[10px] text-slate-400">{t('المرشح للخلافة')}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-300"><UserX className="w-5 h-5" /></div>
                      <p className="text-xs font-medium text-rose-500 mt-1">{t('لا يوجد خليفة')}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <Chip label={t('الجاهزية: {{value}}', { value: t(r.readiness) })} tone={READY_TONE[r.readiness]} />
                <Chip label={t('المخاطر: {{value}}', { value: t(r.risk_level) })} tone={RISK_TONE[r.risk_level]} />
                <Chip label={t(r.potential)} tone={POT_TONE[r.potential]} />
              </div>
              {r.notes && <p className="text-xs text-slate-500 mt-3 leading-relaxed">{r.notes}</p>}
            </div>
          ))}
        </div>
      )}
      {showForm && <Form open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
    </div>
  )
}
