import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Building2, Pencil, Plus, Trash2, MapPin, Phone, Mail, Globe, Hash, Calendar, Users, Briefcase, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { companyApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Select, Button } from '../../components/ui/Form'

const MANAGE = ['admin', 'hr_manager', 'super_admin']

function ProfileForm({ open, onClose, profile }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState(() => ({ ...profile }))
  const m = useMutation((d) => companyApi.updateProfile(d), {
    onSuccess: () => { toast.success(t('تم تحديث بيانات المؤسسة')); qc.invalidateQueries('company'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={t('تعديل بيانات المؤسسة')} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('اسم المؤسسة')} required><Input value={form.name || ''} onChange={set('name')} required /></Field>
          <Field label={t('الاسم القانوني')}><Input value={form.legal_name || ''} onChange={set('legal_name')} /></Field>
          <Field label={t('السجل التجاري')}><Input value={form.cr_number || ''} onChange={set('cr_number')} /></Field>
          <Field label={t('الرقم الضريبي')}><Input value={form.tax_number || ''} onChange={set('tax_number')} /></Field>
          <Field label={t('القطاع')}><Input value={form.industry || ''} onChange={set('industry')} /></Field>
          <Field label={t('حجم المؤسسة')}><Input value={form.size || ''} onChange={set('size')} /></Field>
          <Field label={t('سنة التأسيس')}><Input type="number" value={form.founded_year || ''} onChange={set('founded_year')} /></Field>
          <Field label={t('الهاتف')}><Input value={form.phone || ''} onChange={set('phone')} /></Field>
          <Field label={t('البريد الإلكتروني')}><Input type="email" value={form.email || ''} onChange={set('email')} /></Field>
          <Field label={t('الموقع الإلكتروني')}><Input value={form.website || ''} onChange={set('website')} /></Field>
          <Field label={t('المدينة')}><Input value={form.city || ''} onChange={set('city')} /></Field>
          <Field label={t('الدولة')}><Input value={form.country || ''} onChange={set('country')} /></Field>
        </div>
        <Field label={t('العنوان')}><Input value={form.address || ''} onChange={set('address')} /></Field>
        <Field label={t('نبذة')}><Input value={form.about || ''} onChange={set('about')} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function BranchForm({ open, onClose, editing }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState(() => editing || { name: '', city: '', address: '', phone: '', manager_id: '', is_headquarters: false, status: 'نشط' })
  const m = useMutation(
    (d) => (editing ? companyApi.updateBranch(editing.id, d) : companyApi.createBranch(d)),
    {
      onSuccess: () => { toast.success(editing ? t('تم التحديث') : t('تمت الإضافة')); qc.invalidateQueries('company'); onClose() },
      onError: (e) => toast.error(e.response?.data?.error || t('فشلت العملية')),
    },
  )
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={editing ? t('تعديل فرع') : t('فرع جديد')}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        <Field label={t('اسم الفرع')} required><Input value={form.name} onChange={set('name')} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('المدينة')}><Input value={form.city || ''} onChange={set('city')} /></Field>
          <Field label={t('الهاتف')}><Input value={form.phone || ''} onChange={set('phone')} /></Field>
        </div>
        <Field label={t('العنوان')}><Input value={form.address || ''} onChange={set('address')} /></Field>
        <Field label={t('مدير الفرع')}>
          <Select value={form.manager_id || ''} onChange={set('manager_id')}>
            <option value="">—</option>
            {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={!!form.is_headquarters} onChange={(e) => setForm((f) => ({ ...f, is_headquarters: e.target.checked }))} />
          {t('المقر الرئيسي')}
        </label>
        {editing && <Field label={t('الحالة')}><Select value={form.status} onChange={set('status')}><option value="نشط">{t('نشط')}</option><option value="مغلق">{t('مغلق')}</option></Select></Field>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="w-4 h-4 text-slate-300 shrink-0" />
      <span className="text-xs text-slate-400 w-28 shrink-0">{label}</span>
      <span className="text-sm text-slate-700 truncate">{value}</span>
    </div>
  )
}

export default function Company() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [editProfile, setEditProfile] = useState(false)
  const [branchForm, setBranchForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const { data, isLoading } = useQuery('company', () => companyApi.get())
  const del = useMutation((id) => companyApi.removeBranch(id), {
    onSuccess: () => { toast.success(t('تم الحذف')); qc.invalidateQueries('company') },
    onError: () => toast.error(t('فشل الحذف')),
  })

  const openNewBranch = () => { setEditingBranch(null); setBranchForm(true) }
  const openEditBranch = (b) => { setEditingBranch(b); setBranchForm(true) }

  if (isLoading) return <Spinner fullscreen />
  const p = data?.profile || {}
  const branches = data?.branches || []

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><Building2 className="w-8 h-8" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{p.name}</h2>
              <p className="text-sm text-slate-400">{p.legal_name}</p>
              {p.industry && <span className="badge bg-blue-50 text-blue-700 mt-1 inline-block">{p.industry}</span>}
            </div>
          </div>
          {canManage && <Button variant="secondary" onClick={() => setEditProfile(true)}><Pencil className="w-4 h-4" /> {t('تعديل')}</Button>}
        </div>
        {p.about && <p className="text-sm text-slate-600 leading-relaxed mt-4">{p.about}</p>}
        <div className="grid md:grid-cols-2 gap-x-8 mt-4 pt-4 border-t border-slate-100">
          <div>
            <InfoRow icon={Hash} label={t('السجل التجاري')} value={p.cr_number} />
            <InfoRow icon={Hash} label={t('الرقم الضريبي')} value={p.tax_number} />
            <InfoRow icon={Users} label={t('حجم المؤسسة')} value={p.size} />
            <InfoRow icon={Calendar} label={t('سنة التأسيس')} value={p.founded_year} />
          </div>
          <div>
            <InfoRow icon={Phone} label={t('الهاتف')} value={p.phone} />
            <InfoRow icon={Mail} label={t('البريد')} value={p.email} />
            <InfoRow icon={Globe} label={t('الموقع', { context: 'website' })} value={p.website} />
            <InfoRow icon={MapPin} label={t('العنوان')} value={[p.address, p.city, p.country].filter(Boolean).join('، ')} />
          </div>
        </div>
      </div>

      {/* Branches */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-5 h-5 text-slate-400" /> {t('الفروع ({{count}})', { count: branches.length })}</h3>
        {canManage && <Button onClick={openNewBranch}><Plus className="w-5 h-5" /> {t('فرع جديد')}</Button>}
      </div>

      {branches.length === 0 ? (
        <div className="card"><EmptyState icon={Briefcase} title={t('لا توجد فروع')} /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <div key={b.id} className={`card ${b.status === 'مغلق' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">{b.name}</h4>
                  {b.is_headquarters ? <span className="badge bg-amber-50 text-amber-700 flex items-center gap-1"><Star className="w-3 h-3" /> {t('رئيسي')}</span> : null}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEditBranch(b)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => window.confirm(t('حذف الفرع؟')) && del.mutate(b.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                {b.city && <p className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-300" /> {b.city}{b.address ? ` — ${b.address}` : ''}</p>}
                {b.phone && <p className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4 text-slate-300" /> {b.phone}</p>}
              </div>
              {b.manager_name && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                  <Avatar name={b.manager_name} size="sm" />
                  <div><p className="text-xs font-medium text-slate-700">{b.manager_name}</p><p className="text-[10px] text-slate-400">{t('مدير الفرع')}</p></div>
                  <div className="mr-auto"><Badge status={b.status}>{t(b.status)}</Badge></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editProfile && <ProfileForm open={editProfile} onClose={() => setEditProfile(false)} profile={p} />}
      {branchForm && <BranchForm open={branchForm} onClose={() => setBranchForm(false)} editing={editingBranch} />}
    </div>
  )
}
