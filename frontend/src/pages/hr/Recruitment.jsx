import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Briefcase, Plus, Users, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { jobsApi, applicationsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const APP_STATUSES = ['قيد المراجعة', 'مقابلة', 'مقبول', 'مرفوض']

function JobForm({ open, onClose, editing }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(
    editing || { title: '', department: '', location: 'الرياض - المقر الرئيسي', type: 'دوام كامل', description: '', status: 'مفتوحة' }
  )
  const mutation = useMutation(
    (data) => (editing ? jobsApi.update(editing.id, data) : jobsApi.create(data)),
    {
      onSuccess: () => { toast.success(editing ? 'تم التحديث' : 'تم نشر الوظيفة'); qc.invalidateQueries('jobs-hr'); onClose() },
      onError: (err) => toast.error(err.response?.data?.error || 'فشلت العملية'),
    }
  )
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل وظيفة' : 'وظيفة جديدة'}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label="المسمى الوظيفي" required>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الإدارة"><Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></Field>
          <Field label="الموقع"><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></Field>
          <Field label="نوع التوظيف">
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option>دوام كامل</option><option>دوام جزئي</option><option>عقد</option><option>متدرب</option>
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option>مفتوحة</option><option>مغلقة</option>
            </Select>
          </Field>
        </div>
        <Field label="الوصف"><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

function JobsTab() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const { data: jobs = [], isLoading } = useQuery('jobs-hr', jobsApi.list)
  const removeMutation = useMutation((id) => jobsApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('jobs-hr') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="w-5 h-5" /> وظيفة جديدة</Button>
      </div>
      {jobs.length === 0 ? (
        <div className="card"><EmptyState icon={Briefcase} title="لا توجد وظائف" /></div>
      ) : jobs.map((job) => (
        <div key={job.id} className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800">{job.title}</h3>
                <Badge status={job.status} />
                <span className="badge bg-blue-50 text-blue-600 inline-flex items-center gap-1"><Users className="w-3 h-3" /> {job.applicants} متقدّم</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{job.department} · {job.location} · {job.type}</p>
              {job.description && <p className="text-sm text-slate-600 mt-2">{job.description}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => { setEditing(job); setShowForm(true) }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => window.confirm('حذف الوظيفة؟') && removeMutation.mutate(job.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}
      {showForm && <JobForm open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
    </div>
  )
}

function ApplicationsTab() {
  const qc = useQueryClient()
  const { data: apps = [], isLoading } = useQuery('applications-hr', () => applicationsApi.all())
  const statusMutation = useMutation(({ id, status }) => applicationsApi.setStatus(id, status), {
    onSuccess: () => { qc.invalidateQueries('applications-hr'); qc.invalidateQueries('jobs-hr') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل التحديث'),
  })

  if (isLoading) return <Spinner fullscreen />

  return apps.length === 0 ? (
    <div className="card"><EmptyState icon={Users} title="لا توجد طلبات توظيف" /></div>
  ) : (
    <div className="space-y-3">
      {apps.map((a) => (
        <div key={a.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar name={a.candidate_name || a.candidate_email} size="md" />
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{a.candidate_name || a.candidate_email}</p>
              <p className="text-xs text-slate-400 truncate">{a.job_title} · {formatDate(a.created_at)}</p>
              {a.cover_note && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{a.cover_note}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge status={a.status} />
            <Select value={a.status} onChange={(e) => statusMutation.mutate({ id: a.id, status: e.target.value })} className="text-xs py-1.5 px-2 w-28">
              {APP_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Recruitment() {
  const [tab, setTab] = useState('jobs')
  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-100 w-full sm:w-auto sm:inline-flex">
        <button onClick={() => setTab('jobs')} className={`flex-1 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'jobs' ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>الوظائف</button>
        <button onClick={() => setTab('apps')} className={`flex-1 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'apps' ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>الطلبات</button>
      </div>
      {tab === 'jobs' ? <JobsTab /> : <ApplicationsTab />}
    </div>
  )
}
