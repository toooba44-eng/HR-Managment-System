import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Users, FileWarning, Download, Upload, ShieldCheck, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { employeesApi, departmentsApi } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import { Field, Input, Select, Button } from '../components/ui/Form'
import { formatDate } from '../lib/utils'
import { downloadCSV, parseCSV } from '../lib/csv'

const EXPORT_COLUMNS = [
  { key: 'employee_number', label: 'الرقم الوظيفي' },
  { key: 'full_name', label: 'الاسم الكامل' },
  { key: 'email', label: 'البريد الإلكتروني' },
  { key: 'phone', label: 'رقم الجوال' },
  { key: 'job_title', label: 'المسمى الوظيفي' },
  { key: 'department_name', label: 'الإدارة' },
  { key: 'employment_type', label: 'نوع التوظيف' },
  { key: 'work_location', label: 'موقع العمل' },
  { key: 'status', label: 'الحالة' },
  { key: 'hire_date', label: 'تاريخ التعيين' },
  { key: 'salary', label: 'الراتب الأساسي' },
]
const IMPORT_TEMPLATE_COLUMNS = [
  { key: 'full_name', label: 'الاسم الكامل' },
  { key: 'email', label: 'البريد الإلكتروني' },
  { key: 'job_title', label: 'المسمى الوظيفي' },
  { key: 'hire_date', label: 'hire_date' },
  { key: 'department', label: 'الإدارة' },
  { key: 'phone', label: 'رقم الجوال' },
  { key: 'employment_type', label: 'نوع التوظيف' },
  { key: 'salary', label: 'الراتب الأساسي' },
]

