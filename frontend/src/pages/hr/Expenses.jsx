import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Receipt, Plus, Check, X, Banknote, Wallet, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { expensesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate, formatCurrency } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']
const CATEGORIES = ['مواصلات', 'ضيافة', 'قرطاسية', 'سفر', 'اتصالات', 'سلفة راتب', 'أخرى']

function ExpenseForm({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: 'مصروف', category: 'مواصلات', amount: '', description: '' })
  const mutation = useMutation((data) => expensesApi.create({ ...data, amount: Number(data.amount) }), {
    onSuccess: () => { toast.success('تم إرسال الطلب'); qc.invalidateQueries('expenses'); onClose(); setForm({ type: 'مصروف', category: 'مواصلات', amount: '', description: '' }) },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل الإرسال'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="مطالبة جديدة">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="النوع" required>
            <Select value={form.type} onChange={set('type')}><option>مصروف</option><option>سلفة</option></Select>
          </Field>
          <Field label="التصنيف">
            <Select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
        </div>
        <Field label="المبلغ (ر.س)" required>
          <Input type="number" min="1" step="0.01" value={form.amount} onChange={set('amount')} required />
        </Field>
        <Field label="الوصف">
          <Textarea value={form.description} onChange={set('description')} rows={3} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>إرسال</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Expenses() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery('expenses', () => expensesApi.list())
  const statusMutation = useMutation(({ id, status }) => expensesApi.setStatus(id, status), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries('expenses') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل التحديث'),
  })

  const items = data?.expenses || []
  const s = data?.summary || { total: 0, pending: 0, approved: 0, count: 0 }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Receipt} label="عدد المطالبات" value={s.count} tone="blue" />
        <StatCard icon={Clock} label="قيد الاعتماد" value={formatCurrency(s.pending)} tone="amber" />
        <StatCard icon={Check} label="معتمدة" value={formatCurrency(s.approved)} tone="green" />
        <StatCard icon={Banknote} label="الإجمالي" value={formatCurrency(s.total)} tone="violet" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> مطالبة جديدة</Button>
      </div>

      {isLoading ? (
        <Spinner fullscreen />
      ) : items.length === 0 ? (
        <div className="card"><EmptyState icon={Wallet} title="لا توجد مطالبات" description="قدّم مطالبة مصروف أو طلب سلفة." /></div>
      ) : (
        <div className="space-y-3">
          {items.map((x) => (
            <div key={x.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {canManage && <Avatar name={x.full_name} src={x.profile_picture} size="md" />}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{formatCurrency(x.amount)}</span>
                    <span className="badge bg-slate-100 text-slate-600">{x.type}</span>
                    <span className="badge bg-blue-50 text-blue-600">{x.category}</span>
                    <Badge status={x.status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {canManage && x.full_name ? `${x.full_name} · ` : ''}{formatDate(x.created_at)}
                  </p>
                  {x.description && <p className="text-sm text-slate-600 mt-1">{x.description}</p>}
                </div>
              </div>
              {canManage && x.status === 'معلقة' && (
                <div className="flex gap-2">
                  <button onClick={() => statusMutation.mutate({ id: x.id, status: 'معتمدة' })} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> اعتماد</button>
                  <button onClick={() => statusMutation.mutate({ id: x.id, status: 'مرفوضة' })} className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1"><X className="w-3.5 h-3.5" /> رفض</button>
                </div>
              )}
              {canManage && x.status === 'معتمدة' && (
                <button onClick={() => statusMutation.mutate({ id: x.id, status: 'مصروفة' })} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> صرف</button>
              )}
            </div>
          ))}
        </div>
      )}

      <ExpenseForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
