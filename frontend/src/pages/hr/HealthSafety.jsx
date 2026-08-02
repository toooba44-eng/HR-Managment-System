import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ShieldPlus, Plus, Trash2, Flag, MapPin, Calendar, AlertOctagon, ClipboardList, CheckCircle2, Circle } from 'lucide-react'
import toast from 'react-hot-toast'
import { incidentsApi, employeesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const TYPES = ['حادث', 'إصابة', 'ملاحظة سلامة', 'فحص طبي']
const STATUSES = ['مفتوح', 'قيد المعالجة', 'مغلق']
const SEV_TONE = { عالية: 'text-rose-600 bg-rose-50', متوسطة: 'text-amber-600 bg-amber-50', منخفضة: 'text-slate-500 bg-slate-100' }

function Form({ open, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState({ title: '', type: 'ملاحظة سلامة', employee_id: '', location: '', severity: 'متوسطة', description: '', incident_date: '' })
  const m = useMutation((d) => incidentsApi.create({ ...d, employee_id: d.employee_id ? Number(d.employee_id) : null }), {
    onSuccess: () => { toast.success('تم التسجيل'); qc.invalidateQueries('incidents'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="تسجيل بلاغ سلامة">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="العنوان" required><Input value={form.title} onChange={set('title')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="النوع"><Select value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="الخطورة"><Select value={form.severity} onChange={set('severity')}><option>منخفضة</option><option>متوسطة</option><option>عالية</option></Select></Field>
          <Field label="الموقع"><Input value={form.location} onChange={set('location')} /></Field>
          <Field label="التاريخ"><Input type="date" value={form.incident_date} onChange={set('incident_date')} /></Field>
        </div>
        <Field label="الموظف المعني (اختياري)">
          <Select value={form.employee_id} onChange={set('employee_id')}>
            <option value="">— بدون —</option>
            {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <Field label="التفاصيل"><Textarea value={form.description} onChange={set('description')} rows={3} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddActionForm({ incident, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }))
  const [form, setForm] = useState({ description: '', owner_id: '', due_date: '' })
  const m = useMutation((d) => incidentsApi.createAction(incident.id, { ...d, owner_id: d.owner_id ? Number(d.owner_id) : null }), {
    onSuccess: () => { toast.success('تمت الإضافة'); qc.invalidateQueries(['incident-actions', incident.id]); qc.invalidateQueries('incidents'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-3 rounded-xl border border-dashed border-slate-200 p-3">
      <Field label="الإجراء التصحيحي / الوقائي" required><Textarea value={form.description} onChange={set('description')} rows={2} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="المسؤول">
          <Select value={form.owner_id} onChange={set('owner_id')}>
            <option value="">— بدون —</option>
            {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <Field label="تاريخ الاستحقاق"><Input type="date" value={form.due_date} onChange={set('due_date')} /></Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button type="submit" loading={m.isLoading}>إضافة</Button>
      </div>
    </form>
  )
}

function ActionsModal({ incident, onClose }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const { data: actions = [], isLoading } = useQuery(['incident-actions', incident.id], () => incidentsApi.actions(incident.id))
  const toggle = useMutation(({ id, status }) => incidentsApi.updateAction(id, { status }), {
    onSuccess: () => { qc.invalidateQueries(['incident-actions', incident.id]); qc.invalidateQueries('incidents') },
    onError: () => toast.error('فشل التحديث'),
  })
  const remove = useMutation((id) => incidentsApi.removeAction(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries(['incident-actions', incident.id]); qc.invalidateQueries('incidents') },
    onError: () => toast.error('فشل الحذف'),
  })

  return (
    <Modal open onClose={onClose} title={`الإجراءات التصحيحية — ${incident.title}`}>
      <div className="space-y-4">
        {isLoading ? <Spinner /> : actions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">لا توجد إجراءات بعد.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                <button onClick={() => toggle.mutate({ id: a.id, status: a.status === 'مكتمل' ? 'مفتوح' : 'مكتمل' })}
                  className={a.status === 'مكتمل' ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}>
                  {a.status === 'مكتمل' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${a.status === 'مكتمل' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{a.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                    {a.owner_name && <span className="flex items-center gap-1"><Avatar name={a.owner_name} src={a.owner_picture} size="sm" /> {a.owner_name}</span>}
                    {a.due_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(a.due_date)}</span>}
                    {a.completed_at && <span className="text-emerald-500">أُنجز {formatDate(a.completed_at)}</span>}
                  </div>
                </div>
                <button onClick={() => window.confirm('حذف الإجراء؟') && remove.mutate(a.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}

        {adding ? (
          <AddActionForm incident={incident} onClose={() => setAdding(false)} />
        ) : (
          <button onClick={() => setAdding(true)} className="w-full text-sm py-2 rounded-xl border border-dashed border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> إضافة إجراء تصحيحي
          </button>
        )}
      </div>
    </Modal>
  )
}

export default function HealthSafety() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [viewingActions, setViewingActions] = useState(null)
  const { data, isLoading } = useQuery('incidents', incidentsApi.list)
  const upd = useMutation(({ id, status }) => incidentsApi.update(id, { status }), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries('incidents') },
    onError: () => toast.error('فشل التحديث'),
  })
  const del = useMutation((id) => incidentsApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('incidents') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.incidents || []
  const s = data?.summary || {}
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShieldPlus} label="الإجمالي" value={s.total ?? 0} tone="blue" />
        <StatCard icon={AlertOctagon} label="مفتوحة" value={s.open ?? 0} tone="amber" />
        <StatCard icon={Flag} label="خطورة عالية" value={s.high ?? 0} tone="rose" />
        <StatCard icon={ClipboardList} label="إجراءات مفتوحة" value={s.openActions ?? 0} tone="violet" />
      </div>
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> بلاغ جديد</Button></div>
      {items.length === 0 ? (
        <div className="card"><EmptyState icon={ShieldPlus} title="لا توجد بلاغات" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{i.title}</h3>
                    <span className="badge bg-slate-100 text-slate-600">{i.type}</span>
                    <span className={`badge ${SEV_TONE[i.severity]} inline-flex items-center gap-1`}><Flag className="w-3 h-3" /> {i.severity}</span>
                    <Badge status={i.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                    {i.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {i.location}</span>}
                    {i.incident_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(i.incident_date)}</span>}
                    {i.full_name && <span>الموظف: {i.full_name}</span>}
                  </div>
                  {i.description && <p className="text-sm text-slate-600 mt-2">{i.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setViewingActions(i)} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${i.open_actions_count > 0 ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <ClipboardList className="w-3.5 h-3.5" /> إجراءات {i.actions_count > 0 ? `(${i.actions_count})` : ''}
                  </button>
                  <Select value={i.status} onChange={(e) => upd.mutate({ id: i.id, status: e.target.value })} className="text-xs py-1.5 px-2 w-32">
                    {STATUSES.map((st) => <option key={st}>{st}</option>)}
                  </Select>
                  <button onClick={() => window.confirm('حذف البلاغ؟') && del.mutate(i.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Form open={showForm} onClose={() => setShowForm(false)} />
      {viewingActions && <ActionsModal incident={viewingActions} onClose={() => setViewingActions(null)} />}
    </div>
  )
}
