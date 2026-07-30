import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Workflow, Plus, Trash2, Play, Zap, CheckCircle2, GitBranch, ListChecks, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { automationApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'

const TRIGGERS = ['طلب إجازة', 'طلب مصروف', 'تعيين موظف', 'إنهاء خدمة', 'طلب مستند', 'تقييم أداء', 'طلب عام']
const ACTIONS = ['موافقة', 'إشعار', 'إسناد مهمة', 'تحديث حالة']
const TRIGGER_TONE = {
  'طلب إجازة': 'bg-blue-50 text-blue-700', 'طلب مصروف': 'bg-emerald-50 text-emerald-700', 'تعيين موظف': 'bg-violet-50 text-violet-700',
  'إنهاء خدمة': 'bg-rose-50 text-rose-700', 'طلب مستند': 'bg-amber-50 text-amber-700', 'تقييم أداء': 'bg-cyan-50 text-cyan-700', 'طلب عام': 'bg-slate-100 text-slate-600',
}
const ACTION_TONE = { موافقة: 'bg-emerald-50 text-emerald-700', إشعار: 'bg-blue-50 text-blue-700', 'إسناد مهمة': 'bg-violet-50 text-violet-700', 'تحديث حالة': 'bg-amber-50 text-amber-700' }

function CreateForm({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', trigger_event: 'طلب إجازة', description: '' })
  const m = useMutation((d) => automationApi.create(d), {
    onSuccess: () => { toast.success('تم إنشاء المسار'); qc.invalidateQueries('automation'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="مسار عمل جديد">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="اسم المسار" required><Input value={form.name} onChange={set('name')} required /></Field>
        <Field label="الحدث المُشغّل"><Select value={form.trigger_event} onChange={set('trigger_event')}>{TRIGGERS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="الوصف"><Input value={form.description} onChange={set('description')} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>إنشاء</Button>
        </div>
      </form>
    </Modal>
  )
}

function DetailModal({ wfId, onClose }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery(['automation', wfId], () => automationApi.get(wfId), { enabled: !!wfId })
  const [step, setStep] = useState({ name: '', action_type: 'موافقة', assignee: 'المدير المباشر' })
  const invalidate = () => { qc.invalidateQueries(['automation', wfId]); qc.invalidateQueries('automation') }
  const addStep = useMutation((d) => automationApi.addStep(wfId, d), { onSuccess: () => { toast.success('تمت الإضافة'); setStep({ name: '', action_type: 'موافقة', assignee: 'المدير المباشر' }); invalidate() }, onError: () => toast.error('فشل') })
  const delStep = useMutation((id) => automationApi.removeStep(id), { onSuccess: () => { toast.success('تم الحذف'); invalidate() }, onError: () => toast.error('فشل') })

  return (
    <Modal open={!!wfId} onClose={onClose} title="خطوات المسار" size="lg">
      {isLoading || !data ? (
        <div className="py-12"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">{data.name}</p>
              <span className={`badge ${TRIGGER_TONE[data.trigger_event]} mt-1`}>عند: {data.trigger_event}</span>
            </div>
            <span className="text-xs text-slate-400">{data.runs_count} تنفيذ</span>
          </div>
          <div className="space-y-2">
            {data.steps.map((st, i) => (
              <div key={st.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{st.name}</p>
                  <p className="text-[11px] text-slate-400">المسؤول: {st.assignee}</p>
                </div>
                <span className={`badge ${ACTION_TONE[st.action_type] || 'bg-slate-100 text-slate-600'}`}>{st.action_type}</span>
                <button onClick={() => window.confirm('حذف الخطوة؟') && delStep.mutate(st.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {data.steps.length === 0 && <p className="text-sm text-slate-400 text-center py-4">لا توجد خطوات بعد</p>}
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-3">إضافة خطوة</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="اسم الخطوة"><Input value={step.name} onChange={(e) => setStep((s) => ({ ...s, name: e.target.value }))} /></Field>
              <Field label="نوع الإجراء"><Select value={step.action_type} onChange={(e) => setStep((s) => ({ ...s, action_type: e.target.value }))}>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</Select></Field>
              <Field label="المسؤول"><Input value={step.assignee} onChange={(e) => setStep((s) => ({ ...s, assignee: e.target.value }))} /></Field>
            </div>
            <div className="flex justify-end mt-3"><Button onClick={() => step.name && addStep.mutate(step)} loading={addStep.isLoading}><Plus className="w-4 h-4" /> إضافة</Button></div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Automation() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const { data, isLoading } = useQuery('automation', () => automationApi.list())
  const toggle = useMutation(({ id, is_active }) => automationApi.update(id, { is_active }), {
    onSuccess: () => { qc.invalidateQueries('automation') }, onError: () => toast.error('فشل'),
  })
  const run = useMutation((id) => automationApi.run(id), {
    onSuccess: (r) => { toast.success(`تم التنفيذ (${r.runs_count})`); qc.invalidateQueries('automation') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل'),
  })
  const del = useMutation((id) => automationApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('automation') }, onError: () => toast.error('فشل'),
  })

  if (isLoading) return <Spinner fullscreen />
  const workflows = data?.workflows || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={GitBranch} label="مسارات العمل" value={s.total ?? 0} tone="blue" />
        <StatCard icon={CheckCircle2} label="مفعّلة" value={s.active ?? 0} tone="green" />
        <StatCard icon={Zap} label="إجمالي التنفيذ" value={s.totalRuns ?? 0} tone="amber" />
      </div>

      <div className="flex justify-end"><Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> مسار عمل</Button></div>

      {workflows.length === 0 ? (
        <div className="card"><EmptyState icon={Workflow} title="لا توجد مسارات عمل" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workflows.map((w) => (
            <div key={w.id} className={`card ${!w.is_active ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Workflow className="w-5 h-5" /></div>
                  <div>
                    <p className="font-bold text-slate-800">{w.name}</p>
                    <span className={`badge ${TRIGGER_TONE[w.trigger_event]} mt-1`}>عند: {w.trigger_event}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggle.mutate({ id: w.id, is_active: !w.is_active })}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${w.is_active ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${w.is_active ? 'right-0.5' : 'right-[22px]'}`} />
                </button>
              </div>
              {w.description && <p className="text-sm text-slate-500 mt-3">{w.description}</p>}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50 text-xs text-slate-500">
                <span className="flex items-center gap-1"><ListChecks className="w-4 h-4 text-slate-300" /> {w.steps_count} خطوات</span>
                <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-slate-300" /> {w.runs_count} تنفيذ</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" onClick={() => setDetailId(w.id)} className="flex-1"><Settings2 className="w-4 h-4" /> الخطوات</Button>
                <button onClick={() => run.mutate(w.id)} disabled={!w.is_active} className="w-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 flex items-center justify-center"><Play className="w-4 h-4" /></button>
                <button onClick={() => window.confirm('حذف المسار؟') && del.mutate(w.id)} className="w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateForm open={showCreate} onClose={() => setShowCreate(false)} />}
      {detailId && <DetailModal wfId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
