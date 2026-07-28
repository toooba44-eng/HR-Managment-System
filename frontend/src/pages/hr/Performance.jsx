import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Target, Plus, Trash2, TrendingUp, CheckCircle2, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { goalsApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']

function GoalForm({ open, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-for-goals', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState({ employee_id: '', title: '', description: '', weight: 100, target_date: '' })
  const mutation = useMutation((data) => goalsApi.create({ ...data, employee_id: Number(data.employee_id), weight: Number(data.weight) }), {
    onSuccess: () => { toast.success('تم إسناد الهدف'); qc.invalidateQueries('goals'); onClose() },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل الإسناد'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const employees = emps?.employees || []
  return (
    <Modal open={open} onClose={onClose} title="إسناد هدف">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label="الموظف" required>
          <Select value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">اختر</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <Field label="عنوان الهدف" required><Input value={form.title} onChange={set('title')} required /></Field>
        <Field label="الوصف"><Textarea value={form.description} onChange={set('description')} rows={2} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الوزن (%)"><Input type="number" min="1" max="100" value={form.weight} onChange={set('weight')} /></Field>
          <Field label="تاريخ الاستحقاق"><Input type="date" value={form.target_date} onChange={set('target_date')} /></Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>إسناد</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Performance() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery('goals', () => goalsApi.list())
  const updateMutation = useMutation(({ id, ...body }) => goalsApi.update(id, body), {
    onSuccess: () => qc.invalidateQueries('goals'),
    onError: (err) => toast.error(err.response?.data?.error || 'فشل التحديث'),
  })
  const removeMutation = useMutation((id) => goalsApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('goals') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />
  const goals = data?.goals || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target} label="إجمالي الأهداف" value={s.total ?? 0} tone="blue" />
        <StatCard icon={Loader} label="قيد التنفيذ" value={s.inProgress ?? 0} tone="amber" />
        <StatCard icon={CheckCircle2} label="مكتملة" value={s.completed ?? 0} tone="green" />
        <StatCard icon={TrendingUp} label="متوسط الإنجاز" value={`${s.avgProgress ?? 0}%`} tone="violet" />
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> إسناد هدف</Button>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="card"><EmptyState icon={Target} title="لا توجد أهداف" /></div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{g.title}</h3>
                    <Badge status={g.status} />
                    <span className="badge bg-slate-100 text-slate-600">وزن {g.weight}%</span>
                  </div>
                  {g.description && <p className="text-sm text-slate-600 mt-1">{g.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                    {canManage && g.full_name && <span className="flex items-center gap-1"><Avatar name={g.full_name} size="sm" /> {g.full_name}</span>}
                    {g.target_date && <span>الاستحقاق: {formatDate(g.target_date)}</span>}
                  </div>
                </div>
                {canManage && (
                  <button onClick={() => window.confirm('حذف الهدف؟') && removeMutation.mutate(g.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>

              {/* Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">نسبة الإنجاز</span>
                  <span className="font-bold text-slate-700">{g.progress}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${g.progress >= 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} style={{ width: `${g.progress}%` }} />
                </div>
                {(g.employee_id === user?.employee_id || canManage) && g.status !== 'مكتملة' && g.status !== 'ملغاة' && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {[0, 25, 50, 75, 100].map((p) => (
                      <button key={p} onClick={() => updateMutation.mutate({ id: g.id, progress: p })}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${g.progress === p ? 'bg-primary-600 text-white border-primary-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                        {p}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <GoalForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
