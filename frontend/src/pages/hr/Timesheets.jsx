import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Timer, Plus, Trash2, Check, X, Send, Clock, Banknote, CalendarCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { timesheetsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']

function Form({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ date: '', project: '', task: '', hours: '', billable: true })
  const m = useMutation((d) => timesheetsApi.create({ ...d, hours: Number(d.hours) }), {
    onSuccess: () => { toast.success('تم التسجيل'); qc.invalidateQueries('timesheets'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="تسجيل ساعات عمل">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="التاريخ" required><Input type="date" value={form.date} onChange={set('date')} required /></Field>
          <Field label="الساعات" required><Input type="number" min="0.5" step="0.5" value={form.hours} onChange={set('hours')} required /></Field>
        </div>
        <Field label="المشروع" required><Input value={form.project} onChange={set('project')} required /></Field>
        <Field label="المهمة"><Input value={form.task} onChange={set('task')} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.billable} onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))} className="w-4 h-4 rounded" />
          ساعات قابلة للفوترة
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

function SubmitWeekModal({ onClose }) {
  const qc = useQueryClient()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const m = useMutation(() => timesheetsApi.submitRange(from, to), {
    onSuccess: (data) => { toast.success(`تم تقديم ${data.count} سجل`); qc.invalidateQueries('timesheets'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل التقديم'),
  })
  return (
    <Modal open onClose={onClose} title="تقديم مسودات الفترة">
      <form onSubmit={(e) => { e.preventDefault(); if (from && to) m.mutate() }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="من" required><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></Field>
          <Field label="إلى" required><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} required /></Field>
        </div>
        <p className="text-xs text-slate-400">سيتم تقديم كل سجلاتك بحالة «مسودة» ضمن هذه الفترة دفعة واحدة.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading} disabled={!from || !to}>تقديم</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Timesheets() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [showSubmitWeek, setShowSubmitWeek] = useState(false)
  const { data, isLoading } = useQuery('timesheets', () => timesheetsApi.list())

  const submit = useMutation((id) => timesheetsApi.submit(id), { onSuccess: () => { toast.success('تم التقديم'); qc.invalidateQueries('timesheets') }, onError: () => toast.error('فشل') })
  const review = useMutation(({ id, status }) => timesheetsApi.review(id, status), { onSuccess: () => { toast.success('تم'); qc.invalidateQueries('timesheets') }, onError: () => toast.error('فشل') })
  const del = useMutation((id) => timesheetsApi.remove(id), { onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('timesheets') }, onError: () => toast.error('فشل') })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.timesheets || []
  const s = data?.summary || {}
  const hasOwnDrafts = items.some((t) => t.employee_id === user?.employee_id && t.status === 'مسودة')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Clock} label="إجمالي الساعات" value={s.totalHours ?? 0} tone="blue" />
        <StatCard icon={Banknote} label="قابلة للفوترة" value={s.billableHours ?? 0} tone="violet" />
        <StatCard icon={Clock} label="غير قابلة للفوترة" value={s.nonBillableHours ?? 0} tone="cyan" />
        <StatCard icon={Check} label="ساعات معتمدة" value={s.approvedHours ?? 0} tone="green" />
        <StatCard icon={Timer} label="بانتظار الاعتماد" value={s.pending ?? 0} tone="amber" />
      </div>
      <div className="flex justify-end gap-3">
        {hasOwnDrafts && <Button variant="secondary" onClick={() => setShowSubmitWeek(true)}><CalendarCheck className="w-5 h-5" /> تقديم مسودات فترة</Button>}
        <Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> تسجيل ساعات</Button>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Timer} title="لا توجد سجلات" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-400 border-b border-slate-100">
                {canManage && <th className="pb-3 font-medium">الموظف</th>}
                <th className="pb-3 font-medium">التاريخ</th>
                <th className="pb-3 font-medium">المشروع</th>
                <th className="pb-3 font-medium">الساعات</th>
                <th className="pb-3 font-medium">الفوترة</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((t) => (
                <tr key={t.id}>
                  {canManage && (
                    <td className="py-3">
                      <div className="flex items-center gap-2"><Avatar name={t.full_name} size="sm" /><span className="text-slate-700">{t.full_name}</span></div>
                    </td>
                  )}
                  <td className="py-3 text-slate-600">{formatDate(t.date)}</td>
                  <td className="py-3 text-slate-700">{t.project}{t.task ? ` — ${t.task}` : ''}</td>
                  <td className="py-3 font-medium text-slate-700">{t.hours}</td>
                  <td className="py-3">
                    {t.billable ? <span className="badge bg-violet-50 text-violet-600">قابلة للفوترة</span> : <span className="badge bg-slate-100 text-slate-500">داخلية</span>}
                  </td>
                  <td className="py-3"><Badge status={t.status} /></td>
                  <td className="py-3">
                    <div className="flex gap-1 justify-end">
                      {t.employee_id === user?.employee_id && t.status === 'مسودة' && (
                        <button onClick={() => submit.mutate(t.id)} className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"><Send className="w-3 h-3" /> تقديم</button>
                      )}
                      {canManage && t.status === 'مقدّم' && (
                        <>
                          <button onClick={() => review.mutate({ id: t.id, status: 'معتمد' })} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                          <button onClick={() => review.mutate({ id: t.id, status: 'مرفوض' })} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </>
                      )}
                      {(t.employee_id === user?.employee_id || canManage) && (
                        <button onClick={() => window.confirm('حذف السجل؟') && del.mutate(t.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Form open={showForm} onClose={() => setShowForm(false)} />
      {showSubmitWeek && <SubmitWeekModal onClose={() => setShowSubmitWeek(false)} />}
    </div>
  )
}
