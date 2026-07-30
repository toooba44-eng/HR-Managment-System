import { useQuery } from 'react-query'
import { CalendarDays, Video, MapPin, Phone, Clock, ExternalLink } from 'lucide-react'
import { candidateApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { formatDate } from '../../lib/utils'

const MODE_ICON = { حضوري: MapPin, فيديو: Video, هاتفي: Phone }

export default function CandidateInterview() {
  const { data, isLoading } = useQuery('cand-interviews', () => candidateApi.interviews())
  if (isLoading) return <Spinner fullscreen />
  const items = data?.interviews || []
  const upcoming = items.filter((i) => i.status === 'مجدولة')

  return (
    <div className="space-y-6">
      {upcoming[0] && (
        <div className="card bg-gradient-to-br from-blue-600 to-violet-700 text-white">
          <p className="text-xs text-white/70">مقابلتك القادمة</p>
          <h2 className="text-xl font-bold mt-1">{upcoming[0].job_title}</h2>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/90">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDate(upcoming[0].scheduled_at)}</span>
            <span className="badge bg-white/20 text-white">{upcoming[0].mode}</span>
            <span className="badge bg-white/20 text-white">{upcoming[0].stage}</span>
          </div>
          {upcoming[0].meeting_link && (
            <a href={upcoming[0].meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-4 px-4 py-2 rounded-xl bg-white text-blue-700 text-sm font-medium hover:bg-white/90">
              <Video className="w-4 h-4" /> الانضمام للمقابلة
            </a>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={CalendarDays} title="لا توجد مقابلات مجدولة" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((iv) => {
            const Icon = MODE_ICON[iv.mode] || CalendarDays
            return (
              <div key={iv.id} className="card flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Icon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{iv.job_title}</p>
                  <p className="text-xs text-slate-400">{iv.stage} · {iv.mode}{iv.location ? ` · ${iv.location}` : ''}</p>
                  {iv.notes && <p className="text-xs text-slate-500 mt-1">{iv.notes}</p>}
                </div>
                <div className="text-left shrink-0">
                  <Badge status={iv.status} />
                  <p className="text-xs text-slate-400 mt-1">{formatDate(iv.scheduled_at)}</p>
                  {iv.status === 'مجدولة' && iv.meeting_link && (
                    <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"><ExternalLink className="w-3 h-3" /> رابط</a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
