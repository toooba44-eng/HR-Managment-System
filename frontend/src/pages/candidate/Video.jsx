import { useQuery } from 'react-query'
import { Video, Clock, ExternalLink, CheckCircle2, Wifi, Camera, Mic } from 'lucide-react'
import { candidateApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { formatDate } from '../../lib/utils'

const TIPS = [
  { icon: Wifi, text: 'تأكد من استقرار اتصال الإنترنت' },
  { icon: Camera, text: 'اختبر الكاميرا والإضاءة مسبقاً' },
  { icon: Mic, text: 'تأكد من عمل الميكروفون في مكان هادئ' },
]

export default function CandidateVideo() {
  const { data, isLoading } = useQuery(['cand-interviews', 'فيديو'], () => candidateApi.interviews({ mode: 'فيديو' }))
  if (isLoading) return <Spinner fullscreen />
  const items = data?.interviews || []
  const next = items.find((i) => i.status === 'مجدولة')

  return (
    <div className="space-y-6">
      {next ? (
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600"><Video className="w-7 h-7" /></div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">{next.job_title}</h2>
              <p className="text-sm text-slate-400 flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDate(next.scheduled_at)} · {next.stage}</p>
            </div>
            <Badge status={next.status} />
          </div>
          {next.meeting_link && (
            <a href={next.meeting_link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 mt-4 w-full py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700">
              <Video className="w-5 h-5" /> الانضمام لمقابلة الفيديو <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700 mb-3">نصائح قبل المقابلة</p>
            <div className="space-y-2">
              {TIPS.map((t) => (
                <div key={t.text} className="flex items-center gap-2 text-sm text-slate-600"><t.icon className="w-4 h-4 text-slate-300" /> {t.text}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card"><EmptyState icon={Video} title="لا توجد مقابلات فيديو مجدولة" /></div>
      )}

      {items.filter((i) => i.status !== 'مجدولة').length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-3">مقابلات سابقة</h3>
          <div className="space-y-2">
            {items.filter((i) => i.status !== 'مجدولة').map((iv) => (
              <div key={iv.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="flex-1 text-sm text-slate-700">{iv.job_title} · {iv.stage}</span>
                <span className="text-xs text-slate-400">{formatDate(iv.scheduled_at)}</span>
                <Badge status={iv.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
