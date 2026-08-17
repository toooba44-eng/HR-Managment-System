import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-for-tasks', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState({ title: '', description: '', employee_id: '', priority: 'متوسطة', due_date: '' })

  const mutation = useMutation((data) => tasksApi.create(data), {
    onSuccess: () => {
      toast.success(t('تم إسناد المهمة'))
      qc.invalidateQueries('tasks')
      onClose()
      setForm({ title: '', description: '', employee_id: '', priority: 'متوسطة', due_date: '' })
    },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل الإسناد')),
  })

  const employees = emps?.employees || []

  return (
    <Modal open={open} onClose={onClose} title={t('إسناد مهمة')}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, employee_id: Number(form.employee_id) }) }} className="space-y-4">
        <Field label={t('عنوان المهمة')} required>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </Field>
        <Field label={t('الوصف')}>
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={t('الموظف')} required>
            <Select value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} required>
              <option value="">{t('اختر')}</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
          <Field label={t('الأولوية')}>
            <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="عالية">{t('عالية')}</option><option value="متوسطة">{t('متوسطة')}</option><option value="منخفضة">{t('منخفضة')}</option>
            </Select>
          </Field>
          <Field label={t('تاريخ الاستحقاق')}>
            <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={mutation.isLoading}>{t('إسناد')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Tasks({ title, description }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)

  const { data: items = [], isLoading } = useQuery('tasks', () => tasksApi.list())

  const statusMutation = useMutation(({ id, status }) => tasksApi.setStatus(id, status), {
    onSuccess: () => { qc.invalidateQueries('tasks') },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل التحديث')),
  })
  const removeMutation = useMutation((id) => tasksApi.remove(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('tasks') },
    onError: () => toast.error(t('فشل الحذف')),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {title && <h2 className="text-lg font-bold text-slate-800">{t(title)}</h2>}
          {description && <p className="text-sm text-slate-400">{t(description)}</p>}
        </div>
        {canManage && (
          <Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> {t('إسناد مهمة')}</Button>
        )}
      </div>

      {isLoading ? (
        <Spinner fullscreen />
      ) : items.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardList} title={t('لا توجد مهام')} /></div>
      ) : (
        <div className="space-y-3">
          {items.map((tk) => (
            <div key={tk.id} className="card">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{tk.title}</h3>
                    <span className={`badge ${PRIORITY_TONE[tk.priority] || ''} inline-flex items-center gap-1`}>
                      <Flag className="w-3 h-3" /> {t(tk.priority)}
                    </span>
                    <Badge status={tk.status}>{t(tk.status)}</Badge>
                  </div>
                  {tk.description && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{tk.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                    {canManage && tk.full_name && (
                      <span className="flex items-center gap-1"><Avatar name={tk.full_name} size="sm" /> {tk.full_name}</span>
                    )}
                    {tk.due_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(tk.due_date)}</span>}
                    {tk.assigned_by_name && <span>{t('أسندها: {{name}}', { name: tk.assigned_by_name })}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Select
                    value={tk.status}
                    onChange={(e) => statusMutation.mutate({ id: tk.id, status: e.target.value })}
                    className="text-xs py-1.5 px-2 w-32"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                  </Select>
                  {canManage && (
                    <button onClick={() => window.confirm(t('حذف المهمة؟')) && removeMutation.mutate(tk.id)} className="text-slate-300 hover:text-rose-500" title={t('حذف')}>
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
