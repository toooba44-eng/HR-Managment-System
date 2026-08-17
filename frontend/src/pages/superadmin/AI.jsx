import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Bot, Save, ScanSearch, MessageCircle, LineChart, FileText, Sparkles, MessagesSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { saConfigApi, assistantApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatDate } from '../../lib/utils'

const INTENT_LABEL = { leave_balance: 'رصيد الإجازات', payslip: 'الراتب', attendance: 'الحضور', policies: 'السياسات', fallback: 'أخرى' }

const FEATURES = [
  { key: 'resume_screening', icon: ScanSearch, label: 'فرز السير الذاتية', hint: 'تحليل وترتيب المرشحين آلياً' },
  { key: 'chatbot', icon: MessageCircle, label: 'المساعد الذكي', hint: 'روبوت محادثة لخدمة الموظفين' },
  { key: 'insights', icon: LineChart, label: 'التحليلات الذكية', hint: 'توصيات ورؤى تعتمد على البيانات' },
  { key: 'auto_summaries', icon: FileText, label: 'الملخّصات التلقائية', hint: 'تلخيص التقارير والمستندات' },
]

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-200'} ${disabled ? 'opacity-40' : ''}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'right-0.5' : 'right-[22px]'}`} />
    </button>
  )
}

export default function AI() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery('ai-settings', () => saConfigApi.ai())
  const { data: logsData } = useQuery('assistant-logs', () => assistantApi.logs())
  const [form, setForm] = useState(null)
  useEffect(() => { if (data?.ai) setForm(data.ai) }, [data])
  const m = useMutation((d) => saConfigApi.updateAi(d), {
    onSuccess: () => { toast.success(t('تم حفظ الإعدادات')); qc.invalidateQueries('ai-settings') },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل الحفظ')),
  })

  if (isLoading || !form) return <Spinner fullscreen />
  const on = !!form.enabled
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setBool = (k, v) => setForm((f) => ({ ...f, [k]: v ? 1 : 0 }))

  return (
    <div className="space-y-6">
      <div className={`card ${on ? 'bg-gradient-to-br from-violet-600 to-blue-700 text-white' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${on ? 'bg-white/20' : 'bg-violet-50 text-violet-600'}`}><Sparkles className="w-6 h-6" /></div>
            <div>
              <p className="font-bold text-lg">{t('ميزات الذكاء الاصطناعي')}</p>
              <p className={`text-xs ${on ? 'text-white/80' : 'text-slate-400'}`}>{on ? t('مفعّلة على مستوى المنصة') : t('معطّلة')}</p>
            </div>
          </div>
          <Toggle checked={on} onChange={(v) => setBool('enabled', v)} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-slate-400" /> {t('المزوّد والنموذج')}</h3>
          <div className="space-y-4">
            <Field label={t('المزوّد')}><Select value={form.provider} onChange={set('provider')} disabled={!on}><option value="Claude">Claude</option><option value="OpenAI">OpenAI</option><option value="Gemini">Gemini</option></Select></Field>
            <Field label={t('النموذج')}><Input value={form.model || ''} onChange={set('model')} disabled={!on} /></Field>
            <Field label={t('حد الرموز الشهري (Tokens)')}><Input type="number" min="0" value={form.monthly_token_limit} onChange={set('monthly_token_limit')} disabled={!on} /></Field>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5 text-slate-400" /> {t('الميزات')}</h3>
          {FEATURES.map((f) => (
            <div key={f.key} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600"><f.icon className="w-4 h-4" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">{t(f.label)}</p>
                <p className="text-[11px] text-slate-400">{t(f.hint)}</p>
              </div>
              <Toggle checked={!!form[f.key]} onChange={(v) => setBool(f.key, v)} disabled={!on} />
            </div>
          ))}
        </div>
      </div>

      {logsData && logsData.total > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><MessagesSquare className="w-5 h-5 text-slate-400" /> {t('استخدام المساعد الذكي')}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(logsData.breakdown).map(([intent, count]) => (
              <span key={intent} className="badge bg-violet-50 text-violet-700">{t(INTENT_LABEL[intent] || intent)}: {count}</span>
            ))}
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {logsData.logs.slice(0, 20).map((l) => (
              <div key={l.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <Avatar name={l.full_name || '؟'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{l.message}</p>
                  <p className="text-[11px] text-slate-400">{l.full_name || t('مستخدم غير معروف')} · {formatDate(l.created_at)} · {t(INTENT_LABEL[l.intent] || l.intent)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end"><Button onClick={() => m.mutate(form)} loading={m.isLoading}><Save className="w-5 h-5" /> {t('حفظ الإعدادات')}</Button></div>
    </div>
  )
}
