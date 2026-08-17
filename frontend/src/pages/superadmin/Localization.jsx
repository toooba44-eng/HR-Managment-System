import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Flag, Coins, Languages, Plus, Trash2, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { saConfigApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { Field, Input, Select, Button } from '../../components/ui/Form'

const SECTIONS = [
  { type: 'دولة', label: 'الدول', icon: Flag },
  { type: 'عملة', label: 'العملات', icon: Coins },
  { type: 'لغة', label: 'اللغات', icon: Languages },
]

function AddModal({ onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: 'دولة', name: '', code: '' })
  const m = useMutation((d) => saConfigApi.createLocale(d), {
    onSuccess: () => { toast.success(t('تمت الإضافة')); qc.invalidateQueries('locales'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title={t('إضافة عنصر تعريب')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label={t('النوع')}><Select value={form.type} onChange={set('type')}>{SECTIONS.map((s) => <option key={s.type} value={s.type}>{t(s.type)}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('الاسم')} required><Input value={form.name} onChange={set('name')} required /></Field>
          <Field label={t('الرمز')}><Input value={form.code} onChange={set('code')} placeholder="SA / SAR / ar" /></Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('إضافة')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Localization() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [add, setAdd] = useState(false)
  const { data, isLoading } = useQuery('locales', () => saConfigApi.locales())
  const upd = useMutation(({ id, ...rest }) => saConfigApi.updateLocale(id, rest), {
    onSuccess: () => qc.invalidateQueries('locales'), onError: () => toast.error(t('فشل')),
  })
  const del = useMutation((id) => saConfigApi.removeLocale(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('locales') }, onError: () => toast.error(t('فشل')),
  })

  if (isLoading) return <Spinner fullscreen />
  const grouped = data?.grouped || {}

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button onClick={() => setAdd(true)}><Plus className="w-5 h-5" /> {t('إضافة')}</Button></div>

      <div className="grid lg:grid-cols-3 gap-6">
        {SECTIONS.map((sec) => (
          <div key={sec.type} className="card">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><sec.icon className="w-5 h-5 text-slate-400" /> {t(sec.label)}</h3>
            <div className="space-y-1">
              {(grouped[sec.type] || []).map((l) => (
                <div key={l.id} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-1">{l.name}{l.is_default ? <Star className="w-3.5 h-3.5 text-amber-400 fill-current" /> : null}</p>
                    {l.code && <p className="text-[11px] text-slate-400">{l.code}</p>}
                  </div>
                  {!l.is_default && <button onClick={() => upd.mutate({ id: l.id, is_default: true })} className="text-[11px] text-slate-400 hover:text-amber-500" title={t('تعيين افتراضي')}><Star className="w-4 h-4" /></button>}
                  <button onClick={() => upd.mutate({ id: l.id, enabled: !l.enabled })} className={`relative w-9 h-5 rounded-full transition-colors ${l.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${l.enabled ? 'right-0.5' : 'right-[18px]'}`} />
                  </button>
                  {!l.is_default && <button onClick={() => window.confirm(t('حذف العنصر؟')) && del.mutate(l.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
              {(grouped[sec.type] || []).length === 0 && <p className="text-xs text-slate-400 text-center py-3">{t('لا توجد عناصر')}</p>}
            </div>
          </div>
        ))}
      </div>

      {add && <AddModal onClose={() => setAdd(false)} />}
    </div>
  )
}
