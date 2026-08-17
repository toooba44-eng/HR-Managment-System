import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Workflow, Plus, Trash2, Play, Zap, CheckCircle2, GitBranch, ListChecks, Settings2, Filter, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { automationApi, employeesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDateTime } from '../../lib/utils'

const TRIGGERS = ['طلب إجازة', 'طلب مصروف', 'تعيين موظف', 'إنهاء خدمة', 'طلب مستند', 'تقييم أداء', 'طلب عام']
const ACTIONS = ['موافقة', 'إشعار', 'إسناد مهمة', 'تحديث حالة']
const TRIGGER_TONE = {
  'طلب إجازة': 'bg-blue-50 text-blue-700', 'طلب مصروف': 'bg-emerald-50 text-emerald-700', 'تعيين موظف': 'bg-violet-50 text-violet-700',
  'إنهاء خدمة': 'bg-rose-50 text-rose-700', 'طلب مستند': 'bg-amber-50 text-amber-700', 'تقييم أداء': 'bg-cyan-50 text-cyan-700', 'طلب عام': 'bg-slate-100 text-slate-600',
}
const ACTION_TONE = { موافقة: 'bg-emerald-50 text-emerald-700', إشعار: 'bg-blue-50 text-blue-700', 'إسناد مهمة': 'bg-violet-50 text-violet-700', 'تحديث حالة': 'bg-amber-50 text-amber-700' }

const COND_FIELDS = [
  { key: 'department', label: 'الإدارة' },
  { key: 'nationality', label: 'الجنسية' },
  { key: 'contract_type', label: 'نوع العقد' },
  { key: 'salary', label: 'الراتب' },
  { key: 'work_location', label: 'الموقع' },
  { key: 'status', label: 'الحالة' },
]
const COND_OPS = [
  { key: 'eq', label: 'يساوي' },
  { key: 'ne', label: 'لا يساوي' },
  { key: 'gt', label: 'أكبر من' },
  { key: 'lt', label: 'أصغر من' },
  { key: 'contains', label: 'يحتوي' },
]
const condFieldLabel = (k) => COND_FIELDS.find((f) => f.key === k)?.label || k
const condOpLabel = (k) => COND_OPS.find((o) => o.key === k)?.label || k

