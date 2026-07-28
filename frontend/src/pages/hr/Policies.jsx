import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ScrollText, Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { policiesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { Field, Input, Textarea, Button } from '../../components/ui/Form'

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

export default function Policies() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: items = [], isLoading } = useQuery('policies', policiesApi.list)

  const removeMutation = useMutation((id) => policiesApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('policies') },
    onError: () => toast.error('فشل الحذف'),
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
            </div>
          ))}
        </div>
      )}

      {showForm && <PolicyForm open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
    </div>
  )
}
