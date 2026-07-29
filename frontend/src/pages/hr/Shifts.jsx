import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { CalendarRange, Plus, Trash2, Clock, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { shiftsApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']
const TYPES = ['صباحية', 'مسائية', 'ليلية', 'راحة']
const TYPE_TONE = { صباحية: 'bg-amber-50 text-amber-700', مسائية: 'bg-violet-50 text-violet-700', ليلية: 'bg-slate-800 text-white', راحة: 'bg-emerald-50 text-emerald-700' }

function Form({ open, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState({ employee_id: '', date: '', shift_type: 'صباحية', start_time: '08:00', end_time: '16:00', location: 'المقر الرئيسي' })
  const m = useMutation((d) => shiftsApi.create({ ...d, employee_id: Number(d.employee_id) }), {
    onSuccess: () => { toast.success('تمت الجدولة'); qc.invalidateQueries('shifts'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="جدولة وردية">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="الموظف" required>
          <Select value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">اختر</option>
            {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التاريخ" required><Input type="date" value={form.date} onChange={set('date')} required /></Field>
          <Field label="نوع الوردية"><Select value={form.shift_type} onChange={set('shift_type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="من"><Input type="time" value={form.start_time} onChange={set('start_time')} /></Field>
          <Field label="إلى"><Input type="time" value={form.end_time} onChange={set('end_time')} /></Field>
        </div>
        <Field label="الموقع"><Input value={form.location} onChange={set('location')} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Shifts() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const { data: items = [], isLoading } = useQuery('shifts', () => shiftsApi.list())
  const del = useMutation((id) => shiftsApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('shifts') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />
  // Group by date
  const byDate = {}
  for (const s of items) { (byDate[s.date] = byDate[s.date] || []).push(s) }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {canManage && <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> جدولة وردية</Button></div>}
      {items.length === 0 ? (
        <div className="card"><EmptyState icon={CalendarRange} title="لا توجد ورديات مجدولة" /></div>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <div key={date} className="card">
              <h3 className="font-bold text-slate-800 mb-3">{formatDate(date)}</h3>
              <div className="space-y-2">
                {byDate[date].map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <Avatar name={s.full_name} src={s.profile_picture} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{s.full_name}</p>
                      <p className="text-xs text-slate-400">{s.job_title}</p>
                    </div>
                    <span className={`badge ${TYPE_TONE[s.shift_type] || 'bg-slate-100 text-slate-600'}`}>{s.shift_type}</span>
                    {s.shift_type !== 'راحة' && s.start_time && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3.5 h-3.5" /> {s.start_time}–{s.end_time}</span>
                    )}
                    <span className="hidden md:flex items-center gap-1 text-xs text-slate-400"><MapPin className="w-3.5 h-3.5" /> {s.location}</span>
                    {canManage && <button onClick={() => window.confirm('حذف الوردية؟') && del.mutate(s.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Form open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
