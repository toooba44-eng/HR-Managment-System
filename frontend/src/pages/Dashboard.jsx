import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts'
import {
  Users, UserCheck, CalendarClock, Building2, Clock, TrendingUp, UserPlus,
  UserMinus, ShieldCheck, Repeat, AlertTriangle, FileWarning, Briefcase, Video,
  Cake, Award, ClipboardList, Wallet, FileText, CheckSquare, Gift,
} from 'lucide-react'
import { dashboardApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import StatCard from '../components/ui/StatCard'
import Avatar from '../components/ui/Avatar'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { formatDate, formatTime } from '../lib/utils'

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const HR_ROLES = ['admin', 'hr_manager', 'super_admin', 'department_head']
const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']

const QUICK_ACTIONS = [
  { to: '/employees', label: 'إضافة موظف', icon: UserPlus, tone: 'bg-blue-50 text-blue-600' },
  { to: '/hr/recruitment', label: 'إنشاء وظيفة', icon: Briefcase, tone: 'bg-violet-50 text-violet-600' },
  { to: '/attendance', label: 'الحضور', icon: Clock, tone: 'bg-emerald-50 text-emerald-600' },
  { to: '/leaves', label: 'إضافة إجازة', icon: CalendarClock, tone: 'bg-amber-50 text-amber-600' },
  { to: '/hr/payroll', label: 'تشغيل الرواتب', icon: Wallet, tone: 'bg-rose-50 text-rose-600' },
  { to: '/hr/reports', label: 'إنشاء تقرير', icon: FileText, tone: 'bg-cyan-50 text-cyan-600' },
  { to: '/hr/documents', label: 'إرسال مستند', icon: CheckSquare, tone: 'bg-indigo-50 text-indigo-600' },
]

function MiniStat({ icon: Icon, label, value, tone = 'text-slate-500' }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
      <Icon className={`w-5 h-5 ${tone}`} />
      <div>
        <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  )
}

