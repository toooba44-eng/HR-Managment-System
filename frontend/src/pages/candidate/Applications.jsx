import { useQuery } from 'react-query'
import { ListChecks, MapPin, Building2, CheckCircle2 } from 'lucide-react'
import { applicationsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { formatDate } from '../../lib/utils'

const STEPS = ['قيد المراجعة', 'مقابلة', 'مقبول']

function Tracker({ status }) {
  const rejected = status === 'مرفوض'
  const currentIdx = STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-1 mt-3">
      {STEPS.map((s, i) => {
        const done = !rejected && i <= currentIdx
        return (
          <div key={s} className="flex-1 flex items-center gap-1">
            <div className={`h-1.5 flex-1 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-100'}`} />
          </div>
        )
      })}
    </div>
  )
}

export default function Applications() {
  const { data: apps = [], isLoading } = useQuery('my-applications', applicationsApi.mine)

  if (isLoading) return <Spinner fullscreen />

  return (
    <div className="space-y-4">
      {apps.length === 0 ? (
        <div className="card">
          <EmptyState icon={ListChecks} title="لا توجد طلبات" description="تصفّح الوظائف وقدّم على ما يناسبك." />
        </div>
      ) : (
        apps.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800">{a.job_title}</h3>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {a.job_department || '—'}</span>
                  {a.job_location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {a.job_location}</span>}
                  <span>تاريخ التقديم: {formatDate(a.created_at)}</span>
                </div>
              </div>
              <Badge status={a.status} />
            </div>
            <Tracker status={a.status} />
            {a.status === 'مقبول' && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تهانينا! تم قبول طلبك — سيتواصل معك فريق التوظيف.
              </p>
            )}
          </div>
        ))
      )}
    </div>
  )
}
