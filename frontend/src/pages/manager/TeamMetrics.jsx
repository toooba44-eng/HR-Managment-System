import { useQuery } from 'react-query'
import { Users, UserCheck, CalendarClock, ClipboardList, Clock } from 'lucide-react'
import { employeesApi, attendanceApi, leavesApi, tasksApi } from '../../api/endpoints'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

const today = () => new Date().toISOString().split('T')[0]

export default function TeamMetrics() {
  const { data: emps, isLoading } = useQuery('team-members', () => employeesApi.list({ limit: 100 }))
  const { data: att } = useQuery(['team-attendance', today()], () => attendanceApi.list({ date: today() }))
  const { data: leaves } = useQuery(['team-leaves-pending'], () => leavesApi.list({ status: 'معلقة' }))
  const { data: tasks = [] } = useQuery('tasks', () => tasksApi.list())

  if (isLoading) return <Spinner fullscreen />

  const team = emps?.employees || []
  const summary = att?.summary || {}
  const pendingLeaves = leaves?.leaves?.length || 0

  const taskBy = (s) => tasks.filter((t) => t.status === s).length
  const activeTasks = taskBy('جديدة') + taskBy('قيد التنفيذ')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="أعضاء الفريق" value={team.length} tone="blue" />
        <StatCard icon={UserCheck} label="حاضر اليوم" value={summary.present || 0} tone="green" hint={`${summary.late || 0} متأخر`} />
        <StatCard icon={CalendarClock} label="إجازات معلّقة" value={pendingLeaves} tone="amber" />
        <StatCard icon={ClipboardList} label="مهام نشطة" value={activeTasks} tone="violet" hint={`${taskBy('مكتملة')} مكتملة`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-800 mb-4">حالة المهام</h3>
          {tasks.length === 0 ? (
            <EmptyState icon={ClipboardList} title="لا توجد مهام" />
          ) : (
            <div className="space-y-3">
              {['قيد التنفيذ', 'جديدة', 'مكتملة', 'ملغاة'].map((s) => {
                const count = taskBy(s)
                const pct = tasks.length ? Math.round((count / tasks.length) * 100) : 0
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600">{s}</span>
                      <span className="font-medium text-slate-700">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-800 mb-4">أعضاء الفريق</h3>
          {team.length === 0 ? (
            <EmptyState icon={Users} title="لا يوجد أعضاء" />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
              {team.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2">
                  <Avatar name={e.full_name} src={e.profile_picture} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{e.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{e.job_title}</p>
                  </div>
                  <Badge status={e.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" /> المؤشرات محسوبة لحظياً من بيانات فريقك (الحضور، الإجازات، المهام).
      </p>
    </div>
  )
}
