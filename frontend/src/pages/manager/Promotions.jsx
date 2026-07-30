import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ArrowUpDown, Plus, Trash2, Check, X, TrendingUp, Shuffle, Clock, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { promotionsApi, employeesApi, departmentsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const REVIEW = ['admin', 'hr_manager', 'super_admin']

function CreateModal({ onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }))
  const { data: depts } = useQuery('departments', () => departmentsApi.list())
  const [form, setForm] = useState({ employee_id: '', type: 'ترقية', new_title: '', new_department_id: '', effective_date: '', justification: '' })
  const m = useMutation((d) => promotionsApi.create(d), {
    onSuccess: () => { toast.success('تم رفع الطلب'); qc.invalidateQueries('promotions'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title="طلب ترقية / نقل">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="الموظف" required><Select value={form.employee_id} onChange={set('employee_id')} required><option value="">اختر</option>{(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</Select></Field>
          <Field label="النوع"><Select value={form.type} onChange={set('type')}><option>ترقية</option><option>نقل</option></Select></Field>
        </div>
        {form.type === 'ترقية' ? (
          <Field label="المسمى الجديد" required><Input value={form.new_title} onChange={set('new_title')} required /></Field>
        ) : (
          <Field label="القسم الجديد" required><Select value={form.new_department_id} onChange={set('new_department_id')} required><option value="">اختر</option>{(depts || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ السريان"><Input type="date" value={form.effective_date} onChange={set('effective_date')} /></Field>
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

export default function Promotions() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canReview = REVIEW.includes(user?.role)
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useQuery('promotions', () => promotionsApi.list())
  const setStatus = useMutation(({ id, status }) => promotionsApi.setStatus(id, status), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries('promotions') }, onError: () => toast.error('فشل'),
  })
  const del = useMutation((id) => promotionsApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('promotions') }, onError: () => toast.error('فشل'),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.promotions || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ArrowUpDown} label="إجمالي الطلبات" value={s.total ?? 0} tone="blue" />
        <StatCard icon={Clock} label="قيد المراجعة" value={s.pending ?? 0} tone="amber" />
        <StatCard icon={TrendingUp} label="ترقيات" value={s.promotions ?? 0} tone="green" />
        <StatCard icon={Shuffle} label="عمليات نقل" value={s.transfers ?? 0} tone="violet" />
      </div>

      <div className="flex justify-end"><Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> طلب ترقية/نقل</Button></div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={ArrowUpDown} title="لا توجد طلبات" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={p.full_name} src={p.profile_picture} size="md" />
                  <div>
                    <p className="font-bold text-slate-800">{p.full_name}</p>
                    <span className={`badge ${p.type === 'ترقية' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>{p.type}</span>
                  </div>
                </div>
                <Badge status={p.status} />
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm">
                <span className="text-slate-500">{p.current_title || '—'}</span>
                <ArrowLeft className="w-4 h-4 text-slate-300" />
                <span className="font-medium text-slate-700">{p.type === 'نقل' ? (p.new_department_name || p.new_title || '—') : (p.new_title || '—')}</span>
              </div>
              {p.effective_date && <p className="text-xs text-slate-400 mt-2">تاريخ السريان: {formatDate(p.effective_date)}</p>}
              {p.justification && <p className="text-sm text-slate-500 mt-2">{p.justification}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                <span className="text-xs text-slate-400">مقدّم الطلب: {p.requested_by_name || '—'}</span>
                <div className="flex gap-1">
                  {canReview && p.status === 'معلق' && (
                    <>
                      <button onClick={() => setStatus.mutate({ id: p.id, status: 'موافق عليه' })} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setStatus.mutate({ id: p.id, status: 'مرفوض' })} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </>
                  )}
                  <button onClick={() => window.confirm('حذف الطلب؟') && del.mutate(p.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
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
