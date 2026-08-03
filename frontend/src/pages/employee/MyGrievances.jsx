import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ShieldAlert, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { grievancesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { Field, Input, Textarea, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const TYPE_LABEL = { شكوى: 'شكوى مقدَّمة', مخالفة: 'مخالفة إدارية' }

function FileGrievanceModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ category: '', description: '' })
  const m = useMutation(() => grievancesApi.create(form), {
    onSuccess: () => { toast.success('تم تقديم الشكوى، وسيتم التواصل معك عبر الموارد البشرية'); qc.invalidateQueries('my-grievances'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title="تقديم شكوى">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate() }} className="space-y-4">
        <Field label="التصنيف" required>
          <Input value={form.category} onChange={set('category')} placeholder="بيئة العمل، زميل، مدير مباشر..." required />
        </Field>
        <Field label="التفاصيل" required>
          <Textarea value={form.description} onChange={set('description')} rows={4} required placeholder="اشرح المشكلة بالتفصيل ليتمكن فريق الموارد البشرية من المتابعة." />
        </Field>
        <p className="text-xs text-slate-400">سيتم التعامل مع شكواك بسرّية تامة من فريق الموارد البشرية.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>تقديم</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function MyGrievances() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data = [], isLoading } = useQuery('my-grievances', () => grievancesApi.mine())
  const del = useMutation((id) => grievancesApi.remove(id), {
    onSuccess: () => { toast.success('تم سحب الشكوى'); qc.invalidateQueries('my-grievances') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })

  if (isLoading) return <Spinner fullscreen />

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> تقديم شكوى</Button>
      </div>
      {data.length === 0 ? (
        <div className="card">
          <EmptyState icon={ShieldAlert} title="لا توجد حالات مسجّلة" description="لا توجد لديك أي شكاوى أو مخالفات مسجّلة حالياً." />
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((g) => (
            <div key={g.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{TYPE_LABEL[g.type] || g.type}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{g.category} · {formatDate(g.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge status={g.status} />
                  {g.type === 'شكوى' && g.status === 'مفتوحة' && (
                    <button onClick={() => window.confirm('سحب الشكوى؟') && del.mutate(g.id)} className="text-slate-300 hover:text-rose-500" title="سحب الشكوى">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {g.action && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">الإجراء المتخذ:</span> {g.action}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && <FileGrievanceModal onClose={() => setShowForm(false)} />}
    </div>
  )
}
