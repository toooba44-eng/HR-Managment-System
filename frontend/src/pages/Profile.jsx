import { useState } from 'react'
import { useQuery } from 'react-query'
import { Mail, Building2, Briefcase, Lock, KeyRound, ShieldCheck, ShieldOff, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi, employeesApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import Spinner from '../components/ui/Spinner'
import { Field, Input, Button } from '../components/ui/Form'
import { ROLE_LABELS, formatDate } from '../lib/utils'

function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) {
      toast.error('كلمتا المرور غير متطابقتين')
      return
    }
    if (form.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setLoading(true)
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('تم تغيير كلمة المرور')
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تغيير كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-primary-600" />
        <h3 className="font-bold text-slate-800">تغيير كلمة المرور</h3>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="كلمة المرور الحالية" required>
          <Input type="password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="كلمة المرور الجديدة" required>
            <Input type="password" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} required />
          </Field>
          <Field label="تأكيد كلمة المرور" required>
            <Input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            <Lock className="w-4 h-4" />
            تحديث كلمة المرور
          </Button>
        </div>
      </form>
    </div>
  )
}

function TwoFactorSection() {
  const { user, refreshUser } = useAuthStore()
  const [setup, setSetup] = useState(null)
  const [code, setCode] = useState('')
  const [enabling, setEnabling] = useState(false)
  const [showDisable, setShowDisable] = useState(false)
  const [password, setPassword] = useState('')
  const [disabling, setDisabling] = useState(false)

  const startSetup = async () => {
    try {
      const data = await authApi.setupTwoFactor()
      setSetup(data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل بدء الإعداد')
    }
  }

  const confirmEnable = async (e) => {
    e.preventDefault()
    setEnabling(true)
    try {
      await authApi.enableTwoFactor(code)
      toast.success('تم تفعيل التحقق بخطوتين')
      setSetup(null)
      setCode('')
      await refreshUser()
    } catch (err) {
      toast.error(err.response?.data?.error || 'رمز التحقق غير صحيح')
    } finally {
      setEnabling(false)
    }
  }

  const confirmDisable = async (e) => {
    e.preventDefault()
    setDisabling(true)
    try {
      await authApi.disableTwoFactor(password)
      toast.success('تم تعطيل التحقق بخطوتين')
      setShowDisable(false)
      setPassword('')
      await refreshUser()
    } catch (err) {
      toast.error(err.response?.data?.error || 'كلمة المرور غير صحيحة')
    } finally {
      setDisabling(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard?.writeText(setup.secret)
    toast.success('تم نسخ المفتاح')
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary-600" />
          <h3 className="font-bold text-slate-800">التحقق بخطوتين (2FA)</h3>
        </div>
        {user?.two_factor_enabled && <span className="badge bg-emerald-50 text-emerald-600">مُفعَّل</span>}
      </div>

      {user?.two_factor_enabled ? (
        showDisable ? (
          <form onSubmit={confirmDisable} className="space-y-3">
            <Field label="كلمة المرور لتأكيد التعطيل" required>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowDisable(false)}>إلغاء</Button>
              <Button type="submit" loading={disabling}><ShieldOff className="w-4 h-4" /> تعطيل</Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">حسابك محمي برمز تحقق من تطبيق مصادقة عند كل تسجيل دخول.</p>
            <Button variant="secondary" onClick={() => setShowDisable(true)} className="shrink-0"><ShieldOff className="w-4 h-4" /> تعطيل</Button>
          </div>
        )
      ) : setup ? (
        <form onSubmit={confirmEnable} className="space-y-4">
          <p className="text-sm text-slate-500">أضف هذا المفتاح إلى تطبيق مصادقة (Google Authenticator أو ما شابه) ثم أدخل الرمز الظاهر للتأكيد.</p>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3">
            <code className="text-sm font-mono tracking-wider flex-1 break-all">{setup.secret}</code>
            <button type="button" onClick={copySecret} className="text-slate-400 hover:text-primary-600 shrink-0"><Copy className="w-4 h-4" /></button>
          </div>
          <Field label="رمز التحقق" required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center tracking-[0.5em] font-mono"
              maxLength={6}
              required
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => { setSetup(null); setCode('') }}>إلغاء</Button>
            <Button type="submit" loading={enabling} disabled={code.length !== 6}>تأكيد التفعيل</Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">أضف طبقة حماية إضافية على حسابك باستخدام تطبيق مصادقة.</p>
          <Button onClick={startSetup} className="shrink-0"><ShieldCheck className="w-4 h-4" /> تفعيل</Button>
        </div>
      )}
    </div>
  )
}

export default function Profile() {
  const { user } = useAuthStore()
  const { data: emp, isLoading } = useQuery(
    ['employee', user?.employee_id],
    () => employeesApi.get(user.employee_id),
    { enabled: !!user?.employee_id }
  )

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <Avatar name={user?.full_name || user?.email} src={user?.profile_picture} size="xl" />
          <div className="text-center sm:text-right flex-1">
            <h1 className="text-2xl font-extrabold text-slate-800">{user?.full_name || user?.email}</h1>
            <p className="text-slate-500">{user?.job_title || ROLE_LABELS[user?.role]}</p>
            <div className="flex flex-wrap gap-4 mt-3 justify-center sm:justify-start text-sm text-slate-400">
              <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {user?.email}</span>
              <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {ROLE_LABELS[user?.role]}</span>
              {user?.department_name && (
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {user.department_name}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Spinner fullscreen />
      ) : emp && (
        <div className="card grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-600">{emp.annual_leave_balance ?? 0}</p>
            <p className="text-xs text-slate-400">إجازة سنوية</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{emp.sick_leave_balance ?? 0}</p>
            <p className="text-xs text-slate-400">إجازة مرضية</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{emp.emergency_leave_balance ?? 0}</p>
            <p className="text-xs text-slate-400">إجازة طارئة</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 mt-2">{formatDate(emp.hire_date)}</p>
            <p className="text-xs text-slate-400">تاريخ التعيين</p>
          </div>
        </div>
      )}

      <TwoFactorSection />
      <ChangePassword />
    </div>
  )
}
