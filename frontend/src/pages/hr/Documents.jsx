import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { FileText, Plus, Trash2, Pencil, FileWarning, FileClock, Files, BellRing } from 'lucide-react'
import toast from 'react-hot-toast'
import { documentsApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager']
const TYPES = ['هوية', 'جواز', 'عقد عمل', 'شهادة', 'تأمين', 'أخرى']

function Form({ open, onClose, editing }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open && !editing })
  const [form, setForm] = useState(() => editing
    ? { type: editing.type, title: editing.title, expiry_date: editing.expiry_date || '' }
    : { employee_id: '', type: 'هوية', title: '', expiry_date: '' })
  const m = useMutation(
    (d) => (editing ? documentsApi.update(editing.id, d) : documentsApi.register(d)),
    {
      onSuccess: () => { toast.success(editing ? t('تم التحديث') : t('تم التسجيل')); qc.invalidateQueries('documents-register'); onClose() },
      onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
    },
  )
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={editing ? t('تعديل مستند') : t('تسجيل مستند')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        {!editing && (
          <Field label={t('الموظف')} required>
            <Select value={form.employee_id} onChange={set('employee_id')} required>
              <option value="">{t('اختر')}</option>
              {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('النوع')}><Select value={form.type} onChange={set('type')}>{TYPES.map((tp) => <option key={tp} value={tp}>{t(tp)}</option>)}</Select></Field>
          <Field label={t('تاريخ الانتهاء')}><Input type="date" value={form.expiry_date || ''} onChange={set('expiry_date')} /></Field>
        </div>
        <Field label={t('عنوان المستند')} required><Input value={form.title} onChange={set('title')} required /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Documents() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const { data, isLoading } = useQuery(['documents-register', typeFilter], () => documentsApi.list(typeFilter ? { type: typeFilter } : {}))
  const del = useMutation((id) => documentsApi.remove(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('documents-register') },
    onError: () => toast.error(t('فشل الحذف')),
  })
  const remind = useMutation((id) => documentsApi.remind(id), {
    onSuccess: () => { toast.success(t('تم إرسال تذكير للموظف')); qc.invalidateQueries('documents-register') },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل إرسال التذكير')),
  })

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (r) => { setEditing(r); setShowForm(true) }

  if (isLoading) return <Spinner fullscreen />
  const items = data?.documents || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Files} label={t('إجمالي المستندات')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={FileClock} label={t('تنتهي قريباً')} value={s.expiringSoon ?? 0} tone="amber" />
        <StatCard icon={FileWarning} label={t('منتهية')} value={s.expired ?? 0} tone="rose" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="max-w-[200px]">
          <option value="">{t('كل الأنواع')}</option>
          {TYPES.map((tp) => <option key={tp} value={tp}>{t(tp)}</option>)}
        </Select>
        {canManage && <Button onClick={openNew}><Plus className="w-5 h-5" /> {t('تسجيل مستند')}</Button>}
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={FileText} title={t('لا توجد مستندات')} /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-400 border-b border-slate-100">
                {canManage && <th className="pb-3 font-medium">{t('الموظف')}</th>}
                <th className="pb-3 font-medium">{t('المستند')}</th>
                <th className="pb-3 font-medium">{t('النوع')}</th>
                <th className="pb-3 font-medium">{t('تاريخ الانتهاء')}</th>
                <th className="pb-3 font-medium">{t('الحالة')}</th>
                {canManage && <th className="pb-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((r) => (
                <tr key={r.id}>
                  {canManage && (
                    <td className="py-3">
                      <div className="flex items-center gap-2"><Avatar name={r.full_name} size="sm" /><span className="text-slate-700">{r.full_name}</span></div>
                    </td>
                  )}
                  <td className="py-3">
                    <div className="flex items-center gap-2 text-slate-700"><FileText className="w-4 h-4 text-slate-300" /> {r.title}</div>
                  </td>
                  <td className="py-3 text-slate-500">{t(r.type)}</td>
                  <td className="py-3 text-slate-600">
                    {r.expiry_date ? (
                      <span>{formatDate(r.expiry_date)}{r.days_left != null && r.days_left >= 0 && r.days_left <= 30 && <span className="text-amber-600 text-xs mr-1">({t('{{count}} يوم', { count: r.days_left })})</span>}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3"><Badge status={r.doc_status}>{t(r.doc_status)}</Badge></td>
                  {canManage && (
                    <td className="py-3">
                      <div className="flex gap-1 justify-end">
                        {['تنتهي قريباً', 'منتهية'].includes(r.doc_status) && (
                          <button
                            onClick={() => remind.mutate(r.id)}
                            title={r.reminder_sent_at ? t('آخر تذكير: {{date}}', { date: formatDate(r.reminder_sent_at) }) : t('إرسال تذكير للموظف')}
                            className={`w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center ${r.reminder_sent_at ? 'text-amber-400' : 'text-slate-400 hover:text-amber-600'}`}
                          >
                            <BellRing className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => window.confirm(t('حذف المستند؟')) && del.mutate(r.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && <Form open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
    </div>
  )
}