function ImportModal({ open, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState(null)

  const reset = () => { setRows([]); setFileName(''); setResult(null); if (fileRef.current) fileRef.current.value = '' }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        setRows(parseCSV(String(reader.result)))
      } catch {
        toast.error(t('تعذّر قراءة الملف'))
        setRows([])
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const mutation = useMutation(() => employeesApi.import(rows), {
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries('employees')
      if (data.created > 0) toast.success(t('تم إضافة {{count}} موظف', { count: data.created }))
      if (data.failed?.length) toast.error(t('تعذّر استيراد {{count}} صف', { count: data.failed.length }))
    },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل الاستيراد')),
  })

  const handleClose = () => { reset(); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title={t('استيراد موظفين من CSV')} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          {t('الأعمدة المطلوبة: الاسم الكامل، البريد الإلكتروني، المسمى الوظيفي، تاريخ التعيين (hire_date بصيغة YYYY-MM-DD). عمود "الإدارة" اختياري ويجب أن يطابق اسم إدارة موجودة.')}
        </p>
        <button
          type="button"
          onClick={() => downloadCSV('نموذج-استيراد-الموظفين.csv', [], IMPORT_TEMPLATE_COLUMNS)}
          className="text-sm text-primary-600 hover:underline"
        >
          {t('تحميل نموذج فارغ')}
        </button>

        <Field label={t('ملف CSV')}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="input-field" />
        </Field>

        {fileName && !result && (
          <p className="text-sm text-slate-600">{fileName} — {rows.length} {t('صف جاهز للاستيراد')}</p>
        )}

        {result && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2 text-sm">
            <p className="text-emerald-600 font-medium">{t('تم إنشاء {{count}} موظف بنجاح', { count: result.created })}</p>
            {result.failed?.length > 0 && (
              <div className="space-y-1">
                <p className="text-rose-600 font-medium">{t('فشل {{count}} صف', { count: result.failed.length })}:</p>
                <ul className="text-xs text-slate-500 space-y-0.5 max-h-40 overflow-y-auto">
                  {result.failed.map((f, i) => (
                    <li key={i}>{t('صف')} {f.row} ({f.email || '—'}): {f.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>{t('إغلاق')}</Button>
          {!result && (
            <Button type="button" onClick={() => mutation.mutate()} loading={mutation.isLoading} disabled={rows.length === 0}>
              <Upload className="w-4 h-4" /> {t('استيراد')} {rows.length > 0 ? `(${rows.length})` : ''}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function QiwaReadinessModal({ open, onClose }) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery('qiwa-readiness', employeesApi.qiwaReadiness, { enabled: open })
  const items = data?.items || []
  const s = data?.summary || {}
  return (
    <Modal open={open} onClose={onClose} title={t('جاهزية توثيق العقود في قوى')} size="lg">
      {isLoading || !data ? (
        <div className="py-12"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{t('فحص البيانات المطلوبة لتسجيل عقود العمل في منصة قوى لكل موظف نشط.')}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xl font-bold text-slate-800">{s.total ?? 0}</p>
              <p className="text-xs text-slate-400">{t('الإجمالي')}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <p className="text-xl font-bold text-emerald-700">{s.ready ?? 0}</p>
              <p className="text-xs text-emerald-600">{t('جاهز')}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-xl font-bold text-amber-700">{s.not_ready ?? 0}</p>
              <p className="text-xs text-amber-600">{t('يحتاج استكمال')}</p>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {items.filter((i) => !i.ok).map((i) => (
              <div key={i.employee_id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                <p className="text-sm font-bold text-slate-700">{i.full_name} <span className="text-xs font-normal text-slate-400">— {i.job_title}</span></p>
                <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                  {i.issues.map((iss) => (
                    <li key={iss} className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 shrink-0" /> {t(iss)}</li>
                  ))}
                </ul>
              </div>
            ))}
            {items.filter((i) => !i.ok).length === 0 && (
              <p className="text-sm text-emerald-600 text-center py-4">{t('جميع الموظفين النشطين جاهزون.')}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function EmployeeForm({ open, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: departments = [] } = useQuery('departments', departmentsApi.list, { enabled: open })
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', job_title: '',
    department_id: '', hire_date: '', employment_type: 'دوام كامل',
    salary: '', national_id: '',
  })

  const mutation = useMutation((data) => employeesApi.create(data), {
    onSuccess: () => {
      toast.success(t('تم إضافة الموظف بنجاح'))
      qc.invalidateQueries('employees')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || t('فشل إضافة الموظف')),
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      department_id: Number(form.department_id),
      salary: form.salary ? Number(form.salary) : 0,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={t('إضافة موظف جديد')} size="lg">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t('الاسم الكامل')} required>
          <Input value={form.full_name} onChange={set('full_name')} required />
        </Field>
        <Field label={t('البريد الإلكتروني')} required>
          <Input type="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label={t('رقم الجوال')}>
          <Input value={form.phone} onChange={set('phone')} placeholder="+966 5x xxx xxxx" />
        </Field>
        <Field label={t('رقم الهوية')}>
          <Input value={form.national_id} onChange={set('national_id')} />
        </Field>
        <Field label={t('المسمى الوظيفي')} required>
          <Input value={form.job_title} onChange={set('job_title')} required />
        </Field>
        <Field label={t('الإدارة')} required>
          <Select value={form.department_id} onChange={set('department_id')} required>
            <option value="">{t('اختر الإدارة')}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={t('تاريخ التعيين')} required>
          <Input type="date" value={form.hire_date} onChange={set('hire_date')} required />
        </Field>
        <Field label={t('نوع التوظيف')}>
          <Select value={form.employment_type} onChange={set('employment_type')}>
            <option value="دوام كامل">{t('دوام كامل')}</option>
            <option value="دوام جزئي">{t('دوام جزئي')}</option>
            <option value="عقد">{t('عقد')}</option>
            <option value="متدرب">{t('متدرب')}</option>
          </Select>
        </Field>
        <Field label={t('الراتب الأساسي')}>
          <Input type="number" value={form.salary} onChange={set('salary')} min="0" />
        </Field>
        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" loading={mutation.isLoading}>{t('حفظ الموظف')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Employees() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isHR, user } = useAuthStore()
  const canExport = isHR() || user?.role === 'department_head'
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showQiwa, setShowQiwa] = useState(false)
  const contractExpiring = searchParams.get('contract_expiring') === '1'

  const { data: departments = [] } = useQuery('departments', departmentsApi.list)
  const { data, isLoading } = useQuery(
    ['employees', { search, status, departmentId, contractExpiring, page }],
    () => employeesApi.list({ search, status, department_id: departmentId, contract_expiring: contractExpiring ? 1 : undefined, page, limit: 12 }),
    { keepPreviousData: true }
  )

  const employees = data?.employees || []
  const clearContractFilter = () => { setSearchParams({}); setPage(1) }

  const exportMutation = useMutation(
    () => employeesApi.export({ search, status, department_id: departmentId }),
    {
      onSuccess: (res) => {
        const rows = res.employees || []
        if (rows.length === 0) { toast.error(t('لا يوجد موظفون مطابقون للتصدير')); return }
        downloadCSV(`الموظفون-${new Date().toISOString().slice(0, 10)}.csv`, rows, EXPORT_COLUMNS)
        toast.success(t('تم تصدير {{count}} موظف', { count: rows.length }))
      },
      onError: () => toast.error(t('فشل التصدير')),
    }
  )

  return (
    <div className="space-y-6">
      {contractExpiring && (
        <div className="card border-r-4 border-amber-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <FileWarning className="w-5 h-5" />
            {t('عقود العمل التي تنتهي خلال 60 يوماً — رتّب التجديد أو إنهاء الخدمة قبل الموعد.')}
          </div>
          <Button variant="secondary" className="!py-1.5 !px-3 text-xs shrink-0" onClick={clearContractFilter}>{t('إزالة الفلتر')}</Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('ابحث بالاسم أو البريد أو المسمى الوظيفي...')}
            className="input-field pr-11"
          />
        </div>
        <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1) }} className="sm:w-48">
          <option value="">{t('كل الإدارات')}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="sm:w-40">
          <option value="">{t('كل الحالات')}</option>
          <option value="نشط">{t('نشط')}</option>
          <option value="إجازة">{t('إجازة')}</option>
          <option value="معلق">{t('معلق')}</option>
          <option value="مستقيل">{t('مستقيل')}</option>
        </Select>
        {canExport && (
          <Button variant="secondary" onClick={() => exportMutation.mutate()} loading={exportMutation.isLoading} className="sm:w-auto whitespace-nowrap">
            <Download className="w-4 h-4" />
            {t('تصدير')}
          </Button>
        )}
        {isHR() && (
          <>
            <Button variant="secondary" onClick={() => setShowQiwa(true)} className="sm:w-auto whitespace-nowrap">
              <ShieldCheck className="w-4 h-4" />
              {t('جاهزية قوى')}
            </Button>
            <Button variant="secondary" onClick={() => setShowImport(true)} className="sm:w-auto whitespace-nowrap">
              <Upload className="w-4 h-4" />
              {t('استيراد')}
            </Button>
            <Button onClick={() => setShowForm(true)} className="sm:w-auto whitespace-nowrap">
              <Plus className="w-5 h-5" />
              {t('موظف جديد')}
            </Button>
          </>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <Spinner fullscreen />
      ) : employees.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title={t('لا يوجد موظفون')} description={t('جرّب تغيير معايير البحث أو أضف موظفاً جديداً')} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => navigate(`/employees/${emp.id}`)}
              className="card text-right hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="flex items-start gap-3">
                <Avatar name={emp.full_name} src={emp.profile_picture} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800 truncate">{emp.full_name}</h3>
                    <Badge status={emp.status}>{t(emp.status)}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{emp.job_title}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{emp.department_name || '—'}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">{t('تاريخ التعيين')}</p>
                  <p className="text-slate-600 font-medium">{formatDate(emp.hire_date)}</p>
                </div>
                <div>
                  <p className="text-slate-400">{t('الرقم الوظيفي')}</p>
                  <p className="text-slate-600 font-medium truncate">{emp.employee_number || '—'}</p>
                </div>
                {contractExpiring && emp.contract_end && (
                  <div className="col-span-2">
                    <p className="text-slate-400">{t('نهاية العقد')}</p>
                    <p className="text-amber-600 font-medium">{formatDate(emp.contract_end)}</p>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={data?.pagination?.totalPages}
        onChange={setPage}
      />

      <EmployeeForm open={showForm} onClose={() => setShowForm(false)} />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} />
      <QiwaReadinessModal open={showQiwa} onClose={() => setShowQiwa(false)} />
    </div>
  )
}
