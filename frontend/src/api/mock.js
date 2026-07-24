// In-browser mock API for the static GitHub Pages demo (VITE_DEMO=true).
// Mirrors the backend endpoints using the same seed data, entirely client-side.
// No persistence across reloads — state lives in memory for the session.

const today = () => new Date().toISOString().split('T')[0]
const nowIso = () => new Date().toISOString()
const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms))

// ---------- Seed data (mirrors backend/src/config/seed.js) ----------
const departments = [
  { id: 1, name: 'الإدارة العليا', description: 'الإدارة العليا والرؤساء التنفيذيون', color: '#1E3A5F', manager_id: 1 },
  { id: 2, name: 'الموارد البشرية', description: 'إدارة الموارد البشرية والتوظيف', color: '#E63946', manager_id: 5 },
  { id: 3, name: 'التقنية', description: 'تطوير البرمجيات والبنية التحتية التقنية', color: '#4361EE', manager_id: 2 },
  { id: 4, name: 'المالية', description: 'المحاسبة والميزانيات والتقارير المالية', color: '#2A9D8F', manager_id: 3 },
  { id: 5, name: 'المبيعات', description: 'المبيعات وخدمة العملاء', color: '#F4A261', manager_id: 4 },
  { id: 6, name: 'التسويق', description: 'التسويق الرقمي والعلامة التجارية', color: '#9B5DE5', manager_id: 7 },
  { id: 7, name: 'القانونية', description: 'الشؤون القانونية والعقود', color: '#00B4D8', manager_id: 8 },
  { id: 8, name: 'العمليات', description: 'إدارة العمليات واللوجستيات', color: '#FB8500', manager_id: 9 },
]

