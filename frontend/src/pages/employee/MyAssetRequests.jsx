import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Package, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetRequestsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatCurrency, formatDate } from '../../lib/utils'

const CATEGORIES = ['أجهزة حاسب', 'أجهزة جوال', 'ملحقات', 'أجهزة مكتبية', 'أخرى']

function RequestForm({ open, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ item_name: '', category: 'أجهزة حاسب', justification: '', estimated_cost: '' })
  const m = useMutation(
    () => assetRequestsApi.create({ ...form, estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null }),
    {
      onSuccess: () => { toast.success(t('تم إرسال الطلب')); qc.invalidateQueries('my-asset-requests'); onClose() },
      onError: (e) => toast.error(e.response?.data?.error || t('فشل إرسال الطلب')),
    }
  )
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={t('طلب أصل جديد')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate() }} className="space-y-4">
        <Field label={t('العنصر المطلوب')} required>
          <Input value={form.item_name} onChange={set('item_name')} placeholder={t('مثال: لابتوب بمواصفات أعلى')} required />
        </Field>
        <Field label={t('التصنيف')}><Select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}</Select></Field>
        <Field label={t('التكلفة التقديرية')}><Input type="number" min="0" value={form.estimated_cost} onChange={set('estimated_cost')} /></Field>
        <Field label={t('المبرر')}><Textarea value={form.justification} onChange={set('justification')} rows={3} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('إرسال')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function MyAssetRequests() {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const { data, isLoading } = useQuery('my-asset-requests', () => assetRequestsApi.list())

  if (isLoading) return <Spinner fullscreen />
  const items = data?.requests || []

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> {t('طلب أصل جديد')}</Button>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Package} title={t('لا توجد طلبات')} description={t('قدّم طلبك الأول عبر زر «طلب أصل جديد».')} /></div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{r.item_name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t(r.category)} · {formatDate(r.created_at)}</p>
                </div>
                <Badge status={r.status}>{t(r.status, { context: 'asset' })}</Badge>
              </div>
              {r.justification && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{r.justification}</p>}
              {r.estimated_cost != null && <p className="text-xs text-slate-400 mt-2">{t('التكلفة التقديرية: {{amount}}', { amount: formatCurrency(r.estimated_cost) })}</p>}
            </div>
          ))}
        </div>
      )}

      <RequestForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
