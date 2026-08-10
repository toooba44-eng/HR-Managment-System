import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Wallet, Users, TrendingDown, Banknote, Plus, Trash2, ArrowLeftCircle, ClipboardList, CheckCircle2, Clock, Landmark, Download, AlertTriangle, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { payrollApi, departmentsApi } from '../../api/endpoints'
import { downloadWpsFile } from '../../lib/wps'
import { downloadCSV } from '../../lib/csv'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import Avatar from '../../components/ui/Avatar'
import { Field, Input, Select, Button } from '../../components/ui/Form'
import { formatCurrency, formatDateTime } from '../../lib/utils'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const NEXT_STATUS = { مسودة: 'قيد المراجعة', 'قيد المراجعة': 'معتمد', معتمد: 'مصروف' }
const NEXT_LABEL = { مسودة: 'إرسال للمراجعة', 'قيد المراجعة': 'اعتماد', معتمد: 'صرف' }

function OverviewTab() {
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

function NewRunForm({ open, onClose }) {
  const qc = useQueryClient()
  const now = new Date()
  const [form, setForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const m = useMutation(() => payrollApi.createRun(form), {
    onSuccess: () => { toast.success('تم إنشاء المسير'); qc.invalidateQueries('payroll-runs'); onClose() },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل الإنشاء'),
  })
  return (
    <Modal open={open} onClose={onClose} title="مسير رواتب جديد">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate() }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="الشهر" required>
            <Select value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}>
              {MONTHS.map((mn, i) => <option key={mn} value={i + 1}>{mn}</option>)}
            </Select>
          </Field>
          <Field label="السنة" required>
            <Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))} required />
          </Field>
        </div>
        <p className="text-xs text-slate-400">سيتم إنشاء المسير من رواتب الموظفين النشطين الحالية، وسيمر بمراحل المراجعة والاعتماد والصرف.</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={m.isLoading}>إنشاء</Button>
        </div>
      </form>
    </Modal>
  )
}

const WPS_SUB_STATUS_TONE = { 'تم التوليد': 'bg-slate-100 text-slate-600', 'أُرسل لمدد': 'bg-amber-50 text-amber-600', 'مؤكد': 'bg-emerald-50 text-emerald-600' }

