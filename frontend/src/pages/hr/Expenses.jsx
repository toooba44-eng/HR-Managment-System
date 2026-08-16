import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Receipt, Plus, Check, X, Banknote, Wallet, Clock, Scale, HandCoins, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { expensesApi, settingsApi } from '../../api/endpoints'
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
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: 'مصروف', category: 'مواصلات', amount: '', description: '' })
  const mutation = useMutation((data) => expensesApi.create({ ...data, amount: Number(data.amount) }), {
    onSuccess: () => { toast.success(t('تم إرسال الطلب')); qc.invalidateQueries('expenses'); onClose(); setForm({ type: 'مصروف', category: 'مواصلات', amount: '', description: '' }) },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل الإرسال')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={t('مطالبة جديدة')}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('النوع')} required>
            <Select value={form.type} onChange={set('type')}>
              <option value="مصروف">{t('مصروف', { context: 'expense_type' })}</option>
              <option value="سلفة">{t('سلفة')}</option>
            </Select>
          </Field>
          <Field label={t('التصنيف')}>
            <Select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}</Select>
          </Field>
        </div>
        <Field label={t('المبلغ (ر.س)')} required>
          <Input type="number" min="1" step="0.01" value={form.amount} onChange={set('amount')} required />
        </Field>
        <Field label={t('الوصف')}>
          <Textarea value={form.description} onChange={set('description')} rows={3} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={mutation.isLoading}>{t('إرسال')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function SettleModal({ advance, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [spent, setSpent] = useState('')
  const mutation = useMutation(() => expensesApi.settle(advance.id, Number(spent)), {
    onSuccess: () => { toast.success(t('تمت تسوية السلفة')); qc.invalidateQueries('expenses'); onClose() },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل التسوية')),
  })
  const balance = spent === '' ? null : advance.amount - Number(spent)
  return (
    <Modal open onClose={onClose} title={t('تسوية سلفة')}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
          <span className="text-sm text-slate-500">{t('مبلغ السلفة')}</span>
          <span className="font-bold text-slate-800">{formatCurrency(advance.amount)}</span>
        </div>
        <Field label={t('المبلغ المصروف فعلياً (ر.س)')} required>
          <Input type="number" min="0" step="0.01" value={spent} onChange={(e) => setSpent(e.target.value)} required />
        </Field>
        {balance !== null && (
          <div className={`rounded-xl px-4 py-3 text-sm border ${balance > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : balance < 0 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
            {balance > 0
              ? <>{t('يُعيد الموظف للشركة')} <b>{formatCurrency(balance)}</b></>
              : balance < 0
                ? <>{t('تصرف الشركة للموظف')} <b>{formatCurrency(Math.abs(balance))}</b> {t('إضافية')}</>
                : <>{t('السلفة مطابقة تماماً — لا رصيد')}</>}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={mutation.isLoading}>{t('تأكيد التسوية')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Expenses() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [settling, setSettling] = useState(null)

  const { data, isLoading } = useQuery('expenses', () => expensesApi.list())
  const statusMutation = useMutation(({ id, status }) => expensesApi.setStatus(id, status), {
    onSuccess: () => { toast.success(t('تم التحديث')); qc.invalidateQueries('expenses') },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل التحديث')),
  })

  const items = data?.expenses || []
  const s = data?.summary || { total: 0, pending: 0, approved: 0, count: 0, outstanding: 0 }

  const isSelfServiceUser = user?.role === 'employee'
  const { data: settingsData } = useQuery('settings', () => settingsApi.get(), { enabled: isSelfServiceUser })
  const selfServiceDisabled = isSelfServiceUser && settingsData && !settingsData.settings?.self_service_enabled

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Receipt} label={t('عدد المطالبات')} value={s.count} tone="blue" />
        <StatCard icon={Clock} label={t('قيد الاعتماد')} value={formatCurrency(s.pending)} tone="amber" />
        <StatCard icon={Check} label={t('معتمدة')} value={formatCurrency(s.approved)} tone="green" />
        <StatCard icon={HandCoins} label={t('سلف غير مُسوّاة')} value={formatCurrency(s.outstanding)} tone="rose" />
        <StatCard icon={Banknote} label={t('الإجمالي')} value={formatCurrency(s.total)} tone="violet" />
      </div>

      {selfServiceDisabled && (
        <div className="card border-r-4 border-amber-400 flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {t('بوابة الخدمة الذاتية غير مفعَّلة حالياً — تواصل مع الموارد البشرية لتقديم مطالبتك.')}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} disabled={selfServiceDisabled}><Plus className="w-5 h-5" /> {t('مطالبة جديدة')}</Button>
      </div>

      {isLoading ? (
        <Spinner fullscreen />
      ) : items.length === 0 ? (
        <div className="card"><EmptyState icon={Wallet} title={t('لا توجد مطالبات')} description={t('قدّم مطالبة مصروف أو طلب سلفة.')} /></div>
      ) : (
        <div className="space-y-3">
          {items.map((x) => (
            <div key={x.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {canManage && <Avatar name={x.full_name} src={x.profile_picture} size="md" />}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{formatCurrency(x.amount)}</span>
                    <span className="badge bg-slate-100 text-slate-600">{t(x.type, { context: 'expense_type' })}</span>
                    <span className="badge bg-blue-50 text-blue-600">{t(x.category)}</span>
                    <Badge status={x.status}>{t(x.status)}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {canManage && x.full_name ? `${x.full_name} · ` : ''}{formatDate(x.created_at)}
                  </p>
                  {x.description && <p className="text-sm text-slate-600 mt-1">{x.description}</p>}
                  {x.type === 'سلفة' && x.settled_at && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="badge bg-emerald-50 text-emerald-600 flex items-center gap-1"><Scale className="w-3 h-3" /> {t('مُسوّاة')}</span>
                      <span className="text-slate-500">{t('صُرف فعلياً {{amount}}', { amount: formatCurrency(x.settled_amount) })}</span>
                      {(() => {
                        const bal = x.amount - (x.settled_amount || 0)
                        if (bal > 0) return <span className="text-emerald-600">· {t('مُعاد {{amount}}', { amount: formatCurrency(bal) })}</span>
                        if (bal < 0) return <span className="text-amber-600">· {t('صُرف إضافي {{amount}}', { amount: formatCurrency(Math.abs(bal)) })}</span>
                        return null
                      })()}
                    </div>
                  )}
                </div>
              </div>
              {canManage && x.status === 'معلقة' && (
                <div className="flex gap-2">
                  <button onClick={() => statusMutation.mutate({ id: x.id, status: 'معتمدة' })} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {t('اعتماد')}</button>
                  <button onClick={() => statusMutation.mutate({ id: x.id, status: 'مرفوضة' })} className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1"><X className="w-3.5 h-3.5" /> {t('رفض')}</button>
                </div>
              )}
              {canManage && x.status === 'معتمدة' && (
                <button onClick={() => statusMutation.mutate({ id: x.id, status: 'مصروفة' })} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> {t('صرف')}</button>
              )}
              {x.type === 'سلفة' && x.status === 'مصروفة' && !x.settled_at && (
                <button onClick={() => setSettling(x)} className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center gap-1"><Scale className="w-3.5 h-3.5" /> {t('تسوية السلفة')}</button>
              )}
            </div>
          ))}
        </div>
      )}

      <ExpenseForm open={showForm} onClose={() => setShowForm(false)} />
      {settling && <SettleModal advance={settling} onClose={() => setSettling(null)} />}
    </div>
  )
}
