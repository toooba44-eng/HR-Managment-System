import { useQuery } from 'react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { Users, UserCheck, Briefcase, Wallet, Receipt, GraduationCap, Sparkles } from 'lucide-react'
import { reportsApi } from '../../api/endpoints'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency } from '../../lib/utils'

const TYPE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444']

function Panel({ title, children }) {
  return (
    <div className="card">
      <h3 className="font-bold text-slate-800 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function BreakdownList({ rows, valueKey = 'count', labelKey }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]))
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-600">{r[labelKey]}</span>
            <span className="font-medium text-slate-700">{r[valueKey]}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const { data, isLoading } = useQuery('reports-overview', reportsApi.overview)
  if (isLoading) return <Spinner fullscreen />
  if (!data) return null

  const deptData = (data.byDepartment || []).map((d) => ({ name: d.name, count: d.count, color: d.color }))
  const typeData = (data.byEmploymentType || []).map((t) => ({ name: t.type, value: t.count }))
  const hiresData = (data.hiresByYear || []).map((h) => ({ name: h.year, count: h.count }))

  return (
    <div className="space-y-6">
      {data.insights?.length > 0 && (
        <div className="card border-r-4 border-violet-400">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h3 className="font-bold text-slate-800">رؤى تلقائية</h3>
          </div>
          <ul className="space-y-2">
            {data.insights.map((text, i) => (
              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="إجمالي الموظفين" value={data.headcount?.total ?? 0} tone="blue" hint={`${data.headcount?.active ?? 0} نشط`} />
        <StatCard icon={Wallet} label="صافي الرواتب الشهري" value={formatCurrency(data.payroll?.net)} tone="green" />
        <StatCard icon={Briefcase} label="وظائف مفتوحة" value={data.recruitment?.openJobs ?? 0} tone="amber" hint={`${data.recruitment?.applications ?? 0} طلب`} />
        <StatCard icon={GraduationCap} label="التحاقات التدريب" value={data.training?.enrollments ?? 0} tone="violet" hint={`${data.training?.completed ?? 0} مكتمل`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employees by department */}
        <Panel title="الموظفون حسب الإدارة">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontFamily: 'Tajawal' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {deptData.map((d, i) => <Cell key={i} fill={d.color || '#3b82f6'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Employment type */}
        <Panel title="نوع التوظيف">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {typeData.map((t, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontFamily: 'Tajawal' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {typeData.map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} /> {t.name} ({t.value})
              </span>
            ))}
          </div>
        </Panel>

        {/* Hires by year */}
        <Panel title="التعيينات حسب السنة">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hiresData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontFamily: 'Tajawal' }} />
              <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Leaves by type */}
        <Panel title="الإجازات حسب النوع">
          <BreakdownList rows={data.leavesByType || []} labelKey="type" valueKey="count" />
        </Panel>
      </div>

      {/* Bottom summary row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="مسار التوظيف">
          <BreakdownList rows={data.recruitment?.byStatus || []} labelKey="status" valueKey="count" />
        </Panel>
        <Panel title="الحضور (آخر 30 يوماً)">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div><p className="text-2xl font-bold text-emerald-600">{data.attendance30?.present ?? 0}</p><p className="text-xs text-slate-400">حاضر</p></div>
            <div><p className="text-2xl font-bold text-amber-600">{data.attendance30?.late ?? 0}</p><p className="text-xs text-slate-400">متأخر</p></div>
            <div><p className="text-2xl font-bold text-cyan-600">{data.attendance30?.remote ?? 0}</p><p className="text-xs text-slate-400">عن بُعد</p></div>
            <div><p className="text-2xl font-bold text-slate-600">{data.attendance30?.avgHours ?? 0}</p><p className="text-xs text-slate-400">متوسط الساعات</p></div>
          </div>
        </Panel>
        <Panel title="المصروفات">
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-500 flex items-center gap-1"><Receipt className="w-4 h-4" /> الإجمالي</span><span className="font-bold text-slate-800">{formatCurrency(data.expenses?.total)}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-500">قيد الاعتماد</span><span className="font-medium text-amber-600">{formatCurrency(data.expenses?.pending)}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-500 flex items-center gap-1"><UserCheck className="w-4 h-4" /> معتمدة</span><span className="font-medium text-emerald-600">{formatCurrency(data.expenses?.approved)}</span></div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
