import { useState } from 'react'
import { useQuery } from 'react-query'
import { Wallet, Download, Building2, CreditCard } from 'lucide-react'
import { payslipsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { formatCurrency } from '../../lib/utils'

function PayslipDetail({ slip, employee, onClose }) {
  if (!slip) return null
  const rows = [
    { label: 'الراتب الأساسي', value: slip.basic, positive: true },
    { label: 'البدلات', value: slip.allowances, positive: true },
    { label: 'التأمينات (GOSI)', value: -slip.deductions, positive: false },
  ]
  return (
    <Modal open={!!slip} onClose={onClose} title={`قسيمة راتب — ${slip.month} ${slip.year}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="font-bold text-slate-800">{employee.full_name}</p>
            <p className="text-slate-400">{employee.job_title} · {employee.employee_number}</p>
          </div>
          <Badge status="حاضر">{slip.status}</Badge>
        </div>

        <div className="rounded-xl border border-slate-100 divide-y divide-slate-50">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-slate-600">{r.label}</span>
              <span className={r.positive ? 'text-slate-800 font-medium' : 'text-rose-500 font-medium'}>
                {formatCurrency(r.value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
            <span className="font-bold text-emerald-700">صافي الراتب</span>
            <span className="font-extrabold text-emerald-700">{formatCurrency(slip.net)}</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex flex-wrap gap-4">
          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {employee.bank_name || '—'}</span>
          <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> {employee.bank_account || '—'}</span>
        </div>

        <button
          onClick={() => window.print()}
          className="btn-secondary w-full"
        >
          <Download className="w-4 h-4" />
          طباعة / تنزيل PDF
        </button>
      </div>
    </Modal>
  )
}

export default function Payslips() {
  const { user } = useAuthStore()
  const [selected, setSelected] = useState(null)

  const { data, isLoading } = useQuery(
    ['payslips', user?.employee_id],
    () => payslipsApi.forEmployee(user.employee_id),
    { enabled: !!user?.employee_id }
  )

  if (!user?.employee_id) {
    return <div className="card"><EmptyState icon={Wallet} title="لا يوجد سجل رواتب لهذا الحساب" /></div>
  }
  if (isLoading) return <Spinner fullscreen />

  const payslips = data?.payslips || []
  const employee = data?.employee || {}

  return (
    <div className="space-y-6">
      {payslips[0] && (
        <div className="card bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
          <p className="text-emerald-100 text-sm">صافي راتب آخر شهر ({payslips[0].month})</p>
          <p className="text-3xl font-extrabold mt-1">{formatCurrency(payslips[0].net)}</p>
          <p className="text-emerald-100 text-xs mt-2">
            أساسي {formatCurrency(payslips[0].basic)} + بدلات {formatCurrency(payslips[0].allowances)} − تأمينات {formatCurrency(payslips[0].deductions)}
          </p>
        </div>
      )}

      {payslips.length === 0 ? (
        <div className="card"><EmptyState icon={Wallet} title="لا توجد قسائم" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-400 border-b border-slate-100">
                <th className="pb-3 font-medium">الشهر</th>
                <th className="pb-3 font-medium">الأساسي</th>
                <th className="pb-3 font-medium">البدلات</th>
                <th className="pb-3 font-medium">الاستقطاعات</th>
                <th className="pb-3 font-medium">الصافي</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payslips.map((p) => (
                <tr key={p.id} className="table-row" onClick={() => setSelected(p)}>
                  <td className="py-3 font-medium text-slate-700">{p.month} {p.year}</td>
                  <td className="py-3 text-slate-600">{formatCurrency(p.basic)}</td>
                  <td className="py-3 text-slate-600">{formatCurrency(p.allowances)}</td>
                  <td className="py-3 text-rose-500">−{formatCurrency(p.deductions)}</td>
                  <td className="py-3 font-bold text-emerald-600">{formatCurrency(p.net)}</td>
                  <td className="py-3 text-primary-600 text-xs">عرض</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PayslipDetail slip={selected} employee={employee} onClose={() => setSelected(null)} />
    </div>
  )
}
