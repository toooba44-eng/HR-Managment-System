import { useState } from 'react'
import { useQuery } from 'react-query'
import { Wallet, Users, TrendingDown, Banknote } from 'lucide-react'
import { payrollApi, departmentsApi } from '../../api/endpoints'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import Avatar from '../../components/ui/Avatar'
import { Select } from '../../components/ui/Form'
import { formatCurrency } from '../../lib/utils'

export default function Payroll() {
  const [departmentId, setDepartmentId] = useState('')
  const { data: departments = [] } = useQuery('departments', departmentsApi.list)
  const { data, isLoading } = useQuery(
    ['payroll', departmentId],
    () => payrollApi.overview({ department_id: departmentId }),
    { keepPreviousData: true }
  )

  const payroll = data?.payroll || []
  const totals = data?.totals || { basic: 0, allowances: 0, deductions: 0, net: 0 }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="عدد الموظفين" value={data?.count ?? 0} tone="blue" />
        <StatCard icon={Banknote} label="إجمالي الأساسي" value={formatCurrency(totals.basic)} tone="violet" />
        <StatCard icon={TrendingDown} label="إجمالي الاستقطاعات" value={formatCurrency(totals.deductions)} tone="rose" />
        <StatCard icon={Wallet} label="إجمالي الصافي" value={formatCurrency(totals.net)} tone="green" />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-800">كشف الرواتب الشهري</h3>
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="sm:w-56">
            <option value="">كل الإدارات</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>

        {isLoading ? (
          <Spinner fullscreen />
        ) : payroll.length === 0 ? (
          <EmptyState icon={Wallet} title="لا يوجد موظفون" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">الموظف</th>
                  <th className="pb-3 font-medium">الإدارة</th>
                  <th className="pb-3 font-medium">الأساسي</th>
                  <th className="pb-3 font-medium">البدلات</th>
                  <th className="pb-3 font-medium">الاستقطاعات</th>
                  <th className="pb-3 font-medium">الصافي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payroll.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={p.full_name} size="sm" />
                        <div>
                          <p className="font-medium text-slate-700">{p.full_name}</p>
                          <p className="text-xs text-slate-400">{p.job_title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{p.department_name || '—'}</td>
                    <td className="py-3 text-slate-600">{formatCurrency(p.basic)}</td>
                    <td className="py-3 text-slate-600">{formatCurrency(p.allowances)}</td>
                    <td className="py-3 text-rose-500">−{formatCurrency(p.deductions)}</td>
                    <td className="py-3 font-bold text-emerald-600">{formatCurrency(p.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-100 font-bold text-slate-800">
                  <td className="pt-3" colSpan={2}>الإجمالي</td>
                  <td className="pt-3">{formatCurrency(totals.basic)}</td>
                  <td className="pt-3">{formatCurrency(totals.allowances)}</td>
                  <td className="pt-3 text-rose-500">−{formatCurrency(totals.deductions)}</td>
                  <td className="pt-3 text-emerald-600">{formatCurrency(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
