import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ShieldPlus, Plus, Flag } from 'lucide-react'
import toast from 'react-hot-toast'
import { incidentsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const TYPES = ['ملاحظة سلامة', 'حادث', 'إصابة']
const SEV_TONE = { عالية: 'text-rose-600 bg-rose-50', متوسطة: 'text-amber-600 bg-amber-50', منخفضة: 'text-slate-500 bg-slate-100' }

function ReportModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', type: 'ملاحظة سلامة', location: '', severity: 'متوسطة', description: '', incident_date: '' })
  const m = useMutation(() => incidentsApi.create(form), {
    onSuccess: () => { toast.success('تم استلام البلاغ، شكراً لك'); qc.invalidateQueries('my-incidents'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title="الإبلاغ عن حادث أو ملاحظة سلامة">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate() }} className="space-y-4">
        <Field label="العنوان" required><Input value={form.title} onChange={set('title')} required placeholder="مثال: أرضية مبللة عند المدخل الرئيسي" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="النوع"><Select value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="الخطورة"><Select value={form.severity} onChange={set('severity')}><option>منخفضة</option><option>متوسطة</option><option>عالية</option></Select></Field>
          <Field label="الموقع"><Input value={form.location} onChange={set('location')} placeholder="المبنى، الطابق..." /></Field>
          <Field label="التاريخ"><Input type="date" value={form.incident_date} onChange={set('incident_date')} /></Field>
        </div>
        <Field label="التفاصيل" required><Textarea value={form.description} onChange={set('description')} rows={4} required placeholder="اشرح ما حدث أو ما لاحظته بالتفصيل." /></Field>
        <p className="text-xs text-slate-400">سيصل بلاغك مباشرة لفريق السلامة والموارد البشرية للمتابعة.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>إرسال البلاغ</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ReportIncident() {
  const [showForm, setShowForm] = useState(false)
  const { data = [], isLoading } = useQuery('my-incidents', () => incidentsApi.mine())

  if (isLoading) return <Spinner fullscreen />

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> بلاغ جديد</Button>
      </div>
      {data.length === 0 ? (
        <div className="card">
          <EmptyState icon={ShieldPlus} title="لا توجد بلاغات" description="لم تقدّم أي بلاغ سلامة حتى الآن." />
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((i) => (
            <div key={i.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{i.title}</h3>
                    <span className="badge bg-slate-100 text-slate-600">{i.type}</span>
                    <span className={`badge ${SEV_TONE[i.severity]} inline-flex items-center gap-1`}><Flag className="w-3 h-3" /> {i.severity}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{i.incident_date ? formatDate(i.incident_date) : formatDate(i.created_at)}</p>
                </div>
                <Badge status={i.status} />
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <ReportModal onClose={() => setShowForm(false)} />}
    </div>
  )
}
