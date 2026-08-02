import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Gift, Plus, Trash2, Pencil, Wallet, Users, ShieldCheck, TrendingUp, History, ArrowUp, ArrowDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { compensationApi, employeesApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import StatCard from '../../components/ui/StatCard'
import { Field, Input, Textarea, Select, Button } from '../../components/ui/Form'
import { formatCurrency, formatDate } from '../../lib/utils'

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin']
const INSURANCE = ['الفئة أ', 'الفئة ب', 'الفئة ج', 'بدون']
const GRADES = ['الدرجة التنفيذية', 'الدرجة الأولى', 'الدرجة الثانية', 'الدرجة الثالثة', 'الدرجة الرابعة']

const pkgTotal = (r) =>
  r.total_salary ?? (Number(r.base_salary) + Number(r.housing_allowance) + Number(r.transport_allowance) + Number(r.other_allowances) + Number(r.bonus))

function Form({ open, onClose, editing }) {
  const qc = useQueryClient()
  const { data: emps } = useQuery('employees-all', () => employeesApi.list({ limit: 100 }), { enabled: open })
  const [form, setForm] = useState(() => editing || {
    employee_id: '', grade: 'الدرجة الأولى', base_salary: '', housing_allowance: '', transport_allowance: '',
    other_allowances: '', bonus: '', insurance_class: 'الفئة أ', effective_date: '', status: 'نشط',
  })
  const m = useMutation(
    (d) => (editing ? compensationApi.update(editing.id, d) : compensationApi.create(d)),
    {
      onSuccess: () => { toast.success(editing ? 'تم التحديث' : 'تمت الإضافة'); qc.invalidateQueries('compensation'); onClose() },
      onError: (e) => toast.error(e.response?.data?.error || 'فشلت العملية'),
    },
  )
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل حزمة التعويضات' : 'حزمة تعويضات جديدة'}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form) }} className="space-y-4">
        {!editing && (
          <Field label="الموظف" required>
            <Select value={form.employee_id} onChange={set('employee_id')} required>
              <option value="">اختر</option>
              {(emps?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="الدرجة الوظيفية"><Select value={form.grade} onChange={set('grade')}>{GRADES.map((g) => <option key={g}>{g}</option>)}</Select></Field>
          <Field label="فئة التأمين"><Select value={form.insurance_class} onChange={set('insurance_class')}>{INSURANCE.map((g) => <option key={g}>{g}</option>)}</Select></Field>
          <Field label="الراتب الأساسي" required><Input type="number" min="0" value={form.base_salary} onChange={set('base_salary')} required /></Field>
          <Field label="بدل السكن"><Input type="number" min="0" value={form.housing_allowance} onChange={set('housing_allowance')} /></Field>
          <Field label="بدل النقل"><Input type="number" min="0" value={form.transport_allowance} onChange={set('transport_allowance')} /></Field>
          <Field label="بدلات أخرى"><Input type="number" min="0" value={form.other_allowances} onChange={set('other_allowances')} /></Field>
          <Field label="مكافآت"><Input type="number" min="0" value={form.bonus} onChange={set('bonus')} /></Field>
          <Field label="تاريخ السريان"><Input type="date" value={form.effective_date || ''} onChange={set('effective_date')} /></Field>
        </div>
        {editing && (
          <>
            <Field label="الحالة"><Select value={form.status} onChange={set('status')}><option>نشط</option><option>مؤرشف</option></Select></Field>
            <Field label="سبب التغيير (اختياري)"><Textarea value={form.change_reason || ''} onChange={set('change_reason')} rows={2} placeholder="مثال: ترقية سنوية، تعديل السوق..." /></Field>
          </>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>حفظ</Button>
        </div>
      </form>
    </Modal>
  )
}

function HistoryModal({ pkg, onClose }) {
  const { data = [], isLoading } = useQuery(['compensation-history', pkg.id], () => compensationApi.history(pkg.id))
  return (
    <Modal open onClose={onClose} title={`سجل تعديلات الراتب — ${pkg.full_name || ''}`}>
      {isLoading ? <Spinner /> : data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">لا توجد تعديلات مسجّلة بعد.</p>
      ) : (
        <div className="space-y-2">
          {data.map((h) => {
            const diff = h.new_total - h.old_total
            const pct = h.old_total ? Math.round((diff / h.old_total) * 1000) / 10 : 0
            return (
              <div key={h.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">{formatCurrency(h.old_total)}</span>
                    <span className="text-slate-300">←</span>
                    <span className="font-bold text-slate-800">{formatCurrency(h.new_total)}</span>
                  </div>
                  <span className={`badge inline-flex items-center gap-1 ${diff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {diff >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} {Math.abs(pct)}%
                  </span>
                </div>
                {h.reason && <p className="text-xs text-slate-500 mt-1.5">{h.reason}</p>}
                <p className="text-[11px] text-slate-400 mt-1">{h.changed_by_name || 'مستخدم'} · {formatDate(h.created_at)}</p>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

export default function Compensation() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canManage = MANAGE.includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewingHistory, setViewingHistory] = useState(null)
  const { data, isLoading } = useQuery('compensation', () => compensationApi.list())
  const del = useMutation((id) => compensationApi.remove(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('compensation') },
    onError: () => toast.error('فشل الحذف'),
  })

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (r) => { setEditing(r); setShowForm(true) }

  if (isLoading) return <Spinner fullscreen />
  const items = data?.compensation || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Wallet} label="إجمالي الرواتب الشهرية" value={formatCurrency(s.monthlyPayroll ?? 0)} tone="blue" />
          <StatCard icon={TrendingUp} label="متوسط الحزمة" value={formatCurrency(s.avgSalary ?? 0)} tone="violet" />
          <StatCard icon={Users} label="عدد الحزم" value={s.count ?? 0} tone="amber" />
          <StatCard icon={ShieldCheck} label="مشمولون بالتأمين" value={s.insured ?? 0} tone="green" />
        </div>
      )}

      {canManage && <div className="flex justify-end"><Button onClick={openNew}><Plus className="w-5 h-5" /> حزمة تعويضات</Button></div>}

      {items.length === 0 ? (
        <div className="card"><EmptyState icon={Gift} title="لا توجد حزم تعويضات" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-400 border-b border-slate-100">
                {canManage && <th className="pb-3 font-medium">الموظف</th>}
                <th className="pb-3 font-medium">الدرجة</th>
                <th className="pb-3 font-medium">الأساسي</th>
                <th className="pb-3 font-medium">البدلات</th>
                <th className="pb-3 font-medium">الإجمالي الشهري</th>
                <th className="pb-3 font-medium">التأمين</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((r) => {
                const allowances = Number(r.housing_allowance) + Number(r.transport_allowance) + Number(r.other_allowances) + Number(r.bonus)
                return (
                  <tr key={r.id}>
                    {canManage && (
                      <td className="py-3">
                        <div className="flex items-center gap-2"><Avatar name={r.full_name} size="sm" /><div><p className="text-slate-700">{r.full_name}</p><p className="text-xs text-slate-400">{r.job_title}</p></div></div>
                      </td>
                    )}
                    <td className="py-3 text-slate-600">{r.grade}</td>
                    <td className="py-3 text-slate-700">{formatCurrency(r.base_salary)}</td>
                    <td className="py-3 text-slate-500">{formatCurrency(allowances)}</td>
                    <td className="py-3 font-bold text-slate-800">{formatCurrency(pkgTotal(r))}</td>
                    <td className="py-3 text-slate-600">{r.insurance_class}</td>
                    <td className="py-3"><Badge status={r.status} /></td>
                    <td className="py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setViewingHistory(r)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-violet-600" title="سجل التعديلات"><History className="w-4 h-4" /></button>
                        {canManage && (
                          <>
                            <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => window.confirm('حذف الحزمة؟') && del.mutate(r.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {showForm && <Form open={showForm} onClose={() => setShowForm(false)} editing={editing} />}
      {viewingHistory && <HistoryModal pkg={viewingHistory} onClose={() => setViewingHistory(null)} />}
    </div>
  )
}
