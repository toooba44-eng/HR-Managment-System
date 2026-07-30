import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ClipboardCheck, Plus, Check, X, Trash2, Clock, LogIn, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { attendanceApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import StatCard from '../components/ui/StatCard'
import { Field, Input, Button } from '../components/ui/Form'
import { formatDate } from '../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']

function RequestModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ date: '', requested_check_in: '', requested_check_out: '', reason: '' })
  const m = useMutation((d) => attendanceApi.requestCorrection(d), {
    onSuccess: () => { toast.success('تم إرسال طلب التصحيح'); qc.invalidateQueries('attendance-corrections'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title="طلب تصحيح حضور">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="التاريخ" required><Input type="date" value={form.date} onChange={set('date')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="وقت الدخول الصحيح"><Input type="time" value={form.requested_check_in} onChange={set('requested_check_in')} /></Field>
          <Field label="وقت الخروج الصحيح"><Input type="time" value={form.requested_check_out} onChange={set('requested_check_out')} /></Field>
        </div>
        <Field label="السبب" required><Input value={form.reason} onChange={set('reason')} required /></Field>
        <p className="text-xs text-slate-400">عند الاعتماد سيُحدَّث سجل الحضور لليوم المحدد تلقائياً.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>إرسال</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function AttendanceCorrections() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const { data, isLoading } = useQuery('attendance-corrections', () => attendanceApi.corrections())
  const review = useMutation(({ id, status }) => attendanceApi.reviewCorrection(id, status), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries('attendance-corrections') }, onError: () => toast.error('فشل'),
  })
  const del = useMutation((id) => attendanceApi.removeCorrection(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('attendance-corrections') }, onError: () => toast.error('فشل'),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.corrections || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={ClipboardCheck} label="إجمالي الطلبات" value={s.total ?? 0} tone="blue" />
        <StatCard icon={Clock} label="قيد المراجعة" value={s.pending ?? 0} tone="amber" />
      </div>

      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> طلب تصحيح</Button></div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardCheck} title="لا توجد طلبات تصحيح" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="card flex items-center gap-4">
              {canManage && <Avatar name={c.full_name} src={c.profile_picture} size="sm" />}
              <div className="flex-1 min-w-0">
                {canManage && <p className="font-medium text-slate-700">{c.full_name}</p>}
                <p className="text-sm text-slate-600">{formatDate(c.date)}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                  {c.requested_check_in && <span className="flex items-center gap-1"><LogIn className="w-3.5 h-3.5" /> {c.requested_check_in}</span>}
                  {c.requested_check_out && <span className="flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> {c.requested_check_out}</span>}
                  {c.reason && <span>· {c.reason}</span>}
                </div>
              </div>
              <Badge status={c.status} />
              <div className="flex gap-1">
                {canManage && c.status === 'معلق' && (
                  <>
                    <button onClick={() => review.mutate({ id: c.id, status: 'موافق عليه' })} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                    <button onClick={() => review.mutate({ id: c.id, status: 'مرفوض' })} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </>
                )}
                {(canManage || (c.employee_id === user?.employee_id && c.status === 'معلق')) && (
                  <button onClick={() => window.confirm('حذف الطلب؟') && del.mutate(c.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <RequestModal onClose={() => setShowForm(false)} />}
    </div>
  )
}
