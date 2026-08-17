import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Pencil, Briefcase, GraduationCap, MapPin, Phone, Linkedin, Globe, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { candidateApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Button } from '../../components/ui/Form'

function EditModal({ profile, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...profile })
  const m = useMutation((d) => candidateApi.updateProfile(d), {
    onSuccess: () => { toast.success(t('تم تحديث الملف')); qc.invalidateQueries('candidate-profile'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title={t('تعديل الملف المهني')} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('الاسم')}><Input value={form.full_name || ''} onChange={set('full_name')} /></Field>
          <Field label={t('المسمى المهني')}><Input value={form.headline || ''} onChange={set('headline')} /></Field>
          <Field label={t('سنوات الخبرة')}><Input type="number" min="0" value={form.experience_years || ''} onChange={set('experience_years')} /></Field>
          <Field label={t('المؤهل العلمي')}><Input value={form.education || ''} onChange={set('education')} /></Field>
          <Field label={t('الهاتف')}><Input value={form.phone || ''} onChange={set('phone')} /></Field>
          <Field label={t('الموقع')}><Input value={form.location || ''} onChange={set('location')} /></Field>
          <Field label="LinkedIn"><Input value={form.linkedin || ''} onChange={set('linkedin')} /></Field>
          <Field label={t('معرض الأعمال')}><Input value={form.portfolio || ''} onChange={set('portfolio')} /></Field>
        </div>
        <Field label={t('المهارات (مفصولة بفاصلة)')}><Input value={form.skills || ''} onChange={set('skills')} /></Field>
        <Field label={t('نبذة تعريفية')}><Input value={form.summary || ''} onChange={set('summary')} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function InfoRow({ icon: Icon, label, value, link }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="w-4 h-4 text-slate-300 shrink-0" />
      <span className="text-xs text-slate-400 w-24 shrink-0">{label}</span>
      {link ? <a href={value} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate">{value}</a> : <span className="text-sm text-slate-700 truncate">{value}</span>}
    </div>
  )
}

export default function CandidateProfile() {
  const { t } = useTranslation()
  const [edit, setEdit] = useState(false)
  const { data, isLoading } = useQuery('candidate-profile', () => candidateApi.getProfile())
  if (isLoading) return <Spinner fullscreen />
  const p = data?.profile || {}
  const skills = (p.skills || '').split(',').map((x) => x.trim()).filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={p.full_name} size="md" className="!w-16 !h-16 !text-xl" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">{p.full_name || t('مرشح')}</h2>
              <p className="text-sm text-blue-600 font-medium">{p.headline}</p>
              {p.experience_years != null && <p className="text-xs text-slate-400 mt-1">{t('{{count}} سنوات خبرة', { count: p.experience_years })}</p>}
            </div>
          </div>
          <Button variant="secondary" onClick={() => setEdit(true)}><Pencil className="w-4 h-4" /> {t('تعديل')}</Button>
        </div>
        {p.summary && <p className="text-sm text-slate-600 leading-relaxed mt-4">{p.summary}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Star className="w-5 h-5 text-slate-400" /> {t('المهارات')}</h3>
          {skills.length ? (
            <div className="flex flex-wrap gap-2">{skills.map((sk) => <span key={sk} className="badge bg-blue-50 text-blue-700">{sk}</span>)}</div>
          ) : <p className="text-sm text-slate-400">{t('لم تُضف مهارات بعد')}</p>}
        </div>
        <div className="card">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-1"><Briefcase className="w-5 h-5 text-slate-400" /> {t('معلومات التواصل')}</h3>
          <InfoRow icon={GraduationCap} label={t('المؤهل')} value={p.education} />
          <InfoRow icon={Phone} label={t('الهاتف')} value={p.phone} />
          <InfoRow icon={MapPin} label={t('الموقع')} value={p.location} />
          <InfoRow icon={Linkedin} label="LinkedIn" value={p.linkedin} link />
          <InfoRow icon={Globe} label={t('الأعمال')} value={p.portfolio} link />
        </div>
      </div>

      {edit && <EditModal profile={p} onClose={() => setEdit(false)} />}
    </div>
  )
}
