import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Building2, Plus, Users, UserCog } from 'lucide-react'
import toast from 'react-hot-toast'
import { departmentsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { Field, Input, Textarea, Button } from '../components/ui/Form'

const COLORS = ['#3B82F6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6']

function DepartmentForm({ open, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] })

  const mutation = useMutation((data) => departmentsApi.create(data), {
    onSuccess: () => {
      toast.success(t('تم إنشاء الإدارة'))
      qc.invalidateQueries('departments')
      onClose()
      setForm({ name: '', description: '', color: COLORS[0] })
    },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل الإنشاء')),
  })

  return (
    <Modal open={open} onClose={onClose} title={t('إضافة إدارة جديدة')}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label={t('اسم الإدارة')} required>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </Field>
        <Field label={t('الوصف')}>
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Field>
        <Field label={t('اللون')}>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`w-9 h-9 rounded-lg transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={mutation.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Departments() {
  const { t } = useTranslation()
  const { isHR } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const { data: departments = [], isLoading } = useQuery('departments', departmentsApi.list)

  if (isLoading) return <Spinner fullscreen />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{t('{{count}} إدارة', { count: departments.length })}</p>
        {isHR() && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-5 h-5" />
            {t('إدارة جديدة')}
          </Button>
        )}
      </div>

      {departments.length === 0 ? (
        <div className="card">
          <EmptyState icon={Building2} title={t('لا توجد إدارات')} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <div key={d.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: d.color || '#3B82F6' }}
                >
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 truncate">{d.name}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 min-h-[2.5rem]">
                    {d.description || t('بدون وصف')}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Users className="w-4 h-4" />
                  {t('{{count}} موظف', { count: d.employee_count || 0 })}
                </div>
                {d.manager_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <UserCog className="w-3.5 h-3.5" /> {d.manager_name}
                    </span>
                    <Avatar name={d.manager_name} size="sm" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DepartmentForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
