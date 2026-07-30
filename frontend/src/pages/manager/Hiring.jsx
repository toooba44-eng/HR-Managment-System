import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { UserPlus, Plus, Trash2, Check, X, Clock, Users, Briefcase, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { hiringApi, departmentsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'

const REVIEW = ['admin', 'hr_manager', 'super_admin']
const TYPES = ['دوام كامل', 'دوام جزئي', 'عقد مؤقت', 'تدريب']

function CreateModal({ onClose }) {
  const qc = useQueryClient()
  const { data: depts } = useQuery('departments', () => departmentsApi.list())
  const [form, setForm] = useState({ job_title: '', department_id: '', headcount: 1, employment_type: 'دوام كامل', urgency: 'عادي', justification: '' })
  const m = useMutation((d) => hiringApi.create(d), {
    onSuccess: () => { toast.success('تم رفع الطلب'); qc.invalidateQueries('hiring'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title="طلب توظيف جديد">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="المسمى الوظيفي" required><Input value={form.job_title} onChange={set('job_title')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القسم"><Select value={form.department_id} onChange={set('department_id')}><option value="">قسمي</option>{(depts || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          <Field label="عدد الشواغر"><Input type="number" min="1" value={form.headcount} onChange={set('headcount')} /></Field>
          <Field label="نوع التوظيف"><Select value={form.employment_type} onChange={set('employment_type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="الأولوية"><Select value={form.urgency} onChange={set('urgency')}><option>عادي</option><option>عاجل</option></Select></Field>
        </div>
        <Field label="المبرّر"><Input value={form.justification} onChange={set('justification')} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>رفع الطلب</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Hiring() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canReview = REVIEW.includes(user?.role)
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useQuery('hiring', () => hiringApi.list())
  const setStatus = useMutation(({ id, status }) => hiringApi.setStatus(id, status), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries('hiring') }, onError: () => toast.error('فشل'),
  })
  const del = useMutation((id) => hiringApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('hiring') }, onError: () => toast.error('فشل'),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.hiring || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Briefcase} label="إجمالي الطلبات" value={s.total ?? 0} tone="blue" />
        <StatCard icon={Clock} label="قيد المراجعة" value={s.pending ?? 0} tone="amber" />
        <StatCard icon={Users} label="شواغر معتمدة" value={s.approved ?? 0} tone="green" />
      </div>

      <div className="flex justify-end"><Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> طلب توظيف</Button></div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={UserPlus} title="لا توجد طلبات توظيف" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((h) => (
            <div key={h.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{h.job_title}</h3>
                    {h.urgency === 'عاجل' && <span className="badge bg-rose-50 text-rose-600 flex items-center gap-1"><Zap className="w-3 h-3" /> عاجل</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{h.department_name} · {h.employment_type} · {h.headcount} شاغر</p>
                </div>
                <Badge status={h.status} />
              </div>
              {h.justification && <p className="text-sm text-slate-500 mt-3">{h.justification}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                <span className="text-xs text-slate-400">مقدّم الطلب: {h.requested_by_name || '—'}</span>
                <div className="flex gap-1">
                  {canReview && h.status === 'معلق' && (
                    <>
                      <button onClick={() => setStatus.mutate({ id: h.id, status: 'موافق عليه' })} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setStatus.mutate({ id: h.id, status: 'مرفوض' })} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </>
                  )}
                  <button onClick={() => window.confirm('حذف الطلب؟') && del.mutate(h.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
