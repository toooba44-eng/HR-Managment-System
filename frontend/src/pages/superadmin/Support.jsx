import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { LifeBuoy, Plus, Trash2, Inbox, Loader, CheckCircle2, MoreVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { saConfigApi, companiesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import Modal from '../../components/ui/Modal'
import { Field, Input, Select, Button } from '../../components/ui/Form'

const PRIORITIES = ['منخفضة', 'متوسطة', 'عالية', 'حرجة']
const PRIO_TONE = { منخفضة: 'bg-slate-100 text-slate-600', متوسطة: 'bg-blue-50 text-blue-700', عالية: 'bg-amber-50 text-amber-700', حرجة: 'bg-rose-50 text-rose-700' }
const NEXT_STATUS = { مفتوحة: 'قيد المعالجة', 'قيد المعالجة': 'مغلقة' }

function CreateModal({ onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: companiesData } = useQuery('companies', companiesApi.list)
  const [form, setForm] = useState({ company_id: '', subject: '', category: 'عام', priority: 'متوسطة', description: '' })
  const m = useMutation((d) => saConfigApi.createTicket(d), {
    onSuccess: () => { toast.success(t('تم إنشاء التذكرة')); qc.invalidateQueries('support'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title={t('تذكرة دعم جديدة')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label={t('المؤسسة')}>
          <Select value={form.company_id} onChange={set('company_id')}>
            <option value="">—</option>
            {(companiesData?.companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={t('الموضوع')} required><Input value={form.subject} onChange={set('subject')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('التصنيف')}><Input value={form.category} onChange={set('category')} /></Field>
          <Field label={t('الأولوية')}><Select value={form.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{t(p)}</option>)}</Select></Field>
        </div>
        <Field label={t('الوصف')}><Input value={form.description} onChange={set('description')} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('إنشاء')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Support() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [menuId, setMenuId] = useState(null)
  const { data, isLoading } = useQuery('support', () => saConfigApi.support())
  const setStatus = useMutation(({ id, status }) => saConfigApi.updateTicket(id, { status }), {
    onSuccess: () => { toast.success(t('تم التحديث')); qc.invalidateQueries('support'); setMenuId(null) }, onError: () => toast.error(t('فشل')),
  })
  const del = useMutation((id) => saConfigApi.removeTicket(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('support') }, onError: () => toast.error(t('فشل')),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.tickets || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Inbox} label={t('إجمالي التذاكر')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={LifeBuoy} label={t('مفتوحة')} value={s.open ?? 0} tone="amber" />
        <StatCard icon={Loader} label={t('قيد المعالجة')} value={s.inProgress ?? 0} tone="violet" />
      </div>

      <div className="flex justify-end"><Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> {t('تذكرة جديدة')}</Button></div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={LifeBuoy} title={t('لا توجد تذاكر دعم')} /></div>
      ) : (
        <div className="space-y-3">
          {items.map((tk) => (
            <div key={tk.id} className="card flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800">{tk.subject}</p>
                  <span className={`badge ${PRIO_TONE[tk.priority] || 'bg-slate-100 text-slate-600'}`}>{t(tk.priority)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{tk.company_name || '—'} · {tk.category}{tk.description ? ` · ${tk.description}` : ''}</p>
              </div>
              <Badge status={tk.status}>{t(tk.status)}</Badge>
              <div className="relative">
                <button onClick={() => setMenuId(menuId === tk.id ? null : tk.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><MoreVertical className="w-4 h-4" /></button>
                {menuId === tk.id && (
                  <div className="absolute left-0 top-9 z-10 bg-white rounded-xl shadow-lg border border-slate-100 py-1 w-44 text-right">
                    {NEXT_STATUS[tk.status] && <button onClick={() => setStatus.mutate({ id: tk.id, status: NEXT_STATUS[tk.status] })} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t('نقل إلى: {{status}}', { status: t(NEXT_STATUS[tk.status]) })}</button>}
                    {tk.status !== 'مفتوحة' && <button onClick={() => setStatus.mutate({ id: tk.id, status: 'مفتوحة' })} className="w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">{t('إعادة فتح')}</button>}
                    <button onClick={() => { setMenuId(null); window.confirm(t('حذف التذكرة؟')) && del.mutate(tk.id) }} className="w-full px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"><Trash2 className="w-4 h-4" /> {t('حذف')}</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
