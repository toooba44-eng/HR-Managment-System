import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Package, Plus, Pencil, Trash2, UserCheck, UserX, History, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetsApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate, formatDateTime } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'super_admin']
const CONDITIONS = ['ممتازة', 'جيدة', 'متوسطة', 'تالفة']
const ACTION_TONE = { تخصيص: 'bg-blue-50 text-blue-600', إرجاع: 'bg-slate-100 text-slate-600', صيانة: 'bg-amber-50 text-amber-600', إتلاف: 'bg-rose-50 text-rose-600' }

function AssetForm({ open, onClose, editing }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState(editing || { name: '', category: 'أجهزة حاسب', serial_number: '', notes: '' })
  const mutation = useMutation(
    (data) => (editing ? assetsApi.update(editing.id, data) : assetsApi.create(data)),
    { onSuccess: () => { toast.success(editing ? t('تم التحديث') : t('تمت الإضافة')); qc.invalidateQueries('assets'); onClose() }, onError: () => toast.error(t('فشلت العملية')) }
  )
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={editing ? t('تعديل أصل') : t('إضافة أصل')}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label={t('اسم الأصل')} required><Input value={form.name} onChange={set('name')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('التصنيف')}><Input value={form.category} onChange={set('category')} placeholder={t('أجهزة حاسب، جوال...')} /></Field>
          <Field label={t('الرقم التسلسلي')}><Input value={form.serial_number} onChange={set('serial_number')} /></Field>
        </div>
        <Field label={t('ملاحظات')}><Textarea value={form.notes} onChange={set('notes')} rows={2} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={mutation.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function AssignModal({ asset, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-for-assets', () => employeesApi.list({ limit: 100 }))
  const [empId, setEmpId] = useState('')
  const [returnCondition, setReturnCondition] = useState('جيدة')
  const [historyNotes, setHistoryNotes] = useState('')
  const mutation = useMutation((body) => assetsApi.update(asset.id, body), {
    onSuccess: () => { toast.success(t('تم تحديث التخصيص')); qc.invalidateQueries('assets'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل التخصيص')),
  })
  const employees = emps?.employees || []
  return (
    <Modal open={!!asset} onClose={onClose} title={t('تخصيص: {{name}}', { name: asset.name })}>
      <div className="space-y-4">
        <Field label={t('الموظف')}>
          <Select value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">{t('اختر موظفاً')}</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        {asset.assigned_to_name && (
          <Field label={t('حالة الأصل عند الإرجاع')}>
            <Select value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{t(c, { context: 'condition' })}</option>)}
            </Select>
          </Field>
        )}
        <Field label={t('ملاحظات')}><Input value={historyNotes} onChange={(e) => setHistoryNotes(e.target.value)} /></Field>
        <div className="flex justify-between gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => mutation.mutate({ assigned_to: null, return_condition: returnCondition, history_notes: historyNotes })} className="text-rose-500 border-rose-200">
            <UserX className="w-4 h-4" /> {t('إلغاء التخصيص')}
          </Button>
          <Button onClick={() => empId && mutation.mutate({ assigned_to: Number(empId), history_notes: historyNotes })} loading={mutation.isLoading}>
            <UserCheck className="w-4 h-4" /> {t('تخصيص')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AddHistoryForm({ assetId, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ action: 'صيانة', condition: '', notes: '' })
  const m = useMutation(() => assetsApi.addHistory(assetId, { ...form, condition: form.condition || null }), {
    onSuccess: () => { toast.success(t('تمت الإضافة')); qc.invalidateQueries(['asset-history', assetId]); qc.invalidateQueries('assets'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate() }} className="space-y-3 rounded-xl border border-dashed border-slate-200 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('الإجراء')}>
          <Select value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}>
            <option value="صيانة">{t('صيانة', { context: 'action' })}</option>
            <option value="إتلاف">{t('إتلاف')}</option>
          </Select>
        </Field>
        <Field label={t('الحالة (اختياري)')}>
          <Select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}>
            <option value="">{t('— بدون —')}</option>
            {CONDITIONS.map((c) => <option key={c} value={c}>{t(c, { context: 'condition' })}</option>)}
          </Select>
        </Field>
      </div>
      <Field label={t('ملاحظات')}><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} /></Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
        <Button type="submit" loading={m.isLoading}>{t('إضافة')}</Button>
      </div>
    </form>
  )
}

function HistoryModal({ asset, canManage, onClose }) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const { data = [], isLoading } = useQuery(['asset-history', asset.id], () => assetsApi.history(asset.id))
  return (
    <Modal open onClose={onClose} title={t('سجل العهدة والصيانة — {{name}}', { name: asset.name })}>
      <div className="space-y-4">
        {isLoading ? <Spinner /> : data.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">{t('لا يوجد سجل بعد.')}</p>
        ) : (
          <div className="space-y-2">
            {data.map((h) => (
              <div key={h.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                <span className={`badge ${ACTION_TONE[h.action] || 'bg-slate-100 text-slate-600'} shrink-0`}>{t(h.action, { context: 'action' })}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    {h.employee_name ? h.employee_name : t('بدون موظف')}{h.condition ? ` · ${t('الحالة: {{condition}}', { condition: t(h.condition, { context: 'condition' }) })}` : ''}
                  </p>
                  {h.notes && <p className="text-xs text-slate-500 mt-0.5">{h.notes}</p>}
                  <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(h.created_at)}{h.performed_by_name ? ` · ${t('بواسطة {{name}}', { name: h.performed_by_name })}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {canManage && (
          adding ? (
            <AddHistoryForm assetId={asset.id} onClose={() => setAdding(false)} />
          ) : (
            <button onClick={() => setAdding(true)} className="w-full text-sm py-2 rounded-xl border border-dashed border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1.5">
              <Wrench className="w-4 h-4" /> {t('إضافة حدث صيانة/إتلاف')}
            </button>
          )
        )}
      </div>
    </Modal>
  )
}

export default function Assets() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [assigning, setAssigning] = useState(null)
  const [viewingHistory, setViewingHistory] = useState(null)

  const { data, isLoading } = useQuery('assets', () => assetsApi.list())
  const removeMutation = useMutation((id) => assetsApi.remove(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('assets') },
    onError: () => toast.error(t('فشل الحذف')),
  })

  if (isLoading) return <Spinner fullscreen />
  const assets = data?.assets || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label={t('إجمالي الأصول')} value={s.total ?? 0} tone="violet" />
        <StatCard icon={UserCheck} label={t('مُخصّصة')} value={s.assigned ?? 0} tone="blue" />
        <StatCard icon={Package} label={t('متاحة')} value={s.available ?? 0} tone="green" />
        <StatCard icon={Package} label={t('صيانة', { context: 'action' })} value={s.maintenance ?? 0} tone="amber" />
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="w-5 h-5" /> {t('إضافة أصل')}</Button>
        </div>
      )}

      {assets.length === 0 ? (
        <div className="card"><EmptyState icon={Package} title={t('لا توجد أصول')} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {assets.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Package className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800 truncate">{a.name}</h3><Badge status={a.status}>{t(a.status)}</Badge></div>
                    <p className="text-xs text-slate-400 mt-0.5">{a.category}{a.serial_number ? ` · ${a.serial_number}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setViewingHistory(a)} className="relative w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600" title={t('السجل')}>
                    <History className="w-4 h-4" />
                    {a.history_count > 0 && <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-primary-500 text-white text-[9px] flex items-center justify-center">{a.history_count}</span>}
                  </button>
                  {canManage && (
                    <>
                      <button onClick={() => setAssigning(a)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600" title={t('تخصيص')}><UserCheck className="w-4 h-4" /></button>
                      <button onClick={() => { setEditing(a); setShowForm(true) }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => window.confirm(t('حذف الأصل؟')) && removeMutation.mutate(a.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>{a.assigned_to_name ? t('بعهدة: {{name}}', { name: a.assigned_to_name }) : t('غير مخصّص')}</span>
                {a.assigned_date && <span>{t('منذ {{date}}', { date: formatDate(a.assigned_date) })}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <AssetForm open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
      {assigning && <AssignModal asset={assigning} onClose={() => setAssigning(null)} />}
      {viewingHistory && <HistoryModal asset={viewingHistory} canManage={canManage} onClose={() => setViewingHistory(null)} />}
    </div>
  )
}
