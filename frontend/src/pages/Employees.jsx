import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Search, Plus, Users, FileWarning } from 'lucide-react'
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

function EmployeeForm({ open, onClose }) {
  const qc = useQueryClient()
  const { data: departments = [] } = useQuery('departments', departmentsApi.list, { enabled: open })
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', job_title: '',
    department_id: '', hire_date: '', employment_type: 'دوام كامل',
    salary: '', national_id: '',
  })

  const mutation = useMutation((data) => employeesApi.create(data), {
    onSuccess: () => {
      toast.success('تم إضافة الموظف بنجاح')
      qc.invalidateQueries('employees')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'فشل إضافة الموظف'),
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
    <Modal open={open} onClose={onClose} title="إضافة موظف جديد" size="lg">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="الاسم الكامل" required>
          <Input value={form.full_name} onChange={set('full_name')} required />
        </Field>
        <Field label="البريد الإلكتروني" required>
          <Input type="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="رقم الجوال">
          <Input value={form.phone} onChange={set('phone')} placeholder="+966 5x xxx xxxx" />
        </Field>
        <Field label="رقم الهوية">
          <Input value={form.national_id} onChange={set('national_id')} />
        </Field>
        <Field label="المسمى الوظيفي" required>
          <Input value={form.job_title} onChange={set('job_title')} required />
        </Field>
        <Field label="الإدارة" required>
          <Select value={form.department_id} onChange={set('department_id')} required>
            <option value="">اختر الإدارة</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="تاريخ التعيين" required>
          <Input type="date" value={form.hire_date} onChange={set('hire_date')} required />
        </Field>
        <Field label="نوع التوظيف">
          <Select value={form.employment_type} onChange={set('employment_type')}>
            <option>دوام كامل</option>
            <option>دوام جزئي</option>
            <option>عقد</option>
            <option>متدرب</option>
          </Select>
        </Field>
        <Field label="الراتب الأساسي">
          <Input type="number" value={form.salary} onChange={set('salary')} min="0" />
        </Field>
        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" loading={mutation.isLoading}>حفظ الموظف</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Employees() {
  const navigate = useNavigate()
  const { isHR } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const contractExpiring = searchParams.get('contract_expiring') === '1'

  const { data: departments = [] } = useQuery('departments', departmentsApi.list)
  const { data, isLoading } = useQuery(
    ['employees', { search, status, departmentId, contractExpiring, page }],
    () => employeesApi.list({ search, status, department_id: departmentId, contract_expiring: contractExpiring ? 1 : undefined, page, limit: 12 }),
    { keepPreviousData: true }
  )

  const employees = data?.employees || []
  const clearContractFilter = () => { setSearchParams({}); setPage(1) }

  return (
    <div className="space-y-6">
      {contractExpiring && (
        <div className="card border-r-4 border-amber-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <FileWarning className="w-5 h-5" />
            عقود العمل التي تنتهي خلال 60 يوماً — رتّب التجديد أو إنهاء الخدمة قبل الموعد.
          </div>
          <Button variant="secondary" className="!py-1.5 !px-3 text-xs shrink-0" onClick={clearContractFilter}>إزالة الفلتر</Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="ابحث بالاسم أو البريد أو المسمى الوظيفي..."
            className="input-field pr-11"
          />
        </div>
        <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1) }} className="sm:w-48">
          <option value="">كل الإدارات</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="sm:w-40">
          <option value="">كل الحالات</option>
          <option value="نشط">نشط</option>
          <option value="إجازة">إجازة</option>
          <option value="معلق">معلق</option>
          <option value="مستقيل">مستقيل</option>
        </Select>
        {isHR() && (
          <Button onClick={() => setShowForm(true)} className="sm:w-auto whitespace-nowrap">
            <Plus className="w-5 h-5" />
            موظف جديد
          </Button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <Spinner fullscreen />
      ) : employees.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title="لا يوجد موظفون" description="جرّب تغيير معايير البحث أو أضف موظفاً جديداً" />
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
                    <Badge status={emp.status} />
                  </div>
                  <p className="text-sm text-slate-500 truncate">{emp.job_title}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{emp.department_name || '—'}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">تاريخ التعيين</p>
                  <p className="text-slate-600 font-medium">{formatDate(emp.hire_date)}</p>
                </div>
                <div>
                  <p className="text-slate-400">الرقم الوظيفي</p>
                  <p className="text-slate-600 font-medium truncate">{emp.employee_number || '—'}</p>
                </div>
                {contractExpiring && emp.contract_end && (
                  <div className="col-span-2">
                    <p className="text-slate-400">نهاية العقد</p>
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
    </div>
  )
}
