import { useQuery } from 'react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts'
import {
  Users, UserCheck, CalendarClock, Building2,
  Clock, TrendingUp,
} from 'lucide-react'
import { dashboardApi } from '../api/endpoints'
import StatCard from '../components/ui/StatCard'
import Avatar from '../components/ui/Avatar'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { formatDate, formatTime } from '../lib/utils'

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery('dashboard-stats', dashboardApi.stats)
  const { data: chart = [] } = useQuery('attendance-chart', dashboardApi.attendanceChart)
  const { data: distribution = [] } = useQuery('dept-distribution', dashboardApi.departmentDistribution)
  const { data: upcoming = [] } = useQuery('upcoming-leaves', dashboardApi.upcomingLeaves)

  if (isLoading) return <Spinner fullscreen />

  const chartData = chart.map((d) => ({
    name: WEEKDAYS[new Date(d.date).getDay()],
    حاضر: d.present || 0,
    غائب: d.absent || 0,
    متأخر: d.late || 0,
  }))

  const pieData = distribution.map((d) => ({
    name: d.name,
    value: d.count,
    color: d.color || '#3B82F6',
  }))

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="إجمالي الموظفين"
          value={stats?.employees?.total ?? 0}
          tone="blue"
          hint={`${stats?.employees?.newThisMonth ?? 0} جديد هذا الشهر`}
        />
        <StatCard
          icon={UserCheck}
          label="حاضر اليوم"
          value={stats?.attendance?.present ?? 0}
          tone="green"
          hint={`${stats?.attendance?.remote ?? 0} عن بعد`}
        />
        <StatCard
          icon={CalendarClock}
          label="إجازات معلقة"
          value={stats?.pendingLeaves ?? 0}
          tone="amber"
        />
        <StatCard
          icon={Building2}
          label="الإدارات"
          value={stats?.departments ?? 0}
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly attendance */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800">الحضور الأسبوعي</h3>
              <p className="text-sm text-slate-400">آخر 7 أيام</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          {chartData.length === 0 ? (
            <EmptyState title="لا توجد بيانات حضور" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: 'Tajawal' }} />
                <Bar dataKey="حاضر" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="متأخر" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="غائب" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department distribution */}
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-6">توزيع الموظفين</h3>
          {pieData.length === 0 ? (
            <EmptyState title="لا توجد إدارات" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontFamily: 'Tajawal' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-4">النشاط الأخير</h3>
          {!stats?.recentActivity?.length ? (
            <EmptyState icon={Clock} title="لا يوجد نشاط اليوم" />
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Avatar name={a.full_name} src={a.profile_picture} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{a.full_name}</p>
                    <p className="text-xs text-slate-400">{a.action}</p>
                  </div>
                  <span className="text-xs text-slate-400">{a.timestamp ? formatTime(a.timestamp) : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming leaves */}
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-4">الإجازات القادمة</h3>
          {!upcoming.length ? (
            <EmptyState icon={CalendarClock} title="لا توجد إجازات قادمة" />
          ) : (
            <div className="space-y-3">
              {upcoming.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-2">
                  <Avatar name={l.full_name} src={l.profile_picture} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{l.full_name}</p>
                    <p className="text-xs text-slate-400">{l.type} · {l.days_count} أيام</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(l.start_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