function WpsSection({ runId }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery(['payroll-run-wps', runId], () => payrollApi.wps(runId), { enabled: !!runId })
  const { data: subsData } = useQuery(['wps-submissions', runId], () => payrollApi.wpsSubmissions(runId), { enabled: !!runId })
  const record = useMutation(() => payrollApi.recordWps(runId), {
    onSuccess: () => qc.invalidateQueries(['wps-submissions', runId]),
  })
  const advance = useMutation(
    ({ subId, status, mudad_reference }) => payrollApi.advanceWpsSubmission(subId, status, mudad_reference),
    {
      onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries(['wps-submissions', runId]) },
      onError: (e) => toast.error(e.response?.data?.error || 'فشل التحديث'),
    }
  )

  if (isLoading || !data) return null
  const issueCount = data.items.filter((i) => !i.ok).length
  const submissions = subsData?.submissions || []

  const markSent = (subId) => {
    const ref = window.prompt('الرقم المرجعي من مدد:')
    if (ref && ref.trim()) advance.mutate({ subId, status: 'أُرسل لمدد', mudad_reference: ref.trim() })
  }

  return (
    <div className="rounded-xl border border-slate-100 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Landmark className="w-4 h-4 text-slate-400" /> ملف حماية الأجور (WPS)</p>
        <Button
          variant={data.ready ? 'primary' : 'secondary'}
          disabled={!data.ready}
          onClick={() => { downloadWpsFile(data); toast.success('تم تنزيل الملف'); record.mutate() }}
        >
          <Download className="w-4 h-4" /> تنزيل الملف
        </Button>
      </div>
      {data.org_issues.length > 0 && (
        <ul className="text-xs text-amber-600 space-y-1">
          {data.org_issues.map((iss) => <li key={iss} className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {iss}</li>)}
        </ul>
      )}
      {issueCount > 0 && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {issueCount} موظف يحتاج بيانات هوية/آيبان صحيحة قبل توليد الملف</p>
      )}
      {data.ready && <p className="text-xs text-emerald-600">جاهز للتوليد — {data.items.length} موظف.</p>}

      {submissions.length > 0 && (
        <div className="pt-2 mt-2 border-t border-slate-50 space-y-1.5">
          <p className="text-xs font-bold text-slate-500">سجل الإرسال</p>
          {submissions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <span className={`badge ${WPS_SUB_STATUS_TONE[s.status]}`}>{s.status}</span>
                <span className="text-slate-400 mr-2">{formatDateTime(s.created_at)} · {s.generated_by_name || '—'}</span>
                {s.mudad_reference && <span className="text-slate-500 block mt-1">مرجع مدد: {s.mudad_reference}</span>}
              </div>
              {s.status === 'تم التوليد' && (
                <button onClick={() => markSent(s.id)} className="shrink-0 text-blue-600 hover:underline">تسجيل الإرسال لمدد</button>
              )}
              {s.status === 'أُرسل لمدد' && (
                <button onClick={() => advance.mutate({ subId: s.id, status: 'مؤكد' })} className="shrink-0 text-emerald-600 hover:underline">تأكيد الاستلام</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const GOSI_CSV_COLUMNS = [
  { key: 'full_name', label: 'الموظف' },
  { key: 'national_id', label: 'رقم الهوية/الإقامة' },
  { key: 'nationality', label: 'الجنسية' },
  { key: 'gosi_wage', label: 'الأجر الخاضع للاشتراك' },
  { key: 'employee_gosi', label: 'اشتراك الموظف' },
  { key: 'employer_gosi', label: 'اشتراك المنشأة' },
  { key: 'total_gosi', label: 'الإجمالي' },
]

function GosiSection({ runId, month, year }) {
  const { data, isLoading } = useQuery(['payroll-run-gosi', runId], () => payrollApi.gosi(runId), { enabled: !!runId })
  if (isLoading || !data) return null
  const issueCount = data.items.filter((i) => !i.ok).length
  return (
    <div className="rounded-xl border border-slate-100 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-slate-400" /> تقرير اشتراكات التأمينات الاجتماعية (GOSI)</p>
        <Button
          variant={data.ready ? 'primary' : 'secondary'}
          disabled={!data.ready}
          onClick={() => { downloadCSV(`GOSI_${year}${String(month).padStart(2, '0')}.csv`, data.items, GOSI_CSV_COLUMNS); toast.success('تم تنزيل التقرير') }}
        >
          <Download className="w-4 h-4" /> تنزيل التقرير
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
        <div>اشتراك الموظفين: {formatCurrency(data.totals.employee_gosi)}</div>
        <div>اشتراك المنشأة: {formatCurrency(data.totals.employer_gosi)}</div>
        <div>الإجمالي: {formatCurrency(data.totals.total_gosi)}</div>
      </div>
      {issueCount > 0 && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {issueCount} موظف يحتاج بيانات هوية/جنسية صحيحة قبل توليد التقرير</p>
      )}
    </div>
  )
}

function RunDetailModal({ runId, onClose }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery(['payroll-run', runId], () => payrollApi.getRun(runId), { enabled: !!runId })
  const advance = useMutation((status) => payrollApi.advanceRun(runId, status), {
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries(['payroll-run', runId]); qc.invalidateQueries('payroll-runs') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل التحديث'),
  })

  return (
    <Modal open={!!runId} onClose={onClose} title="تفاصيل مسير الرواتب" size="lg">
      {isLoading || !data ? (
        <div className="py-12"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-800">{MONTHS[data.month - 1]} {data.year}</p>
              <p className="text-xs text-slate-400">{data.employee_count} موظف · الصافي {formatCurrency(data.total_net)}</p>
            </div>
            <Badge status={data.status} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 rounded-xl bg-slate-50 border border-slate-100 p-3">
            <div>أنشأه: {data.created_by_name || '—'}</div>
            <div>اعتمده: {data.approved_by_name ? `${data.approved_by_name} (${formatDateTime(data.approved_at)})` : '—'}</div>
            <div>تاريخ الصرف: {data.paid_at ? formatDateTime(data.paid_at) : '—'}</div>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-400 border-b border-slate-100 sticky top-0 bg-white">
                  <th className="pb-2 font-medium">الموظف</th>
                  <th className="pb-2 font-medium">الأساسي</th>
                  <th className="pb-2 font-medium">البدلات</th>
                  <th className="pb-2 font-medium">الاستقطاعات</th>
                  <th className="pb-2 font-medium">الصافي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((i) => (
                  <tr key={i.employee_id}>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={i.full_name} src={i.profile_picture} size="sm" />
                        <span className="text-slate-700">{i.full_name}</span>
                      </div>
                    </td>
                    <td className="py-2 text-slate-600">{formatCurrency(i.basic)}</td>
                    <td className="py-2 text-slate-600">{formatCurrency(i.allowances)}</td>
                    <td className="py-2 text-rose-500">−{formatCurrency(i.deductions)}</td>
                    <td className="py-2 font-bold text-emerald-600">{formatCurrency(i.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <WpsSection runId={runId} />
          <GosiSection runId={runId} month={data.month} year={data.year} />

          {NEXT_STATUS[data.status] && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button onClick={() => advance.mutate(NEXT_STATUS[data.status])} loading={advance.isLoading}>
                <ArrowLeftCircle className="w-4 h-4" /> {NEXT_LABEL[data.status]}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function RunsTab() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const { data, isLoading } = useQuery('payroll-runs', payrollApi.runs)
  const remove = useMutation((id) => payrollApi.removeRun(id), {
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries('payroll-runs') },
    onError: (e) => toast.error(e.response?.data?.error || 'فشل الحذف'),
  })

  if (isLoading) return <Spinner fullscreen />
  const runs = data?.runs || []
  const s = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="إجمالي المسيرات" value={s.total ?? 0} tone="blue" />
        <StatCard icon={Clock} label="بانتظار الاعتماد" value={s.pendingApproval ?? 0} tone="amber" />
        <StatCard icon={CheckCircle2} label="مصروفة" value={s.paid ?? 0} tone="green" />
        <StatCard icon={ClipboardList} label="مسودات" value={s.drafts ?? 0} tone="violet" />
      </div>

      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="w-5 h-5" /> مسير جديد</Button></div>

      {runs.length === 0 ? (
        <div className="card"><EmptyState icon={Wallet} title="لا توجد مسيرات رواتب" description="أنشئ أول مسير رواتب لهذا الشهر." /></div>
      ) : (
        <div className="space-y-3">
          {runs.map((r) => (
            <button key={r.id} onClick={() => setDetailId(r.id)} className="card w-full text-right flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800">{MONTHS[r.month - 1]} {r.year}</p>
                  <Badge status={r.status} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{r.employee_count} موظف · الصافي {formatCurrency(r.total_net)} · أنشأه {r.created_by_name || '—'}</p>
              </div>
              {r.status === 'مسودة' && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); if (window.confirm('حذف المسير؟')) remove.mutate(r.id) }}
                  className="text-slate-300 hover:text-rose-500 shrink-0 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <NewRunForm open={showForm} onClose={() => setShowForm(false)} />
      {detailId && <RunDetailModal runId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

export default function Payroll() {
  const [tab, setTab] = useState('overview')
  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-100">
        <button onClick={() => setTab('overview')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'overview' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>نظرة عامة</button>
        <button onClick={() => setTab('runs')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'runs' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>مسيرات الرواتب</button>
      </div>
      {tab === 'overview' ? <OverviewTab /> : <RunsTab />}
    </div>
  )
}
