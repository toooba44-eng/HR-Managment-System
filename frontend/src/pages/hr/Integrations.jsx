import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Plug, Plus, Trash2, RefreshCw, Link2, Check, Cable, AlertTriangle, MessageSquare, HardDrive, Calculator, Briefcase, Calendar, KeyRound, Package, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { integrationsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate, formatDateTime } from '../../lib/utils'

const CATEGORIES = ['تواصل', 'تخزين', 'محاسبة', 'توظيف', 'تقويم', 'مصادقة', 'أخرى']
const CAT_ICON = { تواصل: MessageSquare, تخزين: HardDrive, محاسبة: Calculator, توظيف: Briefcase, تقويم: Calendar, مصادقة: KeyRound, أخرى: Package }
const CAT_TONE = { تواصل: 'bg-blue-50 text-blue-600', تخزين: 'bg-violet-50 text-violet-600', محاسبة: 'bg-emerald-50 text-emerald-600', توظيف: 'bg-amber-50 text-amber-600', تقويم: 'bg-cyan-50 text-cyan-600', مصادقة: 'bg-rose-50 text-rose-600', أخرى: 'bg-slate-100 text-slate-500' }

function CreateForm({ open, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', provider: '', category: 'أخرى', description: '' })
  const m = useMutation((d) => integrationsApi.create(d), {
    onSuccess: () => { toast.success(t('تمت الإضافة')); qc.invalidateQueries('integrations'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={t('تكامل جديد')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label={t('اسم التكامل')} required><Input value={form.name} onChange={set('name')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('المزوّد')}><Input value={form.provider} onChange={set('provider')} /></Field>
          <Field label={t('الفئة')}><Select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}</Select></Field>
        </div>
        <Field label={t('الوصف')}><Input value={form.description} onChange={set('description')} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('إضافة')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function SyncHistoryModal({ integration, onClose }) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery(['integration-syncs', integration?.id], () => integrationsApi.syncs(integration.id), { enabled: !!integration })
  const syncs = data?.syncs || []
  return (
    <Modal open={!!integration} onClose={onClose} title={t('سجل مزامنة {{name}}', { name: integration?.name || '' })}>
      {isLoading ? (
        <div className="py-8"><Spinner /></div>
      ) : syncs.length === 0 ? (
        <EmptyState icon={History} title={t('لا توجد عمليات مزامنة بعد')} />
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {syncs.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className={`badge ${s.status === 'نجاح' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{t(s.status)}</span>
                <span className="text-xs text-slate-400">{formatDateTime(s.created_at)}</span>
              </div>
              <p className="text-slate-600 mt-1.5">{s.summary}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default function Integrations() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [cat, setCat] = useState('')
  const [historyItem, setHistoryItem] = useState(null)
  const { data, isLoading } = useQuery(['integrations', cat], () => integrationsApi.list(cat ? { category: cat } : {}))
  const conn = useMutation(({ id, connect }) => integrationsApi.setConnection(id, connect), {
    onSuccess: (_, v) => { toast.success(v.connect ? t('تم الربط') : t('تم الفصل')); qc.invalidateQueries('integrations') },
    onError: () => toast.error(t('فشل')),
  })
  const sync = useMutation((id) => integrationsApi.sync(id), {
    onSuccess: (data) => { toast.success(data.summary || t('تمت المزامنة')); qc.invalidateQueries('integrations') },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل')),
  })
  const del = useMutation((id) => integrationsApi.remove(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('integrations') }, onError: () => toast.error(t('فشل')),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.integrations || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Cable} label={t('إجمالي التكاملات')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={Check} label={t('مربوطة')} value={s.connected ?? 0} tone="green" />
        <StatCard icon={AlertTriangle} label={t('أخطاء')} value={s.errors ?? 0} tone="rose" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="max-w-[200px]">
          <option value="">{t('كل الفئات')}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
        </Select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> {t('تكامل جديد')}</Button>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Plug} title={t('لا توجد تكاملات')} /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => {
            const Icon = CAT_ICON[it.category] || Package
            return (
              <div key={it.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${CAT_TONE[it.category] || CAT_TONE.أخرى}`}><Icon className="w-5 h-5" /></div>
                    <div>
                      <p className="font-bold text-slate-800">{it.name}</p>
                      <p className="text-[11px] text-slate-400">{it.provider}</p>
                    </div>
                  </div>
                  <Badge status={it.status}>{t(it.status)}</Badge>
                </div>
                {it.description && <p className="text-sm text-slate-500 mt-3 leading-relaxed">{it.description}</p>}
                {it.last_sync && (
                  <div className="mt-2">
                    <p className="text-[11px] text-slate-400">{t('آخر مزامنة: {{date}}', { date: formatDate(it.last_sync) })}</p>
                    {it.last_sync_summary && <p className="text-[11px] text-slate-500 mt-0.5">{it.last_sync_summary}</p>}
                  </div>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                  {it.is_connected ? (
                    <>
                      <button onClick={() => sync.mutate(it.id)} className="flex-1 text-sm px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center gap-1"><RefreshCw className="w-4 h-4" /> {t('مزامنة')}</button>
                      <button onClick={() => conn.mutate({ id: it.id, connect: false })} className="flex-1 text-sm px-3 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1">{t('فصل')}</button>
                    </>
                  ) : (
                    <button onClick={() => conn.mutate({ id: it.id, connect: true })} className="flex-1 text-sm px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center gap-1"><Link2 className="w-4 h-4" /> {t('ربط')}</button>
                  )}
                  <button onClick={() => setHistoryItem(it)} className="w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-blue-500" title={t('سجل المزامنة')}><History className="w-4 h-4" /></button>
                  <button onClick={() => window.confirm(t('حذف التكامل؟')) && del.mutate(it.id)} className="w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <CreateForm open={showCreate} onClose={() => setShowCreate(false)} />}
      <SyncHistoryModal integration={historyItem} onClose={() => setHistoryItem(null)} />
    </div>
  )
}