function CreateForm({ open, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', trigger_event: 'طلب إجازة', description: '' })
  const m = useMutation((d) => automationApi.create(d), {
    onSuccess: () => { toast.success(t('تم إنشاء المسار')); qc.invalidateQueries('automation'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={t('مسار عمل جديد')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label={t('اسم المسار')} required><Input value={form.name} onChange={set('name')} required /></Field>
        <Field label={t('الحدث المُشغّل')}><Select value={form.trigger_event} onChange={set('trigger_event')}>{TRIGGERS.map((tr) => <option key={tr} value={tr}>{t(tr, { context: 'trigger' })}</option>)}</Select></Field>
        <Field label={t('الوصف')}><Input value={form.description} onChange={set('description')} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('إنشاء')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function DetailModal({ wfId, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery(['automation', wfId], () => automationApi.get(wfId), { enabled: !!wfId })
  const { data: empData } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }))
  const [step, setStep] = useState({ name: '', action_type: 'موافقة', assignee: 'المدير المباشر' })
  const [cond, setCond] = useState({ field: 'department', operator: 'eq', value: '' })
  const [runEmployeeId, setRunEmployeeId] = useState('')
  const invalidate = () => { qc.invalidateQueries(['automation', wfId]); qc.invalidateQueries('automation') }
  const addStep = useMutation((d) => automationApi.addStep(wfId, d), { onSuccess: () => { toast.success(t('تمت الإضافة')); setStep({ name: '', action_type: 'موافقة', assignee: 'المدير المباشر' }); invalidate() }, onError: () => toast.error(t('فشل')) })
  const delStep = useMutation((id) => automationApi.removeStep(id), { onSuccess: () => { toast.success(t('تم الحذف')); invalidate() }, onError: () => toast.error(t('فشل')) })
  const addCond = useMutation((d) => automationApi.addCondition(wfId, d), { onSuccess: () => { toast.success(t('تمت الإضافة')); setCond((c) => ({ ...c, value: '' })); invalidate() }, onError: (e) => toast.error(e.response?.data?.error || t('فشل')) })
  const delCond = useMutation((id) => automationApi.removeCondition(id), { onSuccess: () => { toast.success(t('تم الحذف')); invalidate() }, onError: () => toast.error(t('فشل')) })
  const runTest = useMutation(() => automationApi.run(wfId, runEmployeeId), {
    onSuccess: (r) => { toast.success(r.message); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل التنفيذ')),
  })

  const employees = empData?.employees || []

  return (
    <Modal open={!!wfId} onClose={onClose} title={t('تفاصيل المسار')} size="lg">
      {isLoading || !data ? (
        <div className="py-12"><Spinner /></div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">{data.name}</p>
              <span className={`badge ${TRIGGER_TONE[data.trigger_event]} mt-1`}>{t('عند: {{event}}', { event: t(data.trigger_event, { context: 'trigger' }) })}</span>
            </div>
            <span className="text-xs text-slate-400">{data.runs_count} {t('تنفيذ')}</span>
          </div>

          {/* Conditions */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> {t('الشروط (يجب تحقق الكل)')}</p>
            <div className="space-y-1.5 mb-2">
              {data.conditions.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded-lg px-3 py-1.5">
                  <span className="text-slate-600">{t(condFieldLabel(c.field))} {t(condOpLabel(c.operator))} <b className="text-slate-800">{c.value}</b></span>
                  <button onClick={() => delCond.mutate(c.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {data.conditions.length === 0 && <p className="text-xs text-slate-400">{t('بلا شروط — يعمل المسار دائماً عند وقوع الحدث.')}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={cond.field} onChange={(e) => setCond((c) => ({ ...c, field: e.target.value }))} className="!py-1.5 text-xs">
                {COND_FIELDS.map((f) => <option key={f.key} value={f.key}>{t(f.label)}</option>)}
              </Select>
              <Select value={cond.operator} onChange={(e) => setCond((c) => ({ ...c, operator: e.target.value }))} className="!py-1.5 text-xs">
                {COND_OPS.map((o) => <option key={o.key} value={o.key}>{t(o.label)}</option>)}
              </Select>
              <div className="flex gap-1">
                <Input value={cond.value} onChange={(e) => setCond((c) => ({ ...c, value: e.target.value }))} placeholder={t('القيمة')} className="!py-1.5 text-xs" />
                <button onClick={() => cond.value.trim() && addCond.mutate(cond)} className="w-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center shrink-0"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">{t('الخطوات (تُنفَّذ بالترتيب عند تحقق الشروط)')}</p>
            <div className="space-y-2">
              {data.steps.map((st, i) => (
                <div key={st.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{st.name}</p>
                    <p className="text-[11px] text-slate-400">{t('المسؤول: {{name}}', { name: st.assignee })}</p>
                  </div>
                  <span className={`badge ${ACTION_TONE[st.action_type] || 'bg-slate-100 text-slate-600'}`}>{t(st.action_type, { context: 'action' })}</span>
                  <button onClick={() => window.confirm(t('حذف الخطوة؟')) && delStep.mutate(st.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {data.steps.length === 0 && <p className="text-sm text-slate-400 text-center py-4">{t('لا توجد خطوات بعد')}</p>}
            </div>
            <div className="rounded-xl border border-dashed border-slate-200 p-4 mt-3">
              <p className="text-xs font-medium text-slate-500 mb-3">{t('إضافة خطوة')}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('اسم الخطوة')}><Input value={step.name} onChange={(e) => setStep((s) => ({ ...s, name: e.target.value }))} /></Field>
                <Field label={t('نوع الإجراء')}><Select value={step.action_type} onChange={(e) => setStep((s) => ({ ...s, action_type: e.target.value }))}>{ACTIONS.map((a) => <option key={a} value={a}>{t(a, { context: 'action' })}</option>)}</Select></Field>
                <Field label={t('المسؤول')}><Input value={step.assignee} onChange={(e) => setStep((s) => ({ ...s, assignee: e.target.value }))} /></Field>
              </div>
              <div className="flex justify-end mt-3"><Button onClick={() => step.name && addStep.mutate(step)} loading={addStep.isLoading}><Plus className="w-4 h-4" /> {t('إضافة')}</Button></div>
            </div>
          </div>

          {/* Test run */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><Play className="w-3.5 h-3.5" /> {t('تشغيل تجريبي على موظف')}</p>
            <div className="flex gap-2">
              <Select value={runEmployeeId} onChange={(e) => setRunEmployeeId(e.target.value)} className="flex-1">
                <option value="">{t('اختر موظفاً')}</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} — {e.job_title}</option>)}
              </Select>
              <Button onClick={() => runEmployeeId && runTest.mutate()} loading={runTest.isLoading} disabled={!data.is_active}>
                <Play className="w-4 h-4" /> {t('تشغيل')}
              </Button>
            </div>
            {!data.is_active && <p className="text-[11px] text-amber-600 mt-1.5">{t('المسار غير مفعّل — فعّله أولاً من القائمة.')}</p>}
          </div>

          {/* Run history */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> {t('سجل التنفيذ')}</p>
            {data.runs.length === 0 ? (
              <p className="text-xs text-slate-400">{t('لم يُنفَّذ المسار بعد.')}</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {data.runs.map((r) => (
                  <div key={r.id} className="text-xs bg-white border border-slate-100 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className={`badge ${r.matched ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{r.matched ? t('تحققت الشروط') : t('لم تتحقق الشروط')}</span>
                      <span className="text-slate-400">{formatDateTime(r.created_at)}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{r.employee_name || t('بلا موظف محدد')} · {t('{{count}} إجراء نُفِّذ من أصل {{total}}', { count: r.actions_executed, total: r.detail.length })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Automation() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const { data, isLoading } = useQuery('automation', () => automationApi.list())
  const toggle = useMutation(({ id, is_active }) => automationApi.update(id, { is_active }), {
    onSuccess: () => { qc.invalidateQueries('automation') }, onError: () => toast.error(t('فشل')),
  })
  const del = useMutation((id) => automationApi.remove(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('automation') }, onError: () => toast.error(t('فشل')),
  })

  if (isLoading) return <Spinner fullscreen />
  const workflows = data?.workflows || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={GitBranch} label={t('مسارات العمل')} value={s.total ?? 0} tone="blue" />
        <StatCard icon={CheckCircle2} label={t('مفعّلة')} value={s.active ?? 0} tone="green" />
        <StatCard icon={Zap} label={t('إجمالي التنفيذ')} value={s.totalRuns ?? 0} tone="amber" />
      </div>

      <div className="flex justify-end"><Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> {t('مسار عمل')}</Button></div>

      {workflows.length === 0 ? (
        <div className="card"><EmptyState icon={Workflow} title={t('لا توجد مسارات عمل')} /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workflows.map((w) => (
            <div key={w.id} className={`card ${!w.is_active ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Workflow className="w-5 h-5" /></div>
                  <div>
                    <p className="font-bold text-slate-800">{w.name}</p>
                    <span className={`badge ${TRIGGER_TONE[w.trigger_event]} mt-1`}>{t('عند: {{event}}', { event: t(w.trigger_event, { context: 'trigger' }) })}</span>
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
                <span className="flex items-center gap-1"><ListChecks className="w-4 h-4 text-slate-300" /> {w.steps_count} {t('خطوات')}</span>
                <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-slate-300" /> {w.runs_count} {t('تنفيذ')}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" onClick={() => setDetailId(w.id)} className="flex-1"><Settings2 className="w-4 h-4" /> {t('التفاصيل والتشغيل')}</Button>
                <button onClick={() => window.confirm(t('حذف المسار؟')) && del.mutate(w.id)} className="w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
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
