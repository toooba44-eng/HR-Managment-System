import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Plus, Check, X, CheckCheck, Inbox, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { requestsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE_ROLES = ['admin', 'hr_manager', 'department_head', 'super_admin']

function RequestForm({ open, onClose, type, typeOptions }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: type || (typeOptions?.[0] ?? 'أخرى'), subject: '', details: '' })

  const mutation = useMutation((data) => requestsApi.create(data), {
    onSuccess: () => {
      toast.success('تم إرسال الطلب')
      qc.invalidateQueries('requests')
      onClose()
      setForm({ type: type || (typeOptions?.[0] ?? 'أخرى'), subject: '', details: '' })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل إرسال الطلب'),
  })

  return (
    <Modal open={open} onClose={onClose} title="طلب جديد">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        {typeOptions && typeOptions.length > 1 && (
          <Field label="نوع الطلب" required>
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {typeOptions.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        )}
        <Field label="الموضوع" required>
          <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required />
        </Field>
        <Field label="التفاصيل">
          <Textarea value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} rows={3} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>إرسال</Button>
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
      onSuccess: () => { toast.success('تم تحديث الطلب'); qc.invalidateQueries('requests') },
      onError: (err) => toast.error(err.response?.data?.error || 'فشل التحديث'),
    }
  )

  const withdrawMutation = useMutation((id) => requestsApi.remove(id), {
    onSuccess: () => { toast.success('تم سحب الطلب'); qc.invalidateQueries('requests') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل سحب الطلب'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {title && <h2 className="text-lg font-bold text-slate-800">{title}</h2>}
          {description && <p className="text-sm text-slate-400">{description}</p>}
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-5 h-5" />
          طلب جديد
        </Button>
      </div>

      {isLoading ? (
        <Spinner fullscreen />
      ) : visible.length === 0 ? (
        <div className="card"><EmptyState icon={Inbox} title="لا توجد طلبات" description="قدّم طلبك الأول عبر زر «طلب جديد»." /></div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start gap-3">
                {canManage && <Avatar name={r.full_name} src={r.profile_picture} size="md" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800">{r.subject}</h3>
                    <Badge status={r.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="badge bg-slate-100 text-slate-600">{r.type}</span>
                    {canManage && r.full_name && <span>· {r.full_name}</span>}
                    <span>· {formatDate(r.created_at)}</span>
                  </div>
                  {r.details && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{r.details}</p>}
                  {r.response && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">الرد:</span> {r.response}
                      {r.resolved_by_name && <span className="text-xs text-slate-400"> — {r.resolved_by_name}</span>}
                    </div>
                  )}

                  {canManage && r.status === 'معلقة' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => resolveMutation.mutate({ id: r.id, status: 'مقبولة' })} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> قبول
                      </button>
                      <button onClick={() => resolveMutation.mutate({ id: r.id, status: 'مكتملة' })} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5" /> إكمال
                      </button>
                      <button onClick={() => resolveMutation.mutate({ id: r.id, status: 'مرفوضة' })} className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> رفض
                      </button>
                    </div>
                  )}
                  {r.employee_id === user?.employee_id && r.status === 'معلقة' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => window.confirm('سحب هذا الطلب؟') && withdrawMutation.mutate(r.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center gap-1"
                      >
                        <Undo2 className="w-3.5 h-3.5" /> سحب الطلب
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
