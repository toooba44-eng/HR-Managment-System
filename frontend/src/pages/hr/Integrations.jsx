import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Plug, Plus, Trash2, RefreshCw, Link2, Check, Cable, AlertTriangle, MessageSquare, HardDrive, Calculator, Briefcase, Calendar, KeyRound, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { integrationsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const CATEGORIES = ['تواصل', 'تخزين', 'محاسبة', 'توظيف', 'تقويم', 'مصادقة', 'أخرى']
const CAT_ICON = { تواصل: MessageSquare, تخزين: HardDrive, محاسبة: Calculator, توظيف: Briefcase, تقويم: Calendar, مصادقة: KeyRound, أخرى: Package }
const CAT_TONE = { تواصل: 'bg-blue-50 text-blue-600', تخزين: 'bg-violet-50 text-violet-600', محاسبة: 'bg-emerald-50 text-emerald-600', توظيف: 'bg-amber-50 text-amber-600', تقويم: 'bg-cyan-50 text-cyan-600', مصادقة: 'bg-rose-50 text-rose-600', أخرى: 'bg-slate-100 text-slate-500' }

function CreateForm({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', provider: '', category: 'أخرى', description: '' })
  const m = useMutation((d) => integrationsApi.create(d), {
    onSuccess: () => { toast.success('تمت الإضافة'); qc.invalidateQueries('integrations'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="تكامل جديد">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="اسم التكامل" required><Input value={form.name} onChange={set('name')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المزوّد"><Input value={form.provider} onChange={set('provider')} /></Field>
          <Field label="الفئة"><Select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        </div>
        <Field label="الوصف"><Input value={form.description} onChange={set('description')} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>إضافة</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Integrations() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [cat, setCat] = useState('')
  const { data, isLoading } = useQuery(['integrations', cat], () => integrationsApi.list(cat ? { category: cat } : {}))
  const conn = useMutation(({ id, connect }) => integrationsApi.setConnection(id, connect), {
    onSuccess: (_, v) => { toast.success(v.connect ? 'تم الربط' : 'تم الفصل'); qc.invalidateQueries('integrations') },
    onError: () => toast.error('فشل'),
  })
  const sync = useMutation((id) => integrationsApi.sync(id), {
    onSuccess: () => { toast.success('تمت المزامنة'); qc.invalidateQueries('integrations') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل'),
  })
  const del = useMutation((id) => integrationsApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('integrations') }, onError: () => toast.error('فشل'),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.integrations || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Cable} label="إجمالي التكاملات" value={s.total ?? 0} tone="blue" />
        <StatCard icon={Check} label="مربوطة" value={s.connected ?? 0} tone="green" />
        <StatCard icon={AlertTriangle} label="أخطاء" value={s.errors ?? 0} tone="rose" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="max-w-[200px]">
          <option value="">كل الفئات</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> تكامل جديد</Button>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Plug} title="لا توجد تكاملات" /></div>
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
                  <Badge status={it.status} />
                </div>
                {it.description && <p className="text-sm text-slate-500 mt-3 leading-relaxed">{it.description}</p>}
                {it.last_sync && <p className="text-[11px] text-slate-400 mt-2">آخر مزامنة: {formatDate(it.last_sync)}</p>}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                  {it.is_connected ? (
                    <>
                      <button onClick={() => sync.mutate(it.id)} className="flex-1 text-sm px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center gap-1"><RefreshCw className="w-4 h-4" /> مزامنة</button>
                      <button onClick={() => conn.mutate({ id: it.id, connect: false })} className="flex-1 text-sm px-3 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1">فصل</button>
                    </>
                  ) : (
                    <button onClick={() => conn.mutate({ id: it.id, connect: true })} className="flex-1 text-sm px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center gap-1"><Link2 className="w-4 h-4" /> ربط</button>
                  )}
                  <button onClick={() => window.confirm('حذف التكامل؟') && del.mutate(it.id)} className="w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <CreateForm open={showCreate} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
