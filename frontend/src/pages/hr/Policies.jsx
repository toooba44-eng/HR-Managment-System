import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ScrollText, Plus, Pencil, Trash2, Users, Check, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { policiesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['super_admin', 'admin', 'hr_manager']

function PolicyForm({ open, onClose, editing }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(
    editing || { title: '', category: '', body: '' }
  )

  const mutation = useMutation(
    (data) => (editing ? policiesApi.update(editing.id, data) : policiesApi.create(data)),
    {
      onSuccess: () => {
        toast.success(editing ? 'تم تحديث السياسة' : 'تم إنشاء السياسة')
        qc.invalidateQueries('policies')
        onClose()
      },
      onError: (err) => toast.error(err.response?.data?.error || 'فشلت العملية'),
    }
  )

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل سياسة' : 'سياسة جديدة'}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label="العنوان" required>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </Field>
        <Field label="التصنيف">
          <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="عام، الحضور، الإجازات..." />
        </Field>
        <Field label="النص" required>
          <Textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={5} required />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

function AcknowledgmentsModal({ policy, onClose }) {
  const { data, isLoading } = useQuery(['policy-acknowledgments', policy.id], () => policiesApi.acknowledgments(policy.id))
  return (
    <Modal open onClose={onClose} title={`من أقرّ بالاطلاع: ${policy.title}`}>
      {isLoading ? <Spinner /> : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            أقرّ <span className="font-bold text-emerald-600">{data.ackers.length}</span> من أصل <span className="font-bold text-slate-700">{data.total}</span> موظف نشط.
          </p>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">أقرّوا ({data.ackers.length})</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {data.ackers.length === 0 && <p className="text-xs text-slate-400">لا أحد بعد.</p>}
              {data.ackers.map((a) => (
                <div key={a.employee_id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2"><Avatar name={a.full_name} size="sm" /><span className="text-slate-700">{a.full_name}</span></div>
                  <span className="text-xs text-slate-400">{formatDate(a.acknowledged_at)}</span>
                </div>
              ))}
            </div>
          </div>
          {data.notAcked.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">لم يقرّوا بعد ({data.notAcked.length})</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {data.notAcked.map((e) => (
                  <div key={e.employee_id} className="flex items-center gap-2 text-sm">
                    <Avatar name={e.full_name} size="sm" /><span className="text-slate-600">{e.full_name}</span>
                    {e.job_title && <span className="text-xs text-slate-400">· {e.job_title}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function Policies() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewingAcks, setViewingAcks] = useState(null)

  const { data: items = [], isLoading } = useQuery('policies', policiesApi.list)

  const removeMutation = useMutation((id) => policiesApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('policies') },
    onError: () => toast.error('فشل الحذف'),
  })

  const ackMutation = useMutation((id) => policiesApi.acknowledge(id), {
    onSuccess: () => { toast.success('تم تسجيل إقرارك'); qc.invalidateQueries('policies') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشلت العملية'),
  })

  if (isLoading) return <Spinner fullscreen />

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (p) => { setEditing(p); setShowForm(true) }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openNew}><Plus className="w-5 h-5" /> سياسة جديدة</Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={ScrollText} title="لا توجد سياسات" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <ScrollText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800">{p.title}</h3>
                    <span className="badge bg-slate-100 text-slate-600 mt-1 inline-block">{p.category}</span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600" title="تعديل">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => window.confirm('حذف هذه السياسة؟') && removeMutation.mutate(p.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500" title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed whitespace-pre-line">{p.body}</p>
              <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
                <div>
                  {canManage && (
                    <button onClick={() => setViewingAcks(p)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-600">
                      <Users className="w-3.5 h-3.5" /> أقرّ {p.ack_count || 0}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!p.acked_by_me ? (
                    <Button variant="secondary" className="!py-1.5 !px-3 text-xs" onClick={() => ackMutation.mutate(p.id)} loading={ackMutation.isLoading}>
                      <Check className="w-4 h-4" /> أقرّ بالاطلاع
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-4 h-4" /> أقررتَ بالاطلاع</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <PolicyForm open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
      {viewingAcks && <AcknowledgmentsModal policy={viewingAcks} onClose={() => setViewingAcks(null)} />}
    </div>
  )
}
