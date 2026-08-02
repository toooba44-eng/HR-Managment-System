import { useQuery } from 'react-query'
import { ShieldAlert } from 'lucide-react'
import { grievancesApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { formatDate } from '../../lib/utils'

const TYPE_LABEL = { شكوى: 'شكوى مقدَّمة', مخالفة: 'مخالفة إدارية' }

export default function MyGrievances() {
  const { data = [], isLoading } = useQuery('my-grievances', () => grievancesApi.mine())

  if (isLoading) return <Spinner fullscreen />

  return (
    <div className="space-y-6">
      {data.length === 0 ? (
        <div className="card">
          <EmptyState icon={ShieldAlert} title="لا توجد حالات مسجّلة" description="لا توجد لديك أي شكاوى أو مخالفات مسجّلة حالياً." />
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((g) => (
            <div key={g.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{TYPE_LABEL[g.type] || g.type}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{g.category} · {formatDate(g.created_at)}</p>
                </div>
                <Badge status={g.status} />
              </div>
              {g.action && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">الإجراء المتخذ:</span> {g.action}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