const employees = [
  { id: 1, full_name: 'أحمد عبدالله العلي', email: 'ahmed.ceo@quant.com', phone: '+966 50 111 0001', national_id: '1000000001', date_of_birth: '1975-03-15', nationality: 'سعودي', marital_status: 'متزوج', address: 'الرياض، حي الدبلوماسية', employee_number: 'EMP-001', job_title: 'الرئيس التنفيذي', department_id: 1, manager_id: null, hire_date: '2015-01-01', employment_type: 'دوام كامل', work_location: 'الرياض - المقر الرئيسي', status: 'نشط', salary: 50000, allowances: 8000, bank_name: 'البنك الأهلي', bank_account: 'SA0010001', contract_type: 'غير محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
  { id: 2, full_name: 'محمد أحمد علام', email: 'mohamed.tech@quant.com', phone: '+966 50 123 4567', national_id: '1000000002', date_of_birth: '1990-05-20', nationality: 'سعودي', marital_status: 'متزوج', address: 'الرياض، حي العليا', employee_number: 'EMP-002', job_title: 'مدير تقني', department_id: 3, manager_id: 1, hire_date: '2020-03-01', employment_type: 'دوام كامل', work_location: 'الرياض - المقر الرئيسي', status: 'نشط', salary: 25000, allowances: 3500, bank_name: 'البنك الأهلي', bank_account: 'SA0010002', contract_type: 'غير محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
  { id: 3, full_name: 'سارة خالد الفهد', email: 'sara.finance@quant.com', phone: '+966 50 234 5678', national_id: '1000000003', date_of_birth: '1988-08-12', nationality: 'سعودية', marital_status: 'متزوجة', address: 'الرياض، حي النزهة', employee_number: 'EMP-003', job_title: 'مديرة مالية', department_id: 4, manager_id: 1, hire_date: '2018-06-15', employment_type: 'دوام كامل', work_location: 'الرياض - المقر الرئيسي', status: 'نشط', salary: 28000, allowances: 4000, bank_name: 'بنك الرياض', bank_account: 'SA0020003', contract_type: 'غير محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
  { id: 4, full_name: 'عمر حسن السالم', email: 'omar.sales@quant.com', phone: '+966 50 345 6789', national_id: '1000000004', date_of_birth: '1992-11-03', nationality: 'سعودي', marital_status: 'أعزب', address: 'جدة، حي الروضة', employee_number: 'EMP-004', job_title: 'مدير مبيعات', department_id: 5, manager_id: 4, hire_date: '2019-01-10', employment_type: 'دوام كامل', work_location: 'جدة - فرع جدة', status: 'نشط', salary: 22000, allowances: 3000, bank_name: 'البنك الأهلي', bank_account: 'SA0010004', contract_type: 'غير محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
  { id: 5, full_name: 'نورة عبدالرحمن', email: 'noura.hr@quant.com', phone: '+966 50 456 7890', national_id: '1000000005', date_of_birth: '1993-02-28', nationality: 'سعودية', marital_status: 'أعزب', address: 'الرياض، حي الياسمين', employee_number: 'EMP-005', job_title: 'مديرة موارد بشرية', department_id: 2, manager_id: 1, hire_date: '2021-04-20', employment_type: 'دوام كامل', work_location: 'الرياض - المقر الرئيسي', status: 'نشط', salary: 20000, allowances: 2500, bank_name: 'بنك الرياض', bank_account: 'SA0020005', contract_type: 'غير محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
  { id: 6, full_name: 'خالد سعد المطيري', email: 'khaled.dev@quant.com', phone: '+966 50 567 8901', national_id: '1000000006', date_of_birth: '1994-07-14', nationality: 'سعودي', marital_status: 'أعزب', address: 'الرياض، حي الملقا', employee_number: 'EMP-006', job_title: 'مطور برمجيات أول', department_id: 3, manager_id: 2, hire_date: '2022-08-01', employment_type: 'دوام كامل', work_location: 'الرياض - المقر الرئيسي', status: 'نشط', salary: 18000, allowances: 2000, bank_name: 'البنك الأهلي', bank_account: 'SA0010006', contract_type: 'غير محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
  { id: 7, full_name: 'ليلى محمد الشمري', email: 'laila.marketing@quant.com', phone: '+966 50 678 9012', national_id: '1000000007', date_of_birth: '1991-09-05', nationality: 'سعودية', marital_status: 'متزوجة', address: 'الدمام، حي الفيصلية', employee_number: 'EMP-007', job_title: 'مديرة تسويق', department_id: 6, manager_id: 1, hire_date: '2020-11-15', employment_type: 'دوام كامل', work_location: 'الدمام - فرع الدمام', status: 'نشط', salary: 21000, allowances: 2800, bank_name: 'بنك الرياض', bank_account: 'SA0020007', contract_type: 'غير محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
  { id: 8, full_name: 'فهد عبدالعزيز', email: 'fahd.legal@quant.com', phone: '+966 50 789 0123', national_id: '1000000008', date_of_birth: '1987-04-22', nationality: 'سعودي', marital_status: 'متزوج', address: 'الرياض، حي الصحافة', employee_number: 'EMP-008', job_title: 'مدير قانوني', department_id: 7, manager_id: 1, hire_date: '2017-02-01', employment_type: 'دوام كامل', work_location: 'الرياض - المقر الرئيسي', status: 'نشط', salary: 24000, allowances: 3500, bank_name: 'البنك الأهلي', bank_account: 'SA0010008', contract_type: 'غير محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
  { id: 9, full_name: 'ريم عبدالله العتيبي', email: 'reem.ops@quant.com', phone: '+966 50 890 1234', national_id: '1000000009', date_of_birth: '1995-12-10', nationality: 'سعودية', marital_status: 'أعزب', address: 'الرياض، حي النرجس', employee_number: 'EMP-009', job_title: 'مديرة عمليات', department_id: 8, manager_id: 1, hire_date: '2023-01-05', employment_type: 'دوام كامل', work_location: 'الرياض - المقر الرئيسي', status: 'نشط', salary: 19000, allowances: 2200, bank_name: 'بنك الرياض', bank_account: 'SA0020009', contract_type: 'محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
  { id: 10, full_name: 'عبدالرحمن سليمان', email: 'abdulrahman.dev@quant.com', phone: '+966 50 901 2345', national_id: '1000000010', date_of_birth: '1996-03-18', nationality: 'سعودي', marital_status: 'أعزب', address: 'جدة، حي الشاطئ', employee_number: 'EMP-010', job_title: 'مطور واجهات أمامية', department_id: 3, manager_id: 2, hire_date: '2023-06-01', employment_type: 'دوام كامل', work_location: 'جدة - فرع جدة', status: 'نشط', salary: 14000, allowances: 1500, bank_name: 'البنك الأهلي', bank_account: 'SA0010010', contract_type: 'محدد', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
]

// email -> auth mapping
const users = {
  'admin@quant.com': { password: 'admin123', role: 'admin', employee_id: null },
  'ahmed.ceo@quant.com': { password: 'password123', role: 'admin', employee_id: 1 },
  'mohamed.tech@quant.com': { password: 'password123', role: 'department_head', employee_id: 2 },
  'sara.finance@quant.com': { password: 'password123', role: 'department_head', employee_id: 3 },
  'omar.sales@quant.com': { password: 'password123', role: 'department_head', employee_id: 4 },
  'noura.hr@quant.com': { password: 'password123', role: 'hr_manager', employee_id: 5 },
  'khaled.dev@quant.com': { password: 'password123', role: 'employee', employee_id: 6 },
  'laila.marketing@quant.com': { password: 'password123', role: 'department_head', employee_id: 7 },
  'fahd.legal@quant.com': { password: 'password123', role: 'department_head', employee_id: 8 },
  'reem.ops@quant.com': { password: 'password123', role: 'department_head', employee_id: 9 },
  'abdulrahman.dev@quant.com': { password: 'password123', role: 'employee', employee_id: 10 },
}

// Generate attendance for the last 7 days (present, ~8h) for all employees
let attendanceSeq = 1
const attendance = []
for (let d = 6; d >= 0; d--) {
  const date = new Date()
  date.setDate(date.getDate() - d)
  const day = date.toISOString().split('T')[0]
  const weekday = date.getDay() // 5=Fri, 6=Sat weekend
  if (weekday === 5 || weekday === 6) continue
  for (const emp of employees) {
    const rand = (emp.id + d) % 7
    let status = 'حاضر'
    if (rand === 0) status = 'تأخر'
    else if (rand === 1) status = 'عمل عن بعد'
    const checkIn = `${day}T0${status === 'تأخر' ? 9 : 8}:${(emp.id * 7) % 60 < 10 ? '0' : ''}${(emp.id * 7) % 60}:00.000Z`
    const workHours = status === 'تأخر' ? 6.5 : 8.2
    const checkOut = d === 0 ? null : `${day}T16:30:00.000Z`
    attendance.push({
      id: attendanceSeq++, employee_id: emp.id, date: day,
      check_in: checkIn, check_out: checkOut,
      work_hours: checkOut ? workHours : 0, status, notes: null,
      check_in_location: 'المكتب', check_out_location: checkOut ? 'المكتب' : null,
    })
  }
}

let leaveSeq = 1
const leaves = [
  { id: leaveSeq++, employee_id: 6, type: 'سنوية', start_date: addDays(3), end_date: addDays(7), days_count: 5, reason: 'إجازة عائلية', status: 'معلقة', approved_by: null, created_at: nowIso() },
  { id: leaveSeq++, employee_id: 10, type: 'مرضية', start_date: addDays(1), end_date: addDays(2), days_count: 2, reason: 'موعد طبي', status: 'معلقة', approved_by: null, created_at: nowIso() },
  { id: leaveSeq++, employee_id: 4, type: 'سنوية', start_date: addDays(10), end_date: addDays(14), days_count: 5, reason: 'سفر', status: 'موافقة', approved_by: 1, created_at: nowIso() },
  { id: leaveSeq++, employee_id: 7, type: 'طارئة', start_date: addDays(-5), end_date: addDays(-4), days_count: 2, reason: 'ظرف طارئ', status: 'موافقة', approved_by: 1, created_at: nowIso() },
]

const documents = []

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ---------- helpers ----------
const deptName = (id) => departments.find((d) => d.id === id)?.name || null
const deptColor = (id) => departments.find((d) => d.id === id)?.color || null
const empName = (id) => employees.find((e) => e.id === id)?.full_name || null

function withDept(e) {
  const mgr = employees.find((m) => m.id === e.manager_id)
  return { ...e, department_name: deptName(e.department_id), department_color: deptColor(e.department_id), manager_name: mgr?.full_name || null, manager_job_title: mgr?.job_title || null }
}

// ---------- mock API ----------
export const mockAuthApi = {
  async login({ email, password }) {
    await delay()
    const u = users[email]
    if (!u || u.password !== password) {
      const err = new Error('Invalid credentials')
      err.response = { status: 401, data: { error: 'بيانات الدخول غير صحيحة' } }
      throw err
    }
    const emp = employees.find((e) => e.id === u.employee_id)
    return {
      token: `demo-token-${email}`,
      user: {
        id: u.employee_id || 0, email, role: u.role, employee_id: u.employee_id,
        full_name: emp?.full_name || 'مدير النظام', job_title: emp?.job_title || 'مدير النظام',
        department_id: emp?.department_id || null, department_name: emp ? deptName(emp.department_id) : null,
        profile_picture: null,
      },
    }
  },
  async me() {
    await delay()
    // Reuse the user persisted by the Zustand auth store
    try {
      const persisted = JSON.parse(localStorage.getItem('quant-hr-auth') || 'null')
      return { user: persisted?.state?.user || null }
    } catch {
      return { user: null }
    }
  },
  async changePassword() {
    await delay()
    return { message: 'تم تغيير كلمة المرور (وضع تجريبي)' }
  },
}

export const mockDashboardApi = {
  async stats() {
    await delay()
    const day = today()
    const todayRecs = attendance.filter((a) => a.date === day)
    const sum = (s) => todayRecs.filter((a) => a.status === s).length
    return {
      employees: { total: employees.length, active: employees.filter((e) => e.status === 'نشط').length, newThisMonth: 0 },
      attendance: {
        total: todayRecs.length, present: sum('حاضر'), absent: sum('غائب'),
        late: sum('تأخر'), remote: sum('عمل عن بعد'),
        avg_hours: 8,
      },
      pendingLeaves: leaves.filter((l) => l.status === 'معلقة').length,
      departments: departments.length,
      recentActivity: [...attendance]
        .filter((a) => a.date === day)
        .slice(0, 6)
        .map((a) => ({ type: 'attendance', timestamp: a.check_in, full_name: empName(a.employee_id), profile_picture: null, action: 'سجل دخول' })),
    }
  },
  async attendanceChart() {
    await delay()
    const byDate = {}
    for (const a of attendance) {
      byDate[a.date] = byDate[a.date] || { date: a.date, total: 0, present: 0, absent: 0, late: 0 }
      byDate[a.date].total++
      if (a.status === 'حاضر' || a.status === 'عمل عن بعد') byDate[a.date].present++
      else if (a.status === 'تأخر') byDate[a.date].late++
      else if (a.status === 'غائب') byDate[a.date].absent++
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  },
  async departmentDistribution() {
    await delay()
    return departments.map((d) => ({ name: d.name, color: d.color, count: employees.filter((e) => e.department_id === d.id && e.status === 'نشط').length }))
  },
  async upcomingLeaves() {
    await delay()
    return leaves
      .filter((l) => l.status === 'موافقة' && l.start_date >= today())
      .map((l) => ({ ...l, full_name: empName(l.employee_id), profile_picture: null, department_name: deptName(employees.find((e) => e.id === l.employee_id)?.department_id) }))
  },
}

export const mockEmployeesApi = {
  async list({ search = '', status = '', department_id = '', page = 1, limit = 12 } = {}) {
    await delay()
    let rows = employees.map(withDept)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter((e) => e.full_name.toLowerCase().includes(s) || e.email.toLowerCase().includes(s) || e.job_title.toLowerCase().includes(s))
    }
    if (status) rows = rows.filter((e) => e.status === status)
    if (department_id) rows = rows.filter((e) => e.department_id === Number(department_id))
    const total = rows.length
    const start = (page - 1) * limit
    return { employees: rows.slice(start, start + limit), pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } }
  },
  async get(id) {
    await delay()
    const e = employees.find((x) => x.id === Number(id))
    if (!e) throw notFound()
    return {
      ...withDept(e),
      subordinates: employees.filter((s) => s.manager_id === e.id).map((s) => ({ id: s.id, full_name: s.full_name, job_title: s.job_title, profile_picture: null, status: s.status })),
      attendance: attendance.filter((a) => a.employee_id === e.id).slice(-10).reverse(),
      leaves: leaves.filter((l) => l.employee_id === e.id).map((l) => ({ ...l, approved_by_name: empName(l.approved_by) })),
      documents: documents.filter((d) => d.employee_id === e.id),
    }
  },
  async stats(id) {
    await delay()
    const recs = attendance.filter((a) => a.employee_id === Number(id))
    return {
      attendance: {
        total_days: recs.length,
        present_days: recs.filter((a) => a.status === 'حاضر' || a.status === 'عمل عن بعد').length,
        absent_days: recs.filter((a) => a.status === 'غائب').length,
        late_days: recs.filter((a) => a.status === 'تأخر').length,
        avg_hours: 8, total_hours: recs.reduce((s, a) => s + (a.work_hours || 0), 0),
      },
      leaves: {
        total_requests: leaves.filter((l) => l.employee_id === Number(id)).length,
        approved_days: leaves.filter((l) => l.employee_id === Number(id) && l.status === 'موافقة').reduce((s, l) => s + l.days_count, 0),
        pending_requests: leaves.filter((l) => l.employee_id === Number(id) && l.status === 'معلقة').length,
      },
    }
  },
  async create(data) {
    await delay()
    const id = Math.max(...employees.map((e) => e.id)) + 1
    const emp = { id, employee_number: `EMP-${String(id).padStart(3, '0')}`, status: 'نشط', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null, manager_id: null, ...data }
    employees.push(emp)
    return { message: 'تم إضافة الموظف (وضع تجريبي)', employee: emp }
  },
  async update(id, data) {
    await delay()
    const e = employees.find((x) => x.id === Number(id))
    if (e) Object.assign(e, data)
    return { message: 'تم التحديث (وضع تجريبي)' }
  },
  async remove(id) {
    await delay()
    const i = employees.findIndex((x) => x.id === Number(id))
    if (i > -1) employees.splice(i, 1)
    return { message: 'تم الحذف (وضع تجريبي)' }
  },
}

export const mockDepartmentsApi = {
  async list() {
    await delay()
    return departments.map((d) => ({ ...d, employee_count: employees.filter((e) => e.department_id === d.id).length, manager_name: empName(d.manager_id), manager_job_title: employees.find((e) => e.id === d.manager_id)?.job_title || null }))
  },
  async get(id) {
    await delay()
    const d = departments.find((x) => x.id === Number(id))
    if (!d) throw notFound()
    return { ...d, manager_name: empName(d.manager_id), employees: employees.filter((e) => e.department_id === d.id), sub_departments: [] }
  },
  async orgChart() {
    await delay()
    return departments.map((d) => ({ ...d, manager_name: empName(d.manager_id), employees: employees.filter((e) => e.department_id === d.id), children: [] }))
  },
  async create(data) {
    await delay()
    const id = Math.max(...departments.map((d) => d.id)) + 1
    const dept = { id, employee_count: 0, manager_id: null, ...data }
    departments.push(dept)
    return { message: 'تم إنشاء الإدارة (وضع تجريبي)', department: dept }
  },
  async update(id, data) {
    await delay()
    const d = departments.find((x) => x.id === Number(id))
    if (d) Object.assign(d, data)
    return { message: 'تم التحديث (وضع تجريبي)' }
  },
  async remove(id) {
    await delay()
    const i = departments.findIndex((x) => x.id === Number(id))
    if (i > -1) departments.splice(i, 1)
    return { message: 'تم الحذف (وضع تجريبي)' }
  },
}

export const mockAttendanceApi = {
  async list({ date = today() } = {}) {
    await delay()
    const records = attendance
      .filter((a) => a.date === date)
      .map((a) => ({ ...a, full_name: empName(a.employee_id), job_title: employees.find((e) => e.id === a.employee_id)?.job_title, profile_picture: null, department_name: deptName(employees.find((e) => e.id === a.employee_id)?.department_id) }))
    const day = today()
    const todayRecs = attendance.filter((a) => a.date === day)
    const cnt = (s) => todayRecs.filter((a) => a.status === s).length
    return { records, summary: { total: todayRecs.length, present: cnt('حاضر'), absent: cnt('غائب'), late: cnt('تأخر'), remote: cnt('عمل عن بعد'), avg_hours: 8 }, pagination: { total: records.length, page: 1, limit: 100, totalPages: 1 } }
  },
  async checkIn({ employee_id }) {
    await delay()
    const day = today()
    if (attendance.find((a) => a.employee_id === employee_id && a.date === day)) throw badReq('سجّلت الدخول اليوم بالفعل')
    const rec = { id: attendanceSeq++, employee_id, date: day, check_in: nowIso(), check_out: null, work_hours: 0, status: 'حاضر', check_in_location: 'المكتب' }
    attendance.push(rec)
    return { message: 'تم تسجيل الدخول', attendance: rec }
  },
  async checkOut({ employee_id }) {
    await delay()
    const day = today()
    const rec = attendance.find((a) => a.employee_id === employee_id && a.date === day)
    if (!rec) throw badReq('لا يوجد سجل دخول لهذا اليوم')
    if (rec.check_out) throw badReq('سجّلت الخروج اليوم بالفعل')
    rec.check_out = nowIso()
    rec.work_hours = Math.max(1, ((new Date(rec.check_out) - new Date(rec.check_in)) / 3600000)).toFixed(2)
    return { message: 'تم تسجيل الخروج', attendance: rec }
  },
  async mine(employeeId) {
    await delay()
    return attendance.filter((a) => a.employee_id === Number(employeeId)).slice(-30).reverse()
  },
  async report() {
    await delay()
    return []
  },
}

export const mockLeavesApi = {
  async list({ status = '' } = {}) {
    await delay()
    let rows = leaves
    if (status) rows = rows.filter((l) => l.status === status)
    const order = { معلقة: 1, موافقة: 2, مرفوضة: 3, ملغاة: 4 }
    rows = [...rows].sort((a, b) => (order[a.status] || 9) - (order[b.status] || 9))
    return {
      leaves: rows.map((l) => ({ ...l, full_name: empName(l.employee_id), job_title: employees.find((e) => e.id === l.employee_id)?.job_title, profile_picture: null, department_name: deptName(employees.find((e) => e.id === l.employee_id)?.department_id), approved_by_name: empName(l.approved_by) })),
      pagination: { total: rows.length, page: 1, limit: 50, totalPages: 1 },
    }
  },
  async create(data) {
    await delay()
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    const days = Math.ceil((end - start) / 86400000) + 1
    const leave = { id: leaveSeq++, days_count: days, status: 'معلقة', approved_by: null, created_at: nowIso(), ...data }
    leaves.unshift(leave)
    return { message: 'تم إرسال الطلب (وضع تجريبي)', leave }
  },
  async approve(id, { status }) {
    await delay()
    const l = leaves.find((x) => x.id === Number(id))
    if (l) { l.status = status; l.approved_by = 1 }
    return { message: 'تم تحديث الطلب (وضع تجريبي)' }
  },
  async cancel(id) {
    await delay()
    const l = leaves.find((x) => x.id === Number(id))
    if (l) l.status = 'ملغاة'
    return { message: 'تم الإلغاء (وضع تجريبي)' }
  },
  async balance(employeeId) {
    await delay()
    const e = employees.find((x) => x.id === Number(employeeId))
    return { annual_leave_balance: e?.annual_leave_balance ?? 30, sick_leave_balance: e?.sick_leave_balance ?? 10, emergency_leave_balance: e?.emergency_leave_balance ?? 5, used_annual: 0, used_sick: 0 }
  },
}

export const mockDocumentsApi = {
  async forEmployee(employeeId) {
    await delay()
    return documents.filter((d) => d.employee_id === Number(employeeId))
  },
  async upload() {
    await delay()
    return { message: 'رفع المستندات غير متاح في الوضع التجريبي' }
  },
  async remove() {
    await delay()
    return { message: 'تم الحذف (وضع تجريبي)' }
  },
}

function notFound() {
  const e = new Error('Not found')
  e.response = { status: 404, data: { error: 'غير موجود' } }
  return e
}
function badReq(msg) {
  const e = new Error(msg)
  e.response = { status: 400, data: { error: msg } }
  return e
}
