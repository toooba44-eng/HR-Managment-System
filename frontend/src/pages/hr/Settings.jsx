import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Globe, Clock, Shield, ShieldCheck, Save, Users, Landmark } from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { ROLE_LABELS } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'super_admin']
const WEEK_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'right-0.5' : 'right-[22px]'}`} />
      </button>
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="card">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Icon className="w-5 h-5 text-slate-400" /> {title}</h3>
      {children}
    </div>
  )
}

export default function Settings() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const { data, isLoading } = useQuery('settings', () => settingsApi.get())
  const [form, setForm] = useState(null)

  useEffect(() => { if (data?.settings) setForm(data.settings) }, [data])

  const m = useMutation((d) => settingsApi.update(d), {
    onSuccess: () => { toast.success('تم حفظ الإعدادات'); qc.invalidateQueries('settings') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل الحفظ'),
  })

  if (isLoading || !form) return <Spinner fullscreen />
  const roles = data?.roles || []
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setBool = (k) => (v) => setForm((f) => ({ ...f, [k]: v ? 1 : 0 }))

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard icon={Globe} title="الإعدادات العامة">
          <div className="grid grid-cols-2 gap-4">
            <Field label="العملة"><Input value={form.currency || ''} onChange={set('currency')} disabled={!canManage} /></Field>
            <Field label="اللغة"><Input value={form.language || ''} onChange={set('language')} disabled={!canManage} /></Field>
            <Field label="المنطقة الزمنية"><Input value={form.timezone || ''} onChange={set('timezone')} disabled={!canManage} /></Field>
            <Field label="بداية الأسبوع"><Select value={form.week_start} onChange={set('week_start')} disabled={!canManage}>{WEEK_DAYS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
            <Field label="بداية السنة المالية"><Select value={form.fiscal_year_start} onChange={set('fiscal_year_start')} disabled={!canManage}>{MONTHS.map((mo) => <option key={mo}>{mo}</option>)}</Select></Field>
          </div>
        </SectionCard>

        <SectionCard icon={Clock} title="الدوام والإجازات">
          <div className="grid grid-cols-2 gap-4">
            <Field label="أيام العمل بالأسبوع"><Input type="number" min="1" max="7" value={form.work_days_per_week} onChange={set('work_days_per_week')} disabled={!canManage} /></Field>
            <Field label="ساعات العمل باليوم"><Input type="number" min="1" max="24" value={form.work_hours_per_day} onChange={set('work_hours_per_day')} disabled={!canManage} /></Field>
            <Field label="فترة التجربة (شهور)"><Input type="number" min="0" value={form.probation_months} onChange={set('probation_months')} disabled={!canManage} /></Field>
            <Field label="الإجازة السنوية (أيام)"><Input type="number" min="0" value={form.annual_leave_days} onChange={set('annual_leave_days')} disabled={!canManage} /></Field>
            <Field label="الإجازة المرضية (أيام)"><Input type="number" min="0" value={form.sick_leave_days} onChange={set('sick_leave_days')} disabled={!canManage} /></Field>
          </div>
        </SectionCard>
      </div>

      <SectionCard icon={Landmark} title="حماية الأجور (WPS)">
        <p className="text-xs text-slate-400 mb-3">بيانات المنشأة المطلوبة لتوليد ملف حماية الأجور من مسيرات الرواتب المعتمدة.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم المنشأة (المكتب)"><Input value={form.wps_establishment_id || ''} onChange={set('wps_establishment_id')} disabled={!canManage} /></Field>
          <Field label="رمز البنك"><Input value={form.wps_bank_code || ''} onChange={set('wps_bank_code')} disabled={!canManage} /></Field>
          <Field label="آيبان المنشأة (SA + 22 رقماً)"><Input value={form.wps_employer_iban || ''} onChange={set('wps_employer_iban')} disabled={!canManage} className="font-mono" /></Field>
        </div>
      </SectionCard>

      <SectionCard icon={Shield} title="الأمان والسياسات العامة">
        <Toggle label="احتساب العمل الإضافي" hint="تفعيل تسجيل واحتساب ساعات العمل الإضافي" checked={!!form.overtime_enabled} onChange={setBool('overtime_enabled')} disabled={!canManage} />
        <Toggle label="العمل عن بُعد" hint="السماح للموظفين بالعمل عن بُعد" checked={!!form.remote_work_enabled} onChange={setBool('remote_work_enabled')} disabled={!canManage} />
        <Toggle label="الخدمة الذاتية للموظفين" hint="تمكين بوابة الخدمة الذاتية" checked={!!form.self_service_enabled} onChange={setBool('self_service_enabled')} disabled={!canManage} />
        <Toggle label="المصادقة الثنائية إلزامية" hint="فرض التحقق بخطوتين على جميع المستخدمين" checked={!!form.two_factor_required} onChange={setBool('two_factor_required')} disabled={!canManage} />
      </SectionCard>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => m.mutate(form)} loading={m.isLoading}><Save className="w-5 h-5" /> حفظ الإعدادات</Button>
        </div>
      )}

      <SectionCard icon={Users} title="الأدوار والصلاحيات">
        <div className="grid gap-3 md:grid-cols-2">
          {roles.map((r) => (
            <div key={r.role} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><ShieldCheck className="w-4 h-4" /></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{r.label || ROLE_LABELS[r.role] || r.role}</p>
                    <p className="text-[11px] text-slate-400">النطاق: {r.scope}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {r.access.map((a) => <span key={a} className="badge bg-slate-50 text-slate-600">{a}</span>)}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4">نموذج الصلاحيات ثابت حسب الأدوار المعرّفة في النظام.</p>
      </SectionCard>
    </div>
  )
}
