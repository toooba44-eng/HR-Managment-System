import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Building, Plus, Pencil, Trash2, Power, Users, HardDrive, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { companiesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'

const PLANS = ['أساسية', 'احترافية', 'مؤسسية']

function CompanyForm({ open, onClose, editing }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(
    editing || { name: '', contact_email: '', plan: 'أساسية', users_limit: 25, storage_limit_gb: 10, status: 'نشطة' }
  )
  const mutation = useMutation(
    (data) => (editing ? companiesApi.update(editing.id, data) : companiesApi.create(data)),
    {
      onSuccess: () => { toast.success(editing ? 'تم التحديث' : 'تم إنشاء المؤسسة'); qc.invalidateQueries('companies'); onClose() },
      onError: (err) => toast.error(err.response?.data?.error || 'فشلت العملية'),
    }
  )
  const num = (k) => (e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }))
  const str = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل مؤسسة' : 'إنشاء مؤسسة'}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label="اسم المؤسسة" required>
          <Input value={form.name} onChange={str('name')} required />
        </Field>
        <Field label="البريد الإلكتروني للتواصل">
          <Input type="email" value={form.contact_email} onChange={str('contact_email')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الباقة">
            <Select value={form.plan} onChange={str('plan')}>
              {PLANS.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={form.status} onChange={str('status')}>
              <option>نشطة</option><option>معلّقة</option>
            </Select>
          </Field>
          <Field label="حد المستخدمين">
            <Input type="number" min="1" value={form.users_limit} onChange={num('users_limit')} />
          </Field>
          <Field label="حد التخزين (GB)">
            <Input type="number" min="1" value={form.storage_limit_gb} onChange={num('storage_limit_gb')} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Companies() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const { data, isLoading } = useQuery('companies', companiesApi.list)

  const toggleMutation = useMutation(
    (c) => companiesApi.update(c.id, { ...c, status: c.status === 'نشطة' ? 'معلّقة' : 'نشطة' }),
    { onSuccess: () => { toast.success('تم تحديث الحالة'); qc.invalidateQueries('companies') } }
  )
  const removeMutation = useMutation((id) => companiesApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('companies') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />

  const companies = data?.companies || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building} label="إجمالي المؤسسات" value={s.total ?? 0} tone="violet" />
        <StatCard icon={Power} label="النشطة" value={s.active ?? 0} tone="green" />
        <StatCard icon={Power} label="المعلّقة" value={s.suspended ?? 0} tone="amber" />
        <StatCard icon={Users} label="الباقات" value={Object.keys(s.byPlan || {}).length} tone="blue" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="w-5 h-5" /> مؤسسة جديدة</Button>
      </div>

      {companies.length === 0 ? (
        <div className="card"><EmptyState icon={Building} title="لا توجد مؤسسات" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {companies.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <Building className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 truncate">{c.name}</h3>
                      <Badge status={c.status} />
                    </div>
                    <span className="badge bg-violet-50 text-violet-600 mt-1 inline-block">باقة {c.plan}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => toggleMutation.mutate(c)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-amber-600" title="تفعيل/تعليق"><Power className="w-4 h-4" /></button>
                  <button onClick={() => { setEditing(c); setShowForm(true) }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => window.confirm('حذف المؤسسة؟') && removeMutation.mutate(c.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                <span className="flex items-center gap-1 text-slate-500"><Users className="w-3.5 h-3.5" /> {c.users_limit} مستخدم</span>
                <span className="flex items-center gap-1 text-slate-500"><HardDrive className="w-3.5 h-3.5" /> {c.storage_limit_gb}GB</span>
                <span className="flex items-center gap-1 text-slate-500 truncate"><Mail className="w-3.5 h-3.5" /> {c.contact_email || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <CompanyForm open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
    </div>
  )
}
