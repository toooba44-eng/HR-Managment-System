import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Briefcase, MapPin, Clock, Building2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { jobsApi, applicationsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { Field, Input, Textarea, Button } from '../../components/ui/Form'

function ApplyModal({ job, onClose }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [form, setForm] = useState({ candidate_name: user?.full_name || '', cover_note: '' })

  const mutation = useMutation((data) => applicationsApi.apply({ job_id: job.id, ...data }), {
    onSuccess: () => {
      toast.success('تم إرسال طلبك بنجاح')
      qc.invalidateQueries('my-applications')
      qc.invalidateQueries('jobs')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل التقديم'),
  })

  return (
    <Modal open={!!job} onClose={onClose} title={`التقديم على: ${job.title}`}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
        <Field label="الاسم الكامل" required>
          <Input value={form.candidate_name} onChange={(e) => setForm((f) => ({ ...f, candidate_name: e.target.value }))} required />
        </Field>
        <Field label="نبذة تعريفية">
          <Textarea value={form.cover_note} onChange={(e) => setForm((f) => ({ ...f, cover_note: e.target.value }))} rows={4} placeholder="عرّف بنفسك ولماذا أنت مناسب لهذه الوظيفة" />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>إرسال الطلب</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Jobs() {
  const [search, setSearch] = useState('')
  const [applying, setApplying] = useState(null)
  const { data: jobs = [], isLoading } = useQuery('jobs', jobsApi.list)

  if (isLoading) return <Spinner fullscreen />

  const filtered = jobs.filter(
    (j) => !search || j.title.includes(search) || (j.department || '').includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن وظيفة..." className="input-field pr-11" />
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={Briefcase} title="لا توجد وظائف متاحة" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((job) => (
            <div key={job.id} className="card flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800">{job.title}</h3>
                    <Badge status={job.status} />
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {job.department || '—'}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {job.type}</span>
                  </div>
                </div>
              </div>
              {job.description && <p className="text-sm text-slate-600 mt-3 leading-relaxed flex-1">{job.description}</p>}
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <Button onClick={() => setApplying(job)} className="text-sm py-2 px-4">التقديم الآن</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {applying && <ApplyModal job={applying} onClose={() => setApplying(null)} />}
    </div>
  )
}