function DistroCard({ title, data }) {
  const rows = (data || []).filter((d) => d.count > 0)
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <div className="card">
      <h3 className="font-bold text-slate-800 mb-4">{title}</h3>
      {rows.length === 0 ? <EmptyState title="لا توجد بيانات" /> : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={r.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">{r.name}</span>
                <span className="font-semibold text-slate-800">{r.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${total ? (r.count / total) * 100 : 0}%`, backgroundColor: r.color || PIE_COLORS[i % PIE_COLORS.length] }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HrDashboard() {
  const { data, isLoading } = useQuery('hr-overview', dashboardApi.hrOverview)
  if (isLoading) return <Spinner fullscreen />
  const w = data?.workforce || {}
  const a = data?.attendanceToday || {}
  const act = data?.actions || {}
  const dist = data?.distributions || {}
  const cel = data?.celebrations || {}
  const alerts = data?.alerts || []
  const deptPie = (dist.byDepartment || []).map((d, i) => ({ name: d.name, value: d.count, color: d.color || PIE_COLORS[i % PIE_COLORS.length] }))
  const trend = (data?.trend || []).map((t) => ({ name: t.month.slice(5), تعيينات: t.hired, استقالات: t.resigned }))

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {QUICK_ACTIONS.map((q) => (
          <Link key={q.label} to={q.to} className="card !p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${q.tone}`}><q.icon className="w-5 h-5" /></div>
            <span className="text-xs font-medium text-slate-600 leading-tight">{q.label}</span>
          </Link>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card border-r-4 border-amber-400">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber-500" /><h3 className="font-bold text-slate-800">تنبيهات مهمة</h3></div>
          <div className="flex flex-wrap gap-2">
            {alerts.map((al, i) => {
              const tone = al.severity === 'تحذير' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              return al.to ? (
                <Link key={i} to={al.to} className={`badge ${tone} transition-colors`}>{al.text}</Link>
              ) : (
                <span key={i} className={`badge ${tone}`}>{al.text}</span>
              )
            })}
          </div>
        </div>
      )}

      {/* Workforce KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="إجمالي الموظفين" value={w.total ?? 0} tone="blue" hint={`${w.active ?? 0} نشط`} />
        <StatCard icon={UserPlus} label="موظفون جدد (30 يوم)" value={w.newHires30 ?? 0} tone="green" hint={`${w.newHires90 ?? 0} خلال 90 يوم`} />
        <StatCard icon={ShieldCheck} label="تحت التجربة" value={w.probation ?? 0} tone="violet" />
        <StatCard icon={Repeat} label="معدل الدوران" value={`${w.turnover ?? 0}%`} tone="amber" hint={`${w.leavers ?? 0} مغادر`} />
      </div>

      {/* Attendance today */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">حضور اليوم</h3>
          <Link to="/attendance" className="text-xs text-blue-600 hover:underline">عرض التفاصيل</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MiniStat icon={UserCheck} label="حاضر" value={a.present ?? 0} tone="text-emerald-500" />
          <MiniStat icon={Clock} label="متأخر" value={a.late ?? 0} tone="text-amber-500" />
          <MiniStat icon={UserMinus} label="غائب" value={a.absent ?? 0} tone="text-rose-500" />
          <MiniStat icon={Video} label="عن بُعد" value={a.remote ?? 0} tone="text-blue-500" />
          <MiniStat icon={CalendarClock} label="في إجازة" value={a.onLeave ?? 0} tone="text-violet-500" />
        </div>
      </div>

      {/* Action items */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Link to="/leaves"><StatCard icon={ClipboardList} label="طلبات تحتاج موافقة" value={act.pendingApprovals ?? 0} tone="amber" /></Link>
        <Link to="/hr/documents"><StatCard icon={FileWarning} label="مستندات قاربت الانتهاء" value={act.expiringDocs ?? 0} tone="rose" /></Link>
        <Link to="/hr/recruitment"><StatCard icon={Briefcase} label="شواغر التوظيف" value={act.openJobs ?? 0} tone="blue" /></Link>
        <Link to="/mgr/interviews"><StatCard icon={Video} label="مقابلات اليوم" value={act.todayInterviews ?? 0} tone="violet" /></Link>
        <Link to="/hr/performance"><StatCard icon={AlertTriangle} label="تقييمات متأخرة" value={act.overdueReviews ?? 0} tone="rose" /></Link>
      </div>

      {/* Trend + department distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div><h3 className="font-bold text-slate-800">اتجاه التوظيف والاستقالات</h3><p className="text-sm text-slate-400">آخر 6 أشهر</p></div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
          </div>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                <Legend />
                <Bar dataKey="تعيينات" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="استقالات" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-800 mb-4">توزيع الموظفين حسب الإدارة</h3>
          {deptPie.length === 0 ? <EmptyState title="لا توجد إدارات" /> : (
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={deptPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3}>
                    {deptPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DistroCard title="حسب الجنسية" data={dist.byNationality} />
        <DistroCard title="حسب الجنس" data={dist.byGender} />
        <DistroCard title="حسب الفئة العمرية" data={dist.byAge} />
        <DistroCard title="حسب نوع التوظيف" data={dist.byType} />
      </div>

      {/* Celebrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4"><Cake className="w-5 h-5 text-pink-500" /><h3 className="font-bold text-slate-800">أعياد الميلاد هذا الشهر</h3></div>
          {!cel.birthdays?.length ? <EmptyState icon={Gift} title="لا توجد أعياد ميلاد" /> : (
            <div className="space-y-3">
              {cel.birthdays.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Avatar name={b.full_name} src={b.profile_picture} size="sm" />
                  <p className="flex-1 text-sm font-medium text-slate-700">{b.full_name}</p>
                  <span className="text-xs text-slate-400">{b.date_of_birth ? formatDate(b.date_of_birth).replace(/\d{4}/, '').trim() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-amber-500" /><h3 className="font-bold text-slate-800">ذكرى الانضمام هذا الشهر</h3></div>
          {!cel.anniversaries?.length ? <EmptyState icon={Award} title="لا توجد مناسبات" /> : (
            <div className="space-y-3">
              {cel.anniversaries.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Avatar name={b.full_name} src={b.profile_picture} size="sm" />
                  <p className="flex-1 text-sm font-medium text-slate-700">{b.full_name}</p>
                  <span className="badge bg-amber-50 text-amber-700">{b.years} سنوات</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmployeeDashboard() {
  const { data: stats, isLoading } = useQuery('dashboard-stats', dashboardApi.stats)
  const { data: chart = [] } = useQuery('attendance-chart', dashboardApi.attendanceChart)
  const { data: distribution = [] } = useQuery('dept-distribution', dashboardApi.departmentDistribution)
  const { data: upcoming = [] } = useQuery('upcoming-leaves', dashboardApi.upcomingLeaves)

  if (isLoading) return <Spinner fullscreen />

  const chartData = chart.map((d) => ({ name: WEEKDAYS[new Date(d.date).getDay()], حاضر: d.present || 0, غائب: d.absent || 0, متأخر: d.late || 0 }))
  const pieData = distribution.map((d) => ({ name: d.name, value: d.count, color: d.color || '#3B82F6' }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="إجمالي الموظفين" value={stats?.employees?.total ?? 0} tone="blue" hint={`${stats?.employees?.newThisMonth ?? 0} جديد هذا الشهر`} />
        <StatCard icon={UserCheck} label="حاضر اليوم" value={stats?.attendance?.present ?? 0} tone="green" hint={`${stats?.attendance?.remote ?? 0} عن بعد`} />
        <StatCard icon={CalendarClock} label="إجازات معلقة" value={stats?.pendingLeaves ?? 0} tone="amber" />
        <StatCard icon={Building2} label="الإدارات" value={stats?.departments ?? 0} tone="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div><h3 className="font-bold text-slate-800">الحضور الأسبوعي</h3><p className="text-sm text-slate-400">آخر 7 أيام</p></div>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
          </div>
          {chartData.length === 0 ? <EmptyState title="لا توجد بيانات حضور" /> : (
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="حاضر" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="متأخر" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="غائب" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-800 mb-6">توزيع الموظفين</h3>
          {pieData.length === 0 ? <EmptyState title="لا توجد إدارات" /> : (
            <>
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-slate-600">{d.name}</span></div>
                    <span className="font-semibold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-4">النشاط الأخير</h3>
          {!stats?.recentActivity?.length ? <EmptyState icon={Clock} title="لا يوجد نشاط اليوم" /> : (
            <div className="space-y-3">
              {stats.recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Avatar name={a.full_name} src={a.profile_picture} size="sm" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{a.full_name}</p><p className="text-xs text-slate-400">{a.action}</p></div>
                  <span className="text-xs text-slate-400">{a.timestamp ? formatTime(a.timestamp) : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-4">الإجازات القادمة</h3>
          {!upcoming.length ? <EmptyState icon={CalendarClock} title="لا توجد إجازات قادمة" /> : (
            <div className="space-y-3">
              {upcoming.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-2">
                  <Avatar name={l.full_name} src={l.profile_picture} size="sm" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{l.full_name}</p><p className="text-xs text-slate-400">{l.type} · {l.days_count} أيام</p></div>
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

export default function Dashboard() {
  const { user } = useAuthStore()
  return HR_ROLES.includes(user?.role) ? <HrDashboard /> : <EmployeeDashboard />
}
