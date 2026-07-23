import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { LogIn, LogOut, CalendarCheck, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { attendanceApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import StatCard from '../components/ui/StatCard'
import { formatDate, formatTime } from '../lib/utils'

function CheckInOutCard() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const employeeId = user?.employee_id
  const today = new Date().toISOString().split('T')[0]

  const { data: mine = [] } = useQuery(
    ['my-attendance', employeeId],
    () => attendanceApi.mine(employeeId),
    { enabled: !!employeeId }
  )

  const todayRecord = mine.find((r) => r.date === today)

  const checkIn = useMutation(() => attendanceApi.checkIn({ employee_id: employeeId, location: 'المكتب' }), {
    onSuccess: () => { toast.success('تم تسجيل الدخول'); qc.invalidateQueries(['my-attendance', employeeId]); qc.invalidateQueries('attendance') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل تسجيل الدخول'),
  })
  const checkOut = useMutation(() => attendanceApi.checkOut({ employee_id: employeeId }), {
    onSuccess: () => { toast.success('تم تسجيل الخروج'); qc.invalidateQueries(['my-attendance', employeeId]); qc.invalidateQueries('attendance') },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل تسجيل الخروج'),
  })

  if (!employeeId) return null

  return (
    <div className="card bg-gradient-to-br from-primary-600 to-primary-800 text-white">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-right">
          <p className="text-primary-100 text-sm">تسجيل حضورك اليوم</p>
          <p className="text-2xl font-extrabold">{formatDate(today)}</p>
          {todayRecord && (
            <div className="flex gap-4 mt-2 text-sm text-primary-100 justify-center sm:justify-start">
              <span>دخول: {formatTime(todayRecord.check_in)}</span>
              {todayRecord.check_out && <span>خروج: {formatTime(todayRecord.check_out)}</span>}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {!todayRecord ? (
            <button
              onClick={() => checkIn.mutate()}
              disabled={checkIn.isLoading}
              className="bg-white text-primary-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-50 transition-colors disabled:opacity-60"
            >
              <LogIn className="w-5 h-5" />
              تسجيل الدخول
            </button>
          ) : !todayRecord.check_out ? (
            <button
              onClick={() => checkOut.mutate()}
              disabled={checkOut.isLoading}
              className="bg-white text-rose-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-50 transition-colors disabled:opacity-60"
            >
              <LogOut className="w-5 h-5" />
              تسجيل الخروج
            </button>
          ) : (
            <div className="bg-white/15 px-6 py-3 rounded-xl font-bold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5" />
              اكتمل اليوم ({todayRecord.work_hours} ساعة)
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Attendance() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const { data, isLoading } = useQuery(['attendance', date], () => attendanceApi.list({ date, limit: 100 }))

  const records = data?.records || []
  const summary = data?.summary || {}

  return (
    <div className="space-y-6">
      <CheckInOutCard />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label="الحاضرون" value={summary.present || 0} tone="green" />
        <StatCard icon={Clock} label="المتأخرون" value={summary.late || 0} tone="amber" />
        <StatCard icon={LogOut} label="الغائبون" value={summary.absent || 0} tone="rose" />
        <StatCard icon={LogIn} label="عن بعد" value={summary.remote || 0} tone="cyan" />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-800">سجل الحضور</h3>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field sm:w-48"
          />
        </div>

        {isLoading ? (
          <Spinner fullscreen />
        ) : records.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="لا توجد سجلات حضور لهذا اليوم" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">الموظف</th>
                  <th className="pb-3 font-medium">الإدارة</th>
                  <th className="pb-3 font-medium">الدخول</th>
                  <th className="pb-3 font-medium">الخروج</th>
                  <th className="pb-3 font-medium">الساعات</th>
                  <th className="pb-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((r) => (
                  <tr key={r.id} className="table-row">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.full_name} src={r.profile_picture} size="sm" />
                        <div>
                          <p className="font-medium text-slate-700">{r.full_name}</p>
                          <p className="text-xs text-slate-400">{r.job_title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{r.department_name || '—'}</td>
                    <td className="py-3 text-slate-600">{formatTime(r.check_in)}</td>
                    <td className="py-3 text-slate-600">{formatTime(r.check_out)}</td>
                    <td className="py-3 text-slate-600">{r.work_hours || 0}</td>
                    <td className="py-3"><Badge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
