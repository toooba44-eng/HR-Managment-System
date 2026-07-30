import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { UserPlus, Plus, Trash2, ClipboardList, CheckCircle2, Clock, AlertTriangle, ListChecks } from 'lucide-react'
import toast from 'react-hot-toast'
import { onboardingApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']
const CAT_TONE = { مستندات: 'bg-blue-50 text-blue-700', تجهيزات: 'bg-violet-50 text-violet-700', تدريب: 'bg-amber-50 text-amber-700', تعريف: 'bg-emerald-50 text-emerald-700', أخرى: 'bg-slate-100 text-slate-600' }

function CreateForm({ open, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState({ employee_id: '', start_date: '', buddy_id: '', notes: '' })
  const m = useMutation((d) => onboardingApi.create(d), {
    onSuccess: () => { toast.success('تم إنشاء خطة التهيئة'); qc.invalidateQueries('onboarding'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const empOptions = emps?.employees || []
  return (
    <Modal open={open} onClose={onClose} title="خطة تهيئة جديدة">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label="الموظف الجديد" required>
          <Select value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">اختر</option>
            {empOptions.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ المباشرة"><Input type="date" value={form.start_date} onChange={set('start_date')} /></Field>
          <Field label="المرشد (Buddy)">
            <Select value={form.buddy_id} onChange={set('buddy_id')}>
              <option value="">—</option>
              {empOptions.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="ملاحظات"><Input value={form.notes} onChange={set('notes')} /></Field>
        <p className="text-xs text-slate-400">سيتم إنشاء قائمة مهام تهيئة افتراضية تلقائياً.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>إنشاء</Button>
        </div>
      </form>
    </Modal>
  )
}

function DetailModal({ planId, onClose }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const { data, isLoading } = useQuery(['onboarding', planId], () => onboardingApi.get(planId), { enabled: !!planId })
  const invalidate = () => { qc.invalidateQueries(['onboarding', planId]); qc.invalidateQueries('onboarding') }
  const toggle = useMutation(({ id, is_done }) => onboardingApi.updateTask(id, { is_done }), { onSuccess: invalidate, onError: () => toast.error('فشل') })
  const delTask = useMutation((id) => onboardingApi.removeTask(id), { onSuccess: () => { toast.success('تم الحذف'); invalidate() }, onError: () => toast.error('فشل') })

  return (
    <Modal open={!!planId} onClose={onClose} title="قائمة مهام التهيئة" size="lg">
      {isLoading || !data ? (
        <div className="py-12"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={data.full_name} size="md" />
            <div className="flex-1">
              <p className="font-bold text-slate-800">{data.full_name}</p>
              <p className="text-xs text-slate-400">{data.job_title} · مباشرة {formatDate(data.start_date)}</p>
            </div>
            <Badge status={data.status} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>التقدّم</span><span>{data.tasks_done}/{data.tasks_total}</span></div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${data.progress}%` }} /></div>
          </div>
          <div className="space-y-2">
            {data.tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <input type="checkbox" checked={!!t.is_done} disabled={!canManage || toggle.isLoading} onChange={(e) => toggle.mutate({ id: t.id, is_done: e.target.checked })} className="w-4 h-4 rounded" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${t.is_done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</p>
                  <p className="text-[11px] text-slate-400">{t.owner}{t.due_date ? ` · ${formatDate(t.due_date)}` : ''}</p>
                </div>
                <span className={`badge ${CAT_TONE[t.category] || CAT_TONE.أخرى}`}>{t.category}</span>
                {canManage && <button onClick={() => window.confirm('حذف المهمة؟') && delTask.mutate(t.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Onboarding() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const { data, isLoading } = useQuery('onboarding', () => onboardingApi.list())
  const del = useMutation((id) => onboardingApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('onboarding') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />
  const plans = data?.onboarding || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="إجمالي الخطط" value={s.total ?? 0} tone="blue" />
        <StatCard icon={Clock} label="قيد التنفيذ" value={s.active ?? 0} tone="amber" />
        <StatCard icon={CheckCircle2} label="مكتملة" value={s.completed ?? 0} tone="green" />
        <StatCard icon={AlertTriangle} label="متأخرة" value={s.overdue ?? 0} tone="rose" />
      </div>

      {canManage && <div className="flex justify-end"><Button onClick={() => setShowCreate(true)}><Plus className="w-5 h-5" /> خطة تهيئة</Button></div>}

      {plans.length === 0 ? (
        <div className="card"><EmptyState icon={UserPlus} title="لا توجد خطط تهيئة" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={p.full_name} src={p.profile_picture} size="md" />
                  <div>
                    <p className="font-bold text-slate-800">{p.full_name}</p>
                    <p className="text-xs text-slate-400">{p.job_title}{p.department_name ? ` · ${p.department_name}` : ''}</p>
                  </div>
                </div>
                <Badge status={p.status} />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1"><span>التقدّم</span><span>{p.tasks_done}/{p.tasks_total} ({p.progress}%)</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${p.progress}%` }} /></div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 text-xs text-slate-500">
                <span>المباشرة: {formatDate(p.start_date)}</span>
                {p.buddy_name && <span>المرشد: {p.buddy_name}</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" onClick={() => setDetailId(p.id)} className="flex-1"><ListChecks className="w-4 h-4" /> القائمة</Button>
                {canManage && <button onClick={() => window.confirm('حذف الخطة؟') && del.mutate(p.id)} className="w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateForm open={showCreate} onClose={() => setShowCreate(false)} />}
      {detailId && <DetailModal planId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
