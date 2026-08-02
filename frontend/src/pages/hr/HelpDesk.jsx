import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { LifeBuoy, Plus, MessageSquare, AlertTriangle, Inbox, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { helpdeskApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDateTime } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'super_admin']
const PRIORITY_TONE = { عاجلة: 'bg-rose-50 text-rose-600', عالية: 'bg-amber-50 text-amber-600', متوسطة: 'bg-blue-50 text-blue-600', منخفضة: 'bg-slate-100 text-slate-500' }

function NewTicketForm({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ category: 'استفسار عام', subject: '', description: '', priority: 'متوسطة' })
  const m = useMutation((d) => helpdeskApi.create(d), {
    onSuccess: () => { toast.success('تم إنشاء التذكرة'); qc.invalidateQueries('helpdesk'); onClose(); setForm({ category: 'استفسار عام', subject: '', description: '', priority: 'متوسطة' }) },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل الإرسال'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="تذكرة دعم جديدة">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="التصنيف">
            <Select value={form.category} onChange={set('category')}>
              {['استفسار عام', 'رواتب ومزايا', 'إجازات وحضور', 'مشكلة تقنية', 'شكوى', 'أخرى'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select value={form.priority} onChange={set('priority')}>
              {['منخفضة', 'متوسطة', 'عالية', 'عاجلة'].map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الموضوع" required><Input value={form.subject} onChange={set('subject')} required /></Field>
        <Field label="التفاصيل"><Textarea value={form.description} onChange={set('description')} rows={3} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>إرسال</Button>
        </div>
      </form>
    </Modal>
  )
}

function TicketModal({ ticketId, onClose, canManage }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: canManage })
  const { data, isLoading } = useQuery(['helpdesk', ticketId], () => helpdeskApi.get(ticketId), { enabled: !!ticketId })
  const [reply, setReply] = useState('')
  const invalidate = () => { qc.invalidateQueries(['helpdesk', ticketId]); qc.invalidateQueries('helpdesk') }
  const update = useMutation((d) => helpdeskApi.update(ticketId, d), { onSuccess: () => { toast.success('تم التحديث'); invalidate() }, onError: () => toast.error('فشل التحديث') })
  const sendReply = useMutation(() => helpdeskApi.reply(ticketId, reply), {
    onSuccess: () => { setReply(''); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل الرد'),
  })

  return (
    <Modal open={!!ticketId} onClose={onClose} title="تذكرة الدعم" size="lg">
      {isLoading || !data ? (
        <div className="py-12"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {canManage && <Avatar name={data.full_name} src={data.profile_picture} size="md" />}
              <div className="min-w-0">
                <p className="font-bold text-slate-800">{data.subject}</p>
                <p className="text-xs text-slate-400">{canManage ? `${data.full_name} · ` : ''}{formatDateTime(data.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`badge ${PRIORITY_TONE[data.priority]}`}>{data.priority}</span>
              <Badge status={data.status} />
            </div>
          </div>
          <span className="badge bg-slate-100 text-slate-600 w-fit">{data.category}</span>
          {data.description && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{data.description}</p>}

          {canManage && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <Field label="الحالة">
                <Select value={data.status} onChange={(e) => update.mutate({ status: e.target.value })}>
                  {['مفتوحة', 'قيد المعالجة', 'بانتظار الموظف', 'مغلقة'].map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="مُسندة إلى">
                <Select value={data.assigned_to || ''} onChange={(e) => update.mutate({ assigned_to: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— بدون —</option>
                  {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </Select>
              </Field>
            </div>
          )}

          <div className="space-y-2 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500">المحادثة</p>
            {data.replies.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد ردود بعد.</p>
            ) : data.replies.map((r) => (
              <div key={r.id} className="flex items-start gap-2.5">
                <Avatar name={r.author_name || '؟'} src={r.author_picture} size="sm" />
                <div className="flex-1 min-w-0 rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600">{r.author_name || 'مستخدم'}</span>
                    <span className="text-[10px] text-slate-400">{formatDateTime(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5">{r.body}</p>
                </div>
              </div>
            ))}
          </div>

          {data.status !== 'مغلقة' && (
            <form onSubmit={(e) => { e.preventDefault(); if (reply.trim()) sendReply.mutate() }} className="flex gap-2 pt-2">
              <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="اكتب رداً..." className="flex-1" />
              <Button type="submit" loading={sendReply.isLoading}><MessageSquare className="w-4 h-4" /> رد</Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function HelpDesk() {
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [ticketId, setTicketId] = useState(null)
  const { data, isLoading } = useQuery('helpdesk', () => helpdeskApi.list())

  if (isLoading) return <Spinner fullscreen />
  const tickets = data?.tickets || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Inbox} label="الإجمالي" value={s.total ?? 0} tone="blue" />
          <StatCard icon={LifeBuoy} label="مفتوحة" value={s.open ?? 0} tone="amber" />
          <StatCard icon={AlertTriangle} label="عاجلة" value={s.urgent ?? 0} tone="rose" />
          <StatCard icon={UserCheck} label="غير مُسندة" value={s.unassigned ?? 0} tone="violet" />
        </div>
      )}

      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> تذكرة جديدة</Button></div>

      {tickets.length === 0 ? (
        <div className="card"><EmptyState icon={LifeBuoy} title="لا توجد تذاكر دعم" description="قدّم تذكرة لأي استفسار أو مشكلة تخص عملك." /></div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setTicketId(t.id)} className="card w-full text-right flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {canManage && <Avatar name={t.full_name} src={t.profile_picture} size="md" />}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800 truncate">{t.subject}</p>
                    <span className="badge bg-slate-100 text-slate-600">{t.category}</span>
                    <span className={`badge ${PRIORITY_TONE[t.priority]}`}>{t.priority}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {canManage && t.full_name ? `${t.full_name} · ` : ''}{formatDateTime(t.created_at)}
                    {t.assigned_to_name ? ` · مُسندة إلى ${t.assigned_to_name}` : ''}
                    {t.replies_count > 0 ? ` · ${t.replies_count} رد` : ''}
                  </p>
                </div>
              </div>
              <Badge status={t.status} />
            </button>
          ))}
        </div>
      )}

      <NewTicketForm open={showForm} onClose={() => setShowForm(false)} />
      {ticketId && <TicketModal ticketId={ticketId} onClose={() => setTicketId(null)} canManage={canManage} />}
    </div>
  )
}
