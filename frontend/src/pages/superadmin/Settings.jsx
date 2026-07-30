import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Globe, ShieldCheck, Save, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import { saConfigApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import { Field, Input, Select, Button } from '../../components/ui/Form'

function Toggle({ label, hint, checked, onChange, danger }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? (danger ? 'bg-rose-500' : 'bg-blue-600') : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'right-0.5' : 'right-[22px]'}`} />
      </button>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Icon className="w-5 h-5 text-slate-400" /> {title}</h3>
      {children}
    </div>
  )
}

export default function PlatformSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery('platform-settings', () => saConfigApi.settings())
  const [form, setForm] = useState(null)
  useEffect(() => { if (data?.settings) setForm(data.settings) }, [data])
  const m = useMutation((d) => saConfigApi.updateSettings(d), {
    onSuccess: () => { toast.success('تم حفظ الإعدادات'); qc.invalidateQueries('platform-settings') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل الحفظ'),
  })

  if (isLoading || !form) return <Spinner fullscreen />
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setBool = (k) => (v) => setForm((f) => ({ ...f, [k]: v ? 1 : 0 }))

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Section icon={Globe} title="الإعدادات العامة">
          <div className="space-y-4">
            <Field label="اسم المنصة"><Input value={form.platform_name || ''} onChange={set('platform_name')} /></Field>
            <Field label="بريد الدعم"><Input type="email" value={form.support_email || ''} onChange={set('support_email')} /></Field>
            <Field label="الباقة الافتراضية"><Select value={form.default_plan} onChange={set('default_plan')}><option>أساسية</option><option>احترافية</option><option>مؤسسية</option></Select></Field>
          </div>
        </Section>

        <Section icon={SlidersHorizontal} title="الحدود">
          <div className="space-y-4">
            <Field label="مهلة الجلسة (دقيقة)"><Input type="number" min="5" value={form.session_timeout_min} onChange={set('session_timeout_min')} /></Field>
            <Field label="الحد الأقصى لرفع الملفات (MB)"><Input type="number" min="1" value={form.max_upload_mb} onChange={set('max_upload_mb')} /></Field>
          </div>
        </Section>
      </div>

      <Section icon={ShieldCheck} title="التشغيل والأمان">
        <Toggle label="السماح بالتسجيل الذاتي" hint="تمكين المؤسسات الجديدة من التسجيل تلقائياً" checked={!!form.signups_enabled} onChange={setBool('signups_enabled')} />
        <Toggle label="وضع الصيانة" hint="إيقاف الوصول مؤقتاً لجميع المؤسسات" checked={!!form.maintenance_mode} onChange={setBool('maintenance_mode')} danger />
      </Section>

      <div className="flex justify-end"><Button onClick={() => m.mutate(form)} loading={m.isLoading}><Save className="w-5 h-5" /> حفظ الإعدادات</Button></div>
    </div>
  )
}
