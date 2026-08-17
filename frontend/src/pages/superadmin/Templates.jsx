import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { FileText, Plus, Trash2, Pencil, Mail, MessageSquare, FileCheck, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { saConfigApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { Field, Input, Select, Button } from '../../components/ui/Form'

const TYPES = ['بريد', 'رسالة نصية', 'مستند', 'إشعار']
const TYPE_ICON = { بريد: Mail, 'رسالة نصية': MessageSquare, مستند: FileCheck, إشعار: Bell }
const TYPE_TONE = { بريد: 'bg-blue-50 text-blue-600', 'رسالة نصية': 'bg-emerald-50 text-emerald-600', مستند: 'bg-violet-50 text-violet-600', إشعار: 'bg-amber-50 text-amber-600' }

function Form({ editing, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState(() => editing || { name: '', type: 'بريد', subject: '', body: '' })
  const m = useMutation((d) => (editing ? saConfigApi.updateTemplate(editing.id, d) : saConfigApi.createTemplate(d)), {
    onSuccess: () => { toast.success(editing ? t('تم التحديث') : t('تمت الإضافة')); qc.invalidateQueries('templates'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title={editing ? t('تعديل القالب') : t('قالب جديد')} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('اسم القالب')} required><Input value={form.name} onChange={set('name')} required /></Field>
          <Field label={t('النوع')}><Select value={form.type} onChange={set('type')}>{TYPES.map((ty) => <option key={ty} value={ty}>{t(ty)}</option>)}</Select></Field>
        </div>
        <Field label={t('العنوان', { context: 'template' })}><Input value={form.subject || ''} onChange={set('subject')} /></Field>
        <Field label={t('المحتوى')}>
          <textarea value={form.body || ''} onChange={set('body')} rows={5} className="input-field w-full" placeholder={t('استخدم {{name}}, {{company}}, {{date}} كمتغيّرات', { name: '{{name}}', company: '{{company}}', date: '{{date}}' })} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Templates() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const { data, isLoading } = useQuery(['templates', typeFilter], () => saConfigApi.templates(typeFilter ? { type: typeFilter } : {}))
  const toggle = useMutation(({ id, enabled }) => saConfigApi.updateTemplate(id, { enabled }), {
    onSuccess: () => qc.invalidateQueries('templates'), onError: () => toast.error(t('فشل')),
  })
  const del = useMutation((id) => saConfigApi.removeTemplate(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('templates') }, onError: () => toast.error(t('فشل')),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.templates || []
  const openNew = () => { setEditing(null); setForm(true) }
  const openEdit = (tpl) => { setEditing(tpl); setForm(true) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="max-w-[200px]">
          <option value="">{t('كل الأنواع')}</option>
          {TYPES.map((ty) => <option key={ty} value={ty}>{t(ty)}</option>)}
        </Select>
        <Button onClick={openNew}><Plus className="w-5 h-5" /> {t('قالب جديد')}</Button>
      </div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={FileText} title={t('لا توجد قوالب')} /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((tpl) => {
            const Icon = TYPE_ICON[tpl.type] || FileText
            return (
              <div key={tpl.id} className={`card ${!tpl.enabled ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TYPE_TONE[tpl.type] || 'bg-slate-100 text-slate-500'}`}><Icon className="w-5 h-5" /></div>
                    <div>
                      <p className="font-bold text-slate-800">{tpl.name}</p>
                      <span className="badge bg-slate-100 text-slate-600">{t(tpl.type)}</span>
                    </div>
                  </div>
                  <button onClick={() => toggle.mutate({ id: tpl.id, enabled: !tpl.enabled })} className={`relative w-11 h-6 rounded-full transition-colors ${tpl.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${tpl.enabled ? 'right-0.5' : 'right-[22px]'}`} />
                  </button>
                </div>
                {tpl.subject && <p className="text-sm font-medium text-slate-600 mt-3">{tpl.subject}</p>}
                {tpl.body && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{tpl.body}</p>}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                  <Button variant="secondary" onClick={() => openEdit(tpl)} className="flex-1"><Pencil className="w-4 h-4" /> {t('تعديل')}</Button>
                  <button onClick={() => window.confirm(t('حذف القالب؟')) && del.mutate(tpl.id)} className="w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form && <Form editing={editing} onClose={() => setForm(false)} />}
    </div>
  )
}
