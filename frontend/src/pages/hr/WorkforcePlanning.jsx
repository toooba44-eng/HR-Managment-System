import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Users, Wallet, Briefcase, TrendingDown, TrendingUp, Pencil } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts'
import toast from 'react-hot-toast'
import { workforceApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatCurrency } from '../../lib/utils'

const YEARS = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]
const MANAGE = ['admin', 'hr_manager', 'super_admin']

function VarianceBadge({ variance, hasPlan }) {
  const { t } = useTranslation()
  if (!hasPlan) return <span className="badge bg-slate-100 text-slate-400">{t('بلا خطة')}</span>
  if (variance === 0) return <span className="badge bg-emerald-50 text-emerald-600">{t('مطابق للخطة')}</span>
  if (variance > 0) return <span className="badge bg-blue-50 text-blue-600 inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {t('فائض {{count}}', { count: variance })}</span>
  return <span className="badge bg-amber-50 text-amber-600 inline-flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {t('نقص {{count}}', { count: Math.abs(variance) })}</span>
}

function PlanModal({ dept, year, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState({ planned_headcount: dept.planned_headcount ?? dept.actual_headcount, budget: dept.budget ?? '', notes: dept.notes || '' })
  const m = useMutation(() => workforceApi.setPlan(dept.department_id, { ...form, year }), {
    onSuccess: () => { toast.success(t('تم حفظ الخطة')); qc.invalidateQueries(['workforce', year]); qc.invalidateQueries('workforce-trend'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || t('فشل الحفظ')),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title={t('خطة القوى العاملة — {{name}} ({{year}})', { name: dept.department_name, year })}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate() }} className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-500">{t('العدد الفعلي الحالي')}</span>
          <span className="font-bold text-slate-800">{dept.actual_headcount}</span>
        </div>
        <Field label={t('العدد المخطط له')} required><Input type="number" min="0" value={form.planned_headcount} onChange={set('planned_headcount')} required /></Field>
        <Field label={t('الميزانية السنوية (ر.س)')}><Input type="number" min="0" step="1000" value={form.budget} onChange={set('budget')} /></Field>
        <Field label={t('ملاحظات')}><Textarea value={form.notes} onChange={set('notes')} rows={3} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={m.isLoading}>{t('حفظ')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function TrendPanel() {
  const { t } = useTranslation()
  const { data } = useQuery('workforce-trend', () => workforceApi.trend())
  const years = data?.years || []
  if (years.length === 0) return null

  const chartData = years.map((y) => ({ ...y, name: String(y.year) }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-slate-800 mb-4">{t('اتجاه العدد المخطط له عبر السنوات')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontFamily: 'Tajawal' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {data?.currentActual != null && (
              <ReferenceLine y={data.currentActual} stroke="#22c55e" strokeDasharray="4 4" label={{ value: t('الفعلي الحالي'), position: 'insideTopLeft', fontSize: 11, fill: '#16a34a' }} />
            )}
            <Line type="monotone" dataKey="planned" name={t('المخطط')} stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <h3 className="font-bold text-slate-800 mb-4">{t('اتجاه الميزانية عبر السنوات')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} width={70} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontFamily: 'Tajawal' }} formatter={(v) => formatCurrency(v)} />
            <Line type="monotone" dataKey="budget" name={t('الميزانية')} stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function WorkforcePlanning() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [year, setYear] = useState(new Date().getFullYear())
  const [editing, setEditing] = useState(null)
  const { data, isLoading } = useQuery(['workforce', year], () => workforceApi.list(year))

  if (isLoading) return <Spinner fullscreen />
  const depts = data?.departments || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-slate-800">{t('تخطيط القوى العاملة')}</h2>
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-32">
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('مخطط / فعلي')} value={`${s.planned ?? 0} / ${s.actual ?? 0}`} tone="blue" />
        <StatCard icon={Briefcase} label={t('شواغر مفتوحة')} value={s.open_positions ?? 0} tone="violet" />
        <StatCard icon={TrendingDown} label={t('أقسام بنقص')} value={s.understaffed ?? 0} tone="amber" />
        <StatCard icon={Wallet} label={t('الميزانية المخططة')} value={formatCurrency(s.budget ?? 0)} tone="green" />
      </div>

      <TrendPanel />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-slate-400 text-xs">
              <th className="text-right p-2 font-medium">{t('القسم')}</th>
              <th className="p-2 font-medium text-center">{t('المخطط')}</th>
              <th className="p-2 font-medium text-center">{t('الفعلي')}</th>
              <th className="p-2 font-medium text-center">{t('الشواغر المفتوحة')}</th>
              <th className="p-2 font-medium text-center">{t('الميزانية')}</th>
              <th className="p-2 font-medium text-center">{t('الحالة')}</th>
              {canManage && <th className="p-2"></th>}
            </tr>
          </thead>
          <tbody>
            {depts.map((d) => (
              <tr key={d.department_id} className="border-t border-slate-100">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="font-medium text-slate-700">{d.department_name}</span>
                  </div>
                  {d.notes && <p className="text-[11px] text-slate-400 mt-0.5 mr-4">{d.notes}</p>}
                </td>
                <td className="p-2 text-center text-slate-600">{d.planned_headcount ?? '—'}</td>
                <td className="p-2 text-center font-bold text-slate-800">{d.actual_headcount}</td>
                <td className="p-2 text-center">
                  {d.open_positions > 0 ? <span className="badge bg-violet-50 text-violet-600">{d.open_positions}</span> : <span className="text-slate-300">0</span>}
                </td>
                <td className="p-2 text-center text-slate-600">{d.budget ? formatCurrency(d.budget) : '—'}</td>
                <td className="p-2 text-center"><VarianceBadge variance={d.variance} hasPlan={!!d.plan_id} /></td>
                {canManage && (
                  <td className="p-2 text-center">
                    <button onClick={() => setEditing(d)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600 mx-auto"><Pencil className="w-4 h-4" /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <PlanModal dept={editing} year={year} onClose={() => setEditing(null)} />}
    </div>
  )
}
