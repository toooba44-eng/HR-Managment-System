import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { CalendarRange, Plus, Trash2, Clock, MapPin, ArrowLeftRight, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { shiftsApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
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

function RequestSwapModal({ myShift, allShifts, onClose }) {
  const qc = useQueryClient()
  const colleagues = useMemo(() => {
    const seen = new Map()
    for (const s of allShifts) {
      if (s.employee_id !== myShift.employee_id) seen.set(s.employee_id, s.full_name)
    }
    return [...seen.entries()].map(([id, full_name]) => ({ id, full_name }))
  }, [allShifts, myShift])
  const [targetId, setTargetId] = useState('')
  const [shiftBId, setShiftBId] = useState('')
  const [reason, setReason] = useState('')
  const theirShifts = allShifts.filter((s) => s.employee_id === Number(targetId))
  const m = useMutation(() => shiftsApi.requestSwap({ shift_a_id: myShift.id, target_id: Number(targetId), shift_b_id: Number(shiftBId), reason }), {
    onSuccess: () => { toast.success('تم إرسال طلب التبديل'); qc.invalidateQueries('shift-swaps'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل الطلب'),
  })
  return (
    <Modal open onClose={onClose} title="طلب تبديل وردية">
      <form onSubmit={(e) => { e.preventDefault(); if (targetId && shiftBId) m.mutate() }} className="space-y-4">
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-500">ورديتي: </span>
          <span className="font-medium text-slate-700">{formatDate(myShift.date)} · {myShift.shift_type}</span>
        </div>
        <Field label="الزميل" required>
          <Select value={targetId} onChange={(e) => { setTargetId(e.target.value); setShiftBId('') }} required>
            <option value="">اختر زميلاً</option>
            {colleagues.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </Select>
        </Field>
        {targetId && (
          <Field label="وردية الزميل" required>
            <Select value={shiftBId} onChange={(e) => setShiftBId(e.target.value)} required>
              <option value="">اختر وردية</option>
              {theirShifts.map((s) => <option key={s.id} value={s.id}>{formatDate(s.date)} · {s.shift_type}</option>)}
            </Select>
          </Field>
        )}
        <Field label="سبب الطلب"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></Field>
        <p className="text-xs text-slate-400">يجب موافقة الزميل ثم اعتماد المدير لإتمام التبديل.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading} disabled={!targetId || !shiftBId}>إرسال الطلب</Button>
        </div>
      </form>
    </Modal>
  )
}

function SwapRequests({ canManage }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { data: swaps = [], isLoading } = useQuery('shift-swaps', shiftsApi.swapRequests)
  const respond = useMutation(({ id, accept }) => shiftsApi.respondSwap(id, accept), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries('shift-swaps') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل'),
  })
  const approve = useMutation((id) => shiftsApi.approveSwap(id), {
    onSuccess: () => { toast.success('تم اعتماد التبديل'); qc.invalidateQueries('shift-swaps'); qc.invalidateQueries('shifts') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل'),
  })
  const reject = useMutation((id) => shiftsApi.rejectSwap(id), {
    onSuccess: () => { toast.success('تم الرفض'); qc.invalidateQueries('shift-swaps') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل'),
  })

  if (isLoading) return null
  if (swaps.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3"><ArrowLeftRight className="w-5 h-5 text-slate-400" /><h3 className="font-bold text-slate-800">طلبات تبديل الورديات</h3></div>
      <div className="space-y-2">
        {swaps.map((s) => {
          const isTarget = s.target_id === user?.employee_id
          return (
            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-2 flex-1 min-w-0 text-sm">
                <Avatar name={s.requester_name} src={s.requester_picture} size="sm" />
                <span className="text-slate-700">{s.requester_name}</span>
                <span className="text-xs text-slate-400">({formatDate(s.shift_a_date)} · {s.shift_a_type})</span>
                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <Avatar name={s.target_name} src={s.target_picture} size="sm" />
                <span className="text-slate-700">{s.target_name}</span>
                <span className="text-xs text-slate-400">({formatDate(s.shift_b_date)} · {s.shift_b_type})</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge status={s.status} />
                {isTarget && s.status === 'بانتظار موافقة الزميل' && (
                  <>
                    <button onClick={() => respond.mutate({ id: s.id, accept: true })} className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> موافقة</button>
                    <button onClick={() => respond.mutate({ id: s.id, accept: false })} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                  </>
                )}
                {canManage && s.status === 'بانتظار اعتماد المدير' && (
                  <>
                    <button onClick={() => approve.mutate(s.id)} className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> اعتماد</button>
                    <button onClick={() => reject.mutate(s.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Shifts() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [swapping, setSwapping] = useState(null)
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
      <SwapRequests canManage={canManage} />
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
                    {s.employee_id === user?.employee_id && s.shift_type !== 'راحة' && (
                      <button onClick={() => setSwapping(s)} title="طلب تبديل" className="text-slate-300 hover:text-primary-600"><ArrowLeftRight className="w-4 h-4" /></button>
                    )}
                    {canManage && <button onClick={() => window.confirm('حذف الوردية؟') && del.mutate(s.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Form open={showForm} onClose={() => setShowForm(false)} />
      {swapping && <RequestSwapModal myShift={swapping} allShifts={items} onClose={() => setSwapping(null)} />}
    </div>
  )
}
