import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Plus, Check, X, CalendarDays, Ban, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { leavesApi, settingsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { Field, Select, Input, Textarea, Button } from '../components/ui/Form'
import { formatDate } from '../lib/utils'

const LEAVE_TYPES = ['سنوية', 'مرضية', 'طارئة', 'بدون راتب', 'أمومة', 'حج', 'عمرة']

function LeaveRequestForm({ open, onClose }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [form, setForm] = useState({ type: 'سنوية', start_date: '', end_date: '', reason: '' })

  const mutation = useMutation(
    (data) => leavesApi.create({ ...data, employee_id: user.employee_id }),
    {
      onSuccess: () => {
        toast.success('تم إرسال طلب الإجازة')
        qc.invalidateQueries('leaves')
        onClose()
        setForm({ type: 'سنوية', start_date: '', end_date: '', reason: '' })
      },
      onError: (err) => toast.error(err.response?.data?.error || 'فشل إرسال الطلب'),
    }
  )

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title="طلب إجازة جديد">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label="نوع الإجازة" required>
          <Select value={form.type} onChange={set('type')} required>
            {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="من تاريخ" required>
            <Input type="date" value={form.start_date} onChange={set('start_date')} required />
          </Field>
          <Field label="إلى تاريخ" required>
            <Input type="date" value={form.end_date} onChange={set('end_date')} required />
          </Field>
        </div>
        <Field label="السبب">
          <Textarea value={form.reason} onChange={set('reason')} placeholder="اذكر سبب الإجازة (اختياري)" />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>إرسال الطلب</Button>
        </div>
      </form>
    </Modal>
  )
}

function LeaveBalance() {
  const { user } = useAuthStore()
  const { data: balance } = useQuery(
    ['leave-balance', user?.employee_id],
    () => leavesApi.balance(user.employee_id),
    { enabled: !!user?.employee_id }
  )

  if (!balance) return null

  const items = [
    { label: 'سنوية', value: balance.annual_leave_balance, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'مرضية', value: balance.sick_leave_balance, tone: 'text-blue-600 bg-blue-50' },
    { label: 'طارئة', value: balance.emergency_leave_balance, tone: 'text-amber-600 bg-amber-50' },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((i) => (
        <div key={i.label} className={`rounded-2xl p-4 text-center ${i.tone}`}>
          <p className="text-3xl font-extrabold">{i.value ?? 0}</p>
          <p className="text-xs font-medium mt-1">رصيد {i.label}</p>
        </div>
      ))}
    </div>
  )
}

export default function Leaves() {
  const qc = useQueryClient()
  const { canManage, user } = useAuthStore()
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery(['leaves', status], () => leavesApi.list({ status, limit: 50 }))
  const leaves = data?.leaves || []

  const approveMutation = useMutation(
    ({ id, decision }) => leavesApi.approve(id, { status: decision }),
    {
      onSuccess: (_, { decision }) => {
        toast.success(decision === 'موافقة' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب')
        qc.invalidateQueries('leaves')
      },
      onError: (err) => toast.error(err.response?.data?.error || 'فشل تحديث الطلب'),
    }
  )

  const cancelMutation = useMutation((id) => leavesApi.cancel(id), {
    onSuccess: () => { toast.success('تم إلغاء الطلب'); qc.invalidateQueries('leaves') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل الإلغاء'),
  })

  const isSelfServiceUser = user?.role === 'employee'
  const { data: settingsData } = useQuery('settings', () => settingsApi.get(), { enabled: isSelfServiceUser })
  const selfServiceDisabled = isSelfServiceUser && settingsData && !settingsData.settings?.self_service_enabled

  return (
    <div className="space-y-6">
      <LeaveBalance />

      {selfServiceDisabled && (
        <div className="card border-r-4 border-amber-400 flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          بوابة الخدمة الذاتية غير مفعَّلة حالياً — تواصل مع الموارد البشرية لتقديم طلب إجازة.
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="">كل الطلبات</option>
          <option value="معلقة">معلقة</option>
          <option value="موافقة">موافقة</option>
          <option value="مرفوضة">مرفوضة</option>
          <option value="ملغاة">ملغاة</option>
        </Select>
        <Button onClick={() => setShowForm(true)} disabled={selfServiceDisabled}>
          <Plus className="w-5 h-5" />
          طلب إجازة
        </Button>
      </div>

      {isLoading ? (
        <Spinner fullscreen />
      ) : leaves.length === 0 ? (
        <div className="card">
          <EmptyState icon={CalendarDays} title="لا توجد طلبات إجازة" />
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map((l) => (
            <div key={l.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Avatar name={l.full_name} src={l.profile_picture} size="md" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{l.full_name}</p>
                  <p className="text-sm text-slate-400">{l.job_title} · {l.department_name || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-slate-400 text-xs">النوع</p>
                  <p className="font-medium text-slate-700">{l.type}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-xs">المدة</p>
                  <p className="font-medium text-slate-700">{l.days_count} أيام</p>
                </div>
                <div className="text-center hidden md:block">
                  <p className="text-slate-400 text-xs">من — إلى</p>
                  <p className="font-medium text-slate-700 text-xs">{formatDate(l.start_date)} — {formatDate(l.end_date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge status={l.status} />
                {l.status === 'معلقة' && canManage() && (
                  <>
                    <button
                      onClick={() => approveMutation.mutate({ id: l.id, decision: 'موافقة' })}
                      className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"
                      title="موافقة"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => approveMutation.mutate({ id: l.id, decision: 'مرفوضة' })}
                      className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center"
                      title="رفض"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                {l.status === 'معلقة' && l.employee_id === user?.employee_id && !canManage() && (
                  <button
                    onClick={() => cancelMutation.mutate(l.id)}
                    className="w-9 h-9 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                    title="إلغاء"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <LeaveRequestForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
