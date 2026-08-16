import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Check, X, CheckCheck, Inbox, Undo2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { requestsApi, settingsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE_ROLES = ['admin', 'hr_manager', 'department_head', 'super_admin']

// Mirrors backend/src/routes/requests.js's TOGGLE_GATED_TYPES — these two
// request types are only meaningful when the org has the feature on.
const TOGGLE_GATED_TYPES = { 'عمل إضافي': 'overtime_enabled', 'عمل عن بعد': 'remote_work_enabled' }

function RequestForm({ open, onClose, type, typeOptions }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: type || (typeOptions?.[0] ?? 'أخرى'), subject: '', details: '' })

  const mutation = useMutation((data) => requestsApi.create(data), {
    onSuccess: () => {
      toast.success(t('تم إرسال الطلب'))
      qc.invalidateQueries('requests')
      onClose()
      setForm({ type: type || (typeOptions?.[0] ?? 'أخرى'), subject: '', details: '' })
    },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل إرسال الطلب')),
  })

  return (
    <Modal open={open} onClose={onClose} title={t('طلب جديد')}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        {typeOptions && typeOptions.length > 1 && (
          <Field label={t('نوع الطلب')} required>
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {typeOptions.map((ty) => <option key={ty} value={ty}>{t(ty)}</option>)}
            </Select>
          </Field>
        )}
        <Field label={t('الموضوع')} required>
          <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required />
        </Field>
        <Field label={t('التفاصيل')}>
          <Textarea value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} rows={3} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={mutation.isLoading}>{t('إرسال')}</Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Generic employee-request page. Reused across several self-service items.
 * @param {string} type       fixed request type for this page (e.g. "عمل عن بعد")
 * @param {string[]} typeOptions  when the page covers multiple types (e.g. شهادة/خطاب)
 */
export default function Requests({ type, typeOptions, title, description }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const canManage = MANAGE_ROLES.includes(user?.role)

  // For a multi-type page we fetch all and filter client-side; else by fixed type.
  const { data: items = [], isLoading } = useQuery(
    ['requests', type || 'all'],
    () => requestsApi.list(type ? { type } : {})
  )

  const visible = typeOptions
    ? items.filter((r) => typeOptions.includes(r.type))
    : items

  const resolveMutation = useMutation(
    ({ id, status }) => requestsApi.resolve(id, { status }),
    {
      onSuccess: () => { toast.success(t('تم تحديث الطلب')); qc.invalidateQueries('requests') },
      onError: (err) => toast.error(err.response?.data?.error || t('فشل التحديث')),
    }
  )

  const withdrawMutation = useMutation((id) => requestsApi.remove(id), {
    onSuccess: () => { toast.success(t('تم سحب الطلب')); qc.invalidateQueries('requests') },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل سحب الطلب')),
  })

  const toggleColumn = type ? TOGGLE_GATED_TYPES[type] : null
  const { data: settingsData } = useQuery('settings', () => settingsApi.get(), { enabled: !!toggleColumn })
  const featureDisabled = toggleColumn && settingsData && !settingsData.settings?.[toggleColumn]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {title && <h2 className="text-lg font-bold text-slate-800">{t(title)}</h2>}
          {description && <p className="text-sm text-slate-400">{t(description)}</p>}
        </div>
        <Button onClick={() => setShowForm(true)} disabled={featureDisabled}>
          <Plus className="w-5 h-5" />
          {t('طلب جديد')}
        </Button>
      </div>

      {featureDisabled && (
        <div className="card border-r-4 border-amber-400 flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {t('هذه الميزة غير مفعَّلة حالياً في إعدادات المؤسسة — تواصل مع الموارد البشرية إن احتجت تفعيلها.')}
        </div>
      )}

      {isLoading ? (
        <Spinner fullscreen />
      ) : visible.length === 0 ? (
        <div className="card"><EmptyState icon={Inbox} title={t('لا توجد طلبات')} description={t('قدّم طلبك الأول عبر زر «طلب جديد».')} /></div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start gap-3">
                {canManage && <Avatar name={r.full_name} src={r.profile_picture} size="md" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800">{r.subject}</h3>
                    <Badge status={r.status}>{t(r.status)}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="badge bg-slate-100 text-slate-600">{t(r.type)}</span>
                    {canManage && r.full_name && <span>· {r.full_name}</span>}
                    <span>· {formatDate(r.created_at)}</span>
                  </div>
                  {r.details && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{r.details}</p>}
                  {r.response && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">{t('الرد:')}</span> {r.response}
                      {r.resolved_by_name && <span className="text-xs text-slate-400"> — {r.resolved_by_name}</span>}
                    </div>
                  )}

                  {canManage && r.status === 'معلقة' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => resolveMutation.mutate({ id: r.id, status: 'مقبولة' })} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {t('قبول')}
                      </button>
                      <button onClick={() => resolveMutation.mutate({ id: r.id, status: 'مكتملة' })} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5" /> {t('إكمال')}
                      </button>
                      <button onClick={() => resolveMutation.mutate({ id: r.id, status: 'مرفوضة' })} className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> {t('رفض')}
                      </button>
                    </div>
                  )}
                  {r.employee_id === user?.employee_id && r.status === 'معلقة' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => window.confirm(t('سحب هذا الطلب؟')) && withdrawMutation.mutate(r.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center gap-1"
                      >
                        <Undo2 className="w-3.5 h-3.5" /> {t('سحب الطلب')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RequestForm open={showForm} onClose={() => setShowForm(false)} type={type} typeOptions={typeOptions} />
    </div>
  )
}
