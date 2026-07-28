import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { AlertTriangle, Plus, Trash2, Flag } from 'lucide-react'
import toast from 'react-hot-toast'
import { grievancesApi, employeesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const STATUSES = ['مفتوحة', 'قيد المعالجة', 'مغلقة']
const SEV_TONE = { عالية: 'text-rose-600 bg-rose-50', متوسطة: 'text-amber-600 bg-amber-50', منخفضة: 'text-slate-500 bg-slate-100' }

function Form({ open, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState({ employee_id: '', type: 'شكوى', category: '', description: '', severity: 'متوسطة' })
  const m = useMutation((d) => grievancesApi.create({ ...d, employee_id: Number(d.employee_id) }), {
    onSuccess: () => { toast.success('تم التسجيل'); qc.invalidateQueries('grievances'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="تسجيل مخالفة/شكوى">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="الموظف" required>
          <Select value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">اختر</option>
            {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="النوع"><Select value={form.type} onChange={set('type')}><option>شكوى</option><option>مخالفة</option></Select></Field>
          <Field label="الخطورة"><Select value={form.severity} onChange={set('severity')}><option>منخفضة</option><option>متوسطة</option><option>عالية</option></Select></Field>
        </div>
        <Field label="التصنيف"><Input value={form.category} onChange={set('category')} placeholder="الالتزام بالدوام، بيئة العمل..." /></Field>
        <Field label="التفاصيل"><Textarea value={form.description} onChange={set('description')} rows={3} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Grievances() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data: items = [], isLoading } = useQuery('grievances', grievancesApi.list)
  const upd = useMutation(({ id, status }) => grievancesApi.update(id, { status }), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries('grievances') },
    onError: () => toast.error('فشل التحديث'),
  })
  const del = useMutation((id) => grievancesApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('grievances') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> تسجيل جديد</Button></div>
      {items.length === 0 ? (
        <div className="card"><EmptyState icon={AlertTriangle} title="لا توجد مخالفات أو شكاوى" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((g) => (
            <div key={g.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={g.full_name} src={g.profile_picture} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800">{g.full_name}</p>
                      <span className="badge bg-slate-100 text-slate-600">{g.type}</span>
                      <span className={`badge ${SEV_TONE[g.severity]} inline-flex items-center gap-1`}><Flag className="w-3 h-3" /> {g.severity}</span>
                      <Badge status={g.status} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{g.category} · {formatDate(g.created_at)}</p>
                    {g.description && <p className="text-sm text-slate-600 mt-1">{g.description}</p>}
                    {g.action && <p className="text-xs text-emerald-600 mt-1">الإجراء: {g.action}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={g.status} onChange={(e) => upd.mutate({ id: g.id, status: e.target.value })} className="text-xs py-1.5 px-2 w-32">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                  <button onClick={() => window.confirm('حذف السجل؟') && del.mutate(g.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Form open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
