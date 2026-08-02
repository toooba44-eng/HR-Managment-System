import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { GraduationCap, Plus, Pencil, Trash2, Clock, Users, Award, ShieldCheck, Copy, Search, PartyPopper } from 'lucide-react'
import toast from 'react-hot-toast'
import { trainingApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'super_admin']
const LEVELS = ['مبتدئ', 'متوسط', 'متقدم']

function CourseForm({ open, onClose, editing }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(editing || { title: '', category: 'عام', description: '', hours: 8, level: 'مبتدئ', status: 'متاحة' })
  const mutation = useMutation(
    (data) => (editing ? trainingApi.updateCourse(editing.id, data) : trainingApi.createCourse(data)),
    { onSuccess: () => { toast.success(editing ? 'تم التحديث' : 'تمت الإضافة'); qc.invalidateQueries('courses'); onClose() }, onError: () => toast.error('فشلت العملية') }
  )
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل دورة' : 'دورة جديدة'}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, hours: Number(form.hours) }) }} className="space-y-4">
        <Field label="عنوان الدورة" required><Input value={form.title} onChange={set('title')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التصنيف"><Input value={form.category} onChange={set('category')} /></Field>
          <Field label="عدد الساعات"><Input type="number" min="1" value={form.hours} onChange={set('hours')} /></Field>
          <Field label="المستوى"><Select value={form.level} onChange={set('level')}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</Select></Field>
          <Field label="الحالة"><Select value={form.status} onChange={set('status')}><option>متاحة</option><option>مغلقة</option></Select></Field>
        </div>
        <Field label="الوصف"><Textarea value={form.description} onChange={set('description')} rows={2} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

function EarnedCertificateModal({ certificate, onClose }) {
  const copy = () => { navigator.clipboard?.writeText(certificate.code); toast.success('تم نسخ رمز الشهادة') }
  return (
    <Modal open onClose={onClose} title="مبروك! لقد حصلت على شهادة">
      <div className="text-center space-y-4 py-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><PartyPopper className="w-8 h-8" /></div>
        <p className="text-sm text-slate-600">أتممت الدورة بنجاح! هذا رمز شهادتك القابل للمشاركة والتحقق:</p>
        <div className="flex items-center justify-center gap-2">
          <code className="text-lg font-bold tracking-wider text-primary-700 bg-primary-50 px-4 py-2 rounded-xl">{certificate.code}</code>
          <button onClick={copy} className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500"><Copy className="w-4 h-4" /></button>
        </div>
        <Button onClick={onClose} className="w-full">إغلاق</Button>
      </div>
    </Modal>
  )
}

function VerifyCertificateModal({ onClose }) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const check = useMutation((c) => trainingApi.verifyCertificate(c), {
    onSuccess: (data) => setResult(data),
    onError: (err) => setResult(err.response?.data || { valid: false, error: 'تعذّر التحقق' }),
  })
  return (
    <Modal open onClose={onClose} title="التحقق من شهادة">
      <div className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) check.mutate(code.trim()) }} className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="QNT-XXXXXXXX" className="flex-1" />
          <Button type="submit" loading={check.isLoading}><Search className="w-4 h-4" /> تحقق</Button>
        </form>
        {result && (
          result.valid ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-1.5">
              <p className="flex items-center gap-2 text-emerald-700 font-bold text-sm"><ShieldCheck className="w-4 h-4" /> شهادة صالحة</p>
              <p className="text-sm text-slate-700"><b>{result.certificate.employee_name}</b> أتمّ دورة <b>{result.certificate.course_title}</b></p>
              <p className="text-xs text-slate-500">{result.certificate.hours} ساعة · {result.certificate.level} · صدرت بتاريخ {formatDate(result.certificate.issued_at)}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">{result.error || 'الشهادة غير موجودة'}</div>
          )
        )}
      </div>
    </Modal>
  )
}

export default function Training() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [earned, setEarned] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const { data: courses = [], isLoading } = useQuery('courses', trainingApi.courses)
  const { data: certificates = [] } = useQuery('certificates', trainingApi.certificates)

  const enrollMutation = useMutation((courseId) => trainingApi.enroll(courseId), {
    onSuccess: () => { toast.success('تم التسجيل في الدورة'); qc.invalidateQueries('courses') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل التسجيل'),
  })
  const progressMutation = useMutation(({ id, progress }) => trainingApi.setProgress(id, progress), {
    onSuccess: (data) => {
      qc.invalidateQueries('courses')
      if (data?.certificate) { qc.invalidateQueries('certificates'); setEarned(data.certificate) }
    },
    onError: () => toast.error('فشل تحديث التقدّم'),
  })
  const removeMutation = useMutation((id) => trainingApi.removeCourse(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('courses') },
    onError: () => toast.error('فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => setVerifying(true)}><ShieldCheck className="w-4 h-4" /> التحقق من شهادة</Button>
        {canManage && <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="w-5 h-5" /> دورة جديدة</Button>}
      </div>

      {courses.length === 0 ? (
        <div className="card"><EmptyState icon={GraduationCap} title="لا توجد دورات" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {courses.map((c) => (
            <div key={c.id} className="card flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0"><GraduationCap className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-slate-800">{c.title}</h3><Badge status={c.status} /></div>
                    <p className="text-xs text-slate-400 mt-0.5">{c.category} · {c.level}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditing(c); setShowForm(true) }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => window.confirm('حذف الدورة؟') && removeMutation.mutate(c.id)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              {c.description && <p className="text-sm text-slate-600 mt-3 flex-1">{c.description}</p>}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {c.hours} ساعة</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c.enrolled_count} متدرّب</span>
              </div>

              {/* Enrollment state */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                {c.my_enrollment ? (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-slate-500"><Award className="w-3.5 h-3.5" /> تقدّمي</span>
                      <span className="font-bold text-slate-700">{c.my_enrollment.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${c.my_enrollment.progress >= 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} style={{ width: `${c.my_enrollment.progress}%` }} />
                    </div>
                    {c.my_enrollment.status !== 'مكتمل' && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[25, 50, 75, 100].map((p) => (
                          <button key={p} onClick={() => progressMutation.mutate({ id: c.my_enrollment.id, progress: p })}
                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">{p}%</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : c.status === 'متاحة' && user?.employee_id ? (
                  <Button onClick={() => enrollMutation.mutate(c.id)} className="w-full text-sm py-2">التحق بالدورة</Button>
                ) : (
                  <p className="text-xs text-slate-400 text-center">{c.status === 'مغلقة' ? 'التسجيل مغلق' : 'غير متاح للتسجيل'}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {certificates.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3"><Award className="w-5 h-5 text-slate-400" /><h3 className="font-bold text-slate-800">{canManage ? 'شهادات إتمام الدورات' : 'شهاداتي'}</h3></div>
          <div className="space-y-2">
            {certificates.map((c) => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {canManage && <Avatar name={c.employee_name} src={c.profile_picture} size="sm" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{canManage ? `${c.employee_name} — ${c.course_title}` : c.course_title}</p>
                    <p className="text-[11px] text-slate-400">{c.hours} ساعة · صدرت بتاريخ {formatDate(c.issued_at)}</p>
                  </div>
                </div>
                <code className="text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-lg self-start sm:self-auto shrink-0">{c.code}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && <CourseForm open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
      {earned && <EarnedCertificateModal certificate={earned} onClose={() => setEarned(null)} />}
      {verifying && <VerifyCertificateModal onClose={() => setVerifying(false)} />}
    </div>
  )
}
