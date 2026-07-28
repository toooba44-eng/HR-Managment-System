import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { UserMinus, Plus, Trash2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { offboardingApi, employeesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const TYPES = ['استقالة', 'فصل', 'انتهاء عقد', 'تقاعد']
const STATUSES = ['قيد المعالجة', 'مكتملة', 'ملغاة']

function Form({ open, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState({ employee_id: '', type: 'استقالة', reason: '', last_working_day: '', notes: '' })
  const m = useMutation((d) => offboardingApi.create({ ...d, employee_id: Number(d.employee_id) }), {
    onSuccess: () => { toast.success('تم إنشاء الطلب'); qc.invalidateQueries('offboarding'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="إجراء إنهاء خدمة">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="الموظف" required>
          <Select value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">اختر</option>
            {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="النوع"><Select value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="آخر يوم عمل"><Input type="date" value={form.last_working_day} onChange={set('last_working_day')} /></Field>
        </div>
        <Field label="السبب"><Input value={form.reason} onChange={set('reason')} /></Field>
        <Field label="ملاحظات"><Textarea value={form.notes} onChange={set('notes')} rows={2} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Offboarding() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data: items = [], isLoading } = useQuery('offboarding', offboardingApi.list)
  const upd = useMutation(({ id, status }) => offboardingApi.update(id, { status }), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries('offboarding') },
    onError: () => toast.error('فشل التحديث'),
  })
  const del = useMutation((id) => offboardingApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('offboarding') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> إجراء جديد</Button></div>
      {items.length === 0 ? (
        <div className="card"><EmptyState icon={UserMinus} title="لا توجد إجراءات إنهاء خدمة" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((o) => (
            <div key={o.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={o.full_name} src={o.profile_picture} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-slate-800">{o.full_name}</p><span className="badge bg-slate-100 text-slate-600">{o.type}</span></div>
                  <p className="text-xs text-slate-400 mt-0.5">{o.job_title} · {o.department_name || '—'}</p>
                  {o.reason && <p className="text-sm text-slate-600 mt-1">{o.reason}</p>}
                  {o.last_working_day && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> آخر يوم عمل: {formatDate(o.last_working_day)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={o.status} />
                <Select value={o.status} onChange={(e) => upd.mutate({ id: o.id, status: e.target.value })} className="text-xs py-1.5 px-2 w-32">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </Select>
                <button onClick={() => window.confirm('حذف الإجراء؟') && del.mutate(o.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Form open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
