import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Grid2x2, TrendingDown } from 'lucide-react'
import { skillsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'

const LEVEL_TONE = {
  1: 'bg-rose-100 text-rose-700 border-rose-200',
  2: 'bg-amber-100 text-amber-700 border-amber-200',
  3: 'bg-sky-100 text-sky-700 border-sky-200',
  4: 'bg-blue-100 text-blue-700 border-blue-200',
  5: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export default function MySkills() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery('my-skills', () => skillsApi.me())

  if (isLoading) return <Spinner fullscreen />
  const skills = data?.skills || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={Grid2x2} label={t('مهارات مُقيَّمة')} value={skills.length} tone="blue" />
        <StatCard icon={TrendingDown} label={t('فجوات تحتاج تطوير (≤2)')} value={data?.gaps ?? 0} tone="rose" />
      </div>

      {skills.length === 0 ? (
        <div className="card">
          <EmptyState icon={Grid2x2} title={t('لا توجد مهارات مُقيَّمة بعد')} description={t('يقوم مديرك المباشر أو الموارد البشرية بتقييم مهاراتك دورياً.')} />
        </div>
      ) : (
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-4">{t('مصفوفة مهاراتي')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skills.map((s) => (
              <div key={s.skill} className={`rounded-xl border p-3 flex items-center justify-between ${LEVEL_TONE[s.level]}`}>
                <span className="font-medium text-sm">{s.skill}</span>
                <span className="text-xs font-bold whitespace-nowrap">{s.level} · {s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
