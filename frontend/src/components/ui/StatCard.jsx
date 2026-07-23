import { cn } from '../../lib/utils'

const tones = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  cyan: 'bg-cyan-50 text-cyan-600',
}

export default function StatCard({ icon: Icon, label, value, tone = 'blue', hint }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{label}</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">{value}</p>
          {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', tones[tone])}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  )
}
