import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight, Mail, Phone, MapPin, Calendar, Building2,
  CreditCard, Briefcase, Trash2, FileText, Clock,
  Target, GraduationCap, Package, GitBranch, Gift, ArrowLeft, Users,
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
  { id: 'financial', label: 'المالية والمزايا' },
  { id: 'attendance', label: 'الحضور' },
  { id: 'leaves', label: 'الإجازات' },
  { id: 'performance', label: 'الأداء' },
  { id: 'training', label: 'التدريب' },
  { id: 'documents', label: 'المستندات' },
  { id: 'assets', label: 'العهد' },
  { id: 'history', label: 'التاريخ الوظيفي' },
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
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAdmin, isHR } = useAuthStore()
  const [tab, setTab] = useState('info')

  const { data: emp, isLoading } = useQuery(['employee', id], () => employeesApi.get(id))
  const { data: stats } = useQuery(['employee-stats', id], () => employeesApi.stats(id))

  const deleteMutation = useMutation(() => employeesApi.remove(id), {
    onSuccess: () => {
      toast.success(t('تم حذف الموظف'))
      qc.invalidateQueries('employees')
      navigate('/employees')
    },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل الحذف')),
  })

  if (isLoading) return <Spinner fullscreen />
  if (!emp) return <EmptyState title={t('الموظف غير موجود')} />

  const handleDelete = () => {
    if (window.confirm(t('هل أنت متأكد من حذف {{name}}؟', { name: emp.full_name }))) {
      deleteMutation.mutate()
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/employees')} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 text-sm font-medium">
        <ArrowRight className="w-4 h-4" />
        {t('العودة للموظفين')}
      </button>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <Avatar name={emp.full_name} src={emp.profile_picture} size="xl" />
          <div className="flex-1 text-center sm:text-right">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl font-extrabold text-slate-800">{emp.full_name}</h1>
              <Badge status={emp.status}>{t(emp.status)}</Badge>
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
              {t('حذف')}
            </Button>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{stats?.attendance?.present_days ?? 0}</p>
            <p className="text-xs text-slate-400">{t('أيام حضور (30 يوم)')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{emp.annual_leave_balance ?? 0}</p>
            <p className="text-xs text-slate-400">{t('رصيد الإجازة السنوية')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{stats?.leaves?.pending_requests ?? 0}</p>
            <p className="text-xs text-slate-400">{t('طلبات معلقة')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-600">{(emp.subordinates || []).length}</p>
            <p className="text-xs text-slate-400">{t('مرؤوسون')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-100 w-full overflow-x-auto scrollbar-hide">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === tb.id ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t(tb.label)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-3">{t('معلومات التواصل')}</h3>
            <InfoRow icon={Mail} label={t('البريد الإلكتروني')} value={emp.email} />
            <InfoRow icon={Phone} label={t('رقم الجوال')} value={emp.phone} />
            <InfoRow icon={MapPin} label={t('العنوان')} value={emp.address} />
            <InfoRow icon={Phone} label={t('جهة اتصال الطوارئ')} value={emp.emergency_contact} />
          </div>
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-3">{t('المعلومات الوظيفية')}</h3>
            <InfoRow icon={Briefcase} label={t('نوع التوظيف')} value={emp.employment_type && t(emp.employment_type)} />
            <InfoRow icon={MapPin} label={t('موقع العمل')} value={emp.work_location} />
            <InfoRow icon={Building2} label={t('المدير المباشر')} value={emp.manager_name} />
            <InfoRow icon={Calendar} label={t('نوع العقد')} value={emp.contract_type} />
          </div>
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-3">{t('المعلومات الشخصية')}</h3>
            <InfoRow icon={Calendar} label={t('تاريخ الميلاد')} value={formatDate(emp.date_of_birth)} />
            <InfoRow icon={MapPin} label={t('الجنسية')} value={emp.nationality} />
            <InfoRow icon={Briefcase} label={t('الحالة الاجتماعية')} value={emp.marital_status} />
            <InfoRow icon={CreditCard} label={t('رقم الهوية')} value={emp.national_id} />
          </div>
          {(emp.subordinates || []).length > 0 && (
            <div className="card lg:col-span-2">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-slate-400" /> {t('المرؤوسون')} ({emp.subordinates.length})</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {emp.subordinates.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100">
                    <Avatar name={s.full_name} src={s.profile_picture} size="sm" />
                    <div className="min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{s.full_name}</p><p className="text-xs text-slate-400 truncate">{s.job_title}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'financial' && (
        isHR() ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-3">{t('بيانات الراتب والبنك')}</h3>
              <InfoRow icon={CreditCard} label={t('الراتب الأساسي')} value={formatCurrency(emp.salary)} />
              <InfoRow icon={CreditCard} label={t('البدلات')} value={formatCurrency(emp.allowances)} />
              <InfoRow icon={CreditCard} label={t('الإجمالي التقريبي')} value={formatCurrency((emp.salary || 0) + (emp.allowances || 0))} />
              <InfoRow icon={Building2} label={t('البنك')} value={emp.bank_name} />
              <InfoRow icon={CreditCard} label={t('رقم الحساب / IBAN')} value={emp.bank_account} />
            </div>
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Gift className="w-5 h-5 text-slate-400" /> {t('حزمة التعويضات')}</h3>
              {emp.compensation ? (
                <>
                  <InfoRow icon={Briefcase} label={t('الدرجة الوظيفية')} value={emp.compensation.grade} />
                  <InfoRow icon={CreditCard} label={t('بدل السكن')} value={formatCurrency(emp.compensation.housing_allowance)} />
                  <InfoRow icon={CreditCard} label={t('بدل النقل')} value={formatCurrency(emp.compensation.transport_allowance)} />
                  <InfoRow icon={Gift} label={t('المكافآت')} value={formatCurrency(emp.compensation.bonus)} />
                  <InfoRow icon={FileText} label={t('فئة التأمين')} value={emp.compensation.insurance_class} />
                </>
              ) : <EmptyState icon={Gift} title={t('لا توجد حزمة تعويضات مسجّلة')} />}
            </div>
          </div>
        ) : (
          <div className="card"><EmptyState icon={CreditCard} title={t('البيانات المالية متاحة للموارد البشرية فقط')} /></div>
        )
      )}

      {tab === 'performance' && (
        <div className="card">
          {!emp.goals?.length ? <EmptyState icon={Target} title={t('لا توجد أهداف أداء')} /> : (
            <div className="space-y-4">
              {emp.goals.map((g) => (
                <div key={g.id} className="p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-700">{g.title}</p>
                    <Badge status={g.status}>{t(g.status)}</Badge>
                  </div>
                  {g.description && <p className="text-xs text-slate-400 mt-1">{g.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${g.progress || 0}%` }} /></div>
                    <span className="text-xs text-slate-500 w-10 text-left">{g.progress || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'training' && (
        <div className="card">
          {!emp.training?.length ? <EmptyState icon={GraduationCap} title={t('لا توجد دورات تدريبية')} /> : (
            <div className="space-y-3">
              {emp.training.map((tr) => (
                <div key={tr.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><GraduationCap className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">{tr.title}</p>
                    <p className="text-xs text-slate-400">{tr.category}{tr.hours ? ` · ${t('{{count}} ساعة', { count: tr.hours })}` : ''}</p>
                  </div>
                  <Badge status={tr.status}>{t(tr.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="card overflow-x-auto">
          {!emp.attendance?.length ? (
            <EmptyState icon={Clock} title={t('لا توجد سجلات حضور')} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">{t('التاريخ')}</th>
                  <th className="pb-3 font-medium">{t('الدخول')}</th>
                  <th className="pb-3 font-medium">{t('الخروج')}</th>
                  <th className="pb-3 font-medium">{t('ساعات العمل')}</th>
                  <th className="pb-3 font-medium">{t('الحالة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {emp.attendance.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 text-slate-700">{formatDate(a.date)}</td>
                    <td className="py-3 text-slate-600">{formatTime(a.check_in)}</td>
                    <td className="py-3 text-slate-600">{formatTime(a.check_out)}</td>
                    <td className="py-3 text-slate-600">{t('{{count}} ساعة', { count: a.work_hours || 0 })}</td>
                    <td className="py-3"><Badge status={a.status}>{t(a.status)}</Badge></td>
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
            <EmptyState title={t('لا توجد طلبات إجازة')} />
          ) : (
            <div className="space-y-3">
              {emp.leaves.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-700">{t(l.type)} · {l.days_count} {t('أيام')}</p>
                    <p className="text-xs text-slate-400">{formatDate(l.start_date)} — {formatDate(l.end_date)}</p>
                  </div>
                  <Badge status={l.status}>{t(l.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="card">
          {!emp.documents?.length ? (
            <EmptyState icon={FileText} title={t('لا توجد مستندات')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {emp.documents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-700 truncate">{d.title}</p>
                    <p className="text-xs text-slate-400">{d.type}{d.expiry_date ? ` · ${t('ينتهي {{date}}', { date: formatDate(d.expiry_date) })}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'assets' && (
        <div className="card">
          {!emp.assets?.length ? <EmptyState icon={Package} title={t('لا توجد عهد مسندة')} /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {emp.assets.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Package className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">{a.name}</p>
                    <p className="text-xs text-slate-400">{a.category}{a.serial_number ? ` · ${a.serial_number}` : ''}</p>
                  </div>
                  <Badge status={a.status}>{t(a.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          {!emp.history?.length ? <EmptyState icon={GitBranch} title={t('لا يوجد تاريخ وظيفي')} /> : (
            <div className="space-y-3">
              {emp.history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><GitBranch className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">{h.current_title || '—'}</span>
                      <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
                      <span className="font-medium text-slate-700">{h.new_title || t(h.type)}</span>
                    </div>
                    <p className="text-xs text-slate-400">{t(h.type)}{h.effective_date ? ` · ${formatDate(h.effective_date)}` : ''}</p>
                  </div>
                  <Badge status={h.status}>{t(h.status, { context: 'promotion' })}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
