import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ date: '', project: '', task: '', hours: '', billable: true })
  const m = useMutation((d) => timesheetsApi.create({ ...d, hours: Number(d.hours) }), {
    onSuccess: () => { toast.success(t('تم التسجيل')); qc.invalidateQueries('timesheets'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={t('تسجيل ساعات عمل')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('التاريخ')} required><Input type="date" value={form.date} onChange={set('date')} required /></Field>
          <Field label={t('الساعات')} required><Input type="number" min="0.5" step="0.5" value={form.hours} onChange={set('hours')} required /></Field>
        </div>
        <Field label={t('المشروع')} required><Input value={form.project} onChange={set('project')} required /></Field>
        <Field label={t('المهمة')}><Input value={form.task} onChange={set('task')} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.billable} onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))} className="w-4 h-4 rounded" />
          {t('ساعات قابلة للفوترة')}
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function SubmitWeekModal({ onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const m = useMutation(() => timesheetsApi.submitRange(from, to), {
    onSuccess: (data) => { toast.success(t('تم تقديم {{count}} سجل', { count: data.count })); qc.invalidateQueries('timesheets'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل التقديم')),
  })
  return (
    <Modal open onClose={onClose} title={t('تقديم مسودات الفترة')}>
      <form onSubmit={(e) => { e.preventDefault(); if (from && to) m.mutate() }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('من')} required><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></Field>
          <Field label={t('إلى')} required><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} required /></Field>
        </div>
        <p className="text-xs text-slate-400">{t('سيتم تقديم كل سجلاتك بحالة «مسودة» ضمن هذه الفترة دفعة واحدة.')}</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading} disabled={!from || !to}>{t('تقديم')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Timesheets() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [showSubmitWeek, setShowSubmitWeek] = useState(false)
  const { data, isLoading } = useQuery('timesheets', () => timesheetsApi.list())

  const submit = useMutation((id) => timesheetsApi.submit(id), { onSuccess: () => { toast.success(t('تم التقديم')); qc.invalidateQueries('timesheets') }, onError: () => toast.error(t('فشل')) })
  const review = useMutation(({ id, status }) => timesheetsApi.review(id, status), { onSuccess: () => { toast.success(t('تم')); qc.invalidateQueries('timesheets') }, onError: () => toast.error(t('فشل')) })
  const del = useMutation((id) => timesheetsApi.remove(id), { onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('timesheets') }, onError: () => toast.error(t('فشل')) })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.timesheets || []
  const s = data?.summary || {}
  const hasOwnDrafts = items.some((ts) => ts.employee_id === user?.employee_id && ts.status === 'مسودة')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Clock} label={t('إجمالي الساعات')} value={s.totalHours ?? 0} tone="blue" />
        <StatCard icon={Banknote} label={t('قابلة للفوترة')} value={s.billableHours ?? 0} tone="violet" />
        <StatCard icon={Clock} label={t('غير قابلة للفوترة')} value={s.nonBillableHours ?? 0} tone="cyan" />
        <StatCard icon={Check} label={t('ساعات معتمدة')} value={s.approvedHours ?? 0} tone="green" />
        <StatCard icon={Timer} label={t('بانتظار الاعتماد')} value={s.pending ?? 0} tone="amber" />
      </div>
      <div className="flex justify-end gap-3">
        {hasOwnDrafts && <Button variant="secondary" onClick={() => setShowSubmitWeek(true)}><CalendarCheck className="w-5 h-5" /> {t('تقديم مسودات فترة')}</Button>}
        <Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> {t('تسجيل ساعات')}</Button>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Timer} title={t('لا توجد سجلات')} /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-400 border-b border-slate-100">
                {canManage && <th className="pb-3 font-medium">{t('الموظف')}</th>}
                <th className="pb-3 font-medium">{t('التاريخ')}</th>
                <th className="pb-3 font-medium">{t('المشروع')}</th>
                <th className="pb-3 font-medium">{t('الساعات')}</th>
                <th className="pb-3 font-medium">{t('الفوترة')}</th>
                <th className="pb-3 font-medium">{t('الحالة')}</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((ts) => (
                <tr key={ts.id}>
                  {canManage && (
                    <td className="py-3">
                      <div className="flex items-center gap-2"><Avatar name={ts.full_name} size="sm" /><span className="text-slate-700">{ts.full_name}</span></div>
                    </td>
                  )}
                  <td className="py-3 text-slate-600">{formatDate(ts.date)}</td>
                  <td className="py-3 text-slate-700">{ts.project}{ts.task ? ` — ${ts.task}` : ''}</td>
                  <td className="py-3 font-medium text-slate-700">{ts.hours}</td>
                  <td className="py-3">
                    {ts.billable ? <span className="badge bg-violet-50 text-violet-600">{t('قابلة للفوترة')}</span> : <span className="badge bg-slate-100 text-slate-500">{t('داخلية')}</span>}
                  </td>
                  <td className="py-3"><Badge status={ts.status}>{t(ts.status)}</Badge></td>
                  <td className="py-3">
                    <div className="flex gap-1 justify-end">
                      {ts.employee_id === user?.employee_id && ts.status === 'مسودة' && (
                        <button onClick={() => submit.mutate(ts.id)} className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"><Send className="w-3 h-3" /> {t('تقديم')}</button>
                      )}
                      {canManage && ts.status === 'مقدّم' && (
                        <>
                          <button onClick={() => review.mutate({ id: ts.id, status: 'معتمد' })} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                          <button onClick={() => review.mutate({ id: ts.id, status: 'مرفوض' })} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </>
                      )}
                      {(ts.employee_id === user?.employee_id || canManage) && (
                        <button onClick={() => window.confirm(t('حذف السجل؟')) && del.mutate(ts.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
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
