import { useState } from 'react'
import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronLeft, CalendarDays, Users, AlertTriangle } from 'lucide-react'
import { leavesApi } from '../api/endpoints'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Avatar from '../components/ui/Avatar'
import StatCard from '../components/ui/StatCard'

const TYPE_TONE = {
  سنوية: '#3b82f6', مرضية: '#f59e0b', طارئة: '#ef4444', أمومة: '#ec4899', أبوة: '#8b5cf6',
  زواج: '#10b981', وفاة: '#64748b', 'بدون راتب': '#94a3b8', دراسة: '#06b6d4',
}
const monthLabel = (ym, lang) => {
  const [y, m] = ym.split('-').map(Number)
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ar-SA', { year: 'numeric', month: 'long' }).format(new Date(y, m - 1, 1))
}
const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function LeaveCalendar() {
  const { t, i18n } = useTranslation()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const { data, isLoading } = useQuery(['leave-calendar', month], () => leavesApi.calendar(month))

  if (isLoading) return <Spinner fullscreen />
  const days = data?.days_in_month || 30
  const leaves = data?.leaves || []
  const perDay = data?.per_day || []
  const s = data?.summary || {}
  const [y, m] = month.split('-').map(Number)
  const isWeekend = (d) => { const dow = new Date(y, m - 1, d).getDay(); return dow === 5 || dow === 6 }

  // group leaves per employee for rows
  const byEmp = {}
  for (const l of leaves) { (byEmp[l.employee_id] = byEmp[l.employee_id] || { name: l.full_name, picture: l.profile_picture, items: [] }).items.push(l) }
  const rows = Object.entries(byEmp)
  const clampDay = (date, fallback) => {
    if (!date) return fallback
    const [dy, dm, dd] = date.split('-').map(Number)
    if (dy < y || (dy === y && dm < m)) return 1
    if (dy > y || (dy === y && dm > m)) return days
    return dd
  }
  const gridCols = { gridTemplateColumns: `repeat(${days}, minmax(14px, 1fr))` }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label={t('موظفون في إجازة')} value={s.people ?? 0} tone="blue" />
        <StatCard icon={CalendarDays} label={t('إجمالي الطلبات')} value={s.total ?? 0} tone="violet" />
        <StatCard icon={AlertTriangle} label={t('أعلى تزامن (يوم)')} value={s.peak ?? 0} tone="amber" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">{monthLabel(month, i18n.language)}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth((mo) => shiftMonth(mo, -1))} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><ChevronRight className="w-5 h-5" /></button>
            <button onClick={() => setMonth(new Date().toISOString().slice(0, 7))} className="text-sm px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100">{t('الشهر الحالي')}</button>
            <button onClick={() => setMonth((mo) => shiftMonth(mo, 1))} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><ChevronLeft className="w-5 h-5" /></button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('لا توجد إجازات في هذا الشهر')} />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              {/* Day header + concurrency heat */}
              <div className="flex">
                <div className="w-40 shrink-0" />
                <div className="flex-1 grid gap-px" style={gridCols}>
                  {Array.from({ length: days }, (_, i) => {
                    const d = i + 1
                    const cnt = perDay[i]?.count || 0
                    const heat = cnt === 0 ? '' : cnt === 1 ? 'bg-blue-100' : cnt === 2 ? 'bg-amber-200' : 'bg-rose-300'
                    return (
                      <div key={d} className={`text-center text-[10px] py-1 rounded-t ${isWeekend(d) ? 'text-slate-300' : 'text-slate-400'} ${heat}`} title={t('{{count}} في إجازة', { count: cnt })}>{d}</div>
                    )
                  })}
                </div>
              </div>

              {/* Employee rows */}
              <div className="space-y-1 mt-1">
                {rows.map(([empId, row]) => (
                  <div key={empId} className="flex items-center">
                    <div className="w-40 shrink-0 flex items-center gap-2 pl-2">
                      <Avatar name={row.name} src={row.picture} size="sm" />
                      <span className="text-xs font-medium text-slate-700 truncate">{row.name}</span>
                    </div>
                    <div className="flex-1 grid gap-px h-8 items-center" style={gridCols}>
                      {Array.from({ length: days }, (_, i) => (
                        <div key={i} className={`h-8 rounded ${isWeekend(i + 1) ? 'bg-slate-50' : 'bg-slate-100/40'}`} style={{ gridColumn: `${i + 1} / ${i + 2}`, gridRow: 1 }} />
                      ))}
                      {row.items.map((l) => {
                        const startD = clampDay(l.start_date, 1)
                        const endD = clampDay(l.end_date, days)
                        const color = TYPE_TONE[l.type] || '#3b82f6'
                        return (
                          <div
                            key={l.id}
                            className={`h-6 rounded-md flex items-center px-1.5 overflow-hidden ${l.status === 'معلقة' ? 'border-2 border-dashed' : ''}`}
                            style={{ gridColumn: `${startD} / ${endD + 1}`, gridRow: 1, backgroundColor: l.status === 'معلقة' ? 'transparent' : color, borderColor: color }}
                            title={t('{{type}} · {{start}} → {{end}} ({{count}} أيام)', { type: t(l.type), start: l.start_date, end: l.end_date, count: l.days_count })}
                          >
                            <span className={`text-[10px] font-medium truncate ${l.status === 'معلقة' ? 'text-slate-600' : 'text-white'}`}>{t(l.type)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
          {Object.entries(TYPE_TONE).slice(0, 6).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded" style={{ backgroundColor: color }} /> {t(type)}</div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded border-2 border-dashed border-slate-400" /> {t('معلقة')}</div>
        </div>
      </div>
    </div>
  )
}
