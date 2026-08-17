import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Receipt, Plus, Trash2, CheckCircle2, Wallet, AlertTriangle, FileText, Ban, MoreVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingApi, companiesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate, formatCurrency } from '../../lib/utils'

const STATUSES = ['مدفوعة', 'غير مدفوعة', 'متأخرة', 'ملغاة']
const PLANS = ['أساسية', 'احترافية', 'مؤسسية']

function CreateForm({ open, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: companiesData } = useQuery('companies', companiesApi.list, { enabled: open })
  const [form, setForm] = useState({ company_id: '', amount: '', plan: '', period: '', issue_date: '', due_date: '' })
  const m = useMutation((d) => billingApi.create({ ...d, amount: Number(d.amount) }), {
    onSuccess: () => { toast.success(t('تم إنشاء الفاتورة')); qc.invalidateQueries('invoices'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const companies = companiesData?.companies || []
  return (
    <Modal open={open} onClose={onClose} title={t('فاتورة جديدة')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label={t('الشركة')} required>
          <Select value={form.company_id} onChange={set('company_id')} required>
            <option value="">{t('اختر')}</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('المبلغ (ر.س)')} required><Input type="number" min="1" value={form.amount} onChange={set('amount')} required /></Field>
          <Field label={t('الباقة')}><Select value={form.plan} onChange={set('plan')}><option value="">{t('حسب الشركة')}</option>{PLANS.map((p) => <option key={p} value={p}>{t(p)}</option>)}</Select></Field>
          <Field label={t('الفترة')}><Input value={form.period} onChange={set('period')} placeholder={t('مارس 2026')} /></Field>
          <Field label={t('تاريخ الإصدار')}><Input type="date" value={form.issue_date} onChange={set('issue_date')} /></Field>
          <Field label={t('تاريخ الاستحقاق')}><Input type="date" value={form.due_date} onChange={set('due_date')} /></Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('إنشاء')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Billing() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [menuId, setMenuId] = useState(null)
  const { data, isLoading } = useQuery(['invoices', statusFilter], () => billingApi.list(statusFilter ? { status: statusFilter } : {}))
  const setStatus = useMutation(({ id, status }) => billingApi.setStatus(id, status), {
    onSuccess: () => { toast.success(t('تم التحديث')); qc.invalidateQueries('invoices'); setMenuId(null) },
    onError: () => toast.error(t('فشل')),
  })
  const del = useMutation((id) => billingApi.remove(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('invoices') }, onError: () => toast.error(t('فشل')),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.invoices || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label={t('إجمالي المحصّل')} value={formatCurrency(s.paid ?? 0)} tone="green" />
        <StatCard icon={FileText} label={t('مستحقات قائمة')} value={formatCurrency(s.outstanding ?? 0)} tone="amber" />
        <StatCard icon={AlertTriangle} label={t('فواتير متأخرة')} value={s.overdue ?? 0} tone="rose" />
        <StatCard icon={Receipt} label={t('إجمالي الفواتير')} value={s.count ?? 0} tone="blue" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[200px]">
          <option value="">{t('كل الحالات')}</option>
          {STATUSES.map((st) => <option key={st} value={st}>{t(st)}</option>)}
        </Select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> {t('فاتورة جديدة')}</Button>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Receipt} title={t('لا توجد فواتير')} /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-400 border-b border-slate-100">
                <th className="pb-3 font-medium">{t('رقم الفاتورة')}</th>
                <th className="pb-3 font-medium">{t('الشركة')}</th>
                <th className="pb-3 font-medium">{t('الباقة')}</th>
                <th className="pb-3 font-medium">{t('الفترة')}</th>
                <th className="pb-3 font-medium">{t('المبلغ')}</th>
                <th className="pb-3 font-medium">{t('الاستحقاق')}</th>
                <th className="pb-3 font-medium">{t('الحالة')}</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-3 font-medium text-slate-700">{inv.invoice_number}</td>
                  <td className="py-3 text-slate-600">{inv.company_name}</td>
                  <td className="py-3 text-slate-500">{t(inv.plan)}</td>
                  <td className="py-3 text-slate-500">{inv.period || '—'}</td>
                  <td className="py-3 font-bold text-slate-800">{formatCurrency(inv.amount)}</td>
                  <td className="py-3 text-slate-500">{formatDate(inv.due_date)}</td>
                  <td className="py-3"><Badge status={inv.status}>{t(inv.status)}</Badge></td>
                  <td className="py-3">
                    <div className="flex gap-1 justify-end items-center relative">
                      {inv.status !== 'مدفوعة' && inv.status !== 'ملغاة' && (
                        <button onClick={() => setStatus.mutate({ id: inv.id, status: 'مدفوعة' })} className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t('تحصيل')}</button>
                      )}
                      <button onClick={() => setMenuId(menuId === inv.id ? null : inv.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><MoreVertical className="w-4 h-4" /></button>
                      {menuId === inv.id && (
                        <div className="absolute left-0 top-8 z-10 bg-white rounded-xl shadow-lg border border-slate-100 py-1 w-40 text-right">
                          {inv.status !== 'متأخرة' && <button onClick={() => setStatus.mutate({ id: inv.id, status: 'متأخرة' })} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> {t('وضع كمتأخرة')}</button>}
                          {inv.status !== 'ملغاة' && <button onClick={() => setStatus.mutate({ id: inv.id, status: 'ملغاة' })} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Ban className="w-4 h-4 text-slate-400" /> {t('إلغاء الفاتورة')}</button>}
                          <button onClick={() => { setMenuId(null); window.confirm(t('حذف الفاتورة؟')) && del.mutate(inv.id) }} className="w-full px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"><Trash2 className="w-4 h-4" /> {t('حذف')}</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateForm open={showCreate} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
