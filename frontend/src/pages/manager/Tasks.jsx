import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ClipboardList, Plus, Flag, Calendar, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { tasksApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']
const STATUSES = ['جديدة', 'قيد التنفيذ', 'مكتملة', 'ملغاة']
const PRIORITY_TONE = { عالية: 'text-rose-600 bg-rose-50', متوسطة: 'text-amber-600 bg-amber-50', منخفضة: 'text-slate-500 bg-slate-100' }

function TaskForm({ open, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-for-tasks', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState({ title: '', description: '', employee_id: '', priority: 'متوسطة', due_date: '' })

  const mutation = useMutation((data) => tasksApi.create(data), {
    onSuccess: () => {
      toast.success('تم إسناد المهمة')
      qc.invalidateQueries('tasks')
      onClose()
      setForm({ title: '', description: '', employee_id: '', priority: 'متوسطة', due_date: '' })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل الإسناد'),
  })

  const employees = emps?.employees || []

  return (
    <Modal open={open} onClose={onClose} title="إسناد مهمة">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, employee_id: Number(form.employee_id) }) }} className="space-y-4">
        <Field label="عنوان المهمة" required>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </Field>
        <Field label="الوصف">
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="الموظف" required>
            <Select value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} required>
              <option value="">اختر</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option>عالية</option><option>متوسطة</option><option>منخفضة</option>
            </Select>
          </Field>
          <Field label="تاريخ الاستحقاق">
            <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>إسناد</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Tasks({ title, description }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)

  const { data: items = [], isLoading } = useQuery('tasks', () => tasksApi.list())

  const statusMutation = useMutation(({ id, status }) => tasksApi.setStatus(id, status), {
    onSuccess: () => { qc.invalidateQueries('tasks') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل التحديث'),
  })
  const removeMutation = useMutation((id) => tasksApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('tasks') },
    onError: () => toast.error('فشل الحذف'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {title && <h2 className="text-lg font-bold text-slate-800">{title}</h2>}
          {description && <p className="text-sm text-slate-400">{description}</p>}
        </div>
        {canManage && (
          <Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> إسناد مهمة</Button>
        )}
      </div>

      {isLoading ? (
        <Spinner fullscreen />
      ) : items.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardList} title="لا توجد مهام" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{t.title}</h3>
                    <span className={`badge ${PRIORITY_TONE[t.priority] || ''} inline-flex items-center gap-1`}>
                      <Flag className="w-3 h-3" /> {t.priority}
                    </span>
                    <Badge status={t.status} />
                  </div>
                  {t.description && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{t.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                    {canManage && t.full_name && (
                      <span className="flex items-center gap-1"><Avatar name={t.full_name} size="sm" /> {t.full_name}</span>
                    )}
                    {t.due_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(t.due_date)}</span>}
                    {t.assigned_by_name && <span>أسندها: {t.assigned_by_name}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Select
                    value={t.status}
                    onChange={(e) => statusMutation.mutate({ id: t.id, status: e.target.value })}
                    className="text-xs py-1.5 px-2 w-32"
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                  {canManage && (
                    <button onClick={() => window.confirm('حذف المهمة؟') && removeMutation.mutate(t.id)} className="text-slate-300 hover:text-rose-500" title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
