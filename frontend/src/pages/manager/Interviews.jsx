import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Video, Plus, Trash2, Star, CalendarClock, CheckCircle2, MapPin, Phone, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { interviewsApi, employeesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MODES = ['حضوري', 'فيديو', 'هاتفي']
const STAGES = ['مبدئية', 'فنية', 'نهائية']
const MODE_ICON = { حضوري: MapPin, فيديو: Video, هاتفي: Phone }

function Form({ editing, onClose }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }))
  const [form, setForm] = useState(() => editing || { candidate_name: '', job_title: '', interviewer_id: '', scheduled_at: '', mode: 'حضوري', stage: 'مبدئية' })
  const m = useMutation((d) => (editing ? interviewsApi.update(editing.id, d) : interviewsApi.create(d)), {
    onSuccess: () => { toast.success(editing ? 'تم التحديث' : 'تمت الجدولة'); qc.invalidateQueries('interviews'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title={editing ? 'تعديل المقابلة' : 'جدولة مقابلة'}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المرشّح" required><Input value={form.candidate_name} onChange={set('candidate_name')} required /></Field>
          <Field label="الوظيفة"><Input value={form.job_title || ''} onChange={set('job_title')} /></Field>
          <Field label="القائم بالمقابلة"><Select value={form.interviewer_id || ''} onChange={set('interviewer_id')}><option value="">—</option>{(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</Select></Field>
          <Field label="الموعد"><Input type="datetime-local" value={form.scheduled_at ? String(form.scheduled_at).slice(0, 16) : ''} onChange={set('scheduled_at')} /></Field>
          <Field label="النوع"><Select value={form.mode} onChange={set('mode')}>{MODES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="المرحلة"><Select value={form.stage} onChange={set('stage')}>{STAGES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

function OutcomeModal({ interview, onClose }) {
  const qc = useQueryClient()
  const [rating, setRating] = useState(interview.rating || 0)
  const [notes, setNotes] = useState(interview.notes || '')
  const m = useMutation(() => interviewsApi.update(interview.id, { status: 'مكتملة', rating, notes }), {
    onSuccess: () => { toast.success('تم تسجيل النتيجة'); qc.invalidateQueries('interviews'); onClose() },
    onError: () => toast.error('فشل'),
  })
  return (
    <Modal open onClose={onClose} title={`نتيجة مقابلة ${interview.candidate_name}`}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">التقييم</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={`transition-transform hover:scale-110 ${n <= rating ? 'text-amber-400' : 'text-slate-200'}`}><Star className="w-6 h-6 fill-current" /></button>
            ))}
          </div>
        </div>
        <Field label="ملاحظات"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => rating && m.mutate()} loading={m.isLoading} disabled={!rating}>حفظ النتيجة</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Interviews() {
  const qc = useQueryClient()
  const [form, setForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [outcome, setOutcome] = useState(null)
  const { data, isLoading } = useQuery('interviews', () => interviewsApi.list())
  const del = useMutation((id) => interviewsApi.remove(id), { onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('interviews') }, onError: () => toast.error('فشل') })

  if (isLoading) return <Spinner fullscreen />
  const items = data?.interviews || []
  const s = data?.summary || {}
  const openNew = () => { setEditing(null); setForm(true) }
  const openEdit = (i) => { setEditing(i); setForm(true) }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Users} label="إجمالي المقابلات" value={s.total ?? 0} tone="blue" />
        <StatCard icon={CalendarClock} label="مجدولة" value={s.scheduled ?? 0} tone="amber" />
        <StatCard icon={CheckCircle2} label="مكتملة" value={s.completed ?? 0} tone="green" />
      </div>

      <div className="flex justify-end"><Button onClick={openNew}><Plus className="w-5 h-5" /> جدولة مقابلة</Button></div>

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Video} title="لا توجد مقابلات" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((iv) => {
            const MIcon = MODE_ICON[iv.mode] || Video
            return (
              <div key={iv.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={iv.candidate_name} size="md" />
                    <div>
                      <p className="font-bold text-slate-800">{iv.candidate_name}</p>
                      <p className="text-xs text-slate-400">{iv.job_title}</p>
                    </div>
                  </div>
                  <Badge status={iv.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><MIcon className="w-4 h-4 text-slate-300" /> {iv.mode}</span>
                  <span className="badge bg-slate-50 text-slate-600">{iv.stage}</span>
                  {iv.scheduled_at && <span className="flex items-center gap-1"><CalendarClock className="w-4 h-4 text-slate-300" /> {formatDate(iv.scheduled_at)}</span>}
                  {iv.interviewer_name && <span>· {iv.interviewer_name}</span>}
                </div>
                {iv.status === 'مكتملة' && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <div className="flex text-amber-400">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-4 h-4 ${n <= (iv.rating || 0) ? 'fill-current' : 'text-slate-200'}`} />)}</div>
                    {iv.notes && <span className="text-xs text-slate-500 truncate">— {iv.notes}</span>}
                  </div>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                  {iv.status === 'مجدولة' && <Button variant="secondary" onClick={() => setOutcome(iv)} className="flex-1"><CheckCircle2 className="w-4 h-4" /> تسجيل النتيجة</Button>}
                  <button onClick={() => openEdit(iv)} className="px-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm">تعديل</button>
                  <button onClick={() => window.confirm('حذف المقابلة؟') && del.mutate(iv.id)} className="w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form && <Form editing={editing} onClose={() => setForm(false)} />}
      {outcome && <OutcomeModal interview={outcome} onClose={() => setOutcome(null)} />}
    </div>
  )
}
