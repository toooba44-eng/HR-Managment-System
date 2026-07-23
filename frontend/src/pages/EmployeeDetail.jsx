import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  ArrowRight, Mail, Phone, MapPin, Calendar, Building2,
  CreditCard, Briefcase, Trash2, FileText, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { employeesApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { Button } from '../components/ui/Form'
import { formatDate, formatTime, formatCurrency } from '../lib/utils'

const TABS = [
  { id: 'info', label: 'المعلومات' },
  { id: 'attendance', label: 'الحضور' },
  { id: 'leaves', label: 'الإجازات' },
  { id: 'documents', label: 'المستندات' },
]

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAdmin, isHR } = useAuthStore()
  const [tab, setTab] = useState('info')

  const { data: emp, isLoading } = useQuery(['employee', id], () => employeesApi.get(id))
  const { data: stats } = useQuery(['employee-stats', id], () => employeesApi.stats(id))

  const deleteMutation = useMutation(() => employeesApi.remove(id), {
    onSuccess: () => {
      toast.success('تم حذف الموظف')
      qc.invalidateQueries('employees')
      navigate('/employees')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />
  if (!emp) return <EmptyState title="الموظف غير موجود" />

  const handleDelete = () => {
    if (window.confirm(`هل أنت متأكد من حذف ${emp.full_name}؟`)) {
      deleteMutation.mutate()
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/employees')} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 text-sm font-medium">
        <ArrowRight className="w-4 h-4" />
        العودة للموظفين
      </button>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <Avatar name={emp.full_name} src={emp.profile_picture} size="xl" />
          <div className="flex-1 text-center sm:text-right">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl font-extrabold text-slate-800">{emp.full_name}</h1>
              <Badge status={emp.status} />
            </div>
            <p className="text-slate-500 mt-1">{emp.job_title}</p>
            <div className="flex flex-wrap gap-4 mt-3 justify-center sm:justify-start text-sm text-slate-400">
              <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {emp.department_name || '—'}</span>
              <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {emp.employee_number || '—'}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(emp.hire_date)}</span>
            </div>
          </div>
          {isAdmin() && (
            <Button variant="secondary" onClick={handleDelete} className="text-rose-500 border-rose-200 hover:bg-rose-50">
              <Trash2 className="w-4 h-4" />
              حذف
            </Button>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{stats?.attendance?.present_days ?? 0}</p>
            <p className="text-xs text-slate-400">أيام حضور (30 يوم)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{emp.annual_leave_balance ?? 0}</p>
            <p className="text-xs text-slate-400">رصيد الإجازة السنوية</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{stats?.leaves?.pending_requests ?? 0}</p>
            <p className="text-xs text-slate-400">طلبات معلقة</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-600">{(emp.subordinates || []).length}</p>
            <p className="text-xs text-slate-400">مرؤوسون</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-100 w-full overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-3">معلومات التواصل</h3>
            <InfoRow icon={Mail} label="البريد الإلكتروني" value={emp.email} />
            <InfoRow icon={Phone} label="رقم الجوال" value={emp.phone} />
            <InfoRow icon={MapPin} label="العنوان" value={emp.address} />
            <InfoRow icon={Phone} label="جهة اتصال الطوارئ" value={emp.emergency_contact} />
          </div>
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-3">المعلومات الوظيفية</h3>
            <InfoRow icon={Briefcase} label="نوع التوظيف" value={emp.employment_type} />
            <InfoRow icon={MapPin} label="موقع العمل" value={emp.work_location} />
            <InfoRow icon={Building2} label="المدير المباشر" value={emp.manager_name} />
            <InfoRow icon={Calendar} label="نوع العقد" value={emp.contract_type} />
          </div>
          {isHR() && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-3">المعلومات المالية</h3>
              <InfoRow icon={CreditCard} label="الراتب الأساسي" value={formatCurrency(emp.salary)} />
              <InfoRow icon={CreditCard} label="البدلات" value={formatCurrency(emp.allowances)} />
              <InfoRow icon={Building2} label="البنك" value={emp.bank_name} />
              <InfoRow icon={CreditCard} label="رقم الحساب" value={emp.bank_account} />
            </div>
          )}
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-3">المعلومات الشخصية</h3>
            <InfoRow icon={Calendar} label="تاريخ الميلاد" value={formatDate(emp.date_of_birth)} />
            <InfoRow icon={MapPin} label="الجنسية" value={emp.nationality} />
            <InfoRow icon={Briefcase} label="الحالة الاجتماعية" value={emp.marital_status} />
            <InfoRow icon={CreditCard} label="رقم الهوية" value={emp.national_id} />
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="card overflow-x-auto">
          {!emp.attendance?.length ? (
            <EmptyState icon={Clock} title="لا توجد سجلات حضور" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">التاريخ</th>
                  <th className="pb-3 font-medium">الدخول</th>
                  <th className="pb-3 font-medium">الخروج</th>
                  <th className="pb-3 font-medium">ساعات العمل</th>
                  <th className="pb-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {emp.attendance.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 text-slate-700">{formatDate(a.date)}</td>
                    <td className="py-3 text-slate-600">{formatTime(a.check_in)}</td>
                    <td className="py-3 text-slate-600">{formatTime(a.check_out)}</td>
                    <td className="py-3 text-slate-600">{a.work_hours || 0} ساعة</td>
                    <td className="py-3"><Badge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'leaves' && (
        <div className="card">
          {!emp.leaves?.length ? (
            <EmptyState title="لا توجد طلبات إجازة" />
          ) : (
            <div className="space-y-3">
              {emp.leaves.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-700">{l.type} · {l.days_count} أيام</p>
                    <p className="text-xs text-slate-400">{formatDate(l.start_date)} — {formatDate(l.end_date)}</p>
                  </div>
                  <Badge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="card">
          {!emp.documents?.length ? (
            <EmptyState icon={FileText} title="لا توجد مستندات" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {emp.documents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 truncate">{d.title}</p>
                    <p className="text-xs text-slate-400">{d.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
