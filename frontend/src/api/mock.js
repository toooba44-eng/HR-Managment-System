// In-browser mock API for the static GitHub Pages demo (VITE_DEMO=true).
// Mirrors the backend endpoints using the same seed data, entirely client-side.
// No persistence across reloads — state lives in memory for the session.

import * as totp from '../lib/totp'

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
  { id: 10, full_name: 'عبدالرحمن سليمان', email: 'abdulrahman.dev@quant.com', phone: '+966 50 901 2345', national_id: '1000000010', date_of_birth: '1996-03-18', nationality: 'سعودي', marital_status: 'أعزب', address: 'جدة، حي الشاطئ', employee_number: 'EMP-010', job_title: 'مطور واجهات أمامية', department_id: 3, manager_id: 2, hire_date: '2023-06-01', employment_type: 'دوام كامل', work_location: 'جدة - فرع جدة', status: 'نشط', salary: 14000, allowances: 1500, bank_name: 'البنك الأهلي', bank_account: 'SA0010010', contract_type: 'محدد', contract_end: addDays(45), annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null },
]

// email -> auth mapping
const users = {
  'superadmin@quant.com': { password: 'super123', role: 'super_admin', employee_id: null, name: 'مدير المنصة' },
  'candidate@quant.com': { password: 'candidate123', role: 'candidate', employee_id: null, name: 'مرشح تجريبي' },
  'admin@quant.com': { password: 'admin123', role: 'admin', employee_id: null, name: 'مدير النظام' },
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

let docSeq = 1
const documents = [
  { id: docSeq++, employee_id: 1, type: 'هوية', title: 'بطاقة الهوية الوطنية', file_name: 'id_card_ceo.pdf', expiry_date: addDays(400), uploaded_by: 1, uploaded_at: nowIso() },
  { id: docSeq++, employee_id: 1, type: 'عقد عمل', title: 'عقد العقد الرئيسي', file_name: 'contract_ceo.pdf', expiry_date: addDays(180), uploaded_by: 1, uploaded_at: nowIso() },
  { id: docSeq++, employee_id: 2, type: 'هوية', title: 'بطاقة الهوية الوطنية', file_name: 'id_card_tech.pdf', expiry_date: addDays(20), uploaded_by: 5, uploaded_at: nowIso() },
  { id: docSeq++, employee_id: 2, type: 'شهادة', title: 'شهادة البكالوريوس', file_name: 'degree_tech.pdf', expiry_date: null, uploaded_by: 5, uploaded_at: nowIso() },
  { id: docSeq++, employee_id: 2, type: 'عقد عمل', title: 'عقد العمل الحالي', file_name: 'contract_tech.pdf', expiry_date: addDays(90), uploaded_by: 5, uploaded_at: nowIso() },
  { id: docSeq++, employee_id: 2, type: 'تأمين', title: 'وثيقة التأمين الطبي', file_name: 'insurance_tech.pdf', expiry_date: addDays(-10), uploaded_by: 5, uploaded_at: nowIso() },
  { id: docSeq++, employee_id: 3, type: 'هوية', title: 'بطاقة الهوية الوطنية', file_name: 'id_card_finance.pdf', expiry_date: addDays(15), uploaded_by: 5, uploaded_at: nowIso() },
  { id: docSeq++, employee_id: 3, type: 'عقد عمل', title: 'عقد العمل', file_name: 'contract_finance.pdf', expiry_date: addDays(365), uploaded_by: 5, uploaded_at: nowIso() },
  { id: docSeq++, employee_id: 3, type: 'جواز', title: 'جواز السفر', file_name: 'passport_finance.pdf', expiry_date: addDays(-45), uploaded_by: 5, uploaded_at: nowIso() },
]

let annSeq = 1
const announcements = [
  { id: annSeq++, title: 'تحديث سياسة العمل عن بُعد', body: 'يسمح النظام الجديد بيومين عمل عن بُعد أسبوعياً بعد موافقة المدير المباشر. يُرجى تقديم الطلبات عبر بوابة الموظف.', audience: 'الجميع', is_pinned: 1, requires_acknowledgment: 1, created_by: 5, created_at: nowIso() },
  { id: annSeq++, title: 'موعد صرف رواتب الشهر', body: 'سيتم صرف رواتب هذا الشهر يوم 27 كالمعتاد. لأي استفسار يُرجى التواصل مع الموارد البشرية.', audience: 'الجميع', is_pinned: 0, requires_acknowledgment: 0, created_by: 5, created_at: nowIso() },
  { id: annSeq++, title: 'برنامج تدريبي جديد', body: 'انطلق التسجيل في برنامج تطوير المهارات القيادية. الأماكن محدودة — سارع بالتسجيل عبر بوابة الموظف.', audience: 'الجميع', is_pinned: 0, requires_acknowledgment: 0, created_by: 5, created_at: nowIso() },
]

let annReadSeq = 1
const announcementReads = [
  { id: annReadSeq++, announcement_id: 1, employee_id: 6, read_at: addDays(-1) },
  { id: annReadSeq++, announcement_id: 1, employee_id: 2, read_at: addDays(-1) },
]

let reqSeq = 1
const requests = [
  { id: reqSeq++, employee_id: 6, type: 'خطاب', subject: 'خطاب تعريف بالراتب', details: 'مطلوب لغرض فتح حساب بنكي.', status: 'مكتملة', response: 'تم إصدار الخطاب.', resolved_by: 5, created_at: nowIso() },
  { id: reqSeq++, employee_id: 6, type: 'عمل عن بعد', subject: 'طلب عمل عن بُعد ليوم الخميس', details: 'لظرف عائلي.', status: 'معلقة', response: null, resolved_by: null, created_at: nowIso() },
  { id: reqSeq++, employee_id: 10, type: 'عمل إضافي', subject: 'عمل إضافي لإنهاء مشروع', details: 'ساعتان إضافيتان.', status: 'مقبولة', response: 'تمت الموافقة.', resolved_by: 2, created_at: nowIso() },
  { id: reqSeq++, employee_id: 10, type: 'تحديث بيانات', subject: 'تحديث رقم الجوال والعنوان', details: 'الرجاء تحديث رقم الجوال والعنوان الوطني في السجل.', status: 'معلقة', response: null, resolved_by: null, created_at: addDays(-1) },
]

let polSeq = 1
const policies = [
  { id: polSeq++, title: 'سياسة الدوام والانصراف', category: 'الحضور', body: 'ساعات العمل الرسمية من 8 صباحاً حتى 5 مساءً، من الأحد إلى الخميس، بينها ساعة استراحة. يُحتسب الحضور بعد 8:15 تأخراً.', created_by: 5 },
  { id: polSeq++, title: 'سياسة الإجازات السنوية', category: 'الإجازات', body: 'يستحق الموظف 30 يوم إجازة سنوية مدفوعة. تُقدَّم الطلبات قبل 3 أيام عمل على الأقل عبر بوابة الموظف وتخضع لموافقة المدير المباشر.', created_by: 5 },
  { id: polSeq++, title: 'سياسة العمل عن بُعد', category: 'العمل المرن', body: 'يُسمح بيومين عمل عن بُعد أسبوعياً بحد أقصى بعد موافقة المدير المباشر، مع الالتزام بالتواجد الرقمي خلال ساعات العمل.', created_by: 5 },
  { id: polSeq++, title: 'مدونة السلوك المهني', category: 'عام', body: 'يلتزم جميع الموظفين بالاحترام المتبادل، السرية، وعدم تضارب المصالح. أي مخالفة تخضع للائحة الجزاءات.', created_by: 5 },
  { id: polSeq++, title: 'سياسة استخدام الأجهزة', category: 'تقنية', body: 'أجهزة الشركة مخصّصة للعمل. يُمنع تثبيت برامج غير مرخّصة، ويجب حماية بيانات الدخول وعدم مشاركتها.', created_by: 2 },
]

let polAckSeq = 1
const policyAcknowledgments = [
  { id: polAckSeq++, policy_id: 4, employee_id: 6, acknowledged_at: addDays(-3) },
  { id: polAckSeq++, policy_id: 4, employee_id: 2, acknowledged_at: addDays(-2) },
]

let taskSeq = 1
const tasks = [
  { id: taskSeq++, title: 'إنهاء وحدة تسجيل الدخول', description: 'استكمال اختبارات وحدة المصادقة وتوثيقها.', employee_id: 6, assigned_by: 2, status: 'قيد التنفيذ', priority: 'عالية', due_date: addDays(3), created_at: nowIso() },
  { id: taskSeq++, title: 'مراجعة كود واجهة الموظفين', description: 'مراجعة طلب الدمج الخاص بصفحة الموظفين.', employee_id: 10, assigned_by: 2, status: 'جديدة', priority: 'متوسطة', due_date: addDays(5), created_at: nowIso() },
  { id: taskSeq++, title: 'تحديث التوثيق التقني', description: 'تحديث ملف README بمتغيرات البيئة الجديدة.', employee_id: 6, assigned_by: 2, status: 'مكتملة', priority: 'منخفضة', due_date: addDays(-2), created_at: nowIso() },
  { id: taskSeq++, title: 'إعداد تقرير المبيعات الشهري', description: 'تجهيز تقرير مبيعات الربع الحالي.', employee_id: 4, assigned_by: 4, status: 'قيد التنفيذ', priority: 'عالية', due_date: addDays(2), created_at: nowIso() },
]

let jobSeq = 1
const jobs = [
  { id: jobSeq++, title: 'مطور واجهات أمامية (React)', department: 'التقنية', location: 'الرياض - المقر الرئيسي', type: 'دوام كامل', description: 'نبحث عن مطوّر واجهات متمكّن من React وTailwind للانضمام لفريق المنتج.', status: 'مفتوحة', created_by: 5, created_at: nowIso() },
  { id: jobSeq++, title: 'أخصائي موارد بشرية', department: 'الموارد البشرية', location: 'الرياض - المقر الرئيسي', type: 'دوام كامل', description: 'مسؤول عن التوظيف وإدارة شؤون الموظفين والسياسات.', status: 'مفتوحة', created_by: 5, created_at: nowIso() },
  { id: jobSeq++, title: 'مندوب مبيعات', department: 'المبيعات', location: 'جدة - فرع جدة', type: 'دوام كامل', description: 'تطوير علاقات العملاء وتحقيق أهداف المبيعات.', status: 'مفتوحة', created_by: 5, created_at: nowIso() },
  { id: jobSeq++, title: 'محاسب', department: 'المالية', location: 'الرياض - المقر الرئيسي', type: 'عقد', description: 'إعداد التقارير المالية ومتابعة الميزانيات.', status: 'مغلقة', created_by: 5, created_at: nowIso() },
]

let appSeq = 1
const applications = [
  { id: appSeq++, job_id: 1, candidate_email: 'candidate@quant.com', candidate_name: 'مرشح تجريبي', cover_note: 'لديّ خبرة 3 سنوات في تطوير الواجهات.', status: 'مقابلة', stage: 'مقابلة', source: 'LinkedIn', rating: 4, created_at: nowIso() },
  { id: appSeq++, job_id: 1, candidate_email: 'sultan.dev@mail.com', candidate_name: 'سلطان الحربي', cover_note: 'خبرة قوية في React و TypeScript.', status: 'قيد المراجعة', stage: 'اختبار', source: 'الموقع', rating: null, created_at: nowIso() },
  { id: appSeq++, job_id: 1, candidate_email: 'tariq.dev@mail.com', candidate_name: 'طارق القحطاني', cover_note: 'مطوّر شغوف بواجهات المستخدم.', status: 'مقابلة', stage: 'عرض وظيفي', source: 'LinkedIn', rating: 5, created_at: nowIso() },
  { id: appSeq++, job_id: 1, candidate_email: 'huda.dev@mail.com', candidate_name: 'هدى العنزي', cover_note: 'حديثة تخرّج بمشاريع متميزة.', status: 'قيد المراجعة', stage: 'متقدم جديد', source: 'إحالة موظف', rating: null, created_at: nowIso() },
  { id: appSeq++, job_id: 2, candidate_email: 'mona.hr@mail.com', candidate_name: 'منى العتيبي', cover_note: 'خبرة 5 سنوات في التوظيف.', status: 'قيد المراجعة', stage: 'مراجعة أولية', source: 'الموقع', rating: 3, created_at: nowIso() },
  { id: appSeq++, job_id: 2, candidate_email: 'faisal.hr@mail.com', candidate_name: 'فيصل النمر', cover_note: 'أخصائي موارد بشرية معتمد.', status: 'مقابلة', stage: 'مقابلة', source: 'Indeed', rating: 4, created_at: nowIso() },
  { id: appSeq++, job_id: 3, candidate_email: 'saad.sales@mail.com', candidate_name: 'سعد الدوسري', cover_note: 'سجل مبيعات حافل.', status: 'مقبول', stage: 'تم التوظيف', source: 'إحالة موظف', rating: 5, created_at: nowIso() },
  { id: appSeq++, job_id: 3, candidate_email: 'noor.sales@mail.com', candidate_name: 'نور الشهري', cover_note: 'خبرة في مبيعات التجزئة.', status: 'مرفوض', stage: 'مرفوض', source: 'الموقع', rating: 2, created_at: nowIso() },
]

let companySeq = 1
const companies = [
  { id: companySeq++, name: 'شركة كوانت التقنية', contact_email: 'admin@quant.com', plan: 'مؤسسية', users_limit: 200, storage_limit_gb: 100, status: 'نشطة', created_at: nowIso() },
  { id: companySeq++, name: 'مجموعة الأفق', contact_email: 'it@alufuq.com', plan: 'احترافية', users_limit: 75, storage_limit_gb: 50, status: 'نشطة', created_at: nowIso() },
  { id: companySeq++, name: 'مؤسسة النخبة', contact_email: 'hr@alnukhba.com', plan: 'أساسية', users_limit: 25, storage_limit_gb: 10, status: 'نشطة', created_at: nowIso() },
  { id: companySeq++, name: 'شركة الريادة', contact_email: 'info@alriyada.com', plan: 'احترافية', users_limit: 75, storage_limit_gb: 50, status: 'معلّقة', created_at: nowIso() },
]

let expenseSeq = 1
const expenses = [
  { id: expenseSeq++, employee_id: 6, type: 'مصروف', category: 'مواصلات', amount: 350, description: 'أجرة مواصلات لزيارة عميل.', status: 'معلقة', approved_by: null, created_at: nowIso() },
  { id: expenseSeq++, employee_id: 6, type: 'سلفة', category: 'سلفة راتب', amount: 3000, description: 'سلفة على راتب الشهر القادم.', status: 'معتمدة', approved_by: 2, created_at: nowIso() },
  { id: expenseSeq++, employee_id: 10, type: 'مصروف', category: 'قرطاسية', amount: 180, description: 'شراء مستلزمات مكتبية.', status: 'مصروفة', approved_by: 5, created_at: nowIso() },
  { id: expenseSeq++, employee_id: 4, type: 'مصروف', category: 'ضيافة', amount: 620, description: 'ضيافة اجتماع مبيعات.', status: 'معلقة', approved_by: null, created_at: nowIso() },
  { id: expenseSeq++, employee_id: 3, type: 'سلفة', category: 'سفر', amount: 5000, description: 'سلفة سفر لحضور مؤتمر في الرياض.', status: 'مصروفة', approved_by: 2, settled_amount: null, settled_at: null, created_at: nowIso() },
  { id: expenseSeq++, employee_id: 5, type: 'سلفة', category: 'سفر', amount: 4000, description: 'سلفة سفر — زيارة فرع جدة.', status: 'مصروفة', approved_by: 2, settled_amount: 3450, settled_at: nowIso(), created_at: nowIso() },
]

let assetSeq = 1
const assets = [
  { id: assetSeq++, name: 'لابتوب Dell Latitude', category: 'أجهزة حاسب', serial_number: 'DL-2024-0012', assigned_to: 6, status: 'مُخصّص', assigned_date: addDays(-120), notes: 'مخصّص لفريق التطوير.' },
  { id: assetSeq++, name: 'شاشة LG 27"', category: 'ملحقات', serial_number: 'LG-27-0345', assigned_to: 6, status: 'مُخصّص', assigned_date: addDays(-120), notes: null },
  { id: assetSeq++, name: 'هاتف iPhone 15', category: 'أجهزة جوال', serial_number: 'IP-15-0088', assigned_to: 4, status: 'مُخصّص', assigned_date: addDays(-60), notes: 'لمندوب المبيعات.' },
  { id: assetSeq++, name: 'لابتوب MacBook Pro', category: 'أجهزة حاسب', serial_number: 'MBP-2024-0021', assigned_to: null, status: 'متاح', assigned_date: null, notes: 'متاح للتخصيص.' },
  { id: assetSeq++, name: 'طابعة HP LaserJet', category: 'أجهزة مكتبية', serial_number: 'HP-LJ-0007', assigned_to: null, status: 'صيانة', assigned_date: null, notes: 'قيد الصيانة الدورية.' },
]

let assetHistorySeq = 1
const assetHistory = [
  { id: assetHistorySeq++, asset_id: 1, employee_id: 6, action: 'تخصيص', condition: null, notes: 'تسليم عند الالتحاق بفريق التطوير.', performed_by: 5, created_at: addDays(-120) },
  { id: assetHistorySeq++, asset_id: 3, employee_id: 4, action: 'تخصيص', condition: null, notes: 'تسليم لمندوب المبيعات.', performed_by: 5, created_at: addDays(-60) },
  { id: assetHistorySeq++, asset_id: 5, employee_id: null, action: 'صيانة', condition: null, notes: 'انحشار ورق متكرر — أُرسلت للصيانة الدورية.', performed_by: 5, created_at: addDays(-3) },
]
const ASSET_HISTORY_ACTIONS = ['تخصيص', 'إرجاع', 'صيانة', 'إتلاف']
const ASSET_CONDITIONS = ['ممتازة', 'جيدة', 'متوسطة', 'تالفة']

let assetReqSeq = 1
const assetRequests = [
  { id: assetReqSeq++, employee_id: 10, category: 'أجهزة حاسب', item_name: 'لابتوب بمواصفات أعلى', justification: 'الجهاز الحالي بطيء عند تشغيل بيئة التطوير.', estimated_cost: 6500, status: 'معلق', requested_by: 2, reviewed_by: null, reviewed_at: null, created_at: nowIso() },
]

let goalSeq = 1
const goals = [
  { id: goalSeq++, employee_id: 6, title: 'إطلاق الوحدة الجديدة', description: 'إنهاء وإطلاق وحدة التقارير قبل نهاية الربع.', weight: 40, progress: 60, target_date: addDays(30), status: 'قيد التنفيذ', created_by: 2 },
  { id: goalSeq++, employee_id: 6, title: 'تحسين تغطية الاختبارات', description: 'رفع تغطية الاختبارات إلى 80%.', weight: 30, progress: 25, target_date: addDays(45), status: 'قيد التنفيذ', created_by: 2 },
  { id: goalSeq++, employee_id: 10, title: 'تطوير مهارات React المتقدمة', description: 'إكمال مسار تدريبي وتطبيقه عملياً.', weight: 30, progress: 100, target_date: addDays(-5), status: 'مكتملة', created_by: 2 },
  { id: goalSeq++, employee_id: 4, title: 'تحقيق هدف المبيعات الربعي', description: 'الوصول إلى 110% من المستهدف.', weight: 50, progress: 45, target_date: addDays(20), status: 'قيد التنفيذ', created_by: 4 },
]

let courseSeq = 1
const courses = [
  { id: courseSeq++, title: 'أساسيات إدارة المشاريع', category: 'إدارة', description: 'مقدمة في منهجيات إدارة المشاريع وأدواتها.', hours: 12, level: 'مبتدئ', status: 'متاحة', created_by: 5 },
  { id: courseSeq++, title: 'React المتقدم', category: 'تقنية', description: 'أنماط متقدمة في React وتحسين الأداء.', hours: 20, level: 'متقدم', status: 'متاحة', created_by: 5 },
  { id: courseSeq++, title: 'مهارات التواصل الفعّال', category: 'مهارات', description: 'تطوير مهارات التواصل والعرض والإقناع.', hours: 8, level: 'مبتدئ', status: 'متاحة', created_by: 5 },
  { id: courseSeq++, title: 'الأمن السيبراني للموظفين', category: 'أمن معلومات', description: 'أساسيات حماية البيانات والوعي الأمني.', hours: 6, level: 'مبتدئ', status: 'متاحة', created_by: 5 },
  { id: courseSeq++, title: 'القيادة وإدارة الفرق', category: 'قيادة', description: 'برنامج تطوير المهارات القيادية.', hours: 16, level: 'متوسط', status: 'مغلقة', created_by: 5 },
]

let enrollSeq = 1
const enrollments = [
  { id: enrollSeq++, course_id: 2, employee_id: 6, progress: 40, status: 'قيد التقدم', enrolled_at: nowIso() },
  { id: enrollSeq++, course_id: 4, employee_id: 6, progress: 100, status: 'مكتمل', enrolled_at: nowIso() },
  { id: enrollSeq++, course_id: 1, employee_id: 10, progress: 10, status: 'قيد التقدم', enrolled_at: nowIso() },
  { id: enrollSeq++, course_id: 3, employee_id: 10, progress: 100, status: 'مكتمل', enrolled_at: nowIso() },
]

let certSeq = 1
const courseCertificates = [
  { id: certSeq++, enrollment_id: 2, employee_id: 6, course_id: 4, code: 'QNT-8A21FC03', issued_at: nowIso() },
  { id: certSeq++, enrollment_id: 4, employee_id: 10, course_id: 3, code: 'QNT-5B9E7D14', issued_at: nowIso() },
]

let offSeq = 1
let offTaskSeq = 1
const offboardings = [
  {
    id: offSeq++, employee_id: 9, type: 'انتهاء عقد', reason: 'انتهاء مدة العقد محدد المدة.', last_working_day: addDays(20), status: 'قيد المعالجة', notes: 'بانتظار إجراءات المخالصة.', created_by: 5, created_at: nowIso(),
    tasks: [
      { id: offTaskSeq++, title: 'استرجاع الحاسب والعهد والبطاقة التعريفية', category: 'عهدة', owner: 'تقنية المعلومات', due_date: addDays(18), is_done: 1 },
      { id: offTaskSeq++, title: 'إلغاء صلاحيات الأنظمة والبريد الإلكتروني', category: 'صلاحيات', owner: 'تقنية المعلومات', due_date: addDays(20), is_done: 0 },
      { id: offTaskSeq++, title: 'تصفية الرصيد المالي ومستحقات نهاية الخدمة', category: 'تصفية مالية', owner: 'الموارد البشرية', due_date: addDays(22), is_done: 0 },
      { id: offTaskSeq++, title: 'إجراء مقابلة خروج (Exit Interview)', category: 'مقابلة خروج', owner: 'الموارد البشرية', due_date: addDays(19), is_done: 0 },
      { id: offTaskSeq++, title: 'تسليم مستند إخلاء الطرف', category: 'مستندات', owner: 'الموارد البشرية', due_date: addDays(22), is_done: 0 },
    ],
  },
]

const OFF_DEFAULT_TASKS = [
  { title: 'استرجاع الحاسب والعهد والبطاقة التعريفية', category: 'عهدة', owner: 'تقنية المعلومات' },
  { title: 'إلغاء صلاحيات الأنظمة والبريد الإلكتروني', category: 'صلاحيات', owner: 'تقنية المعلومات' },
  { title: 'تصفية الرصيد المالي ومستحقات نهاية الخدمة', category: 'تصفية مالية', owner: 'الموارد البشرية' },
  { title: 'إجراء مقابلة خروج (Exit Interview)', category: 'مقابلة خروج', owner: 'الموارد البشرية' },
  { title: 'تسليم مستند إخلاء الطرف', category: 'مستندات', owner: 'الموارد البشرية' },
]
const OFF_TYPE_TO_EMP_STATUS = { استقالة: 'مستقيل', فصل: 'مفصول', 'انتهاء عقد': 'مستقيل', تقاعد: 'مستقيل' }

function offProgress(o) {
  const total = o.tasks.length
  const done = o.tasks.filter((t) => t.is_done).length
  return { ...withEmp(o), tasks_total: total, tasks_done: done, progress: total ? Math.round((done / total) * 100) : 0 }
}
function findOffTask(taskId) {
  for (const o of offboardings) {
    const t = o.tasks.find((x) => x.id === Number(taskId))
    if (t) return { kase: o, task: t }
  }
  return {}
}

let grvSeq = 1
const grievances = [
  { id: grvSeq++, employee_id: 10, type: 'مخالفة', category: 'الالتزام بالدوام', description: 'تأخر متكرر عن موعد الحضور.', severity: 'متوسطة', status: 'قيد المعالجة', action: 'تم توجيه إنذار شفهي.', assigned_to: 5, created_by: 5, created_at: nowIso() },
  { id: grvSeq++, employee_id: 6, type: 'شكوى', category: 'بيئة العمل', description: 'شكوى بخصوص ضوضاء في مساحة العمل.', severity: 'منخفضة', status: 'مفتوحة', action: null, assigned_to: null, created_by: 5, created_at: nowIso() },
]
let grievanceNoteSeq = 1
const grievanceNotes = [
  { id: grievanceNoteSeq++, grievance_id: 1, author_id: 5, note: 'راجعت سجل الحضور — 4 حالات تأخر خلال الشهرين الماضيين.', created_at: addDays(-4) },
  { id: grievanceNoteSeq++, grievance_id: 1, author_id: 5, note: 'اجتمعت مع الموظف وتم توجيه إنذار شفهي مع متابعة الحضور أسبوعياً.', created_at: addDays(-2) },
]

let incSeq = 1
const incidents = [
  { id: incSeq++, title: 'انزلاق في الممر', type: 'حادث', employee_id: 6, location: 'الطابق الثاني - الممر', severity: 'منخفضة', description: 'أرضية مبللة دون لافتة تحذير.', status: 'مغلق', incident_date: addDays(-10), reported_by: 5, created_at: nowIso() },
  { id: incSeq++, title: 'فحص طفايات الحريق', type: 'ملاحظة سلامة', employee_id: null, location: 'المبنى الرئيسي', severity: 'متوسطة', description: 'حان موعد الفحص الدوري لطفايات الحريق.', status: 'مفتوح', incident_date: addDays(-2), reported_by: 5, created_at: nowIso() },
  { id: incSeq++, title: 'سلك كهرباء مكشوف قرب المطبخ', type: 'ملاحظة سلامة', employee_id: null, location: 'الطابق الأول - المطبخ', severity: 'عالية', description: 'لاحظت سلكاً كهربائياً مكشوفاً بجانب مدخل المطبخ.', status: 'قيد المعالجة', incident_date: addDays(-1), reported_by: 6, created_at: addDays(-1) },
]

let incidentActionSeq = 1
const incidentActions = [
  { id: incidentActionSeq++, incident_id: 1, description: 'تركيب لافتات تحذير من الانزلاق في نقاط التنظيف.', owner_id: 5, due_date: addDays(-8), status: 'مكتمل', created_by: 5, completed_at: addDays(-8), created_at: nowIso() },
  { id: incidentActionSeq++, incident_id: 1, description: 'تدريب طاقم النظافة على وضع اللافتات فوراً.', owner_id: 5, due_date: addDays(-5), status: 'مكتمل', created_by: 5, completed_at: addDays(-6), created_at: nowIso() },
  { id: incidentActionSeq++, incident_id: 2, description: 'التنسيق مع مورد خارجي لفحص وصيانة الطفايات.', owner_id: 2, due_date: addDays(5), status: 'مفتوح', created_by: 5, completed_at: null, created_at: nowIso() },
  { id: incidentActionSeq++, incident_id: 2, description: 'تحديث سجل الفحص الدوري بعد الصيانة.', owner_id: 5, due_date: addDays(7), status: 'مفتوح', created_by: 5, completed_at: null, created_at: nowIso() },
]

let shiftSeq = 1
const shifts = [
  { id: shiftSeq++, employee_id: 6, date: addDays(0), shift_type: 'صباحية', start_time: '08:00', end_time: '16:00', location: 'المقر الرئيسي', notes: null, created_by: 5 },
  { id: shiftSeq++, employee_id: 6, date: addDays(1), shift_type: 'صباحية', start_time: '08:00', end_time: '16:00', location: 'المقر الرئيسي', notes: null, created_by: 5 },
  { id: shiftSeq++, employee_id: 10, date: addDays(0), shift_type: 'مسائية', start_time: '16:00', end_time: '00:00', location: 'فرع جدة', notes: null, created_by: 5 },
  { id: shiftSeq++, employee_id: 4, date: addDays(0), shift_type: 'صباحية', start_time: '09:00', end_time: '17:00', location: 'فرع جدة', notes: null, created_by: 5 },
  { id: shiftSeq++, employee_id: 10, date: addDays(3), shift_type: 'مسائية', start_time: '16:00', end_time: '00:00', location: 'فرع جدة', notes: null, created_by: 5 },
  { id: shiftSeq++, employee_id: 6, date: addDays(3), shift_type: 'صباحية', start_time: '08:00', end_time: '16:00', location: 'المقر الرئيسي', notes: null, created_by: 5 },
]

let swapSeq = 1
const shiftSwapRequests = [
  { id: swapSeq++, requester_id: 6, shift_a_id: 6, target_id: 10, shift_b_id: 5, reason: 'لدي موعد شخصي في ذلك اليوم وأودّ التبديل.', status: 'بانتظار موافقة الزميل', approved_by: null, approved_at: null, created_at: nowIso() },
  { id: swapSeq++, requester_id: 4, shift_a_id: 4, target_id: 10, shift_b_id: 3, reason: 'تعارض مع موعد طبي.', status: 'بانتظار اعتماد المدير', approved_by: null, approved_at: null, created_at: addDays(-2) },
]

let tsSeq = 1
const timesheets = [
  { id: tsSeq++, employee_id: 6, date: addDays(-1), project: 'منصة الموارد البشرية', task: 'تطوير وحدة التقارير', hours: 6, billable: 1, status: 'معتمد', approved_by: 2, created_at: nowIso() },
  { id: tsSeq++, employee_id: 6, date: addDays(0), project: 'منصة الموارد البشرية', task: 'إصلاح أخطاء', hours: 3, billable: 1, status: 'مقدّم', approved_by: null, created_at: nowIso() },
  { id: tsSeq++, employee_id: 10, date: addDays(0), project: 'تطبيق الجوال', task: 'تصميم الواجهات', hours: 5, billable: 1, status: 'مسودة', approved_by: null, created_at: nowIso() },
  { id: tsSeq++, employee_id: 6, date: addDays(-2), project: 'داخلي', task: 'اجتماع الفريق الأسبوعي', hours: 1, billable: 0, status: 'معتمد', approved_by: 2, created_at: nowIso() },
]

let compSeq = 1
const compensation = [
  { id: compSeq++, employee_id: 1, grade: 'الدرجة التنفيذية', base_salary: 35000, housing_allowance: 8000, transport_allowance: 2000, other_allowances: 3000, bonus: 5000, insurance_class: 'الفئة أ', effective_date: addDays(-120), status: 'نشط', notes: null, created_by: 5 },
  { id: compSeq++, employee_id: 2, grade: 'الدرجة الأولى', base_salary: 22000, housing_allowance: 5000, transport_allowance: 1500, other_allowances: 1000, bonus: 2000, insurance_class: 'الفئة أ', effective_date: addDays(-90), status: 'نشط', notes: null, created_by: 5 },
  { id: compSeq++, employee_id: 3, grade: 'الدرجة الأولى', base_salary: 21000, housing_allowance: 5000, transport_allowance: 1500, other_allowances: 800, bonus: 1500, insurance_class: 'الفئة أ', effective_date: addDays(-90), status: 'نشط', notes: null, created_by: 5 },
  { id: compSeq++, employee_id: 5, grade: 'الدرجة الثانية', base_salary: 18000, housing_allowance: 4000, transport_allowance: 1200, other_allowances: 500, bonus: 1000, insurance_class: 'الفئة ب', effective_date: addDays(-60), status: 'نشط', notes: null, created_by: 5 },
  { id: compSeq++, employee_id: 6, grade: 'الدرجة الثالثة', base_salary: 12000, housing_allowance: 3000, transport_allowance: 1000, other_allowances: 0, bonus: 500, insurance_class: 'الفئة ب', effective_date: addDays(-45), status: 'نشط', notes: null, created_by: 5 },
  { id: compSeq++, employee_id: 10, grade: 'الدرجة الرابعة', base_salary: 9000, housing_allowance: 2500, transport_allowance: 800, other_allowances: 0, bonus: 0, insurance_class: 'الفئة ج', effective_date: addDays(-30), status: 'نشط', notes: null, created_by: 5 },
]

let compReqSeq = 1
const compensationRequests = [
  { id: compReqSeq++, employee_id: 10, compensation_id: 6, current_base_salary: 9000, requested_base_salary: 10500, reason: 'أداء متميز وزيادة نطاق المسؤوليات خلال الربع الأخير.', status: 'معلق', requested_by: 2, reviewed_by: null, reviewed_at: null, created_at: nowIso() },
]
let compHistSeq = 1
const compensationHistory = [
  { id: compHistSeq++, compensation_id: 5, employee_id: 6, old_total: 15000, new_total: 16500, old_base_salary: 10500, new_base_salary: 12000, reason: 'ترقية سنوية بعد تقييم الأداء.', changed_by: 5, created_at: addDays(-45) },
]

let succSeq = 1
const succession = [
  { id: succSeq++, position_title: 'الرئيس التنفيذي', department_id: 1, incumbent_id: 1, successor_id: 2, readiness: 'خلال سنتين', risk_level: 'مرتفع', potential: 'نجم صاعد', status: 'نشط', notes: 'يحتاج برنامج تطوير قيادي', created_by: 5 },
  { id: succSeq++, position_title: 'مدير التقنية', department_id: 1, incumbent_id: 2, successor_id: 6, readiness: 'خلال سنة', risk_level: 'متوسط', potential: 'أداء عالٍ', status: 'نشط', notes: 'خبرة تقنية قوية', created_by: 5 },
  { id: succSeq++, position_title: 'مدير المالية', department_id: 3, incumbent_id: 3, successor_id: null, readiness: 'غير جاهز', risk_level: 'مرتفع', potential: 'موثوق', status: 'نشط', notes: 'لا يوجد مرشح داخلي — يُنصح بالتوظيف الخارجي', created_by: 5 },
  { id: succSeq++, position_title: 'مدير الموارد البشرية', department_id: 5, incumbent_id: 5, successor_id: 7, readiness: 'جاهز الآن', risk_level: 'منخفض', potential: 'نجم صاعد', status: 'نشط', notes: 'جاهز للترقية الفورية', created_by: 5 },
]

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
function sessionFor(email) {
  const u = users[email]
  const emp = employees.find((e) => e.id === u.employee_id)
  return {
    token: `demo-token-${email}`,
    user: {
      id: u.employee_id || 0, email, role: u.role, employee_id: u.employee_id,
      full_name: emp?.full_name || u.name || 'مستخدم', job_title: emp?.job_title || u.name || '',
      department_id: emp?.department_id || null, department_name: emp ? deptName(emp.department_id) : null,
      profile_picture: null, two_factor_enabled: !!u.two_factor_enabled,
    },
  }
}

export const mockAuthApi = {
  async login({ email, password }) {
    await delay()
    const u = users[email]
    if (!u || u.password !== password) {
      const err = new Error('Invalid credentials')
      err.response = { status: 401, data: { error: 'بيانات الدخول غير صحيحة' } }
      throw err
    }
    if (u.two_factor_enabled) {
      return { requires_2fa: true, pending_token: `demo-pending-${email}` }
    }
    return sessionFor(email)
  },
  async verifyTwoFactor({ pending_token, code }) {
    await delay()
    const email = String(pending_token || '').replace(/^demo-pending-/, '')
    const u = users[email]
    if (!u || !u.two_factor_enabled) {
      const err = new Error('Invalid pending session')
      err.response = { status: 401, data: { error: 'Invalid pending session' } }
      throw err
    }
    if (!(await totp.verifyToken(u.two_factor_secret, code))) {
      const err = new Error('Invalid code')
      err.response = { status: 400, data: { error: 'رمز التحقق غير صحيح' } }
      throw err
    }
    return sessionFor(email)
  },
  async setupTwoFactor() {
    await delay()
    const cu = currentUser()
    const u = cu && users[cu.email]
    if (!u) { const err = new Error('No session'); err.response = { status: 401, data: { error: 'No token provided' } }; throw err }
    const secret = totp.generateSecret()
    u.two_factor_secret = secret
    u.two_factor_enabled = false
    return { secret, otpauth_url: totp.otpauthUrl(secret, cu.email) }
  },
  async enableTwoFactor(code) {
    await delay()
    const cu = currentUser()
    const u = cu && users[cu.email]
    if (!u) { const err = new Error('No session'); err.response = { status: 401, data: { error: 'No token provided' } }; throw err }
    if (!u.two_factor_secret) throw badReq('ابدأ الإعداد أولاً')
    if (!(await totp.verifyToken(u.two_factor_secret, code))) throw badReq('رمز التحقق غير صحيح')
    u.two_factor_enabled = true
    return { message: 'تم تفعيل التحقق بخطوتين' }
  },
  async disableTwoFactor(password) {
    await delay()
    const cu = currentUser()
    const u = cu && users[cu.email]
    if (!u) { const err = new Error('No session'); err.response = { status: 401, data: { error: 'No token provided' } }; throw err }
    if (password !== u.password) throw badReq('كلمة المرور غير صحيحة')
    u.two_factor_secret = null
    u.two_factor_enabled = false
    return { message: 'تم تعطيل التحقق بخطوتين' }
  },
  async me() {
    await delay()
    try {
      const persisted = JSON.parse(localStorage.getItem('quant-hr-auth') || 'null')
      const user = persisted?.state?.user || null
      if (user?.email && users[user.email]) user.two_factor_enabled = !!users[user.email].two_factor_enabled
      return { user }
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
  async hrOverview() {
    await delay()
    const day = today()
    const now = new Date()
    const active = employees.filter((e) => e.status === 'نشط')
    const daysSince = (d) => (d ? Math.floor((now - new Date(d)) / 86400000) : 99999)
    const total = employees.length
    const leavers = employees.filter((e) => ['مستقيل', 'مفصول'].includes(e.status)).length
    const groupBy = (arr, fn) => {
      const m = {}
      for (const x of arr) { const k = fn(x); if (k == null) continue; m[k] = (m[k] || 0) + 1 }
      return m
    }
    const toArr = (obj, extra = {}) => Object.entries(obj).map(([name, count]) => ({ name, count, ...(extra[name] || {}) }))
    const femaleMS = ['عزباء', 'متزوجة', 'مطلقة', 'أرملة']
    const ageBucket = (dob) => {
      if (!dob) return null
      const a = now.getFullYear() - new Date(dob).getFullYear()
      return a < 30 ? 'أقل من 30' : a < 40 ? '30-39' : a < 50 ? '40-49' : '50+'
    }
    const todayRecs = attendance.filter((a) => a.date === day)
    const attSum = (s) => todayRecs.filter((a) => a.status === s).length
    const curMonth = String(now.getMonth() + 1).padStart(2, '0')

    const pendingLeaves = leaves.filter((l) => l.status === 'معلقة').length
    const pendingRequests = (typeof requests !== 'undefined' ? requests : []).filter((r) => r.status === 'معلق').length
    const pendingExpenses = (typeof expenses !== 'undefined' ? expenses : []).filter((x) => x.status === 'معلقة').length
    const expiringDocs = (typeof documents !== 'undefined' ? documents : []).filter((d) => d.expiry_date && daysSince(d.expiry_date) <= 0 && daysSince(d.expiry_date) >= -30).length
    const expiringContracts = employees.filter((e) => e.contract_end && daysSince(e.contract_end) <= 0 && daysSince(e.contract_end) >= -60).length
    const openJobs = (typeof jobs !== 'undefined' ? jobs : []).filter((j) => j.status === 'مفتوحة').length
    const todayInterviews = (typeof interviews !== 'undefined' ? interviews : []).filter((i) => String(i.scheduled_at || '').slice(0, 10) === day && i.status === 'مجدولة').length
    const overdueReviews = (typeof goals !== 'undefined' ? goals : []).filter((g) => g.target_date && g.target_date < day && g.status !== 'مكتملة').length

    const trend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      trend.push({ month: ym, hired: employees.filter((e) => String(e.hire_date || '').slice(0, 7) === ym).length, resigned: 0 })
    }

    const deptColors = {}
    departments.forEach((d) => { deptColors[d.name] = { color: d.color } })
    const pendingApprovals = pendingLeaves + pendingRequests + pendingExpenses
    const alerts = []
    if (expiringDocs > 0) alerts.push({ severity: 'تحذير', text: `${expiringDocs} مستند/هوية قارب على الانتهاء`, to: '/hr/documents' })
    if (expiringContracts > 0) alerts.push({ severity: 'تحذير', text: `${expiringContracts} عقد قارب على الانتهاء`, to: '/employees?contract_expiring=1' })
    if (pendingApprovals > 0) alerts.push({ severity: 'معلومة', text: `${pendingApprovals} طلب بانتظار الموافقة`, to: '/approvals' })
    if (overdueReviews > 0) alerts.push({ severity: 'تحذير', text: `${overdueReviews} تقييم أداء متأخر`, to: '/hr/performance' })
    if (attSum('غائب') > 0) alerts.push({ severity: 'معلومة', text: `${attSum('غائب')} موظف غائب اليوم`, to: '/attendance' })

    return {
      workforce: {
        total, active: active.length,
        onLeave: employees.filter((e) => e.status === 'إجازة').length,
        leavers,
        newHires30: employees.filter((e) => daysSince(e.hire_date) <= 30).length,
        newHires90: employees.filter((e) => daysSince(e.hire_date) <= 90).length,
        probation: active.filter((e) => daysSince(e.hire_date) <= 90).length,
        turnover: total ? Math.round((leavers / total) * 1000) / 10 : 0,
      },
      attendanceToday: { present: attSum('حاضر'), late: attSum('تأخر'), absent: attSum('غائب'), remote: attSum('عمل عن بعد'), onLeave: employees.filter((e) => e.status === 'إجازة').length },
      actions: { pendingApprovals, pendingLeaves, pendingRequests, pendingExpenses, expiringContracts, expiringDocs, openJobs, todayInterviews, overdueReviews },
      celebrations: {
        birthdays: active.filter((e) => String(e.date_of_birth || '').slice(5, 7) === curMonth).map((e) => ({ full_name: e.full_name, profile_picture: null, date_of_birth: e.date_of_birth })),
        anniversaries: active.filter((e) => String(e.hire_date || '').slice(5, 7) === curMonth && daysSince(e.hire_date) > 330).map((e) => ({ full_name: e.full_name, profile_picture: null, hire_date: e.hire_date, years: now.getFullYear() - new Date(e.hire_date).getFullYear() })),
      },
      distributions: {
        byDepartment: departments.map((d) => ({ name: d.name, color: d.color, count: active.filter((e) => e.department_id === d.id).length })).filter((x) => x.count > 0),
        byNationality: toArr(groupBy(active, (e) => e.nationality)),
        byGender: toArr(groupBy(active, (e) => (femaleMS.includes(e.marital_status) ? 'أنثى' : 'ذكر'))),
        byAge: toArr(groupBy(active, (e) => ageBucket(e.date_of_birth))),
        byType: toArr(groupBy(active, (e) => e.employment_type)),
      },
      trend,
      alerts,
    }
  },
}

export const mockEmployeesApi = {
  async list({ search = '', status = '', department_id = '', contract_expiring = '', page = 1, limit = 12 } = {}) {
    await delay()
    let rows = employees.map(withDept)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter((e) => e.full_name.toLowerCase().includes(s) || e.email.toLowerCase().includes(s) || e.job_title.toLowerCase().includes(s))
    }
    if (status) rows = rows.filter((e) => e.status === status)
    if (department_id) rows = rows.filter((e) => e.department_id === Number(department_id))
    if (contract_expiring) {
      const now = Date.now(), horizon = now + 60 * 86400000
      rows = rows.filter((e) => e.contract_end && new Date(e.contract_end).getTime() >= now && new Date(e.contract_end).getTime() <= horizon)
      rows.sort((a, b) => new Date(a.contract_end) - new Date(b.contract_end))
    }
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
      goals: (typeof goals !== 'undefined' ? goals : []).filter((g) => g.employee_id === e.id),
      training: (typeof enrollments !== 'undefined' ? enrollments : []).filter((en) => en.employee_id === e.id).map((en) => {
        const c = (typeof courses !== 'undefined' ? courses : []).find((x) => x.id === en.course_id) || {}
        return { ...en, title: c.title, category: c.category, hours: c.hours }
      }),
      assets: (typeof assets !== 'undefined' ? assets : []).filter((a) => a.assigned_to === e.id),
      compensation: (typeof compensation !== 'undefined' ? compensation : []).find((c) => c.employee_id === e.id && c.status === 'نشط') || null,
      history: (typeof promotions !== 'undefined' ? promotions : []).filter((p) => p.employee_id === e.id).map((p) => ({ id: p.id, type: p.type, current_title: p.current_title, new_title: p.new_title, effective_date: p.effective_date, status: p.status, created_at: p.created_at })),
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
  async orgChart() {
    await delay()
    const node = (e) => ({ id: e.id, full_name: e.full_name, job_title: e.job_title, profile_picture: null, status: e.status, manager_id: e.manager_id, department_id: e.department_id, department_name: deptName(e.department_id), department_color: deptColor(e.department_id) })
    const build = (n) => {
      const children = employees.filter((e) => e.manager_id === n.id).map(node).map(build)
      return { ...n, children, direct_reports: children.length, total_reports: children.reduce((s, c) => s + c.total_reports + 1, 0) }
    }
    const roots = employees.filter((e) => !e.manager_id).map(node).map(build)
    return { tree: roots, total: employees.length }
  },
  async create(data) {
    await delay()
    const id = Math.max(...employees.map((e) => e.id)) + 1
    const emp = { id, employee_number: `EMP-${String(id).padStart(3, '0')}`, status: 'نشط', annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5, profile_picture: null, manager_id: null, ...data }
    employees.push(emp)
    wfRunWorkflowsFor('تعيين موظف', id)
    return { message: 'تم إضافة الموظف (وضع تجريبي)', employee: emp }
  },
  async update(id, data) {
    await delay()
    const e = employees.find((x) => x.id === Number(id))
    if (!e) return { message: 'تم التحديث (وضع تجريبي)' }
    const u = currentUser()
    if (u?.role === 'candidate') throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (u?.role === 'employee' && e.id !== u.employee_id) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (u?.role === 'department_head' && e.id !== u.employee_id && !sameDeptAsMe(u, e.id)) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    Object.assign(e, data)
    return { message: 'تم التحديث (وضع تجريبي)' }
  },
  async remove(id) {
    await delay()
    const i = employees.findIndex((x) => x.id === Number(id))
    if (i > -1) employees.splice(i, 1)
    return { message: 'تم الحذف (وضع تجريبي)' }
  },
  async export({ search = '', status = '', department_id = '' } = {}) {
    await delay()
    let rows = employees.map(withDept)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter((e) => e.full_name.toLowerCase().includes(s) || e.email.toLowerCase().includes(s) || e.job_title.toLowerCase().includes(s))
    }
    if (status) rows = rows.filter((e) => e.status === status)
    if (department_id) rows = rows.filter((e) => e.department_id === Number(department_id))
    const u = currentUser()
    if (u?.role === 'department_head') rows = rows.filter((e) => e.id === u.employee_id || sameDeptAsMe(u, e.id))
    return {
      employees: rows.map((e) => ({
        employee_number: e.employee_number, full_name: e.full_name, email: e.email, phone: e.phone,
        job_title: e.job_title, department_name: e.department_name, employment_type: e.employment_type,
        work_location: e.work_location, status: e.status, hire_date: e.hire_date, salary: e.salary,
      })),
    }
  },
  async import(rows) {
    await delay()
    const list = Array.isArray(rows) ? rows : []
    if (list.length === 0) throw badReq('No rows to import')
    if (list.length > 500) throw badReq('الحد الأقصى 500 صف لكل استيراد')
    const deptByName = new Map(departments.map((d) => [d.name.trim().toLowerCase(), d.id]))
    let created = 0
    const failed = []
    list.forEach((row, i) => {
      const full_name = (row.full_name || '').trim()
      const email = (row.email || '').trim()
      const job_title = (row.job_title || '').trim()
      const hire_date = (row.hire_date || '').trim()
      if (!full_name || !email || !job_title || !hire_date) {
        failed.push({ row: i + 1, email, error: 'الاسم والبريد والمسمى الوظيفي وتاريخ التعيين مطلوبة' })
        return
      }
      if (employees.some((e) => e.email === email)) {
        failed.push({ row: i + 1, email, error: 'البريد الإلكتروني مستخدم بالفعل' })
        return
      }
      let department_id = null
      if (row.department) {
        department_id = deptByName.get(String(row.department).trim().toLowerCase()) || null
        if (!department_id) {
          failed.push({ row: i + 1, email, error: `الإدارة "${row.department}" غير موجودة` })
          return
        }
      }
      const id = Math.max(...employees.map((e) => e.id)) + 1
      employees.push({
        id, full_name, email, phone: row.phone || null, job_title, department_id,
        manager_id: null, hire_date, employment_type: row.employment_type || 'دوام كامل',
        work_location: row.work_location || 'الرياض - المقر الرئيسي', team: null, status: 'نشط',
        salary: row.salary ? Number(row.salary) : 0, allowances: 0, bank_name: null, bank_account: null,
        contract_type: 'غير محدد', contract_start: null, contract_end: null, national_id: null,
        date_of_birth: null, marital_status: null, address: null, emergency_contact: null,
        profile_picture: null, nationality: 'سعودي', employee_number: `EMP-${Date.now()}-${i}`,
        annual_leave_balance: 30, sick_leave_balance: 10, emergency_leave_balance: 5,
        created_at: nowIso(),
      })
      created += 1
    })
    return { created, failed }
  },
  async qiwaReadiness() {
    await delay()
    const QIWA_ID_RE = /^[12]\d{9}$/
    const items = employees.filter((e) => e.status === 'نشط').map((e) => {
      const issues = []
      if (!e.national_id || !QIWA_ID_RE.test(e.national_id)) issues.push('رقم الهوية/الإقامة مفقود أو غير صالح')
      if (!e.nationality) issues.push('الجنسية غير مُحدَّدة')
      if (!e.contract_type) issues.push('نوع العقد غير محدد')
      if (!e.contract_start && !e.hire_date) issues.push('تاريخ بداية العقد مفقود')
      if (!e.salary || e.salary <= 0) issues.push('الراتب الأساسي غير محدد')
      if (!e.work_location) issues.push('موقع العمل غير محدد')
      return {
        employee_id: e.id, full_name: e.full_name, job_title: e.job_title, department_name: deptName(e.department_id),
        national_id: e.national_id, nationality: e.nationality, contract_type: e.contract_type,
        ok: issues.length === 0, issues,
      }
    }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'))
    const readyCount = items.filter((i) => i.ok).length
    return { items, summary: { total: items.length, ready: readyCount, not_ready: items.length - readyCount } }
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
    if (Number(employee_id) !== currentUser()?.employee_id) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const day = today()
    if (attendance.find((a) => a.employee_id === employee_id && a.date === day)) throw badReq('سجّلت الدخول اليوم بالفعل')
    const rec = { id: attendanceSeq++, employee_id, date: day, check_in: nowIso(), check_out: null, work_hours: 0, status: 'حاضر', check_in_location: 'المكتب' }
    attendance.push(rec)
    return { message: 'تم تسجيل الدخول', attendance: rec }
  },
  async checkOut({ employee_id }) {
    await delay()
    if (Number(employee_id) !== currentUser()?.employee_id) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
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
    const id = Number(employeeId)
    const u = currentUser()
    if (u && ['employee', 'candidate'].includes(u.role) && id !== u.employee_id) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    if (u && u.role === 'department_head' && id !== u.employee_id && !sameDeptAsMe(u, id)) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    return attendance.filter((a) => a.employee_id === id).slice(-30).reverse()
  },
  async report() {
    await delay()
    return []
  },
  async corrections({ status } = {}) {
    await delay()
    let rows = scopeByRole(attendanceCorrections)
    if (status) rows = rows.filter((c) => c.status === status)
    const list = rows.sort((a, b) => ({ معلق: 1, 'موافق عليه': 2, مرفوض: 3 }[a.status] - { معلق: 1, 'موافق عليه': 2, مرفوض: 3 }[b.status]) || b.id - a.id)
      .map((c) => ({ ...c, full_name: empName(c.employee_id), job_title: employees.find((e) => e.id === c.employee_id)?.job_title || null, reviewed_by_name: empName(c.reviewed_by), profile_picture: null }))
    const summary = list.reduce((s, r) => { s.total += 1; if (r.status === 'معلق') s.pending += 1; return s }, { total: 0, pending: 0 })
    return { corrections: list, summary }
  },
  async requestCorrection(data) {
    await delay()
    const u = currentUser()
    if (!u?.employee_id) throw badReq('لا يوجد موظف مرتبط بالحساب')
    if (!data.date) throw badReq('التاريخ مطلوب')
    if (!data.requested_check_in && !data.requested_check_out) throw badReq('مطلوب وقت واحد على الأقل')
    const c = { id: attnCorrSeq++, employee_id: u.employee_id, date: data.date, requested_check_in: data.requested_check_in || null, requested_check_out: data.requested_check_out || null, reason: data.reason || null, status: 'معلق', reviewed_by: null, created_at: nowIso() }
    attendanceCorrections.unshift(c)
    return { message: 'تم', correction: { id: c.id } }
  },
  async reviewCorrection(id, status) {
    await delay()
    const c = attendanceCorrections.find((x) => x.id === Number(id))
    if (!c) throw notFound()
    const u = currentUser()
    if (u?.role === 'department_head' && employees.find((e) => e.id === c.employee_id)?.department_id !== myDept()) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    c.status = status
    c.reviewed_by = currentUser()?.employee_id || 5
    if (status === 'موافق عليه') {
      const rec = attendance.find((a) => a.employee_id === c.employee_id && a.date === c.date)
      const ci = c.requested_check_in ? `${c.date} ${c.requested_check_in}` : (rec?.check_in || null)
      const co = c.requested_check_out ? `${c.date} ${c.requested_check_out}` : (rec?.check_out || null)
      let hrs = rec?.work_hours || 0
      if (ci && co) hrs = Math.max(0, Math.round(((new Date(co) - new Date(ci)) / 3600000) * 10) / 10)
      if (rec) { rec.check_in = ci; rec.check_out = co; rec.work_hours = hrs; rec.status = 'حاضر' }
      else attendance.push({ id: attendanceSeq++, employee_id: c.employee_id, date: c.date, check_in: ci, check_out: co, work_hours: hrs, status: 'حاضر', notes: 'تصحيح معتمد' })
    }
    if (status !== 'معلق') {
      pushNotification({ employee_id: c.employee_id }, {
        title: status === 'موافق عليه' ? 'تمت الموافقة على تصحيح الحضور' : 'تم رفض تصحيح الحضور',
        message: `${c.date} · ${c.requested_check_in || '—'} إلى ${c.requested_check_out || '—'}`,
        type: status === 'موافق عليه' ? 'success' : 'error',
        link: '/ess/attendance-corrections',
      })
    }
    return { message: 'تم' }
  },
  async removeCorrection(id) {
    await delay()
    const i = attendanceCorrections.findIndex((x) => x.id === Number(id))
    if (i > -1) attendanceCorrections.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

let attnCorrSeq = 1
const attendanceCorrections = [
  { id: attnCorrSeq++, employee_id: 6, date: addDays(-1), requested_check_in: '08:05', requested_check_out: '16:10', reason: 'نسيت تسجيل الدخول بسبب اجتماع صباحي', status: 'معلق', reviewed_by: null, created_at: nowIso() },
  { id: attnCorrSeq++, employee_id: 10, date: addDays(-2), requested_check_in: '09:00', requested_check_out: '17:00', reason: 'عطل في جهاز البصمة', status: 'موافق عليه', reviewed_by: 5, created_at: nowIso() },
  { id: attnCorrSeq++, employee_id: 4, date: addDays(-3), requested_check_in: null, requested_check_out: '16:30', reason: 'نسيت تسجيل الخروج', status: 'مرفوض', reviewed_by: 5, created_at: nowIso() },
]

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
    wfRunWorkflowsFor('طلب إجازة', leave.employee_id)
    return { message: 'تم إرسال الطلب (وضع تجريبي)', leave }
  },
  async approve(id, { status }) {
    await delay()
    const l = leaves.find((x) => x.id === Number(id))
    if (!l) return { message: 'تم تحديث الطلب (وضع تجريبي)' }
    const u = currentUser()
    if (u?.role === 'department_head' && employees.find((e) => e.id === l.employee_id)?.department_id !== myDept()) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    l.status = status
    l.approved_by = u?.employee_id || 1
    pushNotification({ employee_id: l.employee_id }, {
      title: status === 'موافقة' ? 'تمت الموافقة على طلب الإجازة' : 'تم رفض طلب الإجازة',
      message: `طلب إجازة ${l.type} (${l.start_date} إلى ${l.end_date})`,
      type: status === 'موافقة' ? 'success' : 'error',
      link: '/leaves',
    })
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
  async calendar(month) {
    await delay()
    const mo = /^\d{4}-\d{2}$/.test(month || '') ? month : nowIso().slice(0, 7)
    const start = `${mo}-01`, end = `${mo}-31`
    const rows = leaves
      .filter((l) => ['موافقة', 'معلقة'].includes(l.status) && l.start_date <= end && l.end_date >= start)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .map((l) => { const e = employees.find((x) => x.id === l.employee_id); return { id: l.id, employee_id: l.employee_id, type: l.type, start_date: l.start_date, end_date: l.end_date, days_count: l.days_count, status: l.status, full_name: empName(l.employee_id), profile_picture: null, department_name: deptName(e?.department_id), department_color: deptColor(e?.department_id) } })
    const [y, m] = mo.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const perDay = Array.from({ length: daysInMonth }, (_, i) => {
      const day = `${mo}-${String(i + 1).padStart(2, '0')}`
      return { day: i + 1, count: rows.filter((r) => r.status === 'موافقة' && r.start_date <= day && r.end_date >= day).length }
    })
    const peak = perDay.reduce((mx, d) => Math.max(mx, d.count), 0)
    return { month: mo, days_in_month: daysInMonth, leaves: rows, per_day: perDay, summary: { people: new Set(rows.map((r) => r.employee_id)).size, total: rows.length, peak } }
  },
}

const docDaysLeft = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null)
const docStatus = (d) => {
  if (!d) return 'بدون انتهاء'
  const dl = docDaysLeft(d)
  if (dl < 0) return 'منتهية'
  if (dl <= 30) return 'تنتهي قريباً'
  return 'سارية'
}

export const mockDocumentsApi = {
  async forEmployee(employeeId) {
    await delay()
    const u = currentUser()
    const id = Number(employeeId)
    if (u && ['employee', 'candidate'].includes(u.role) && id !== u.employee_id) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    if (u && !sameDeptAsMe(u, id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    return documents.filter((d) => d.employee_id === id)
  },
  async list({ type, employee_id } = {}) {
    await delay()
    let rows = scopeByRole(documents)
    if (type) rows = rows.filter((d) => d.type === type)
    if (employee_id) rows = rows.filter((d) => d.employee_id === Number(employee_id))
    const items = [...rows]
      .sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0
        if (!a.expiry_date) return 1
        if (!b.expiry_date) return -1
        return a.expiry_date.localeCompare(b.expiry_date)
      })
      .map((d) => ({
        ...d,
        days_left: docDaysLeft(d.expiry_date),
        doc_status: docStatus(d.expiry_date),
        full_name: empName(d.employee_id),
        job_title: employees.find((e) => e.id === d.employee_id)?.job_title || null,
        department_name: deptName(employees.find((e) => e.id === d.employee_id)?.department_id),
        uploaded_by_name: empName(d.uploaded_by),
        profile_picture: null,
      }))
    const summary = items.reduce((s, r) => {
      s.total += 1
      if (r.doc_status === 'منتهية') s.expired += 1
      if (r.doc_status === 'تنتهي قريباً') s.expiringSoon += 1
      return s
    }, { total: 0, expired: 0, expiringSoon: 0 })
    return { documents: items, summary }
  },
  async register(data) {
    await delay()
    const d = { id: docSeq++, type: data.type || 'أخرى', title: data.title, file_name: data.file_name || null, expiry_date: data.expiry_date || null, uploaded_by: currentUser()?.employee_id || 5, uploaded_at: nowIso(), ...data, employee_id: Number(data.employee_id) }
    documents.unshift(d)
    return { message: 'تم التسجيل', document: d }
  },
  async update(id, data) {
    await delay()
    const d = documents.find((x) => x.id === Number(id))
    if (d) Object.assign(d, data)
    return { message: 'تم التحديث' }
  },
  async upload() {
    await delay()
    return { message: 'رفع المستندات غير متاح في الوضع التجريبي' }
  },
  async remove(id) {
    await delay()
    const i = documents.findIndex((x) => x.id === Number(id))
    if (i > -1) documents.splice(i, 1)
    return { message: 'تم الحذف' }
  },
  async remind(id) {
    await delay()
    const d = documents.find((x) => x.id === Number(id))
    if (!d) { const err = new Error('bad'); err.response = { status: 404, data: { error: 'غير موجود' } }; throw err }
    if (!d.expiry_date) throw badReq('لا يوجد تاريخ انتهاء لهذا المستند')
    const daysLeft = docDaysLeft(d.expiry_date)
    if (daysLeft > 30) throw badReq('المستند لا يزال سارياً — لا حاجة للتذكير بعد')
    d.reminder_sent_at = nowIso()
    pushNotification({ employee_id: d.employee_id }, {
      title: daysLeft < 0 ? 'مستند منتهي الصلاحية' : 'مستند على وشك الانتهاء',
      message: daysLeft < 0
        ? `${d.title} منتهي الصلاحية منذ ${Math.abs(daysLeft)} يوم. يرجى تحديثه في أقرب وقت.`
        : `${d.title} ينتهي خلال ${daysLeft} يوم. يرجى تجديده قبل الموعد.`,
      type: daysLeft < 0 ? 'error' : 'warning',
    })
    return { message: 'تم إرسال التذكير' }
  },
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('quant-hr-auth') || 'null')?.state?.user || null
  } catch {
    return null
  }
}

let notifSeq = 1
const notifications = []
// Recipient is either an employee_id (staff) or an email (candidates, who
// aren't linked to an employees row) — mirrors notifyEmployee/notifyEmail
// on the real backend.
function pushNotification({ employee_id, email }, { title, message, type = 'info', link = null }) {
  notifications.unshift({ id: notifSeq++, employee_id: employee_id || null, email: email || null, title, message, type, link, is_read: 0, created_at: nowIso() })
}
function isMyNotification(n, u) {
  if (u?.employee_id && n.employee_id === u.employee_id) return true
  if (!n.employee_id && u?.email && n.email === u.email) return true
  return false
}

// Seed a few sample notifications so the bell isn't empty on first demo login.
pushNotification({ employee_id: 6 }, { title: 'تمت الموافقة على طلب الإجازة', message: 'طلب إجازة سنوية (٥ أيام)', type: 'success', link: '/leaves' })
pushNotification({ employee_id: 6 }, { title: 'إعلان جديد', message: 'اجتماع عام لجميع الموظفين الخميس القادم', type: 'info', link: '/ess/announcements' })
notifications[1].is_read = 1

export const mockNotificationsApi = {
  async list({ unread } = {}) {
    await delay()
    const u = currentUser()
    const mine = notifications.filter((n) => isMyNotification(n, u))
    let rows = mine
    if (unread === '1' || unread === true || unread === 'true') rows = rows.filter((n) => !n.is_read)
    return { notifications: rows.slice(0, 50), unread_count: mine.filter((n) => !n.is_read).length }
  },
  async markRead(id) {
    await delay()
    const n = notifications.find((x) => x.id === Number(id))
    if (n) n.is_read = 1
    return { message: 'تم' }
  },
  async markAllRead() {
    await delay()
    const u = currentUser()
    notifications.forEach((n) => { if (isMyNotification(n, u)) n.is_read = 1 })
    return { message: 'تم' }
  },
  async remove(id) {
    await delay()
    const i = notifications.findIndex((x) => x.id === Number(id))
    if (i > -1) notifications.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export const mockAnnouncementsApi = {
  async list() {
    await delay()
    const myId = currentUser()?.employee_id
    return [...announcements]
      .sort((a, b) => (b.is_pinned - a.is_pinned) || b.id - a.id)
      .map((a) => ({
        ...a,
        created_by_name: empName(a.created_by),
        read_count: announcementReads.filter((r) => r.announcement_id === a.id).length,
        read_by_me: announcementReads.some((r) => r.announcement_id === a.id && r.employee_id === myId),
      }))
  },
  async create(data) {
    await delay()
    const ann = { id: annSeq++, is_pinned: data.is_pinned ? 1 : 0, requires_acknowledgment: data.requires_acknowledgment ? 1 : 0, audience: data.audience || 'الجميع', created_by: currentUser()?.employee_id || null, created_at: nowIso(), ...data }
    announcements.unshift(ann)
    return { message: 'تم النشر', announcement: ann }
  },
  async markRead(id) {
    await delay()
    const employee_id = currentUser()?.employee_id
    if (!employee_id) throw { response: { data: { error: 'No employee associated with this account' } } }
    const a = announcements.find((x) => x.id === Number(id))
    if (!a) throw { response: { data: { error: 'Not found' } } }
    if (!announcementReads.some((r) => r.announcement_id === Number(id) && r.employee_id === employee_id)) {
      announcementReads.push({ id: annReadSeq++, announcement_id: Number(id), employee_id, read_at: nowIso() })
    }
    return { message: 'Acknowledged' }
  },
  async reads(id) {
    await delay()
    const a = announcements.find((x) => x.id === Number(id))
    if (!a) throw { response: { data: { error: 'Not found' } } }
    const readers = announcementReads
      .filter((r) => r.announcement_id === Number(id))
      .sort((x, y) => new Date(x.read_at) - new Date(y.read_at))
      .map((r) => ({ read_at: r.read_at, employee_id: r.employee_id, full_name: empName(r.employee_id), job_title: employees.find((e) => e.id === r.employee_id)?.job_title, profile_picture: null }))
    const readIds = new Set(readers.map((r) => r.employee_id))
    const notRead = employees
      .filter((e) => e.status === 'نشط' && !readIds.has(e.id))
      .map((e) => ({ employee_id: e.id, full_name: e.full_name, job_title: e.job_title, profile_picture: null }))
    return { announcement: a, readers, notRead, total: readers.length + notRead.length }
  },
  async remove(id) {
    await delay()
    const i = announcements.findIndex((a) => a.id === Number(id))
    if (i > -1) announcements.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

export const mockRequestsApi = {
  async list({ type = '', status = '' } = {}) {
    await delay()
    const u = currentUser()
    let rows = requests
    if (u && ['employee', 'candidate'].includes(u.role)) {
      rows = rows.filter((r) => r.employee_id === u.employee_id)
    } else if (u?.role === 'department_head') {
      rows = rows.filter((r) => employees.find((e) => e.id === r.employee_id)?.department_id === myDept())
    }
    if (type) rows = rows.filter((r) => r.type === type)
    if (status) rows = rows.filter((r) => r.status === status)
    const order = { معلقة: 1, مقبولة: 2, مرفوضة: 3, مكتملة: 4 }
    return [...rows]
      .sort((a, b) => (order[a.status] || 9) - (order[b.status] || 9) || b.id - a.id)
      .map((r) => ({
        ...r,
        full_name: empName(r.employee_id),
        job_title: employees.find((e) => e.id === r.employee_id)?.job_title,
        department_name: deptName(employees.find((e) => e.id === r.employee_id)?.department_id),
        resolved_by_name: empName(r.resolved_by),
        profile_picture: null,
      }))
  },
  async create(data) {
    await delay()
    const TOGGLE_GATED_TYPES = { 'عمل إضافي': { column: 'overtime_enabled', label: 'احتساب العمل الإضافي' }, 'عمل عن بعد': { column: 'remote_work_enabled', label: 'العمل عن بُعد' } }
    const gate = TOGGLE_GATED_TYPES[data.type]
    if (gate && !orgSettings[gate.column]) throw badReq(`ميزة "${gate.label}" غير مفعَّلة حالياً في إعدادات المؤسسة`)
    const u = currentUser()
    const req = { id: reqSeq++, employee_id: u?.employee_id || data.employee_id, status: 'معلقة', response: null, resolved_by: null, created_at: nowIso(), ...data }
    requests.unshift(req)
    return { message: 'تم إرسال الطلب', request: req }
  },
  async resolve(id, { status, response }) {
    await delay()
    const r = requests.find((x) => x.id === Number(id))
    if (!r) return { message: 'تم تحديث الطلب' }
    const u = currentUser()
    if (u?.role === 'department_head' && employees.find((e) => e.id === r.employee_id)?.department_id !== myDept()) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    r.status = status; r.response = response || null; r.resolved_by = u?.employee_id || 5; r.resolved_at = nowIso()
    const STATUS_LABEL = { 'مقبولة': 'قبول', 'مرفوضة': 'رفض', 'مكتملة': 'إنجاز' }
    pushNotification({ employee_id: r.employee_id }, {
      title: `تم ${STATUS_LABEL[status] || 'تحديث'} طلبك: ${r.subject}`,
      message: response || r.type,
      type: status === 'مرفوضة' ? 'error' : 'success',
      link: null,
    })
    return { message: 'تم تحديث الطلب' }
  },
  async remove(id) {
    await delay()
    const r = requests.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    if (r.employee_id !== currentUser()?.employee_id) throw { response: { data: { error: 'Access denied' } } }
    if (r.status !== 'معلقة') throw badReq('لا يمكن سحب طلب تم البت فيه')
    const i = requests.findIndex((x) => x.id === Number(id))
    if (i > -1) requests.splice(i, 1)
    return { message: 'تم سحب الطلب' }
  },
}

export const mockPayslipsApi = {
  // Payslips are the line items of actual payroll runs that have at least
  // been approved — drafts and runs still under review aren't final yet.
  async forEmployee(employeeId) {
    await delay()
    const id = Number(employeeId)
    const emp = employees.find((e) => e.id === id)
    if (!emp) throw notFound()
    const u = currentUser()
    const privileged = ['admin', 'hr_manager', 'super_admin'].includes(u?.role)
    if (!privileged && id !== u?.employee_id) {
      if (u?.role !== 'department_head' || !sameDeptAsMe(u, id)) {
        throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
      }
    }
    const payslips = [...payrollRuns]
      .filter((r) => ['معتمد', 'مصروف'].includes(r.status))
      .sort((a, b) => (b.year - a.year) || (b.month - a.month))
      .map((r) => {
        const i = r.items.find((x) => x.employee_id === Number(employeeId))
        if (!i) return null
        return {
          id: r.id, month: AR_MONTHS[r.month - 1], year: r.year,
          basic: i.basic, housing_allowance: i.housing_allowance, transport_allowance: i.transport_allowance,
          other_allowances: i.other_allowances, bonus: i.bonus, allowances: i.allowances, deductions: i.deductions,
          gross: i.basic + i.allowances, net: i.net,
          status: r.status === 'مصروف' ? 'مدفوع' : 'معتمد', paid_at: r.paid_at,
        }
      })
      .filter(Boolean)
    return {
      employee: { id: emp.id, full_name: emp.full_name, employee_number: emp.employee_number, job_title: emp.job_title, bank_name: emp.bank_name, bank_account: emp.bank_account },
      payslips,
    }
  },
}

export const mockPoliciesApi = {
  async list() {
    await delay()
    const myId = currentUser()?.employee_id
    return [...policies]
      .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
      .map((p) => ({
        ...p,
        created_by_name: empName(p.created_by),
        ack_count: policyAcknowledgments.filter((a) => a.policy_id === p.id).length,
        acked_by_me: policyAcknowledgments.some((a) => a.policy_id === p.id && a.employee_id === myId),
      }))
  },
  async create(data) {
    await delay()
    const p = { id: polSeq++, category: data.category || 'عام', created_by: currentUser()?.employee_id || null, ...data }
    policies.push(p)
    return { message: 'تم إنشاء السياسة', policy: p }
  },
  async update(id, data) {
    await delay()
    const p = policies.find((x) => x.id === Number(id))
    if (p) Object.assign(p, data)
    return { message: 'تم التحديث' }
  },
  async acknowledge(id) {
    await delay()
    const employee_id = currentUser()?.employee_id
    if (!employee_id) throw badReq('No employee associated with this account')
    const p = policies.find((x) => x.id === Number(id))
    if (!p) throw notFound()
    if (!policyAcknowledgments.some((a) => a.policy_id === Number(id) && a.employee_id === employee_id)) {
      policyAcknowledgments.push({ id: polAckSeq++, policy_id: Number(id), employee_id, acknowledged_at: nowIso() })
    }
    return { message: 'Acknowledged' }
  },
  async acknowledgments(id) {
    await delay()
    const p = policies.find((x) => x.id === Number(id))
    if (!p) throw notFound()
    const ackers = policyAcknowledgments
      .filter((a) => a.policy_id === Number(id))
      .sort((x, y) => new Date(x.acknowledged_at) - new Date(y.acknowledged_at))
      .map((a) => ({ acknowledged_at: a.acknowledged_at, employee_id: a.employee_id, full_name: empName(a.employee_id), job_title: employees.find((e) => e.id === a.employee_id)?.job_title, profile_picture: null }))
    const ackedIds = new Set(ackers.map((a) => a.employee_id))
    const notAcked = employees
      .filter((e) => e.status === 'نشط' && !ackedIds.has(e.id))
      .map((e) => ({ employee_id: e.id, full_name: e.full_name, job_title: e.job_title, profile_picture: null }))
    return { policy: p, ackers, notAcked, total: ackers.length + notAcked.length }
  },
  async remove(id) {
    await delay()
    const i = policies.findIndex((x) => x.id === Number(id))
    if (i > -1) policies.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

// GOSI (Saudi social insurance) contribution rates — mirrors backend
// payCalc.js. Saudis subscribe on both sides (Annuities + SANED); non-Saudis
// only carry the employer-paid Occupational Hazards branch.
const GOSI_SAUDI_EMPLOYEE_RATE = 0.0975
const GOSI_SAUDI_EMPLOYER_RATE = 0.1175
const GOSI_NON_SAUDI_EMPLOYER_RATE = 0.02
const isSaudiNationality = (n) => n === 'سعودي' || n === 'سعودية'
function payItemFor(e) {
  const pkg = compensation.find((c) => c.employee_id === e.id && c.status === 'نشط')
  const basic = pkg ? pkg.base_salary : (e.salary || 0)
  const housing_allowance = pkg ? pkg.housing_allowance : 0
  const transport_allowance = pkg ? pkg.transport_allowance : 0
  const other_allowances = pkg ? pkg.other_allowances : (e.allowances || 0)
  const bonus = pkg ? pkg.bonus : 0
  const allowances = housing_allowance + transport_allowance + other_allowances + bonus
  const gosiWage = basic + housing_allowance
  const saudi = isSaudiNationality(e.nationality)
  const deductions = saudi ? Math.round(gosiWage * GOSI_SAUDI_EMPLOYEE_RATE) : 0
  const employer_gosi = Math.round(gosiWage * (saudi ? GOSI_SAUDI_EMPLOYER_RATE : GOSI_NON_SAUDI_EMPLOYER_RATE))
  return { basic, housing_allowance, transport_allowance, other_allowances, bonus, allowances, deductions, employer_gosi, net: basic + allowances - deductions }
}

export const mockPayrollApi = {
  async overview({ department_id } = {}) {
    await delay()
    let rows = employees.filter((e) => e.status === 'نشط')
    if (department_id) rows = rows.filter((e) => e.department_id === Number(department_id))
    const payroll = rows
      .map((e) => {
        const { basic, allowances, deductions, net } = payItemFor(e)
        return { id: e.id, full_name: e.full_name, job_title: e.job_title, employee_number: e.employee_number, department_name: deptName(e.department_id), basic, allowances, deductions, net }
      })
      .sort((a, b) => b.basic - a.basic)
    const totals = payroll.reduce((t, p) => ({ basic: t.basic + p.basic, allowances: t.allowances + p.allowances, deductions: t.deductions + p.deductions, net: t.net + p.net }), { basic: 0, allowances: 0, deductions: 0, net: 0 })
    return { payroll, totals, count: payroll.length }
  },
}

const PR_STATUSES = ['مسودة', 'قيد المراجعة', 'معتمد', 'مصروف']
const PR_NEXT_STATUS = { مسودة: 'قيد المراجعة', 'قيد المراجعة': 'معتمد', معتمد: 'مصروف' }
let payrollRunSeq = 1
function prBuildItems() {
  return employees.filter((e) => e.status === 'نشط').map((e) => ({ employee_id: e.id, ...payItemFor(e) }))
}
function prMakeRun(month, year, status, createdAgoDays, approvedAgoDays, paidAgoDays) {
  const items = prBuildItems()
  const total_net = items.reduce((s, i) => s + i.net, 0)
  return {
    id: payrollRunSeq++, month, year, status, total_net, employee_count: items.length,
    created_by: 5, approved_by: approvedAgoDays != null ? 5 : null,
    approved_at: approvedAgoDays != null ? addDays(-approvedAgoDays) : null,
    paid_at: paidAgoDays != null ? addDays(-paidAgoDays) : null,
    created_at: addDays(-createdAgoDays), items,
  }
}
const now = new Date()
const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const payrollRuns = [
  prMakeRun(lastMonthDate.getMonth() + 1, lastMonthDate.getFullYear(), 'مصروف', 28, 25, 20),
  prMakeRun(now.getMonth() + 1, now.getFullYear(), 'قيد المراجعة', 1, null, null),
]
let wpsSubSeq = 1
const wpsSubmissions = []

Object.assign(mockPayrollApi, {
  async runs() {
    await delay()
    const rows = [...payrollRuns].sort((a, b) => (b.year - a.year) || (b.month - a.month))
      .map((r) => ({ ...r, items: undefined, created_by_name: empName(r.created_by), approved_by_name: empName(r.approved_by) }))
    const summary = {
      total: rows.length,
      drafts: rows.filter((r) => r.status === 'مسودة').length,
      pendingApproval: rows.filter((r) => r.status === 'قيد المراجعة').length,
      paid: rows.filter((r) => r.status === 'مصروف').length,
    }
    return { runs: rows, summary }
  },
  async getRun(id) {
    await delay()
    const r = payrollRuns.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    const items = r.items.map((i) => {
      const e = employees.find((x) => x.id === i.employee_id)
      return { ...i, full_name: e?.full_name, job_title: e?.job_title, profile_picture: null, employee_number: e?.employee_number }
    }).sort((a, b) => b.net - a.net)
    return { ...r, items, created_by_name: empName(r.created_by), approved_by_name: empName(r.approved_by) }
  },
  async createRun(data) {
    await delay()
    const month = parseInt(data.month, 10)
    const year = parseInt(data.year, 10)
    if (!(month >= 1 && month <= 12) || !year) throw badReq('يجب إدخال شهر وسنة صحيحين')
    if (payrollRuns.find((r) => r.month === month && r.year === year)) throw badReq('يوجد مسير رواتب لهذا الشهر بالفعل')
    const items = prBuildItems()
    if (items.length === 0) throw badReq('لا يوجد موظفون نشطون لإنشاء المسير')
    const total_net = items.reduce((s, i) => s + i.net, 0)
    const run = { id: payrollRunSeq++, month, year, status: 'مسودة', total_net, employee_count: items.length, created_by: currentUser()?.employee_id || 5, approved_by: null, approved_at: null, paid_at: null, created_at: nowIso(), items }
    payrollRuns.unshift(run)
    return { message: 'تم', run: { id: run.id } }
  },
  async advanceRun(id, status) {
    await delay()
    const r = payrollRuns.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    if (!PR_STATUSES.includes(status)) throw badReq('حالة غير صالحة')
    if (status !== PR_NEXT_STATUS[r.status]) throw badReq(`لا يمكن الانتقال من "${r.status}" إلى "${status}" مباشرة`)
    r.status = status
    if (status === 'معتمد') { r.approved_by = currentUser()?.employee_id || 5; r.approved_at = nowIso() }
    if (status === 'مصروف') r.paid_at = nowIso()
    return { message: 'تم التحديث' }
  },
  async removeRun(id) {
    await delay()
    const r = payrollRuns.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    if (r.status !== 'مسودة') throw badReq('لا يمكن حذف مسير بعد بدء المراجعة')
    const i = payrollRuns.findIndex((x) => x.id === Number(id))
    if (i > -1) payrollRuns.splice(i, 1)
    return { message: 'تم الحذف' }
  },
  async wps(id) {
    await delay()
    const r = payrollRuns.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    const SAUDI_IBAN_RE = /^SA\d{22}$/
    const SAUDI_NATIONAL_ID_RE = /^[12]\d{9}$/
    const org = { wps_establishment_id: orgSettings.wps_establishment_id, wps_bank_code: orgSettings.wps_bank_code, wps_employer_iban: orgSettings.wps_employer_iban }
    const orgIssues = []
    if (!org.wps_establishment_id) orgIssues.push('رقم المنشأة (المكتب) غير مُعد')
    if (!org.wps_bank_code) orgIssues.push('رمز البنك غير مُعد')
    if (!org.wps_employer_iban || !SAUDI_IBAN_RE.test((org.wps_employer_iban || '').replace(/\s/g, '').toUpperCase())) {
      orgIssues.push('آيبان المنشأة غير مُعد أو غير صالح')
    }
    if (!['معتمد', 'مصروف'].includes(r.status)) orgIssues.push('يجب اعتماد المسير قبل توليد الملف')

    const items = r.items.map((i) => {
      const e = employees.find((x) => x.id === i.employee_id)
      const iban = (e?.bank_account || '').replace(/\s/g, '').toUpperCase()
      const issues = []
      if (!e?.national_id || !SAUDI_NATIONAL_ID_RE.test(e.national_id)) issues.push('رقم الهوية/الإقامة مفقود أو غير صالح')
      if (!SAUDI_IBAN_RE.test(iban)) issues.push('رقم الآيبان مفقود أو غير صالح')
      return {
        employee_id: i.employee_id, full_name: e?.full_name, national_id: e?.national_id, iban,
        basic: i.basic, housing_allowance: i.housing_allowance, other_earnings: Math.max(0, i.allowances - i.housing_allowance),
        deductions: i.deductions, net: i.net, ok: issues.length === 0, issues,
      }
    }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'))

    const ready = orgIssues.length === 0 && items.every((i) => i.ok)
    return { run: { id: r.id, month: r.month, year: r.year, status: r.status }, org, org_issues: orgIssues, items, ready }
  },
  async recordWps(id) {
    await delay()
    const r = payrollRuns.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    if (!['معتمد', 'مصروف'].includes(r.status)) throw badReq('يجب اعتماد المسير قبل توليد الملف')
    const u = currentUser()
    const item_count = r.items.length
    const total_amount = r.items.reduce((s, i) => s + i.net, 0)
    const sub = {
      id: wpsSubSeq++, run_id: r.id, generated_by: u?.employee_id || null, generated_by_name: empName(u?.employee_id),
      item_count, total_amount, status: 'تم التوليد', mudad_reference: null, submitted_at: null, confirmed_at: null, created_at: nowIso(),
    }
    wpsSubmissions.unshift(sub)
    return { message: 'Recorded', submission: { id: sub.id } }
  },
  async wpsSubmissions(id) {
    await delay()
    const r = payrollRuns.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    return { submissions: wpsSubmissions.filter((s) => s.run_id === r.id) }
  },
  async advanceWpsSubmission(subId, status, mudad_reference) {
    await delay()
    const sub = wpsSubmissions.find((s) => s.id === Number(subId))
    if (!sub) throw notFound()
    const WPS_SUB_NEXT = { 'تم التوليد': 'أُرسل لمدد', 'أُرسل لمدد': 'مؤكد' }
    if (status !== WPS_SUB_NEXT[sub.status]) throw badReq(`لا يمكن الانتقال من "${sub.status}" إلى "${status}" مباشرة`)
    if (status === 'أُرسل لمدد') {
      if (!mudad_reference || !mudad_reference.trim()) throw badReq('الرقم المرجعي من مدد مطلوب')
      sub.status = status; sub.mudad_reference = mudad_reference.trim(); sub.submitted_at = nowIso()
    } else {
      sub.status = status; sub.confirmed_at = nowIso()
    }
    return { message: 'Updated' }
  },
  async gosi(id) {
    await delay()
    const r = payrollRuns.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    const SAUDI_NATIONAL_ID_RE = /^[12]\d{9}$/
    const items = r.items.map((i) => {
      const e = employees.find((x) => x.id === i.employee_id)
      const issues = []
      if (!e?.national_id || !SAUDI_NATIONAL_ID_RE.test(e.national_id)) issues.push('رقم الهوية/الإقامة مفقود أو غير صالح')
      if (!e?.nationality) issues.push('الجنسية غير مُحدَّدة')
      return {
        employee_id: i.employee_id, full_name: e?.full_name, national_id: e?.national_id, nationality: e?.nationality,
        gosi_wage: i.basic + i.housing_allowance, employee_gosi: i.deductions, employer_gosi: i.employer_gosi,
        total_gosi: i.deductions + i.employer_gosi, ok: issues.length === 0, issues,
      }
    }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'))
    const totals = items.reduce((t, i) => ({
      gosi_wage: t.gosi_wage + i.gosi_wage, employee_gosi: t.employee_gosi + i.employee_gosi,
      employer_gosi: t.employer_gosi + i.employer_gosi, total_gosi: t.total_gosi + i.total_gosi,
    }), { gosi_wage: 0, employee_gosi: 0, employer_gosi: 0, total_gosi: 0 })
    return { run: { id: r.id, month: r.month, year: r.year, status: r.status }, items, totals, ready: items.every((i) => i.ok) }
  },
})

export const mockTasksApi = {
  async list({ status = '' } = {}) {
    await delay()
    const u = currentUser()
    let rows = tasks
    if (u && ['employee', 'candidate'].includes(u.role)) {
      rows = rows.filter((t) => t.employee_id === u.employee_id)
    } else if (u && u.role === 'department_head') {
      const mgrDept = employees.find((e) => e.id === u.employee_id)?.department_id
      rows = rows.filter((t) => employees.find((e) => e.id === t.employee_id)?.department_id === mgrDept)
    }
    if (status) rows = rows.filter((t) => t.status === status)
    const so = { 'قيد التنفيذ': 1, جديدة: 2, مكتملة: 3, ملغاة: 4 }
    const po = { عالية: 1, متوسطة: 2, منخفضة: 3 }
    return [...rows]
      .sort((a, b) => (so[a.status] - so[b.status]) || (po[a.priority] - po[b.priority]) || b.id - a.id)
      .map((t) => {
        const e = employees.find((x) => x.id === t.employee_id)
        return { ...t, full_name: e?.full_name, job_title: e?.job_title, department_id: e?.department_id, profile_picture: null, assigned_by_name: empName(t.assigned_by) }
      })
  },
  async create(data) {
    await delay()
    const u = currentUser()
    const isManager = ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u?.role)
    if (!isManager) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (!sameDeptAsMe(u, data.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const t = { id: taskSeq++, status: 'جديدة', priority: data.priority || 'متوسطة', assigned_by: u?.employee_id || null, created_at: nowIso(), ...data }
    tasks.unshift(t)
    return { message: 'تم إنشاء المهمة', task: t }
  },
  async setStatus(id, status) {
    await delay()
    const t = tasks.find((x) => x.id === Number(id))
    if (!t) return { message: 'تم التحديث' }
    const u = currentUser()
    const isOwner = t.employee_id === u?.employee_id
    const isManager = ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u?.role)
    if (!isOwner && !isManager) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (!isOwner && !sameDeptAsMe(u, t.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    t.status = status
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const t = tasks.find((x) => x.id === Number(id))
    if (!t) throw notFound()
    const u = currentUser()
    const isManager = ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u?.role)
    if (!isManager) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (!sameDeptAsMe(u, t.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const i = tasks.findIndex((x) => x.id === Number(id))
    if (i > -1) tasks.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

const RECRUIT_MANAGE = ['super_admin', 'admin', 'hr_manager']

export const mockJobsApi = {
  async list() {
    await delay()
    const u = currentUser()
    const isManager = u && RECRUIT_MANAGE.includes(u.role)
    return jobs
      .filter((j) => isManager || j.status === 'مفتوحة')
      .map((j) => ({ ...j, created_by_name: empName(j.created_by), applicants: applications.filter((a) => a.job_id === j.id).length }))
  },
  async create(data) {
    await delay()
    const j = { id: jobSeq++, status: data.status || 'مفتوحة', location: data.location || 'الرياض - المقر الرئيسي', type: data.type || 'دوام كامل', created_by: currentUser()?.employee_id || null, created_at: nowIso(), ...data }
    jobs.unshift(j)
    return { message: 'تم النشر', job: j }
  },
  async update(id, data) {
    await delay()
    const j = jobs.find((x) => x.id === Number(id))
    if (j) Object.assign(j, data)
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const i = jobs.findIndex((x) => x.id === Number(id))
    if (i === -1) throw notFound()
    if (applications.some((a) => a.job_id === Number(id))) throw badReq('لا يمكن حذف وظيفة يوجد لها متقدمون — أغلق الوظيفة بدلاً من ذلك')
    jobs.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

export const mockApplicationsApi = {
  async all({ job_id, status } = {}) {
    await delay()
    let rows = applications
    if (job_id) rows = rows.filter((a) => a.job_id === Number(job_id))
    if (status) rows = rows.filter((a) => a.status === status)
    return rows.map((a) => {
      const j = jobs.find((x) => x.id === a.job_id)
      return { ...a, job_title: j?.title, job_department: j?.department }
    })
  },
  async mine() {
    await delay()
    const email = currentUser()?.email
    return applications
      .filter((a) => a.candidate_email === email)
      .map((a) => {
        const j = jobs.find((x) => x.id === a.job_id)
        return { ...a, job_title: j?.title, job_department: j?.department, job_location: j?.location }
      })
  },
  async apply({ job_id, candidate_name, cover_note }) {
    await delay()
    const email = currentUser()?.email
    const job = jobs.find((j) => j.id === Number(job_id) && j.status === 'مفتوحة')
    if (!job) throw badReq('الوظيفة غير متاحة للتقديم')
    if (applications.find((a) => a.job_id === Number(job_id) && a.candidate_email === email)) {
      throw badReq('لقد تقدّمت لهذه الوظيفة مسبقاً')
    }
    const app = { id: appSeq++, job_id: Number(job_id), candidate_email: email, candidate_name: candidate_name || currentUser()?.full_name, cover_note: cover_note || null, status: 'قيد المراجعة', created_at: nowIso() }
    applications.unshift(app)
    return { message: 'تم التقديم', application: app }
  },
  async setStatus(id, status) {
    await delay()
    const a = applications.find((x) => x.id === Number(id))
    if (a) a.status = status
    return { message: 'تم التحديث' }
  },
  async pipeline({ job_id } = {}) {
    await delay()
    const stages = ['متقدم جديد', 'مراجعة أولية', 'اختبار', 'مقابلة', 'عرض وظيفي', 'تم التوظيف', 'مرفوض']
    let rows = [...applications]
    if (job_id) rows = rows.filter((a) => a.job_id === Number(job_id))
    rows = rows.map((a) => { const j = jobs.find((x) => x.id === a.job_id); return { ...a, stage: a.stage || 'متقدم جديد', job_title: j?.title, job_department: j?.department } })
      .sort((x, y) => (y.rating || 0) - (x.rating || 0))
    const columns = stages.map((stage) => ({ stage, cards: rows.filter((r) => r.stage === stage) }))
    const summary = {
      total: rows.length,
      hired: rows.filter((r) => r.stage === 'تم التوظيف').length,
      rejected: rows.filter((r) => r.stage === 'مرفوض').length,
      active: rows.filter((r) => !['تم التوظيف', 'مرفوض'].includes(r.stage)).length,
    }
    return { columns, stages, summary }
  },
  async moveStage(id, stage) {
    await delay()
    const s2st = { 'متقدم جديد': 'قيد المراجعة', 'مراجعة أولية': 'قيد المراجعة', اختبار: 'قيد المراجعة', مقابلة: 'مقابلة', 'عرض وظيفي': 'مقابلة', 'تم التوظيف': 'مقبول', مرفوض: 'مرفوض' }
    const a = applications.find((x) => x.id === Number(id))
    if (!a) throw notFound()
    a.stage = stage
    a.status = s2st[stage] || 'قيد المراجعة'
    return { message: 'تم' }
  },
  async rate(id, rating) {
    await delay()
    const a = applications.find((x) => x.id === Number(id))
    if (!a) throw notFound()
    a.rating = Number(rating)
    return { message: 'تم' }
  },
  async getOffer(id) {
    await delay()
    const a = applications.find((x) => x.id === Number(id))
    if (!a) throw notFound()
    const mine = jobOffers.filter((o) => o.email === a.candidate_email).sort((x, y) => y.id - x.id)
    return { offer: mine[0] ? { ...mine[0] } : null }
  },
  async createOffer(id, data) {
    await delay()
    const a = applications.find((x) => x.id === Number(id))
    if (!a) throw notFound()
    if (!data?.job_title) throw badReq('المسمى الوظيفي مطلوب')
    const offer = {
      id: offerSeq++,
      email: a.candidate_email,
      job_title: data.job_title,
      department: data.department || null,
      salary: data.salary != null && data.salary !== '' ? Number(data.salary) : null,
      start_date: data.start_date || null,
      details: data.details || null,
      status: 'معلّق',
      responded_at: null,
    }
    jobOffers.push(offer)
    a.stage = 'عرض وظيفي'
    a.status = 'مقابلة'
    pushNotification({ email: a.candidate_email }, {
      title: 'لديك عرض وظيفي جديد',
      message: `${data.job_title}${data.department ? ' — ' + data.department : ''}`,
      type: 'success',
      link: '/cand/offer',
    })
    return { message: 'تم الإنشاء', offer }
  },
  async withdrawOffer(offerId) {
    await delay()
    const offer = jobOffers.find((o) => o.id === Number(offerId))
    if (!offer) throw notFound()
    if (offer.status !== 'معلّق') throw badReq('لا يمكن سحب عرض تم الرد عليه')
    const i = jobOffers.indexOf(offer)
    jobOffers.splice(i, 1)
    return { message: 'تم السحب' }
  },
}

function companiesSummary() {
  const byPlan = {}
  for (const c of companies) byPlan[c.plan] = (byPlan[c.plan] || 0) + 1
  return {
    total: companies.length,
    active: companies.filter((c) => c.status === 'نشطة').length,
    suspended: companies.filter((c) => c.status === 'معلّقة').length,
    byPlan,
  }
}

export const mockCompaniesApi = {
  async list() {
    await delay()
    return { companies: [...companies].reverse(), summary: companiesSummary() }
  },
  async create(data) {
    await delay()
    const c = { id: companySeq++, plan: data.plan || 'أساسية', users_limit: data.users_limit || 25, storage_limit_gb: data.storage_limit_gb || 10, status: data.status || 'نشطة', created_at: nowIso(), ...data }
    companies.push(c)
    return { message: 'تم الإنشاء', company: c }
  },
  async update(id, data) {
    await delay()
    const c = companies.find((x) => x.id === Number(id))
    if (c) Object.assign(c, data)
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const i = companies.findIndex((x) => x.id === Number(id))
    if (i > -1) companies.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

let invoiceSeq = 1
const invoices = [
  { id: invoiceSeq++, company_id: 1, invoice_number: 'INV-2026-0001', plan: 'مؤسسية', period: 'يناير 2026', amount: 24000, issue_date: addDays(-60), due_date: addDays(-45), status: 'مدفوعة', paid_at: addDays(-50) },
  { id: invoiceSeq++, company_id: 1, invoice_number: 'INV-2026-0002', plan: 'مؤسسية', period: 'فبراير 2026', amount: 24000, issue_date: addDays(-30), due_date: addDays(-15), status: 'مدفوعة', paid_at: addDays(-20) },
  { id: invoiceSeq++, company_id: 2, invoice_number: 'INV-2026-0003', plan: 'احترافية', period: 'فبراير 2026', amount: 9000, issue_date: addDays(-30), due_date: addDays(-15), status: 'مدفوعة', paid_at: addDays(-18) },
  { id: invoiceSeq++, company_id: 2, invoice_number: 'INV-2026-0004', plan: 'احترافية', period: 'مارس 2026', amount: 9000, issue_date: addDays(-5), due_date: addDays(10), status: 'غير مدفوعة', paid_at: null },
  { id: invoiceSeq++, company_id: 3, invoice_number: 'INV-2026-0005', plan: 'أساسية', period: 'مارس 2026', amount: 3000, issue_date: addDays(-5), due_date: addDays(10), status: 'غير مدفوعة', paid_at: null },
  { id: invoiceSeq++, company_id: 4, invoice_number: 'INV-2026-0006', plan: 'احترافية', period: 'فبراير 2026', amount: 9000, issue_date: addDays(-40), due_date: addDays(-25), status: 'متأخرة', paid_at: null },
]
const invStatusOrder = { متأخرة: 1, 'غير مدفوعة': 2, مدفوعة: 3, ملغاة: 4 }
const companyName = (id) => companies.find((c) => c.id === Number(id))?.name || null

export const mockBillingApi = {
  async list({ status, company_id } = {}) {
    await delay()
    // Auto-promote any unpaid invoice past its due date to "متأخرة" — mirrors the backend.
    const today = nowIso().slice(0, 10)
    for (const inv of invoices) {
      if (inv.status === 'غير مدفوعة' && inv.due_date && inv.due_date < today) inv.status = 'متأخرة'
    }
    let rows = [...invoices]
    if (status) rows = rows.filter((i) => i.status === status)
    if (company_id) rows = rows.filter((i) => i.company_id === Number(company_id))
    rows.sort((a, b) => (invStatusOrder[a.status] - invStatusOrder[b.status]) || (b.issue_date || '').localeCompare(a.issue_date || ''))
    const list = rows.map((i) => ({ ...i, company_name: companyName(i.company_id), company_plan: companies.find((c) => c.id === i.company_id)?.plan || null }))
    const summary = list.reduce((s, r) => {
      s.count += 1
      if (r.status === 'مدفوعة') s.paid += r.amount
      if (r.status === 'غير مدفوعة' || r.status === 'متأخرة') s.outstanding += r.amount
      if (r.status === 'متأخرة') s.overdue += 1
      return s
    }, { count: 0, paid: 0, outstanding: 0, overdue: 0 })
    return { invoices: list, summary }
  },
  async create(data) {
    await delay()
    if (!data.company_id) throw badReq('الشركة مطلوبة')
    if (!data.amount || data.amount <= 0) throw badReq('المبلغ غير صالح')
    const seq = invoices.length + 1
    const number = data.invoice_number || `INV-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`
    const inv = {
      id: invoiceSeq++, company_id: Number(data.company_id), invoice_number: number,
      plan: data.plan || companies.find((c) => c.id === Number(data.company_id))?.plan || 'أساسية',
      period: data.period || null, amount: Number(data.amount),
      issue_date: data.issue_date || nowIso().slice(0, 10), due_date: data.due_date || null,
      status: 'غير مدفوعة', paid_at: null,
    }
    invoices.push(inv)
    return { message: 'تم', invoice: { id: inv.id, invoice_number: number } }
  },
  async setStatus(id, status) {
    await delay()
    const inv = invoices.find((x) => x.id === Number(id))
    if (!inv) throw notFound()
    inv.status = status
    inv.paid_at = status === 'مدفوعة' ? nowIso() : null
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const i = invoices.findIndex((x) => x.id === Number(id))
    if (i > -1) invoices.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

let subReqSeq = 1
const subscriptionRequests = [
  { id: subReqSeq++, company_id: 2, type: 'ترقية', requested_plan: 'مؤسسية', reason: 'نمو عدد الموظفين وحاجة لتكاملات API', status: 'معلق', created_at: nowIso() },
  { id: subReqSeq++, company_id: 3, type: 'ترقية', requested_plan: 'احترافية', reason: 'الحاجة لوحدة الرواتب والتقارير', status: 'معلق', created_at: nowIso() },
  { id: subReqSeq++, company_id: 4, type: 'إلغاء', requested_plan: null, reason: 'إعادة هيكلة داخلية', status: 'معلق', created_at: nowIso() },
  { id: subReqSeq++, company_id: 1, type: 'ترقية', requested_plan: 'مؤسسية', reason: 'تجديد الباقة', status: 'موافق عليه', created_at: nowIso() },
]
const PLATFORM_MODULES = [
  { key: 'recruitment', label: 'التوظيف والتعيين' },
  { key: 'attendance', label: 'الحضور والانصراف' },
  { key: 'payroll', label: 'الرواتب والتعويضات' },
  { key: 'performance', label: 'الأداء والتطوير' },
  { key: 'training', label: 'التدريب' },
  { key: 'documents', label: 'المستندات' },
  { key: 'automation', label: 'الأتمتة وسير العمل' },
  { key: 'integrations', label: 'التكاملات' },
]
const companyModuleState = {} // { [companyId]: { [key]: 0|1 } }
const reqStatusOrder = { معلق: 1, 'موافق عليه': 2, مرفوض: 3 }
const compName = (id) => companies.find((c) => c.id === Number(id))?.name || null

export const mockPlatformApi = {
  async requests() {
    await delay()
    const list = [...subscriptionRequests]
      .sort((a, b) => reqStatusOrder[a.status] - reqStatusOrder[b.status] || b.id - a.id)
      .map((r) => ({ ...r, company_name: compName(r.company_id), current_plan: companies.find((c) => c.id === r.company_id)?.plan || null }))
    const summary = list.reduce((s, r) => { s.total += 1; if (r.status === 'معلق') s.pending += 1; if (r.type === 'إلغاء') s.cancellations += 1; return s }, { total: 0, pending: 0, cancellations: 0 })
    return { requests: list, summary }
  },
  async setRequestStatus(id, status) {
    await delay()
    const r = subscriptionRequests.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    r.status = status
    if (status === 'موافق عليه') {
      const c = companies.find((x) => x.id === r.company_id)
      if (c) { if (r.type === 'إلغاء') c.status = 'معلّقة'; else if (r.requested_plan) c.plan = r.requested_plan }
    }
    return { message: 'تم' }
  },
  async removeRequest(id) { await delay(); const i = subscriptionRequests.findIndex((x) => x.id === Number(id)); if (i > -1) subscriptionRequests.splice(i, 1); return { message: 'تم الحذف' } },
  async modules(companyId) {
    await delay()
    const state = companyModuleState[companyId] || {}
    return { modules: PLATFORM_MODULES.map((m) => ({ ...m, enabled: state[m.key] !== undefined ? state[m.key] : 1 })) }
  },
  async setModule(company_id, module_key, enabled) {
    await delay()
    companyModuleState[company_id] = companyModuleState[company_id] || {}
    companyModuleState[company_id][module_key] = enabled ? 1 : 0
    return { message: 'تم' }
  },
  async setLimits(companyId, data) {
    await delay()
    const c = companies.find((x) => x.id === Number(companyId))
    if (!c) throw notFound()
    if (data.users_limit != null) c.users_limit = parseInt(data.users_limit, 10)
    if (data.storage_limit_gb != null) c.storage_limit_gb = parseInt(data.storage_limit_gb, 10)
    return { message: 'تم' }
  },
  async usage() {
    await delay()
    const rows = companies.map((c) => {
      const used = Math.min(c.users_limit, Math.round(c.users_limit * (0.4 + ((c.id * 17) % 50) / 100)))
      const storage = Math.min(c.storage_limit_gb, Math.round(c.storage_limit_gb * (0.3 + ((c.id * 23) % 60) / 100)))
      return { id: c.id, name: c.name, plan: c.plan, status: c.status, users_limit: c.users_limit, users_used: used, storage_limit_gb: c.storage_limit_gb, storage_used_gb: storage }
    })
    const summary = rows.reduce((s, r) => { s.companies += 1; if (r.status === 'نشطة') s.active += 1; s.seats += r.users_limit; s.seatsUsed += r.users_used; s.storage += r.storage_limit_gb; s.storageUsed += r.storage_used_gb; return s }, { companies: 0, active: 0, seats: 0, seatsUsed: 0, storage: 0, storageUsed: 0 })
    return { usage: rows, summary }
  },
  async performance() {
    await delay()
    const now = Date.now()
    const series = Array.from({ length: 12 }, (_, i) => { const t = new Date(now - (11 - i) * 3600000); return { time: `${String(t.getHours()).padStart(2, '0')}:00`, response_ms: 90 + ((i * 37) % 120), requests: 400 + ((i * 53) % 600) } })
    return { health: { uptime: 99.98, avg_response_ms: 142, error_rate: 0.12, requests_today: 48213, cpu: 34, memory: 61, db_connections: 42, status: 'صحّي' }, series }
  },
  async apiMonitor() {
    await delay()
    const rows = integrations.map((it) => {
      const calls = it.is_connected ? 500 + ((it.id * 137) % 4000) : 0
      const errors = it.is_connected ? ((it.id * 7) % 40) : 0
      return { id: it.id, name: it.name, category: it.category, is_connected: it.is_connected, status: it.status, calls_24h: calls, errors_24h: errors, error_rate: calls ? Math.round((errors / calls) * 1000) / 10 : 0, avg_latency_ms: it.is_connected ? 80 + ((it.id * 29) % 220) : 0 }
    })
    const summary = rows.reduce((s, r) => { s.total += 1; if (r.is_connected) s.connected += 1; s.calls += r.calls_24h; s.errors += r.errors_24h; return s }, { total: 0, connected: 0, calls: 0, errors: 0 })
    return { endpoints: rows, summary }
  },
  async backups() {
    await delay()
    const rows = [...backups].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    const last = rows.find((r) => r.status === 'مكتمل')
    return { backups: rows, summary: { total: rows.length, last_at: last ? last.created_at : null } }
  },
  async createBackup(note) {
    await delay()
    const b = { id: backupSeq++, type: 'يدوي', size_mb: Math.round((120 + Math.random() * 80) * 10) / 10, status: 'مكتمل', note: note || 'نسخة احتياطية يدوية', created_at: nowIso() }
    backups.unshift(b)
    auditLogs.unshift({ id: auditSeq++, actor: currentUser()?.email || 'superadmin@quant.com', action: 'إنشاء نسخة احتياطية', entity: 'backup', severity: 'معلومة', details: `نسخة #${b.id}`, created_at: nowIso() })
    return { message: 'تم', backup: { id: b.id } }
  },
  async restoreBackup(id) {
    await delay()
    const b = backups.find((x) => x.id === Number(id))
    if (!b) throw notFound()
    if (b.status !== 'مكتمل') throw badReq('لا يمكن استعادة هذه النسخة')
    auditLogs.unshift({ id: auditSeq++, actor: currentUser()?.email || 'superadmin@quant.com', action: 'استعادة نسخة احتياطية', entity: 'backup', severity: 'تحذير', details: `استعادة نسخة #${b.id}`, created_at: nowIso() })
    return { message: 'تم' }
  },
  async removeBackup(id) { await delay(); const i = backups.findIndex((x) => x.id === Number(id)); if (i > -1) backups.splice(i, 1); return { message: 'تم الحذف' } },
  async audit({ severity } = {}) {
    await delay()
    let rows = [...auditLogs]
    if (severity) rows = rows.filter((l) => l.severity === severity)
    rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    const summary = rows.reduce((s, r) => { s.total += 1; if (r.severity === 'تحذير') s.warnings += 1; if (r.severity === 'حرج') s.critical += 1; return s }, { total: 0, warnings: 0, critical: 0 })
    return { logs: rows, summary }
  },
}

let backupSeq = 1
const backups = [
  { id: backupSeq++, type: 'تلقائي', size_mb: 182.4, status: 'مكتمل', note: 'نسخة يومية تلقائية', created_at: addDays(0) },
  { id: backupSeq++, type: 'تلقائي', size_mb: 179.1, status: 'مكتمل', note: 'نسخة يومية تلقائية', created_at: addDays(-1) },
  { id: backupSeq++, type: 'يدوي', size_mb: 176.8, status: 'مكتمل', note: 'قبل تحديث النظام', created_at: addDays(-2) },
  { id: backupSeq++, type: 'تلقائي', size_mb: 175.0, status: 'مكتمل', note: 'نسخة يومية تلقائية', created_at: addDays(-3) },
]
let ticketSeq = 1
const supportTickets = [
  { id: ticketSeq++, company_id: 2, subject: 'مشكلة في تسجيل الدخول لبعض المستخدمين', category: 'تقني', priority: 'عالية', status: 'مفتوحة', description: 'يواجه 3 مستخدمين خطأ عند تسجيل الدخول', response: null, created_at: nowIso() },
  { id: ticketSeq++, company_id: 3, subject: 'استفسار عن ترقية الباقة', category: 'اشتراكات', priority: 'متوسطة', status: 'قيد المعالجة', description: 'ما الفرق بين الباقة الاحترافية والمؤسسية؟', response: null, created_at: nowIso() },
  { id: ticketSeq++, company_id: 1, subject: 'طلب تفعيل وحدة التكاملات', category: 'ميزات', priority: 'منخفضة', status: 'مفتوحة', description: 'نرغب بتفعيل تكامل Slack', response: null, created_at: nowIso() },
  { id: ticketSeq++, company_id: 4, subject: 'بطء في تحميل التقارير', category: 'أداء', priority: 'حرجة', status: 'مغلقة', description: 'تم حل المشكلة بعد التحديث', response: null, created_at: nowIso() },
]
const ticketStatusOrder = { مفتوحة: 1, 'قيد المعالجة': 2, مغلقة: 3 }
const ticketPrioOrder = { حرجة: 1, عالية: 2, متوسطة: 3, منخفضة: 4 }
const platformSettings = {
  id: 1, platform_name: 'كوانت للموارد البشرية', support_email: 'support@quant-hr.com', default_plan: 'أساسية',
  session_timeout_min: 60, max_upload_mb: 10, maintenance_mode: 0, signups_enabled: 1,
}
const saBool = ['maintenance_mode', 'signups_enabled']
const saInt = ['session_timeout_min', 'max_upload_mb']
export const mockSaConfigApi = {
  async support({ status } = {}) {
    await delay()
    let rows = [...supportTickets]
    if (status) rows = rows.filter((t) => t.status === status)
    const list = rows.sort((a, b) => ticketStatusOrder[a.status] - ticketStatusOrder[b.status] || ticketPrioOrder[a.priority] - ticketPrioOrder[b.priority] || b.id - a.id)
      .map((t) => ({ ...t, company_name: compName(t.company_id) }))
    const summary = list.reduce((s, r) => { s.total += 1; if (r.status === 'مفتوحة') s.open += 1; if (r.status === 'قيد المعالجة') s.inProgress += 1; return s }, { total: 0, open: 0, inProgress: 0 })
    return { tickets: list, summary }
  },
  async createTicket(data) {
    await delay()
    const t = { id: ticketSeq++, company_id: data.company_id ? Number(data.company_id) : null, subject: data.subject, category: data.category || 'عام', priority: data.priority || 'متوسطة', status: 'مفتوحة', description: data.description || null, response: null, created_at: nowIso() }
    supportTickets.unshift(t)
    return { message: 'تم', ticket: { id: t.id } }
  },
  async updateTicket(id, data) {
    await delay()
    const t = supportTickets.find((x) => x.id === Number(id))
    if (!t) throw notFound()
    if (data.status !== undefined) t.status = data.status
    if (data.response !== undefined) t.response = data.response
    return { message: 'تم' }
  },
  async removeTicket(id) { await delay(); const i = supportTickets.findIndex((x) => x.id === Number(id)); if (i > -1) supportTickets.splice(i, 1); return { message: 'تم الحذف' } },
  async settings() { await delay(); return { settings: { ...platformSettings } } },
  async updateSettings(data) {
    await delay()
    for (const [k, v] of Object.entries(data)) {
      if (saBool.includes(k)) platformSettings[k] = v ? 1 : 0
      else if (saInt.includes(k)) platformSettings[k] = parseInt(v, 10) || 0
      else if (k in platformSettings) platformSettings[k] = v
    }
    return { message: 'تم التحديث', settings: { ...platformSettings } }
  },
  async locales() {
    await delay()
    const rows = [...platformLocales].sort((a, b) => a.type.localeCompare(b.type) || b.is_default - a.is_default || a.name.localeCompare(b.name))
    const grouped = { دولة: [], عملة: [], لغة: [] }
    for (const r of rows) grouped[r.type].push(r)
    return { locales: rows, grouped }
  },
  async createLocale(data) {
    await delay()
    if (!['دولة', 'عملة', 'لغة'].includes(data.type)) throw badReq('نوع غير صالح')
    if (!data.name) throw badReq('الاسم مطلوب')
    const l = { id: localeSeq++, type: data.type, name: data.name, code: data.code || null, is_default: 0, enabled: 1 }
    platformLocales.push(l)
    return { message: 'تم', locale: { id: l.id } }
  },
  async updateLocale(id, data) {
    await delay()
    const l = platformLocales.find((x) => x.id === Number(id))
    if (!l) throw notFound()
    if (data.is_default) platformLocales.filter((x) => x.type === l.type).forEach((x) => { x.is_default = 0 })
    if (data.name !== undefined) l.name = data.name
    if (data.code !== undefined) l.code = data.code
    if (data.is_default !== undefined) l.is_default = data.is_default ? 1 : 0
    if (data.enabled !== undefined) l.enabled = data.enabled ? 1 : 0
    return { message: 'تم' }
  },
  async removeLocale(id) { await delay(); const i = platformLocales.findIndex((x) => x.id === Number(id)); if (i > -1) platformLocales.splice(i, 1); return { message: 'تم الحذف' } },
  async templates({ type } = {}) {
    await delay()
    let rows = [...systemTemplates]
    if (type) rows = rows.filter((t) => t.type === type)
    return { templates: rows.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)) }
  },
  async createTemplate(data) {
    await delay()
    if (!data.name) throw badReq('الاسم مطلوب')
    const t = { id: templateSeq++, name: data.name, type: data.type || 'بريد', subject: data.subject || null, body: data.body || null, enabled: 1 }
    systemTemplates.push(t)
    return { message: 'تم', template: { id: t.id } }
  },
  async updateTemplate(id, data) {
    await delay()
    const t = systemTemplates.find((x) => x.id === Number(id))
    if (!t) throw notFound()
    for (const k of ['name', 'type', 'subject', 'body']) if (data[k] !== undefined) t[k] = data[k]
    if (data.enabled !== undefined) t.enabled = data.enabled ? 1 : 0
    return { message: 'تم' }
  },
  async removeTemplate(id) { await delay(); const i = systemTemplates.findIndex((x) => x.id === Number(id)); if (i > -1) systemTemplates.splice(i, 1); return { message: 'تم الحذف' } },
  async ai() { await delay(); return { ai: { ...aiSettings } } },
  async updateAi(data) {
    await delay()
    for (const [k, v] of Object.entries(data)) {
      if (aiBool.includes(k)) aiSettings[k] = v ? 1 : 0
      else if (aiInt.includes(k)) aiSettings[k] = parseInt(v, 10) || 0
      else if (k in aiSettings) aiSettings[k] = v
    }
    return { message: 'تم التحديث', ai: { ...aiSettings } }
  },
}

let localeSeq = 1
const platformLocales = [
  { id: localeSeq++, type: 'دولة', name: 'السعودية', code: 'SA', is_default: 1, enabled: 1 },
  { id: localeSeq++, type: 'دولة', name: 'الإمارات', code: 'AE', is_default: 0, enabled: 1 },
  { id: localeSeq++, type: 'دولة', name: 'الكويت', code: 'KW', is_default: 0, enabled: 1 },
  { id: localeSeq++, type: 'دولة', name: 'مصر', code: 'EG', is_default: 0, enabled: 0 },
  { id: localeSeq++, type: 'عملة', name: 'ريال سعودي', code: 'SAR', is_default: 1, enabled: 1 },
  { id: localeSeq++, type: 'عملة', name: 'درهم إماراتي', code: 'AED', is_default: 0, enabled: 1 },
  { id: localeSeq++, type: 'عملة', name: 'دولار أمريكي', code: 'USD', is_default: 0, enabled: 1 },
  { id: localeSeq++, type: 'لغة', name: 'العربية', code: 'ar', is_default: 1, enabled: 1 },
  { id: localeSeq++, type: 'لغة', name: 'English', code: 'en', is_default: 0, enabled: 1 },
]
let templateSeq = 1
const systemTemplates = [
  { id: templateSeq++, name: 'ترحيب بموظف جديد', type: 'بريد', subject: 'مرحباً بك في {{company}}', body: 'عزيزي {{name}}، يسعدنا انضمامك إلى فريق {{company}}.', enabled: 1 },
  { id: templateSeq++, name: 'اعتماد طلب إجازة', type: 'إشعار', subject: 'تم اعتماد إجازتك', body: 'تمت الموافقة على طلب إجازتك من {{start}} إلى {{end}}.', enabled: 1 },
  { id: templateSeq++, name: 'تذكير بالمقابلة', type: 'رسالة نصية', subject: null, body: 'تذكير: لديك مقابلة يوم {{date}} الساعة {{time}}.', enabled: 1 },
  { id: templateSeq++, name: 'عقد عمل', type: 'مستند', subject: 'عقد عمل - {{name}}', body: 'هذا العقد مبرم بين {{company}} و {{name}} بوظيفة {{title}}.', enabled: 1 },
  { id: templateSeq++, name: 'إشعار انتهاء مستند', type: 'إشعار', subject: 'مستند على وشك الانتهاء', body: 'ينتهي المستند {{document}} بتاريخ {{expiry}}.', enabled: 0 },
]
const aiSettings = { id: 1, enabled: 1, provider: 'Claude', model: 'claude-sonnet', resume_screening: 1, chatbot: 1, insights: 1, auto_summaries: 0, monthly_token_limit: 1000000 }
const aiBool = ['enabled', 'resume_screening', 'chatbot', 'insights', 'auto_summaries']
const aiInt = ['monthly_token_limit']

let auditSeq = 1
const auditLogs = [
  { id: auditSeq++, actor: 'superadmin@quant.com', action: 'تسجيل دخول', entity: 'auth', severity: 'معلومة', details: 'دخول ناجح لبوابة إدارة المنصة', created_at: addDays(0) },
  { id: auditSeq++, actor: 'superadmin@quant.com', action: 'اعتماد طلب اشتراك', entity: 'subscription', severity: 'معلومة', details: 'ترقية باقة مجموعة الأفق', created_at: addDays(0) },
  { id: auditSeq++, actor: 'noura.hr@quant.com', action: 'تعديل بيانات موظف', entity: 'employee', severity: 'معلومة', details: 'تحديث بيانات موظف #6', created_at: addDays(-1) },
  { id: auditSeq++, actor: 'نظام', action: 'محاولة دخول فاشلة', entity: 'auth', severity: 'تحذير', details: '3 محاولات دخول فاشلة متتالية', created_at: addDays(-1) },
  { id: auditSeq++, actor: 'superadmin@quant.com', action: 'استعادة نسخة احتياطية', entity: 'backup', severity: 'تحذير', details: 'استعادة نسخة #3', created_at: addDays(-2) },
  { id: auditSeq++, actor: 'نظام', action: 'فشل تكامل خارجي', entity: 'integration', severity: 'حرج', details: 'انقطاع الاتصال مع Active Directory', created_at: addDays(-2) },
]

export const mockExpensesApi = {
  async list({ type = '', status = '' } = {}) {
    await delay()
    const u = currentUser()
    let rows = expenses
    if (u && ['employee', 'candidate'].includes(u.role)) {
      rows = rows.filter((x) => x.employee_id === u.employee_id)
    } else if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      rows = rows.filter((x) => employees.find((e) => e.id === x.employee_id)?.department_id === dep)
    }
    if (type) rows = rows.filter((x) => x.type === type)
    if (status) rows = rows.filter((x) => x.status === status)
    const so = { معلقة: 1, معتمدة: 2, مصروفة: 3, مرفوضة: 4 }
    const list = [...rows]
      .sort((a, b) => (so[a.status] - so[b.status]) || b.id - a.id)
      .map((x) => ({ ...x, full_name: empName(x.employee_id), job_title: employees.find((e) => e.id === x.employee_id)?.job_title, department_name: deptName(employees.find((e) => e.id === x.employee_id)?.department_id), approved_by_name: empName(x.approved_by), profile_picture: null }))
    const summary = list.reduce((s, r) => {
      s.count += 1; s.total += r.amount
      if (r.status === 'معلقة') s.pending += r.amount
      if (r.status === 'معتمدة' || r.status === 'مصروفة') s.approved += r.amount
      if (r.type === 'سلفة' && r.status === 'مصروفة' && r.settled_at == null) s.outstanding += r.amount
      return s
    }, { count: 0, total: 0, pending: 0, approved: 0, outstanding: 0 })
    return { expenses: list, summary }
  },
  async create(data) {
    await delay()
    const x = { id: expenseSeq++, employee_id: currentUser()?.employee_id, status: 'معلقة', approved_by: null, created_at: nowIso(), type: data.type || 'مصروف', category: data.category || 'أخرى', ...data }
    expenses.unshift(x)
    return { message: 'تم الإرسال', expense: x }
  },
  async setStatus(id, status) {
    await delay()
    const x = expenses.find((e) => e.id === Number(id))
    if (!x) return { message: 'تم التحديث' }
    const u = currentUser()
    if (u?.role === 'department_head' && employees.find((e) => e.id === x.employee_id)?.department_id !== myDept()) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    x.status = status
    x.approved_by = u?.employee_id || 5
    const STATUS_LABEL = { 'معتمدة': 'اعتماد', 'مرفوضة': 'رفض', 'مصروفة': 'صرف' }
    pushNotification({ employee_id: x.employee_id }, {
      title: `تم ${STATUS_LABEL[status] || 'تحديث'} طلب ${x.type === 'سلفة' ? 'السلفة' : 'المصروف'}`,
      message: x.description || `بمبلغ ${x.amount}`,
      type: status === 'مرفوضة' ? 'error' : 'success',
      link: '/ess/expenses',
    })
    return { message: 'تم التحديث' }
  },
  async settle(id, settledAmount) {
    await delay()
    const x = expenses.find((e) => e.id === Number(id))
    if (!x) return { message: 'غير موجود' }
    if (x.type !== 'سلفة') { const err = new Error('bad'); err.response = { data: { error: 'يمكن تسوية السلف فقط' } }; throw err }
    if (x.status !== 'مصروفة') { const err = new Error('bad'); err.response = { data: { error: 'يجب صرف السلفة قبل التسوية' } }; throw err }
    const u = currentUser()
    const isOwner = u?.employee_id === x.employee_id
    const isManage = ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u?.role)
    if (!isOwner && (!isManage || !sameDeptAsMe(u, x.employee_id))) {
      throw { response: { data: { error: 'Not allowed' } }, message: 'denied' }
    }
    x.settled_amount = Number(settledAmount)
    x.settled_at = nowIso()
    return { message: 'تمت التسوية', balance: Number((x.amount - x.settled_amount).toFixed(2)) }
  },
}

export const mockAssetsApi = {
  async list({ status = '', category = '' } = {}) {
    await delay()
    const u = currentUser()
    let rows = assets
    if (u && ['employee', 'candidate', 'department_head'].includes(u.role)) {
      rows = rows.filter((a) => a.assigned_to === u.employee_id)
    }
    if (status) rows = rows.filter((a) => a.status === status)
    if (category) rows = rows.filter((a) => a.category === category)
    const list = rows.map((a) => ({ ...a, assigned_to_name: empName(a.assigned_to), history_count: assetHistory.filter((h) => h.asset_id === a.id).length }))
    const summary = {
      total: list.length,
      assigned: list.filter((a) => a.status === 'مُخصّص').length,
      available: list.filter((a) => a.status === 'متاح').length,
      maintenance: list.filter((a) => a.status === 'صيانة').length,
    }
    return { assets: list, summary }
  },
  async create(data) {
    await delay()
    const a = { id: assetSeq++, category: data.category || 'أخرى', status: 'متاح', assigned_to: null, assigned_date: null, ...data }
    assets.unshift(a)
    return { message: 'تم الإنشاء', asset: a }
  },
  async update(id, data) {
    await delay()
    const a = assets.find((x) => x.id === Number(id))
    if (!a) return { message: 'تم التحديث' }
    if (data.return_condition !== undefined && data.return_condition !== null && !ASSET_CONDITIONS.includes(data.return_condition)) {
      throw badReq('حالة غير صالحة')
    }
    const prevAssigned = a.assigned_to
    const prevStatus = a.status
    const u = currentUser()
    Object.assign(a, data)
    if (data.assigned_to !== undefined) {
      if (data.assigned_to) { a.status = 'مُخصّص'; a.assigned_date = a.assigned_date || addDays(0) }
      else { if (prevStatus === 'مُخصّص') a.status = 'متاح'; a.assigned_date = null }
    }
    if (data.assigned_to !== undefined && a.assigned_to && a.assigned_to !== prevAssigned) {
      assetHistory.unshift({ id: assetHistorySeq++, asset_id: a.id, employee_id: a.assigned_to, action: 'تخصيص', condition: null, notes: data.history_notes || null, performed_by: u?.employee_id || 5, created_at: nowIso() })
    } else if (data.assigned_to !== undefined && !a.assigned_to && prevAssigned) {
      assetHistory.unshift({ id: assetHistorySeq++, asset_id: a.id, employee_id: prevAssigned, action: 'إرجاع', condition: data.return_condition || null, notes: data.history_notes || null, performed_by: u?.employee_id || 5, created_at: nowIso() })
    }
    if (data.status === 'صيانة' && prevStatus !== 'صيانة') {
      assetHistory.unshift({ id: assetHistorySeq++, asset_id: a.id, employee_id: prevAssigned, action: 'صيانة', condition: null, notes: data.history_notes || null, performed_by: u?.employee_id || 5, created_at: nowIso() })
    }
    if (data.status === 'مُتلف' && prevStatus !== 'مُتلف') {
      assetHistory.unshift({ id: assetHistorySeq++, asset_id: a.id, employee_id: prevAssigned, action: 'إتلاف', condition: data.return_condition || 'تالفة', notes: data.history_notes || null, performed_by: u?.employee_id || 5, created_at: nowIso() })
    }
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const i = assets.findIndex((x) => x.id === Number(id))
    if (i > -1) assets.splice(i, 1)
    return { message: 'تم الحذف' }
  },
  async history(id) {
    await delay()
    const asset = assets.find((x) => x.id === Number(id))
    if (!asset) throw notFound()
    const u = currentUser()
    if (u && !['admin', 'hr_manager', 'super_admin'].includes(u.role)) {
      const wasInvolved = assetHistory.some((h) => h.asset_id === Number(id) && h.employee_id === u.employee_id)
      if (asset.assigned_to !== u.employee_id && !wasInvolved) { const e = new Error('bad'); e.response = { status: 403, data: { error: 'غير مسموح' } }; throw e }
    }
    return assetHistory.filter((h) => h.asset_id === Number(id))
      .map((h) => ({ ...h, employee_name: empName(h.employee_id), performed_by_name: empName(h.performed_by) }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },
  async addHistory(id, data) {
    await delay()
    const asset = assets.find((x) => x.id === Number(id))
    if (!asset) throw notFound()
    if (!ASSET_HISTORY_ACTIONS.includes(data.action)) throw badReq('إجراء غير صالح')
    if (data.condition && !ASSET_CONDITIONS.includes(data.condition)) throw badReq('حالة غير صالحة')
    assetHistory.unshift({ id: assetHistorySeq++, asset_id: Number(id), employee_id: asset.assigned_to, action: data.action, condition: data.condition || null, notes: data.notes || null, performed_by: currentUser()?.employee_id || 5, created_at: nowIso() })
    return { message: 'تم' }
  },
}

export const mockAssetRequestsApi = {
  async list({ status = '' } = {}) {
    await delay()
    const u = currentUser()
    let rows = assetRequests
    if (u && ['employee', 'candidate'].includes(u.role)) {
      rows = rows.filter((r) => r.employee_id === u.employee_id)
    } else if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      rows = rows.filter((r) => r.requested_by === u.employee_id || employees.find((e) => e.id === r.employee_id)?.department_id === dep)
    }
    if (status) rows = rows.filter((r) => r.status === status)
    const list = [...rows]
      .sort((a, b) => (a.status === 'معلق' ? -1 : 1) - (b.status === 'معلق' ? -1 : 1) || b.id - a.id)
      .map((r) => ({
        ...r,
        full_name: empName(r.employee_id),
        job_title: employees.find((e) => e.id === r.employee_id)?.job_title,
        profile_picture: null,
        department_id: employees.find((e) => e.id === r.employee_id)?.department_id,
        requested_by_name: empName(r.requested_by),
        reviewed_by_name: empName(r.reviewed_by),
      }))
    const summary = list.reduce((s, r) => { s.total += 1; if (r.status === 'معلق') s.pending += 1; s.estimatedTotal += r.estimated_cost || 0; return s }, { total: 0, pending: 0, estimatedTotal: 0 })
    return { requests: list, summary }
  },
  async create(data) {
    await delay()
    const u = currentUser()
    let employee_id = data.employee_id ? Number(data.employee_id) : null
    if (!['admin', 'hr_manager', 'super_admin', 'department_head'].includes(u?.role) || !employee_id) {
      employee_id = u?.employee_id
    }
    if (!employee_id) throw badReq('No employee associated with this account')
    if (!data.item_name) throw badReq('اسم العنصر مطلوب')
    const r = {
      id: assetReqSeq++, employee_id, category: data.category || 'أخرى', item_name: data.item_name,
      justification: data.justification || null, estimated_cost: data.estimated_cost != null ? Number(data.estimated_cost) : null,
      status: 'معلق', requested_by: u?.employee_id || 5, reviewed_by: null, reviewed_at: null, created_at: nowIso(),
    }
    assetRequests.unshift(r)
    return { message: 'تم', request: { id: r.id } }
  },
  async setStatus(id, status) {
    await delay()
    const r = assetRequests.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    r.status = status
    r.reviewed_by = currentUser()?.employee_id || 5
    r.reviewed_at = nowIso()
    return { message: 'تم' }
  },
  async remove(id) {
    await delay()
    const i = assetRequests.findIndex((x) => x.id === Number(id))
    if (i > -1) assetRequests.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

export const mockGoalsApi = {
  async list({ status = '' } = {}) {
    await delay()
    const u = currentUser()
    let rows = goals
    if (u && ['employee', 'candidate'].includes(u.role)) {
      rows = rows.filter((g) => g.employee_id === u.employee_id)
    } else if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      rows = rows.filter((g) => employees.find((e) => e.id === g.employee_id)?.department_id === dep)
    }
    if (status) rows = rows.filter((g) => g.status === status)
    const so = { 'قيد التنفيذ': 1, 'لم تبدأ': 2, مكتملة: 3, ملغاة: 4 }
    const list = [...rows]
      .sort((a, b) => (so[a.status] - so[b.status]) || b.id - a.id)
      .map((g) => ({ ...g, full_name: empName(g.employee_id), job_title: employees.find((e) => e.id === g.employee_id)?.job_title, department_id: employees.find((e) => e.id === g.employee_id)?.department_id, profile_picture: null, created_by_name: empName(g.created_by) }))
    // Weighted by each goal's importance, not a flat average — matches the backend.
    const totalWeight = list.reduce((s, g) => s + (g.weight || 100), 0)
    const summary = {
      total: list.length,
      completed: list.filter((g) => g.status === 'مكتملة').length,
      inProgress: list.filter((g) => g.status === 'قيد التنفيذ').length,
      avgProgress: totalWeight ? Math.round(list.reduce((s, g) => s + (g.progress || 0) * (g.weight || 100), 0) / totalWeight) : 0,
    }
    return { goals: list, summary }
  },
  async create(data) {
    await delay()
    const u = currentUser()
    const isManager = ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u?.role)
    const employee_id = isManager && data.employee_id ? Number(data.employee_id) : u?.employee_id
    if (!employee_id) throw badReq('Employee is required')
    if (!data.title) throw badReq('Employee and title are required')
    const g = {
      id: goalSeq++, employee_id, title: data.title, description: data.description || null,
      weight: data.weight || 100, target_date: data.target_date || null,
      progress: 0, status: 'لم تبدأ', created_by: u?.employee_id || null, created_at: nowIso(),
    }
    goals.unshift(g)
    return { message: 'تم إنشاء الهدف', goal: g }
  },
  async update(id, data) {
    await delay()
    const g = goals.find((x) => x.id === Number(id))
    if (!g) throw notFound()
    const u = currentUser()
    const isManager = ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u?.role)
    const isOwner = g.employee_id === u?.employee_id
    if (!isOwner && !isManager) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (!isOwner && !sameDeptAsMe(u, g.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (data.progress !== undefined) {
      g.progress = Math.max(0, Math.min(100, parseInt(data.progress, 10)))
      if (data.status === undefined) g.status = g.progress >= 100 ? 'مكتملة' : g.progress > 0 ? 'قيد التنفيذ' : g.status
    }
    if (data.status !== undefined) { g.status = data.status; if (data.status === 'مكتملة') g.progress = 100 }
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const g = goals.find((x) => x.id === Number(id))
    if (!g) throw notFound()
    const u = currentUser()
    const isManager = ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u?.role)
    if (!isManager) {
      if (g.employee_id !== u?.employee_id) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
      if (g.status !== 'لم تبدأ') throw badReq('لا يمكن حذف هدف بدأ العمل عليه')
    } else if (!sameDeptAsMe(u, g.employee_id)) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    const i = goals.findIndex((x) => x.id === Number(id))
    if (i > -1) goals.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

export const mockTrainingApi = {
  async courses() {
    await delay()
    const empId = currentUser()?.employee_id
    return courses.map((c) => ({
      ...c,
      created_by_name: empName(c.created_by),
      enrolled_count: enrollments.filter((e) => e.course_id === c.id).length,
      my_enrollment: empId ? (enrollments.find((e) => e.course_id === c.id && e.employee_id === empId) || null) : null,
    }))
  },
  async createCourse(data) {
    await delay()
    const c = { id: courseSeq++, category: data.category || 'عام', hours: data.hours || 0, level: data.level || 'مبتدئ', status: data.status || 'متاحة', created_by: currentUser()?.employee_id || null, ...data }
    courses.unshift(c)
    return { message: 'تم الإنشاء', course: c }
  },
  async updateCourse(id, data) {
    await delay()
    const c = courses.find((x) => x.id === Number(id))
    if (c) Object.assign(c, data)
    return { message: 'تم التحديث' }
  },
  async removeCourse(id) {
    await delay()
    const i = courses.findIndex((x) => x.id === Number(id))
    if (i > -1) courses.splice(i, 1)
    return { message: 'تم الحذف' }
  },
  async enroll(courseId) {
    await delay()
    const empId = currentUser()?.employee_id
    const course = courses.find((c) => c.id === Number(courseId) && c.status === 'متاحة')
    if (!course) throw badReq('الدورة غير متاحة للتسجيل')
    if (enrollments.find((e) => e.course_id === Number(courseId) && e.employee_id === empId)) throw badReq('أنت مسجّل في هذه الدورة بالفعل')
    const en = { id: enrollSeq++, course_id: Number(courseId), employee_id: empId, progress: 0, status: 'مسجّل', enrolled_at: nowIso() }
    enrollments.unshift(en)
    return { message: 'تم التسجيل', enrollment: en }
  },
  async enrollments() {
    await delay()
    const u = currentUser()
    let rows = enrollments
    if (u && ['employee', 'candidate', 'department_head'].includes(u.role)) {
      rows = rows.filter((e) => e.employee_id === u.employee_id)
    }
    return rows.map((e) => {
      const c = courses.find((x) => x.id === e.course_id)
      return { ...e, course_title: c?.title, category: c?.category, hours: c?.hours, full_name: empName(e.employee_id), profile_picture: null }
    })
  },
  async setProgress(enrollmentId, progress) {
    await delay()
    const e = enrollments.find((x) => x.id === Number(enrollmentId))
    let certificate = null
    if (e) {
      e.progress = Math.max(0, Math.min(100, parseInt(progress, 10)))
      e.status = e.progress >= 100 ? 'مكتمل' : e.progress > 0 ? 'قيد التقدم' : 'مسجّل'
      if (e.status === 'مكتمل') {
        certificate = courseCertificates.find((c) => c.enrollment_id === e.id)
        if (!certificate) {
          certificate = { id: certSeq++, enrollment_id: e.id, employee_id: e.employee_id, course_id: e.course_id, code: `QNT-${Math.random().toString(16).slice(2, 10).toUpperCase()}`, issued_at: nowIso() }
          courseCertificates.push(certificate)
        }
      }
    }
    return { message: 'تم التحديث', certificate }
  },
  async certificates() {
    await delay()
    const u = currentUser()
    const MANAGE = ['admin', 'hr_manager', 'super_admin']
    let rows = courseCertificates
    if (u && !MANAGE.includes(u.role)) rows = rows.filter((c) => c.employee_id === u.employee_id)
    return [...rows].sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at)).map((c) => {
      const course = courses.find((x) => x.id === c.course_id)
      return { ...c, employee_name: empName(c.employee_id), profile_picture: null, course_title: course?.title, hours: course?.hours, level: course?.level, category: course?.category }
    })
  },
  async verifyCertificate(code) {
    await delay()
    const c = courseCertificates.find((x) => x.code === code)
    if (!c) { const err = new Error('bad'); err.response = { status: 404, data: { valid: false, error: 'الشهادة غير موجودة' } }; throw err }
    const course = courses.find((x) => x.id === c.course_id)
    return { valid: true, certificate: { code: c.code, issued_at: c.issued_at, employee_name: empName(c.employee_id), course_title: course?.title, hours: course?.hours, level: course?.level } }
  },
}

// Mirrors backend/src/routes/reports.js computeInsights — same deterministic,
// threshold-based rules over the same numbers, not a model call.
function computeInsightsMock(o) {
  const insights = []

  const total30 = (o.attendance30.present || 0) + (o.attendance30.absent || 0) + (o.attendance30.late || 0) + (o.attendance30.remote || 0)
  if (total30 > 0) {
    const absentRate = (o.attendance30.absent || 0) / total30
    if (absentRate > 0.05) insights.push(`نسبة الغياب خلال آخر 30 يوماً ${(absentRate * 100).toFixed(0)}% من سجلات الحضور — أعلى من المعتاد.`)
    const lateRate = (o.attendance30.late || 0) / total30
    if (lateRate > 0.1) insights.push(`نسبة التأخر خلال آخر 30 يوماً ${(lateRate * 100).toFixed(0)}% من سجلات الحضور.`)
  }

  if (o.recruitment.applications > 0) {
    const accepted = o.recruitment.byStatus.find((s) => s.status === 'مقبول')?.count || 0
    const rejected = o.recruitment.byStatus.find((s) => s.status === 'مرفوض')?.count || 0
    const decided = accepted + rejected
    if (decided > 0) {
      const acceptRate = accepted / decided
      insights.push(`معدل قبول المرشحين ${(acceptRate * 100).toFixed(0)}% من أصل ${decided} قراراً صدر حتى الآن.`)
    }
  }

  if (o.expenses.total > 0) {
    const pendingRate = o.expenses.pending / o.expenses.total
    if (pendingRate > 0.3) insights.push(`${(pendingRate * 100).toFixed(0)}% من إجمالي المصروفات لا تزال معلّقة بانتظار الاعتماد.`)
  }

  if (o.byDepartment.length > 1) {
    const counts = o.byDepartment.map((d) => d.count)
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length
    const max = o.byDepartment.reduce((m, d) => (d.count > m.count ? d : m))
    if (avg > 0 && max.count > avg * 1.8) {
      insights.push(`إدارة ${max.name} تضم ${max.count} موظف، أعلى بكثير من متوسط ${avg.toFixed(1)} موظف لكل إدارة.`)
    }
  }

  if (o.training.enrollments > 0) {
    const completionRate = o.training.completed / o.training.enrollments
    insights.push(`معدل إكمال التدريب ${(completionRate * 100).toFixed(0)}% من ${o.training.enrollments} تسجيلاً.`)
  }

  return insights.slice(0, 5)
}

export const mockReportsApi = {
  async overview() {
    await delay()
    const groupCount = (arr, key) => {
      const m = {}
      for (const x of arr) m[x[key]] = (m[x[key]] || 0) + 1
      return m
    }
    const byDepartment = departments.map((d) => ({ name: d.name, color: d.color, count: employees.filter((e) => e.department_id === d.id).length })).sort((a, b) => b.count - a.count)
    const statusMap = groupCount(employees, 'status')
    const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))
    const typeMap = groupCount(employees, 'employment_type')
    const byEmploymentType = Object.entries(typeMap).map(([type, count]) => ({ type, count }))
    const yearMap = {}
    for (const e of employees) { const y = (e.hire_date || '').slice(0, 4); if (y) yearMap[y] = (yearMap[y] || 0) + 1 }
    const hiresByYear = Object.entries(yearMap).map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year))

    const att = { present: 0, absent: 0, late: 0, remote: 0, avgHours: 0 }
    let hoursSum = 0, hoursCount = 0
    for (const a of attendance) {
      if (a.status === 'حاضر') att.present++
      else if (a.status === 'غائب') att.absent++
      else if (a.status === 'تأخر') att.late++
      else if (a.status === 'عمل عن بعد') att.remote++
      if (a.work_hours) { hoursSum += a.work_hours; hoursCount++ }
    }
    att.avgHours = hoursCount ? Math.round((hoursSum / hoursCount) * 10) / 10 : 0

    const leaveMap = {}
    for (const l of leaves) { leaveMap[l.type] = leaveMap[l.type] || { type: l.type, count: 0, days: 0 }; leaveMap[l.type].count++; leaveMap[l.type].days += l.days_count }
    const leavesByType = Object.values(leaveMap).sort((a, b) => b.count - a.count)

    const active = employees.filter((e) => e.status === 'نشط')
    // Uses each employee's active compensation package when one exists, so
    // this agrees with the live payroll overview and payroll runs.
    const payTotals = active.reduce((t, e) => {
      const i = payItemFor(e)
      return { basic: t.basic + i.basic, allowances: t.allowances + i.allowances, deductions: t.deductions + i.deductions }
    }, { basic: 0, allowances: 0, deductions: 0 })
    const basic = payTotals.basic
    const allowances = payTotals.allowances
    const deductions = payTotals.deductions

    const appStatus = groupCount(applications, 'status')
    const expTotal = expenses.reduce((s, x) => s + x.amount, 0)
    const expPending = expenses.filter((x) => x.status === 'معلقة').reduce((s, x) => s + x.amount, 0)
    const expApproved = expenses.filter((x) => ['معتمدة', 'مصروفة'].includes(x.status)).reduce((s, x) => s + x.amount, 0)

    const payload = {
      headcount: { total: employees.length, active: active.length },
      byDepartment,
      byStatus,
      byEmploymentType,
      hiresByYear,
      attendance30: att,
      leavesByType,
      payroll: { basic, allowances, deductions, net: basic + allowances - deductions },
      recruitment: {
        openJobs: jobs.filter((j) => j.status === 'مفتوحة').length,
        applications: applications.length,
        byStatus: Object.entries(appStatus).map(([status, count]) => ({ status, count })),
      },
      expenses: { total: expTotal, pending: expPending, approved: expApproved },
      training: { courses: courses.length, enrollments: enrollments.length, completed: enrollments.filter((e) => e.status === 'مكتمل').length },
    }

    if (aiSettings.enabled && aiSettings.insights) payload.insights = computeInsightsMock(payload)
    return payload
  },
  async datasets() {
    await delay()
    return {
      datasets: Object.entries(RB_DATASETS).map(([key, ds]) => ({ key, label: ds.label, fields: Object.entries(ds.fields).map(([fk, f]) => ({ key: fk, label: f.label, type: f.type })) })),
      operators: [{ key: 'eq', label: 'يساوي' }, { key: 'ne', label: 'لا يساوي' }, { key: 'gt', label: 'أكبر من' }, { key: 'lt', label: 'أصغر من' }, { key: 'contains', label: 'يحتوي' }],
    }
  },
  async run({ dataset, fields, filters, group_by } = {}) {
    await delay()
    const ds = RB_DATASETS[dataset]
    if (!ds) throw badReq('مصدر بيانات غير معروف')
    let rows = ds.rows()
    for (const f of (Array.isArray(filters) ? filters : [])) {
      const field = ds.fields[f.field]
      if (!field || f.value === undefined || f.value === '') continue
      const v = field.type === 'number' ? Number(f.value) : String(f.value)
      rows = rows.filter((r) => {
        const cell = r[f.field]
        if (f.op === 'eq') return String(cell) === String(v)
        if (f.op === 'ne') return String(cell) !== String(v)
        if (f.op === 'gt') return Number(cell) > v
        if (f.op === 'lt') return Number(cell) < v
        if (f.op === 'contains') return String(cell ?? '').includes(v)
        return true
      })
    }
    if (group_by && ds.fields[group_by]) {
      const m = {}
      for (const r of rows) { const k = r[group_by]; m[k] = (m[k] || 0) + 1 }
      const grouped = Object.entries(m).map(([group_value, count]) => ({ group_value, count })).sort((a, b) => b.count - a.count)
      return { grouped: true, columns: [{ key: 'group_value', label: ds.fields[group_by].label }, { key: 'count', label: 'العدد' }], rows: grouped, total: grouped.length }
    }
    const cols = (Array.isArray(fields) && fields.length ? fields : Object.keys(ds.fields)).filter((k) => ds.fields[k])
    const out = rows.slice(0, 1000).map((r) => { const o = {}; for (const k of cols) o[k] = r[k]; return o })
    return { grouped: false, columns: cols.map((k) => ({ key: k, label: ds.fields[k].label })), rows: out, total: out.length }
  },
}

// Report-builder datasets for the demo mock (mirror the backend whitelist)
const RB_DATASETS = {
  employees: {
    label: 'الموظفون',
    fields: { full_name: { label: 'الاسم', type: 'text' }, employee_number: { label: 'الرقم الوظيفي', type: 'text' }, job_title: { label: 'المسمى', type: 'text' }, department: { label: 'الإدارة', type: 'text' }, status: { label: 'الحالة', type: 'text' }, employment_type: { label: 'نوع التوظيف', type: 'text' }, nationality: { label: 'الجنسية', type: 'text' }, hire_date: { label: 'تاريخ التعيين', type: 'date' }, salary: { label: 'الراتب', type: 'number' } },
    rows: () => employees.map((e) => ({ full_name: e.full_name, employee_number: e.employee_number, job_title: e.job_title, department: deptName(e.department_id), status: e.status, employment_type: e.employment_type, nationality: e.nationality, hire_date: e.hire_date, salary: e.salary })),
  },
  attendance: {
    label: 'الحضور',
    fields: { full_name: { label: 'الموظف', type: 'text' }, date: { label: 'التاريخ', type: 'date' }, status: { label: 'الحالة', type: 'text' }, work_hours: { label: 'ساعات العمل', type: 'number' } },
    rows: () => attendance.map((a) => ({ full_name: empName(a.employee_id), date: a.date, status: a.status, work_hours: a.work_hours })),
  },
  leaves: {
    label: 'الإجازات',
    fields: { full_name: { label: 'الموظف', type: 'text' }, type: { label: 'النوع', type: 'text' }, status: { label: 'الحالة', type: 'text' }, days_count: { label: 'عدد الأيام', type: 'number' }, start_date: { label: 'تاريخ البداية', type: 'date' } },
    rows: () => leaves.map((l) => ({ full_name: empName(l.employee_id), type: l.type, status: l.status, days_count: l.days_count, start_date: l.start_date })),
  },
  expenses: {
    label: 'المصروفات والسلف',
    fields: { full_name: { label: 'الموظف', type: 'text' }, type: { label: 'النوع', type: 'text' }, category: { label: 'الفئة', type: 'text' }, amount: { label: 'المبلغ', type: 'number' }, status: { label: 'الحالة', type: 'text' }, created_at: { label: 'تاريخ الطلب', type: 'date' } },
    rows: () => expenses.map((x) => ({ full_name: empName(x.employee_id), type: x.type, category: x.category, amount: x.amount, status: x.status, created_at: x.created_at })),
  },
  training: {
    label: 'التدريب',
    fields: { full_name: { label: 'الموظف', type: 'text' }, course: { label: 'الدورة', type: 'text' }, category: { label: 'الفئة', type: 'text' }, status: { label: 'الحالة', type: 'text' }, progress: { label: 'نسبة الإنجاز', type: 'number' }, enrolled_at: { label: 'تاريخ التسجيل', type: 'date' } },
    rows: () => enrollments.map((en) => { const c = courses.find((x) => x.id === en.course_id) || {}; return { full_name: empName(en.employee_id), course: c.title, category: c.category, status: en.status, progress: en.progress, enrolled_at: en.enrolled_at } }),
  },
  compensation: {
    label: 'الرواتب والتعويضات',
    fields: { full_name: { label: 'الموظف', type: 'text' }, grade: { label: 'الدرجة', type: 'text' }, base_salary: { label: 'الراتب الأساسي', type: 'number' }, housing_allowance: { label: 'بدل السكن', type: 'number' }, transport_allowance: { label: 'بدل النقل', type: 'number' }, bonus: { label: 'المكافأة', type: 'number' }, status: { label: 'الحالة', type: 'text' }, effective_date: { label: 'تاريخ السريان', type: 'date' } },
    rows: () => compensation.map((c) => ({ full_name: empName(c.employee_id), grade: c.grade, base_salary: c.base_salary, housing_allowance: c.housing_allowance, transport_allowance: c.transport_allowance, bonus: c.bonus, status: c.status, effective_date: c.effective_date })),
  },
  recruitment: {
    label: 'التوظيف والمرشحون',
    fields: { candidate_name: { label: 'المرشح', type: 'text' }, job_title: { label: 'الوظيفة', type: 'text' }, status: { label: 'الحالة', type: 'text' }, stage: { label: 'المرحلة', type: 'text' }, source: { label: 'المصدر', type: 'text' }, rating: { label: 'التقييم', type: 'number' }, created_at: { label: 'تاريخ التقديم', type: 'date' } },
    rows: () => applications.map((ap) => ({ candidate_name: ap.candidate_name, job_title: jobs.find((j) => j.id === ap.job_id)?.title, status: ap.status, stage: ap.stage, source: ap.source, rating: ap.rating, created_at: ap.created_at })),
  },
}

const withEmp = (r) => ({ ...r, full_name: empName(r.employee_id), job_title: employees.find((e) => e.id === r.employee_id)?.job_title, department_name: deptName(employees.find((e) => e.id === r.employee_id)?.department_id), profile_picture: null })

export const mockOffboardingApi = {
  async list() {
    await delay()
    const cases = offboardings.map(offProgress)
    const summary = cases.reduce((s, c) => {
      s.total += 1
      if (c.status === 'قيد المعالجة') s.active += 1
      if (c.status === 'مكتملة') s.completed += 1
      return s
    }, { total: 0, active: 0, completed: 0 })
    return { offboarding: cases, summary }
  },
  async get(id) {
    await delay()
    const o = offboardings.find((x) => x.id === Number(id))
    if (!o) throw notFound()
    return { ...offProgress(o), tasks: o.tasks.slice() }
  },
  async create(data) {
    await delay()
    const list = Array.isArray(data.tasks) && data.tasks.length ? data.tasks : OFF_DEFAULT_TASKS
    const o = {
      id: offSeq++, employee_id: Number(data.employee_id), type: data.type || 'استقالة', reason: data.reason || null,
      last_working_day: data.last_working_day || null, status: 'قيد المعالجة', notes: data.notes || null,
      created_by: currentUser()?.employee_id || 5, created_at: nowIso(),
      tasks: list.map((t) => ({ id: offTaskSeq++, title: t.title, category: t.category || 'أخرى', owner: t.owner || 'الموارد البشرية', due_date: t.due_date || data.last_working_day || null, is_done: 0 })),
    }
    offboardings.unshift(o)
    return { message: 'تم', offboarding: { id: o.id } }
  },
  async update(id, data) {
    await delay()
    const o = offboardings.find((x) => x.id === Number(id))
    if (o) {
      if (data.status !== undefined) o.status = data.status
      if (data.notes !== undefined) o.notes = data.notes
      if (data.status === 'مكتملة') {
        const emp = employees.find((e) => e.id === o.employee_id)
        if (emp) emp.status = OFF_TYPE_TO_EMP_STATUS[o.type] || 'مستقيل'
      }
    }
    return { message: 'تم التحديث' }
  },
  async remove(id) { await delay(); const i = offboardings.findIndex((x) => x.id === Number(id)); if (i > -1) offboardings.splice(i, 1); return { message: 'تم الحذف' } },
  async addTask(id, data) {
    await delay()
    const o = offboardings.find((x) => x.id === Number(id))
    if (!o) throw notFound()
    const t = { id: offTaskSeq++, title: data.title, category: data.category || 'أخرى', owner: data.owner || 'الموارد البشرية', due_date: data.due_date || null, is_done: 0 }
    o.tasks.push(t)
    return { message: 'تم', task: { id: t.id } }
  },
  async updateTask(taskId, data) {
    await delay()
    const { kase, task } = findOffTask(taskId)
    if (!task) throw notFound()
    if (data.title !== undefined) task.title = data.title
    if (data.category !== undefined) task.category = data.category
    if (data.owner !== undefined) task.owner = data.owner
    if (data.due_date !== undefined) task.due_date = data.due_date
    if (data.is_done !== undefined) task.is_done = data.is_done ? 1 : 0
    if (kase && kase.status !== 'ملغاة') {
      const allDone = kase.tasks.length > 0 && kase.tasks.every((t) => t.is_done)
      if (allDone) {
        kase.status = 'مكتملة'
        const emp = employees.find((e) => e.id === kase.employee_id)
        if (emp) emp.status = OFF_TYPE_TO_EMP_STATUS[kase.type] || 'مستقيل'
      } else if (kase.status === 'مكتملة') kase.status = 'قيد المعالجة'
    }
    return { message: 'تم' }
  },
  async removeTask(taskId) {
    await delay()
    const { kase } = findOffTask(taskId)
    if (kase) kase.tasks = kase.tasks.filter((t) => t.id !== Number(taskId))
    return { message: 'تم الحذف' }
  },
}

export const mockGrievancesApi = {
  async list() {
    await delay()
    return grievances.map((g) => ({ ...withEmp(g), assigned_to_name: empName(g.assigned_to), notes_count: grievanceNotes.filter((n) => n.grievance_id === g.id).length }))
  },
  async mine() {
    await delay()
    const empId = currentUser()?.employee_id
    return grievances
      .filter((g) => g.employee_id === empId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((g) => ({ id: g.id, type: g.type, category: g.category, status: g.status, action: g.action, created_at: g.created_at }))
  },
  async create(data) {
    await delay()
    const u = currentUser()
    const hr = ['admin', 'hr_manager', 'super_admin'].includes(u?.role)
    const employee_id = hr ? Number(data.employee_id) : u?.employee_id
    if (!employee_id) throw badReq('Employee is required')
    const type = hr ? (data.type || 'شكوى') : 'شكوى'
    const severity = hr ? (data.severity || 'متوسطة') : 'متوسطة'
    const g = { id: grvSeq++, employee_id, type, category: data.category || 'أخرى', description: data.description || null, severity, status: 'مفتوحة', action: null, assigned_to: null, created_by: u?.employee_id || 5, created_at: nowIso() }
    grievances.unshift(g)
    return { message: 'تم', grievance: g }
  },
  async update(id, data) { await delay(); const g = grievances.find((x) => x.id === Number(id)); if (g) Object.assign(g, data); return { message: 'تم التحديث' } },
  async remove(id) {
    await delay()
    const g = grievances.find((x) => x.id === Number(id))
    if (!g) throw notFound()
    const u = currentUser()
    const hr = ['admin', 'hr_manager', 'super_admin'].includes(u?.role)
    if (!hr) {
      if (g.employee_id !== u?.employee_id) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
      if (g.status !== 'مفتوحة') throw badReq('لا يمكن سحب الشكوى بعد بدء معالجتها')
    }
    const i = grievances.findIndex((x) => x.id === Number(id))
    if (i > -1) grievances.splice(i, 1)
    return { message: 'تم الحذف' }
  },
  async notes(id) {
    await delay()
    return grievanceNotes.filter((n) => n.grievance_id === Number(id)).map((n) => ({ ...n, author_name: empName(n.author_id), author_picture: null }))
  },
  async addNote(id, note) {
    await delay()
    const g = grievances.find((x) => x.id === Number(id))
    if (!g) throw notFound()
    const text = (note || '').trim()
    if (!text) throw badReq('الملاحظة مطلوبة')
    grievanceNotes.push({ id: grievanceNoteSeq++, grievance_id: Number(id), author_id: currentUser()?.employee_id || 5, note: text, created_at: nowIso() })
    return { message: 'تم' }
  },
}

export const mockIncidentsApi = {
  async list() {
    await delay()
    const list = incidents.map((r) => {
      const acts = incidentActions.filter((a) => a.incident_id === r.id)
      return { ...r, full_name: empName(r.employee_id), reported_by_name: empName(r.reported_by), actions_count: acts.length, open_actions_count: acts.filter((a) => a.status === 'مفتوح').length }
    })
    return {
      incidents: list,
      summary: {
        total: list.length,
        open: list.filter((r) => r.status !== 'مغلق').length,
        high: list.filter((r) => r.severity === 'عالية').length,
        openActions: list.reduce((s, r) => s + r.open_actions_count, 0),
      },
    }
  },
  async mine() {
    await delay()
    const myId = currentUser()?.employee_id
    return incidents
      .filter((i) => i.reported_by === myId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((i) => ({ id: i.id, title: i.title, type: i.type, severity: i.severity, status: i.status, incident_date: i.incident_date, created_at: i.created_at }))
  },
  async create(data) { await delay(); const i = { id: incSeq++, type: data.type || 'ملاحظة سلامة', severity: data.severity || 'متوسطة', status: 'مفتوح', incident_date: data.incident_date || addDays(0), reported_by: currentUser()?.employee_id || 5, created_at: nowIso(), ...data }; incidents.unshift(i); return { message: 'تم', incident: i } },
  async update(id, data) { await delay(); const i = incidents.find((x) => x.id === Number(id)); if (i) Object.assign(i, data); return { message: 'تم التحديث' } },
  async remove(id) { await delay(); const idx = incidents.findIndex((x) => x.id === Number(id)); if (idx > -1) incidents.splice(idx, 1); return { message: 'تم الحذف' } },
  async actions(incidentId) {
    await delay()
    return incidentActions.filter((a) => a.incident_id === Number(incidentId))
      .map((a) => ({ ...a, owner_name: empName(a.owner_id), owner_picture: null }))
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'مفتوح' ? -1 : 1))
  },
  async createAction(incidentId, data) {
    await delay()
    if (!incidents.find((i) => i.id === Number(incidentId))) { const err = new Error('bad'); err.response = { status: 404, data: { error: 'البلاغ غير موجود' } }; throw err }
    if (!data.description) throw badReq('الوصف مطلوب')
    const a = { id: incidentActionSeq++, incident_id: Number(incidentId), description: data.description, owner_id: data.owner_id || null, due_date: data.due_date || null, status: 'مفتوح', created_by: currentUser()?.employee_id || 5, completed_at: null, created_at: nowIso() }
    incidentActions.push(a)
    return { message: 'تم', action: a }
  },
  async updateAction(actionId, data) {
    await delay()
    const a = incidentActions.find((x) => x.id === Number(actionId))
    if (!a) { const err = new Error('bad'); err.response = { status: 404, data: { error: 'غير موجود' } }; throw err }
    const wasCompleted = a.status === 'مكتمل'
    Object.assign(a, data)
    if (data.status === 'مكتمل' && !wasCompleted) a.completed_at = nowIso()
    else if (data.status && data.status !== 'مكتمل') a.completed_at = null
    return { message: 'تم التحديث' }
  },
  async removeAction(actionId) {
    await delay()
    const idx = incidentActions.findIndex((x) => x.id === Number(actionId))
    if (idx > -1) incidentActions.splice(idx, 1)
    return { message: 'تم الحذف' }
  },
}

function scopeByRole(rows, key = 'employee_id') {
  const u = currentUser()
  if (u && ['employee', 'candidate'].includes(u.role)) return rows.filter((r) => r[key] === u.employee_id)
  if (u && u.role === 'department_head') {
    const dep = employees.find((e) => e.id === u.employee_id)?.department_id
    return rows.filter((r) => employees.find((e) => e.id === r[key])?.department_id === dep)
  }
  return rows
}

export const mockShiftsApi = {
  async list({ from, to } = {}) {
    await delay()
    let rows = scopeByRole(shifts)
    if (from) rows = rows.filter((s) => s.date >= from)
    if (to) rows = rows.filter((s) => s.date <= to)
    return [...rows].sort((a, b) => b.date.localeCompare(a.date)).map((s) => ({ ...s, full_name: empName(s.employee_id), job_title: employees.find((e) => e.id === s.employee_id)?.job_title, profile_picture: null }))
  },
  async create(data) {
    await delay()
    const u = currentUser()
    if (!sameDeptAsMe(u, data.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const s = { id: shiftSeq++, shift_type: data.shift_type || 'صباحية', location: data.location || 'المقر الرئيسي', created_by: u?.employee_id || 5, ...data }
    shifts.unshift(s)
    return { message: 'تم', shift: s }
  },
  async update(id, data) {
    await delay()
    const s = shifts.find((x) => x.id === Number(id))
    if (!s) return { message: 'تم التحديث' }
    if (!sameDeptAsMe(currentUser(), s.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    Object.assign(s, data)
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const s = shifts.find((x) => x.id === Number(id))
    if (!s) throw notFound()
    if (!sameDeptAsMe(currentUser(), s.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const i = shifts.findIndex((x) => x.id === Number(id))
    if (i > -1) shifts.splice(i, 1)
    return { message: 'تم الحذف' }
  },
  async swapRequests() {
    await delay()
    const u = currentUser()
    let rows = shiftSwapRequests
    if (u && ['employee', 'candidate'].includes(u.role)) {
      rows = rows.filter((r) => r.requester_id === u.employee_id || r.target_id === u.employee_id)
    } else if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      rows = rows.filter((r) => employees.find((e) => e.id === r.requester_id)?.department_id === dep || employees.find((e) => e.id === r.target_id)?.department_id === dep)
    }
    const order = { 'بانتظار موافقة الزميل': 1, 'بانتظار اعتماد المدير': 2, معتمد: 3, مرفوض: 3 }
    return [...rows].sort((a, b) => (order[a.status] - order[b.status]) || new Date(b.created_at) - new Date(a.created_at)).map((r) => {
      const sa = shifts.find((s) => s.id === r.shift_a_id)
      const sb = shifts.find((s) => s.id === r.shift_b_id)
      return {
        ...r, requester_name: empName(r.requester_id), requester_picture: null, target_name: empName(r.target_id), target_picture: null,
        shift_a_date: sa?.date, shift_a_type: sa?.shift_type, shift_b_date: sb?.date, shift_b_type: sb?.shift_type,
      }
    })
  },
  async requestSwap(data) {
    await delay()
    const u = currentUser()
    if (!u?.employee_id) throw badReq('لا يوجد موظف مرتبط بهذا الحساب')
    if (Number(data.target_id) === u.employee_id) throw badReq('لا يمكن تبديل الوردية مع نفسك')
    const shiftA = shifts.find((s) => s.id === Number(data.shift_a_id))
    if (!shiftA || shiftA.employee_id !== u.employee_id) throw badReq('الوردية الأولى غير صحيحة')
    const shiftB = shifts.find((s) => s.id === Number(data.shift_b_id))
    if (!shiftB || shiftB.employee_id !== Number(data.target_id)) throw badReq('وردية الزميل غير صحيحة')
    const r = { id: swapSeq++, requester_id: u.employee_id, shift_a_id: shiftA.id, target_id: Number(data.target_id), shift_b_id: shiftB.id, reason: data.reason || null, status: 'بانتظار موافقة الزميل', approved_by: null, approved_at: null, created_at: nowIso() }
    shiftSwapRequests.unshift(r)
    return { message: 'تم', swap: { id: r.id } }
  },
  async respondSwap(id, accept) {
    await delay()
    const r = shiftSwapRequests.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    const u = currentUser()
    if (r.target_id !== u?.employee_id) { const e = new Error('bad'); e.response = { status: 403, data: { error: 'غير مسموح' } }; throw e }
    if (r.status !== 'بانتظار موافقة الزميل') throw badReq('تمت المعالجة مسبقاً')
    r.status = accept ? 'بانتظار اعتماد المدير' : 'مرفوض'
    return { message: 'تم' }
  },
  async approveSwap(id) {
    await delay()
    const r = shiftSwapRequests.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    if (!sameDeptEitherAsMe(currentUser(), r.requester_id, r.target_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (r.status !== 'بانتظار اعتماد المدير') throw badReq('يجب موافقة الزميل أولاً')
    const shiftA = shifts.find((s) => s.id === r.shift_a_id)
    const shiftB = shifts.find((s) => s.id === r.shift_b_id)
    if (shiftA) shiftA.employee_id = r.target_id
    if (shiftB) shiftB.employee_id = r.requester_id
    r.status = 'معتمد'
    r.approved_by = currentUser()?.employee_id || 5
    r.approved_at = nowIso()
    return { message: 'تم الاعتماد' }
  },
  async rejectSwap(id) {
    await delay()
    const r = shiftSwapRequests.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    if (!sameDeptEitherAsMe(currentUser(), r.requester_id, r.target_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (r.status === 'معتمد') throw badReq('تم الاعتماد مسبقاً')
    r.status = 'مرفوض'
    return { message: 'تم الرفض' }
  },
}

export const mockTimesheetsApi = {
  async list({ status } = {}) {
    await delay()
    let rows = scopeByRole(timesheets)
    if (status) rows = rows.filter((t) => t.status === status)
    const so = { 'مقدّم': 1, مسودة: 2, معتمد: 3, مرفوض: 4 }
    const list = [...rows].sort((a, b) => (so[a.status] - so[b.status]) || b.date.localeCompare(a.date))
      .map((t) => ({ ...t, full_name: empName(t.employee_id), job_title: employees.find((e) => e.id === t.employee_id)?.job_title, profile_picture: null, approved_by_name: empName(t.approved_by) }))
    const summary = list.reduce((s, r) => {
      s.totalHours += r.hours
      if (r.billable) s.billableHours += r.hours; else s.nonBillableHours += r.hours
      if (r.status === 'معتمد') s.approvedHours += r.hours
      if (r.status === 'مقدّم') s.pending += 1
      return s
    }, { totalHours: 0, billableHours: 0, nonBillableHours: 0, approvedHours: 0, pending: 0, count: list.length })
    return { timesheets: list, summary }
  },
  async create(data) { await delay(); const t = { id: tsSeq++, employee_id: currentUser()?.employee_id, billable: data.billable === false || data.billable === 0 ? 0 : 1, status: 'مسودة', approved_by: null, created_at: nowIso(), ...data }; timesheets.unshift(t); return { message: 'تم', timesheet: t } },
  async submit(id) { await delay(); const t = timesheets.find((x) => x.id === Number(id)); if (t) t.status = 'مقدّم'; return { message: 'تم' } },
  async submitRange(from, to) {
    await delay()
    const u = currentUser()
    let count = 0
    for (const t of timesheets) {
      if (t.employee_id === u?.employee_id && t.status === 'مسودة' && t.date >= from && t.date <= to) { t.status = 'مقدّم'; count += 1 }
    }
    return { message: 'تم', count }
  },
  async review(id, status) {
    await delay()
    const t = timesheets.find((x) => x.id === Number(id))
    if (!t) throw notFound()
    if (!sameDeptAsMe(currentUser(), t.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    t.status = status
    t.approved_by = currentUser()?.employee_id || 5
    return { message: 'تم' }
  },
  async remove(id) {
    await delay()
    const i = timesheets.findIndex((x) => x.id === Number(id))
    if (i === -1) throw notFound()
    const t = timesheets[i]
    const u = currentUser()
    const isOwner = t.employee_id === u?.employee_id
    if (!isOwner && !sameDeptAsMe(u, t.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    timesheets.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

const compTotal = (r) => r.base_salary + r.housing_allowance + r.transport_allowance + r.other_allowances + r.bonus
export const mockCompensationApi = {
  async list({ status } = {}) {
    await delay()
    let rows = scopeByRole(compensation)
    if (status) rows = rows.filter((c) => c.status === status)
    const items = [...rows]
      .sort((a, b) => (a.status === b.status ? b.base_salary - a.base_salary : a.status === 'نشط' ? -1 : 1))
      .map((c) => ({ ...c, total_salary: compTotal(c), full_name: empName(c.employee_id), job_title: employees.find((e) => e.id === c.employee_id)?.job_title, department_name: deptName(employees.find((e) => e.id === c.employee_id)?.department_id), profile_picture: null }))
    const active = items.filter((r) => r.status === 'نشط')
    const summary = {
      count: items.length,
      monthlyPayroll: active.reduce((s, r) => s + r.total_salary, 0),
      avgSalary: active.length ? Math.round(active.reduce((s, r) => s + r.total_salary, 0) / active.length) : 0,
      insured: active.filter((r) => r.insurance_class !== 'بدون').length,
    }
    return { compensation: items, summary }
  },
  async create(data) { await delay(); const c = { id: compSeq++, grade: 'الدرجة الأولى', base_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowances: 0, bonus: 0, insurance_class: 'الفئة أ', status: 'نشط', notes: null, created_by: currentUser()?.employee_id || 5, ...data, employee_id: Number(data.employee_id) }; compensation.unshift(c); return { message: 'تم', compensation: c } },
  async update(id, data) {
    await delay()
    const c = compensation.find((x) => x.id === Number(id))
    if (!c) return { message: 'تم التحديث' }
    const oldTotal = compTotal(c)
    const oldBase = c.base_salary
    const { change_reason, ...rest } = data
    Object.assign(c, rest)
    const newTotal = compTotal(c)
    if (newTotal !== oldTotal) {
      compensationHistory.unshift({ id: compHistSeq++, compensation_id: c.id, employee_id: c.employee_id, old_total: oldTotal, new_total: newTotal, old_base_salary: oldBase, new_base_salary: c.base_salary, reason: change_reason || null, changed_by: currentUser()?.employee_id || 5, created_at: nowIso() })
    }
    return { message: 'تم التحديث' }
  },
  async remove(id) { await delay(); const i = compensation.findIndex((x) => x.id === Number(id)); if (i > -1) compensation.splice(i, 1); return { message: 'تم الحذف' } },
  async history(id) {
    await delay()
    const c = compensation.find((x) => x.id === Number(id))
    if (!c) throw notFound()
    const u = currentUser()
    if (u && ['employee', 'candidate'].includes(u.role) && c.employee_id !== u.employee_id) { const e = new Error('bad'); e.response = { status: 403, data: { error: 'غير مسموح' } }; throw e }
    return compensationHistory.filter((h) => h.compensation_id === Number(id))
      .map((h) => ({ ...h, changed_by_name: empName(h.changed_by) }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },
}

export const mockCompensationRequestsApi = {
  async list({ status } = {}) {
    await delay()
    let rows = scopeByRole(compensationRequests)
    if (status) rows = rows.filter((r) => r.status === status)
    const list = [...rows]
      .sort((a, b) => (a.status === 'معلق' ? -1 : 1) - (b.status === 'معلق' ? -1 : 1) || b.id - a.id)
      .map((r) => ({
        ...r,
        full_name: empName(r.employee_id),
        job_title: employees.find((e) => e.id === r.employee_id)?.job_title,
        profile_picture: null,
        department_id: employees.find((e) => e.id === r.employee_id)?.department_id,
        requested_by_name: empName(r.requested_by),
        reviewed_by_name: empName(r.reviewed_by),
      }))
    const summary = { total: list.length, pending: list.filter((r) => r.status === 'معلق').length }
    return { requests: list, summary }
  },
  async create(data) {
    await delay()
    const empId = Number(data.employee_id)
    const amount = Number(data.requested_base_salary)
    if (!empId) throw badReq('الموظف مطلوب')
    if (!Number.isFinite(amount) || amount <= 0) throw badReq('الراتب المطلوب غير صالح')
    const pkg = compensation.find((c) => c.employee_id === empId && c.status === 'نشط')
    if (pkg && amount <= pkg.base_salary) throw badReq('الراتب المطلوب يجب أن يكون أعلى من الراتب الأساسي الحالي')
    const r = {
      id: compReqSeq++, employee_id: empId, compensation_id: pkg ? pkg.id : null,
      current_base_salary: pkg ? pkg.base_salary : 0, requested_base_salary: amount,
      reason: data.reason || null, status: 'معلق', requested_by: currentUser()?.employee_id || 5,
      reviewed_by: null, reviewed_at: null, created_at: nowIso(),
    }
    compensationRequests.unshift(r)
    return { message: 'تم', request: { id: r.id } }
  },
  async setStatus(id, status) {
    await delay()
    const r = compensationRequests.find((x) => x.id === Number(id))
    if (!r) throw notFound()
    r.status = status
    r.reviewed_by = currentUser()?.employee_id || 5
    r.reviewed_at = nowIso()
    if (status === 'معتمد') {
      const pkg = r.compensation_id ? compensation.find((c) => c.id === r.compensation_id) : null
      if (pkg) {
        const oldTotal = compTotal(pkg)
        const oldBase = pkg.base_salary
        pkg.base_salary = r.requested_base_salary
        const newTotal = compTotal(pkg)
        if (newTotal !== oldTotal) {
          compensationHistory.unshift({ id: compHistSeq++, compensation_id: pkg.id, employee_id: r.employee_id, old_total: oldTotal, new_total: newTotal, old_base_salary: oldBase, new_base_salary: r.requested_base_salary, reason: r.reason, changed_by: currentUser()?.employee_id || 5, created_at: nowIso() })
        }
      } else {
        compensation.unshift({ id: compSeq++, employee_id: r.employee_id, grade: 'الدرجة الأولى', base_salary: r.requested_base_salary, housing_allowance: 0, transport_allowance: 0, other_allowances: 0, bonus: 0, insurance_class: 'الفئة أ', status: 'نشط', notes: r.reason, created_by: currentUser()?.employee_id || 5 })
      }
    }
    return { message: 'تم' }
  },
  async remove(id) {
    await delay()
    const i = compensationRequests.findIndex((x) => x.id === Number(id))
    if (i > -1) compensationRequests.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

const riskOrder = { مرتفع: 1, متوسط: 2, منخفض: 3 }
const TALENT_BOXES = {
  '1-3': 'لغز (Enigma)', '2-3': 'صاعد (Growth)', '3-3': 'نجم (Star)',
  '1-2': 'أداء غير متسق', '2-2': 'أساسي (Core)', '3-2': 'أداء عالٍ',
  '1-1': 'مخاطرة (Risk)', '2-1': 'فعّال (Effective)', '3-1': 'خبير موثوق',
}
const talentReviews = {
  2: { performance: 3, potential: 3, notes: 'أداء وإمكانات عالية — مرشّح للقيادة' },
  6: { performance: 2, potential: 3, notes: 'إمكانات عالية بحاجة لتطوير الأداء' },
  3: { performance: 3, potential: 2, notes: 'أداء عالٍ ومستقر' },
  5: { performance: 3, potential: 3, notes: 'نجمة في الموارد البشرية' },
  10: { performance: 2, potential: 2, notes: 'أداء أساسي جيد' },
  4: { performance: 3, potential: 1, notes: 'خبير موثوق في مجاله' },
}
let talentHistSeq = 1
const talentReviewHistory = [
  { id: talentHistSeq++, employee_id: 6, performance: 1, potential: 2, notes: 'أداء غير متسق — يحتاج متابعة', changed_by: 5, created_at: addDays(-90) },
  { id: talentHistSeq++, employee_id: 6, performance: 2, potential: 3, notes: 'إمكانات عالية بحاجة لتطوير الأداء', changed_by: 5, created_at: addDays(-5) },
]
export const mockTalentGridApi = {
  async get() {
    await delay()
    const u = currentUser()
    let pool = employees.filter((e) => e.status === 'نشط')
    if (u?.role === 'department_head') pool = pool.filter((e) => e.department_id === myDept())
    const rows = pool.map((e) => ({
      id: e.id, full_name: e.full_name, job_title: e.job_title, profile_picture: null, department_name: deptName(e.department_id),
      performance: talentReviews[e.id]?.performance || null, potential: talentReviews[e.id]?.potential || null, notes: talentReviews[e.id]?.notes || null,
    }))
    const reviewed = rows.filter((r) => r.performance && r.potential)
    return {
      employees: rows, boxes: TALENT_BOXES,
      summary: { total: rows.length, reviewed: reviewed.length, unreviewed: rows.length - reviewed.length, stars: reviewed.filter((r) => r.performance === 3 && r.potential === 3).length, risks: reviewed.filter((r) => r.performance === 1 && r.potential === 1).length },
    }
  },
  async set(employeeId, data) {
    await delay()
    if (![1, 2, 3].includes(data.performance) || ![1, 2, 3].includes(data.potential)) throw badReq('التقييم يجب أن يكون 1-3')
    if (!sameDeptAsMe(currentUser(), Number(employeeId))) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const id = Number(employeeId)
    const existing = talentReviews[id]
    const moved = !existing || existing.performance !== data.performance || existing.potential !== data.potential
    talentReviews[id] = { performance: data.performance, potential: data.potential, notes: data.notes || null }
    if (moved) {
      talentReviewHistory.push({ id: talentHistSeq++, employee_id: id, performance: data.performance, potential: data.potential, notes: data.notes || null, changed_by: currentUser()?.employee_id || 5, created_at: nowIso() })
    }
    return { message: 'تم' }
  },
  async clear(employeeId) {
    await delay()
    if (!sameDeptAsMe(currentUser(), Number(employeeId))) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    delete talentReviews[Number(employeeId)]
    return { message: 'تم' }
  },
  async history(employeeId) {
    await delay()
    if (!sameDeptAsMe(currentUser(), Number(employeeId))) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    return talentReviewHistory
      .filter((h) => h.employee_id === Number(employeeId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((h) => ({ ...h, box: TALENT_BOXES[`${h.performance}-${h.potential}`], changed_by_name: empName(h.changed_by) }))
  },
}

const SKILL_LEVELS = { 1: 'مبتدئ', 2: 'أساسي', 3: 'كفؤ', 4: 'متقدم', 5: 'خبير' }
// employeeSkills[employeeId] = { skill: level }
const employeeSkills = {
  2: { 'إدارة المشاريع': 5, 'JavaScript': 4, 'قواعد البيانات': 4, 'القيادة': 4 },
  6: { 'JavaScript': 5, 'قواعد البيانات': 3, 'التواصل': 3, 'إدارة المشاريع': 2 },
  10: { 'JavaScript': 3, 'قواعد البيانات': 2, 'التواصل': 4 },
  3: { 'التحليل المالي': 5, 'Excel المتقدم': 4, 'إدارة المشاريع': 3, 'القيادة': 3 },
  5: { 'التوظيف': 5, 'التواصل': 5, 'القيادة': 4, 'إدارة المشاريع': 3 },
  4: { 'التفاوض': 5, 'التواصل': 4, 'Excel المتقدم': 2 },
}
let reqSkillSeq = 1
const roleRequiredSkills = [
  { id: reqSkillSeq++, job_title: 'مطور واجهات أمامية', skill: 'JavaScript', required_level: 4 },
  { id: reqSkillSeq++, job_title: 'مطور واجهات أمامية', skill: 'قواعد البيانات', required_level: 3 },
  { id: reqSkillSeq++, job_title: 'مطور برمجيات أول', skill: 'JavaScript', required_level: 4 },
  { id: reqSkillSeq++, job_title: 'مطور برمجيات أول', skill: 'القيادة', required_level: 3 },
]
export const mockSkillsApi = {
  async matrix() {
    await delay()
    const u = currentUser()
    let emps = employees.filter((e) => e.status === 'نشط')
    if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      emps = emps.filter((e) => e.department_id === dep)
    }
    const skillSet = new Map()
    const rows = emps.map((e) => {
      const sk = employeeSkills[e.id] || {}
      for (const [name, lv] of Object.entries(sk)) {
        const agg = skillSet.get(name) || { sum: 0, count: 0 }
        agg.sum += lv; agg.count += 1; skillSet.set(name, agg)
      }
      return { id: e.id, full_name: e.full_name, job_title: e.job_title, profile_picture: null, department_name: deptName(e.department_id), skills: { ...sk } }
    })
    const skills = [...skillSet.keys()].sort((a, b) => a.localeCompare(b, 'ar')).map((name) => {
      const agg = skillSet.get(name)
      return { name, avg: Number((agg.sum / agg.count).toFixed(1)), rated: agg.count }
    })
    const all = rows.flatMap((r) => Object.values(r.skills))
    return {
      employees: rows, skills, levels: SKILL_LEVELS,
      summary: { employees: rows.length, skills: skills.length, ratings: all.length, gaps: all.filter((l) => l <= 2).length, experts: all.filter((l) => l === 5).length },
    }
  },
  async me() {
    await delay()
    const empId = currentUser()?.employee_id
    const bag = (empId && employeeSkills[empId]) || {}
    const skills = Object.entries(bag)
      .map(([skill, level]) => ({ skill, level, label: SKILL_LEVELS[level] }))
      .sort((a, b) => b.level - a.level || a.skill.localeCompare(b.skill, 'ar'))
    return { skills, levels: SKILL_LEVELS, gaps: skills.filter((s) => s.level <= 2).length }
  },
  async set(employeeId, data) {
    await delay()
    const name = (data.skill || '').trim()
    if (!name) throw badReq('المهارة مطلوبة')
    if (![1, 2, 3, 4, 5].includes(data.level)) throw badReq('المستوى يجب أن يكون 1-5')
    if (!sameDeptAsMe(currentUser(), Number(employeeId))) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    ;(employeeSkills[Number(employeeId)] ||= {})[name] = data.level
    return { message: 'تم' }
  },
  async remove(employeeId, skill) {
    await delay()
    if (!sameDeptAsMe(currentUser(), Number(employeeId))) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const bag = employeeSkills[Number(employeeId)]
    if (bag) delete bag[(skill || '').trim()]
    return { message: 'تم' }
  },
  async requirements() {
    await delay()
    const rows = [...roleRequiredSkills].sort((a, b) => a.job_title.localeCompare(b.job_title, 'ar') || a.skill.localeCompare(b.skill, 'ar'))
    return { requirements: rows, levels: SKILL_LEVELS }
  },
  async setRequirement(data) {
    await delay()
    const job_title = (data.job_title || '').trim()
    const skill = (data.skill || '').trim()
    if (!job_title) throw badReq('المسمى الوظيفي مطلوب')
    if (!skill) throw badReq('المهارة مطلوبة')
    if (![1, 2, 3, 4, 5].includes(data.required_level)) throw badReq('المستوى يجب أن يكون 1-5')
    const existing = roleRequiredSkills.find((r) => r.job_title === job_title && r.skill === skill)
    if (existing) existing.required_level = data.required_level
    else roleRequiredSkills.push({ id: reqSkillSeq++, job_title, skill, required_level: data.required_level })
    return { message: 'تم' }
  },
  async removeRequirement(id) {
    await delay()
    const i = roleRequiredSkills.findIndex((r) => r.id === Number(id))
    if (i > -1) roleRequiredSkills.splice(i, 1)
    return { message: 'تم' }
  },
  async gaps() {
    await delay()
    const u = currentUser()
    let emps = employees.filter((e) => e.status === 'نشط')
    if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      emps = emps.filter((e) => e.department_id === dep)
    }
    const result = []
    for (const e of emps) {
      const reqs = roleRequiredSkills.filter((r) => r.job_title === e.job_title)
      if (reqs.length === 0) continue
      const actual = employeeSkills[e.id] || {}
      const shortfalls = reqs
        .filter((r) => (actual[r.skill] || 0) < r.required_level)
        .map((r) => ({ skill: r.skill, required_level: r.required_level, actual_level: actual[r.skill] || 0 }))
      if (shortfalls.length > 0) {
        result.push({ employee_id: e.id, full_name: e.full_name, job_title: e.job_title, profile_picture: null, department_name: deptName(e.department_id), shortfalls })
      }
    }
    const totalShortfalls = result.reduce((s, e) => s + e.shortfalls.length, 0)
    return { employees: result, summary: { employeesWithGaps: result.length, totalShortfalls }, levels: SKILL_LEVELS }
  },
}

const RECOMMENDATIONS = ['يوصى بشدة', 'يوصى', 'محايد', 'لا يوصى']
let scorecardSeq = 1
const scorecards = [
  { id: scorecardSeq++, application_id: 1, interviewer_id: 2, technical: 4, communication: 4, problem_solving: 4, culture_fit: 4, recommendation: 'يوصى', notes: 'أداء تقني جيد ومهارات تواصل ممتازة.', created_at: nowIso() },
  { id: scorecardSeq++, application_id: 1, interviewer_id: 5, technical: 2, communication: 2, problem_solving: 2, culture_fit: 3, recommendation: 'لا يوصى', notes: 'أرى فجوات واضحة في الأساسيات لم يستطع تجاوزها.', created_at: nowIso() },
  { id: scorecardSeq++, application_id: 3, interviewer_id: 2, technical: 5, communication: 5, problem_solving: 4, culture_fit: 5, recommendation: 'يوصى بشدة', notes: 'من أفضل من قابلنا هذا الربع.', created_at: nowIso() },
  { id: scorecardSeq++, application_id: 3, interviewer_id: 4, technical: 5, communication: 4, problem_solving: 5, culture_fit: 5, recommendation: 'يوصى بشدة', notes: 'حل المسائل التقنية بسرعة وثقة عالية.', created_at: nowIso() },
  { id: scorecardSeq++, application_id: 6, interviewer_id: 5, technical: 4, communication: 5, problem_solving: 3, culture_fit: 4, recommendation: 'يوصى', notes: 'خبرة جيدة في التوظيف، تحتاج دعماً في القرارات الصعبة.', created_at: nowIso() },
]
const scOverall = (r) => Number(((r.technical + r.communication + r.problem_solving + r.culture_fit) / 4).toFixed(2))
export const mockScorecardsApi = {
  async get(applicationId) {
    await delay()
    const app = applications.find((a) => a.id === Number(applicationId))
    if (!app) { const err = new Error('bad'); err.response = { status: 404, data: { error: 'الطلب غير موجود' } }; throw err }
    const rows = scorecards.filter((s) => s.application_id === Number(applicationId))
      .map((s) => ({ ...s, overall: scOverall(s), interviewer_name: empName(s.interviewer_id), interviewer_title: employees.find((e) => e.id === s.interviewer_id)?.job_title, interviewer_picture: null }))
    const n = rows.length
    const averages = n === 0 ? null : {
      technical: Number((rows.reduce((s, r) => s + r.technical, 0) / n).toFixed(2)),
      communication: Number((rows.reduce((s, r) => s + r.communication, 0) / n).toFixed(2)),
      problem_solving: Number((rows.reduce((s, r) => s + r.problem_solving, 0) / n).toFixed(2)),
      culture_fit: Number((rows.reduce((s, r) => s + r.culture_fit, 0) / n).toFixed(2)),
      overall: Number((rows.reduce((s, r) => s + r.overall, 0) / n).toFixed(2)),
    }
    const recommendationCounts = RECOMMENDATIONS.reduce((acc, r) => { acc[r] = rows.filter((x) => x.recommendation === r).length; return acc }, {})
    const spread = n > 1 ? Math.max(...rows.map((r) => r.overall)) - Math.min(...rows.map((r) => r.overall)) : 0
    const u = currentUser()
    const mine = u?.employee_id ? rows.find((r) => r.interviewer_id === u.employee_id) || null : null
    return { candidate_name: app.candidate_name, scorecards: rows, averages, recommendationCounts, disagreement: spread >= 1.5, mine }
  },
  async submit(applicationId, data) {
    await delay()
    const u = currentUser()
    if (!u?.employee_id) throw badReq('لا يوجد موظف مرتبط بهذا الحساب')
    for (const key of ['technical', 'communication', 'problem_solving', 'culture_fit']) {
      const v = parseInt(data[key], 10)
      if (!(v >= 1 && v <= 5)) throw badReq(`${key} يجب أن يكون 1-5`)
    }
    if (!RECOMMENDATIONS.includes(data.recommendation)) throw badReq('توصية غير صالحة')
    const existing = scorecards.find((s) => s.application_id === Number(applicationId) && s.interviewer_id === u.employee_id)
    if (existing) {
      Object.assign(existing, { technical: data.technical, communication: data.communication, problem_solving: data.problem_solving, culture_fit: data.culture_fit, recommendation: data.recommendation, notes: data.notes || null })
    } else {
      scorecards.push({ id: scorecardSeq++, application_id: Number(applicationId), interviewer_id: u.employee_id, technical: data.technical, communication: data.communication, problem_solving: data.problem_solving, culture_fit: data.culture_fit, recommendation: data.recommendation, notes: data.notes || null, created_at: nowIso() })
    }
    return { message: 'تم' }
  },
  async remove(applicationId) {
    await delay()
    const u = currentUser()
    const idx = scorecards.findIndex((s) => s.application_id === Number(applicationId) && s.interviewer_id === u?.employee_id)
    if (idx >= 0) scorecards.splice(idx, 1)
    return { message: 'تم' }
  },
}

export const mockSuccessionApi = {
  async list({ status } = {}) {
    await delay()
    const u = currentUser()
    if (u && ['employee', 'candidate'].includes(u.role)) return { succession: [], summary: { count: 0, atRisk: 0, readyNow: 0, noSuccessor: 0 } }
    let rows = [...succession]
    if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      rows = rows.filter((s) => s.department_id === dep)
    }
    if (status) rows = rows.filter((s) => s.status === status)
    const list = rows
      .sort((a, b) => (riskOrder[a.risk_level] - riskOrder[b.risk_level]) || b.id - a.id)
      .map((s) => ({
        ...s,
        department_name: deptName(s.department_id),
        incumbent_name: empName(s.incumbent_id),
        incumbent_job_title: employees.find((e) => e.id === s.incumbent_id)?.job_title || null,
        successor_name: empName(s.successor_id),
        successor_job_title: employees.find((e) => e.id === s.successor_id)?.job_title || null,
      }))
    const summary = list.reduce((acc, r) => {
      acc.count += 1
      if (r.status === 'نشط' && r.risk_level === 'مرتفع') acc.atRisk += 1
      if (r.status === 'نشط' && r.readiness === 'جاهز الآن') acc.readyNow += 1
      if (r.status === 'نشط' && !r.successor_id) acc.noSuccessor += 1
      return acc
    }, { count: 0, atRisk: 0, readyNow: 0, noSuccessor: 0 })
    return { succession: list, summary }
  },
  async create(data) {
    await delay()
    const u = currentUser()
    if (!deptIdInMyScope(u, data.department_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (data.successor_id && data.incumbent_id && Number(data.successor_id) === Number(data.incumbent_id)) throw badReq('لا يمكن أن يكون الموظف خليفة لنفسه')
    const s = { id: succSeq++, readiness: 'خلال سنة', risk_level: 'متوسط', potential: 'أداء عالٍ', status: 'نشط', notes: null, created_by: u?.employee_id || 5, ...data, department_id: data.department_id ? Number(data.department_id) : null, incumbent_id: data.incumbent_id ? Number(data.incumbent_id) : null, successor_id: data.successor_id ? Number(data.successor_id) : null }
    succession.unshift(s)
    return { message: 'تم', succession: s }
  },
  async update(id, data) {
    await delay()
    const s = succession.find((x) => x.id === Number(id))
    if (!s) throw notFound()
    const u = currentUser()
    if (!deptIdInMyScope(u, s.department_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (data.department_id !== undefined && !deptIdInMyScope(u, data.department_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const nextIncumbent = data.incumbent_id !== undefined ? data.incumbent_id : s.incumbent_id
    const nextSuccessor = data.successor_id !== undefined ? data.successor_id : s.successor_id
    if (nextSuccessor && nextIncumbent && Number(nextSuccessor) === Number(nextIncumbent)) throw badReq('لا يمكن أن يكون الموظف خليفة لنفسه')
    Object.assign(s, data)
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const s = succession.find((x) => x.id === Number(id))
    if (!s) throw notFound()
    if (!deptIdInMyScope(currentUser(), s.department_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const i = succession.findIndex((x) => x.id === Number(id))
    if (i > -1) succession.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

const orgProfile = {
  id: 1,
  name: 'كوانت للموارد البشرية',
  legal_name: 'شركة كوانت لتقنية الموارد البشرية',
  cr_number: '1010123456',
  tax_number: '300012345600003',
  industry: 'التقنية والبرمجيات',
  size: '201-500 موظف',
  founded_year: 2018,
  about: 'منصة سعودية متكاملة لإدارة الموارد البشرية تخدم المؤسسات في المملكة والخليج.',
  phone: '+966 11 234 5678',
  email: 'info@quant-hr.com',
  website: 'https://quant-hr.com',
  address: 'طريق الملك فهد، حي العليا',
  city: 'الرياض',
  country: 'السعودية',
}
let branchSeq = 1
const branches = [
  { id: branchSeq++, name: 'المقر الرئيسي', city: 'الرياض', address: 'طريق الملك فهد، حي العليا', phone: '+966 11 234 5678', manager_id: 1, is_headquarters: 1, status: 'نشط' },
  { id: branchSeq++, name: 'فرع جدة', city: 'جدة', address: 'طريق الأمير سلطان', phone: '+966 12 345 6789', manager_id: 4, is_headquarters: 0, status: 'نشط' },
  { id: branchSeq++, name: 'فرع الدمام', city: 'الدمام', address: 'شارع الملك سعود', phone: '+966 13 456 7890', manager_id: 9, is_headquarters: 0, status: 'نشط' },
]

export const mockCompanyApi = {
  async get() {
    await delay()
    const list = [...branches]
      .sort((a, b) => b.is_headquarters - a.is_headquarters || a.id - b.id)
      .map((b) => ({ ...b, manager_name: empName(b.manager_id), manager_job_title: employees.find((e) => e.id === b.manager_id)?.job_title || null }))
    return { profile: { ...orgProfile }, branches: list }
  },
  async updateProfile(data) { await delay(); Object.assign(orgProfile, data); return { message: 'تم التحديث', profile: { ...orgProfile } } },
  async createBranch(data) { await delay(); const b = { id: branchSeq++, city: null, address: null, phone: null, status: 'نشط', ...data, is_headquarters: data.is_headquarters ? 1 : 0, manager_id: data.manager_id ? Number(data.manager_id) : null }; branches.push(b); return { message: 'تم', branch: b } },
  async updateBranch(id, data) { await delay(); const b = branches.find((x) => x.id === Number(id)); if (b) Object.assign(b, data, { is_headquarters: data.is_headquarters !== undefined ? (data.is_headquarters ? 1 : 0) : b.is_headquarters, manager_id: data.manager_id !== undefined ? (data.manager_id ? Number(data.manager_id) : null) : b.manager_id }); return { message: 'تم التحديث' } },
  async removeBranch(id) { await delay(); const i = branches.findIndex((x) => x.id === Number(id)); if (i > -1) branches.splice(i, 1); return { message: 'تم الحذف' } },
}

const orgSettings = {
  id: 1,
  currency: 'ريال سعودي',
  timezone: 'Asia/Riyadh',
  language: 'العربية',
  week_start: 'الأحد',
  fiscal_year_start: 'يناير',
  work_days_per_week: 5,
  work_hours_per_day: 8,
  probation_months: 3,
  annual_leave_days: 30,
  sick_leave_days: 30,
  overtime_enabled: 1,
  remote_work_enabled: 1,
  two_factor_required: 0,
  self_service_enabled: 1,
  wps_establishment_id: '7001234567',
  wps_bank_code: 'NCB',
  wps_employer_iban: 'SA4420000001234567891234',
}
const settingsRoles = [
  { role: 'super_admin', label: 'مدير المنصة', scope: 'كامل المنصة', access: ['إدارة المؤسسات', 'الفوترة', 'إعدادات النظام', 'الوصول الكامل'] },
  { role: 'admin', label: 'مدير النظام', scope: 'المؤسسة بالكامل', access: ['إدارة الموظفين', 'الإعدادات', 'التقارير', 'الرواتب'] },
  { role: 'hr_manager', label: 'مدير الموارد البشرية', scope: 'الموارد البشرية', access: ['إدارة الموظفين', 'التوظيف', 'الإجازات', 'المستندات'] },
  { role: 'department_head', label: 'رئيس قسم', scope: 'القسم', access: ['اعتماد الطلبات', 'متابعة الفريق', 'التقييمات'] },
  { role: 'employee', label: 'موظف', scope: 'ذاتي', access: ['الخدمة الذاتية', 'الطلبات', 'قسائم الراتب'] },
  { role: 'candidate', label: 'مرشح', scope: 'التوظيف', access: ['التقديم على الوظائف', 'متابعة الطلب'] },
]
const boolFields = ['overtime_enabled', 'remote_work_enabled', 'two_factor_required', 'self_service_enabled']
const intFields = ['work_days_per_week', 'work_hours_per_day', 'probation_months', 'annual_leave_days', 'sick_leave_days']
export const mockSettingsApi = {
  async get() { await delay(); return { settings: { ...orgSettings }, roles: settingsRoles } },
  async update(data) {
    await delay()
    for (const [k, v] of Object.entries(data)) {
      if (boolFields.includes(k)) orgSettings[k] = v ? 1 : 0
      else if (intFields.includes(k)) orgSettings[k] = parseInt(v, 10) || 0
      else if (k in orgSettings) orgSettings[k] = v
    }
    return { message: 'تم التحديث', settings: { ...orgSettings } }
  },
}

let obSeq = 1
let obTaskSeq = 1
const onboarding = [
  {
    id: obSeq++, employee_id: 6, start_date: addDays(-10), buddy_id: 2, status: 'قيد التنفيذ', notes: 'موظف جديد في فريق التطوير', created_by: 5,
    tasks: [
      { id: obTaskSeq++, title: 'استكمال العقد والمستندات الرسمية', category: 'مستندات', owner: 'الموارد البشرية', due_date: addDays(-10), is_done: 1 },
      { id: obTaskSeq++, title: 'فتح حساب البريد الإلكتروني والأنظمة', category: 'تجهيزات', owner: 'تقنية المعلومات', due_date: addDays(-9), is_done: 1 },
      { id: obTaskSeq++, title: 'تجهيز جهاز الحاسب ومكان العمل', category: 'تجهيزات', owner: 'تقنية المعلومات', due_date: addDays(-9), is_done: 1 },
      { id: obTaskSeq++, title: 'جلسة تعريفية بالمؤسسة والسياسات', category: 'تعريف', owner: 'الموارد البشرية', due_date: addDays(-8), is_done: 0 },
      { id: obTaskSeq++, title: 'التعريف بالفريق والمدير المباشر', category: 'تعريف', owner: 'المدير', due_date: addDays(-8), is_done: 0 },
      { id: obTaskSeq++, title: 'التدريب على المهام الأساسية للوظيفة', category: 'تدريب', owner: 'المدير', due_date: addDays(-5), is_done: 0 },
    ],
  },
  {
    id: obSeq++, employee_id: 10, start_date: addDays(-3), buddy_id: 4, status: 'قيد التنفيذ', notes: 'موظف جديد في فريق المبيعات', created_by: 5,
    tasks: [
      { id: obTaskSeq++, title: 'استكمال العقد والمستندات الرسمية', category: 'مستندات', owner: 'الموارد البشرية', due_date: addDays(-3), is_done: 1 },
      { id: obTaskSeq++, title: 'فتح حساب البريد الإلكتروني والأنظمة', category: 'تجهيزات', owner: 'تقنية المعلومات', due_date: addDays(-2), is_done: 0 },
      { id: obTaskSeq++, title: 'جلسة تعريفية بالمؤسسة والسياسات', category: 'تعريف', owner: 'الموارد البشرية', due_date: addDays(-1), is_done: 0 },
      { id: obTaskSeq++, title: 'التدريب على نظام إدارة العملاء', category: 'تدريب', owner: 'المدير', due_date: addDays(1), is_done: 0 },
    ],
  },
  {
    id: obSeq++, employee_id: 7, start_date: addDays(-40), buddy_id: 5, status: 'مكتمل', notes: 'اكتملت التهيئة بنجاح', created_by: 5,
    tasks: [
      { id: obTaskSeq++, title: 'استكمال العقد والمستندات الرسمية', category: 'مستندات', owner: 'الموارد البشرية', due_date: addDays(-40), is_done: 1 },
      { id: obTaskSeq++, title: 'فتح حساب البريد الإلكتروني والأنظمة', category: 'تجهيزات', owner: 'تقنية المعلومات', due_date: addDays(-39), is_done: 1 },
      { id: obTaskSeq++, title: 'جلسة تعريفية بالمؤسسة والسياسات', category: 'تعريف', owner: 'الموارد البشرية', due_date: addDays(-38), is_done: 1 },
    ],
  },
]

const OB_DEFAULT_TASKS = [
  { title: 'استكمال العقد والمستندات الرسمية', category: 'مستندات', owner: 'الموارد البشرية' },
  { title: 'فتح حساب البريد الإلكتروني والأنظمة', category: 'تجهيزات', owner: 'تقنية المعلومات' },
  { title: 'تجهيز جهاز الحاسب ومكان العمل', category: 'تجهيزات', owner: 'تقنية المعلومات' },
  { title: 'جلسة تعريفية بالمؤسسة والسياسات', category: 'تعريف', owner: 'الموارد البشرية' },
  { title: 'التعريف بالفريق والمدير المباشر', category: 'تعريف', owner: 'المدير' },
  { title: 'التدريب على المهام الأساسية للوظيفة', category: 'تدريب', owner: 'المدير' },
]

function obProgress(p) {
  const total = p.tasks.length
  const done = p.tasks.filter((t) => t.is_done).length
  return {
    id: p.id,
    employee_id: p.employee_id,
    start_date: p.start_date,
    buddy_id: p.buddy_id,
    status: p.status,
    notes: p.notes,
    created_by: p.created_by,
    tasks_total: total,
    tasks_done: done,
    progress: total ? Math.round((done / total) * 100) : 0,
    full_name: empName(p.employee_id),
    job_title: employees.find((e) => e.id === p.employee_id)?.job_title || null,
    department_name: deptName(employees.find((e) => e.id === p.employee_id)?.department_id),
    buddy_name: empName(p.buddy_id),
    profile_picture: null,
  }
}
const obStatusOrder = { متأخر: 1, 'قيد التنفيذ': 2, مكتمل: 3, ملغى: 4 }
function findTask(taskId) {
  for (const p of onboarding) {
    const t = p.tasks.find((x) => x.id === Number(taskId))
    if (t) return { plan: p, task: t }
  }
  return {}
}
// Keeps "متأخر" in sync with reality, mirroring the backend: a plan moves
// there once it has an incomplete task past its due date, and moves back
// to "قيد التنفيذ" once it no longer does.
function obSyncOverdueStatuses() {
  const today = addDays(0)
  const hasOverdueTask = (p) => p.tasks.some((t) => !t.is_done && t.due_date && t.due_date < today)
  for (const p of onboarding) {
    if (p.status === 'قيد التنفيذ' && hasOverdueTask(p)) p.status = 'متأخر'
    else if (p.status === 'متأخر' && !hasOverdueTask(p)) p.status = 'قيد التنفيذ'
  }
}

export const mockOnboardingApi = {
  async list({ status } = {}) {
    await delay()
    obSyncOverdueStatuses()
    let rows = scopeByRole(onboarding)
    if (status) rows = rows.filter((p) => p.status === status)
    const plans = rows
      .slice()
      .sort((a, b) => (obStatusOrder[a.status] - obStatusOrder[b.status]) || (b.start_date || '').localeCompare(a.start_date || ''))
      .map(obProgress)
    const summary = plans.reduce((s, p) => {
      s.total += 1
      if (p.status === 'قيد التنفيذ') s.active += 1
      if (p.status === 'مكتمل') s.completed += 1
      if (p.status === 'متأخر') s.overdue += 1
      return s
    }, { total: 0, active: 0, completed: 0, overdue: 0 })
    return { onboarding: plans, summary }
  },
  async get(id) {
    await delay()
    obSyncOverdueStatuses()
    const p = onboarding.find((x) => x.id === Number(id))
    if (!p) throw notFound()
    return { ...obProgress(p), tasks: p.tasks.slice() }
  },
  async create(data) {
    await delay()
    const u = currentUser()
    if (!sameDeptAsMe(u, Number(data.employee_id))) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const list = Array.isArray(data.tasks) && data.tasks.length ? data.tasks : OB_DEFAULT_TASKS
    const p = {
      id: obSeq++, employee_id: Number(data.employee_id), start_date: data.start_date || null,
      buddy_id: data.buddy_id ? Number(data.buddy_id) : null, status: 'قيد التنفيذ', notes: data.notes || null,
      created_by: u?.employee_id || 5,
      tasks: list.map((t) => ({ id: obTaskSeq++, title: t.title, category: t.category || 'أخرى', owner: t.owner || 'الموارد البشرية', due_date: t.due_date || data.start_date || null, is_done: 0 })),
    }
    onboarding.unshift(p)
    return { message: 'تم', onboarding: { id: p.id } }
  },
  async update(id, data) {
    await delay()
    const p = onboarding.find((x) => x.id === Number(id))
    if (!p) return { message: 'تم التحديث' }
    if (!sameDeptAsMe(currentUser(), p.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (data.start_date !== undefined) p.start_date = data.start_date; if (data.buddy_id !== undefined) p.buddy_id = data.buddy_id ? Number(data.buddy_id) : null; if (data.status !== undefined) p.status = data.status; if (data.notes !== undefined) p.notes = data.notes
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const p = onboarding.find((x) => x.id === Number(id))
    if (!p) throw notFound()
    if (!sameDeptAsMe(currentUser(), p.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const i = onboarding.findIndex((x) => x.id === Number(id))
    if (i > -1) onboarding.splice(i, 1)
    return { message: 'تم الحذف' }
  },
  async addTask(id, data) {
    await delay()
    const p = onboarding.find((x) => x.id === Number(id))
    if (!p) throw notFound()
    if (!sameDeptAsMe(currentUser(), p.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const t = { id: obTaskSeq++, title: data.title, category: data.category || 'أخرى', owner: data.owner || 'الموارد البشرية', due_date: data.due_date || null, is_done: 0 }
    p.tasks.push(t)
    return { message: 'تم', task: { id: t.id } }
  },
  async updateTask(taskId, data) {
    await delay()
    const { plan, task } = findTask(taskId)
    if (!task) throw notFound()
    if (!sameDeptAsMe(currentUser(), plan?.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (data.title !== undefined) task.title = data.title
    if (data.category !== undefined) task.category = data.category
    if (data.owner !== undefined) task.owner = data.owner
    if (data.due_date !== undefined) task.due_date = data.due_date
    if (data.is_done !== undefined) task.is_done = data.is_done ? 1 : 0
    if (plan && plan.status !== 'ملغى') {
      const allDone = plan.tasks.length > 0 && plan.tasks.every((t) => t.is_done)
      if (allDone) plan.status = 'مكتمل'
      else if (plan.status === 'مكتمل') plan.status = 'قيد التنفيذ'
    }
    return { message: 'تم' }
  },
  async removeTask(taskId) {
    await delay()
    const { plan } = findTask(taskId)
    if (!plan) throw notFound()
    if (!sameDeptAsMe(currentUser(), plan.employee_id)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    plan.tasks = plan.tasks.filter((t) => t.id !== Number(taskId))
    return { message: 'تم الحذف' }
  },
}

let wfSeq = 1
let wfStepSeq = 1
const workflows = [
  {
    id: wfSeq++, name: 'اعتماد طلبات الإجازة', trigger_event: 'طلب إجازة', description: 'مسار اعتماد الإجازات على مرحلتين', is_active: 1, runs_count: 128, created_by: 5,
    steps: [
      { id: wfStepSeq++, name: 'موافقة المدير المباشر', action_type: 'موافقة', assignee: 'المدير المباشر', step_order: 1 },
      { id: wfStepSeq++, name: 'موافقة الموارد البشرية', action_type: 'موافقة', assignee: 'الموارد البشرية', step_order: 2 },
      { id: wfStepSeq++, name: 'إشعار الموظف بالنتيجة', action_type: 'إشعار', assignee: 'الموظف', step_order: 3 },
    ],
  },
  {
    id: wfSeq++, name: 'اعتماد المصروفات', trigger_event: 'طلب مصروف', description: 'اعتماد المصروفات والسلف المالية', is_active: 1, runs_count: 64, created_by: 5,
    steps: [
      { id: wfStepSeq++, name: 'موافقة المدير المباشر', action_type: 'موافقة', assignee: 'المدير المباشر', step_order: 1 },
      { id: wfStepSeq++, name: 'موافقة المالية', action_type: 'موافقة', assignee: 'الإدارة المالية', step_order: 2 },
    ],
  },
  {
    id: wfSeq++, name: 'تهيئة الموظف الجديد', trigger_event: 'تعيين موظف', description: 'أتمتة مهام تهيئة الموظفين الجدد', is_active: 1, runs_count: 12, created_by: 5,
    steps: [
      { id: wfStepSeq++, name: 'إسناد مهام التهيئة', action_type: 'إسناد مهمة', assignee: 'الموارد البشرية', step_order: 1 },
      { id: wfStepSeq++, name: 'تجهيز الحسابات والأجهزة', action_type: 'إسناد مهمة', assignee: 'تقنية المعلومات', step_order: 2 },
      { id: wfStepSeq++, name: 'إشعار المدير المباشر', action_type: 'إشعار', assignee: 'المدير المباشر', step_order: 3 },
    ],
  },
  {
    id: wfSeq++, name: 'إجراءات إنهاء الخدمة', trigger_event: 'إنهاء خدمة', description: 'مسار إنهاء الخدمة والمخالصة', is_active: 0, runs_count: 5, created_by: 5,
    steps: [
      { id: wfStepSeq++, name: 'استرجاع العهد والأجهزة', action_type: 'إسناد مهمة', assignee: 'تقنية المعلومات', step_order: 1 },
      { id: wfStepSeq++, name: 'المخالصة المالية', action_type: 'موافقة', assignee: 'الإدارة المالية', step_order: 2 },
      { id: wfStepSeq++, name: 'تحديث حالة الموظف', action_type: 'تحديث حالة', assignee: 'الموارد البشرية', step_order: 3 },
    ],
  },
]

function wfSummaryShape(w) {
  return {
    id: w.id, name: w.name, trigger_event: w.trigger_event, description: w.description,
    is_active: w.is_active, runs_count: w.runs_count, created_by: w.created_by,
    created_by_name: empName(w.created_by), steps_count: w.steps.length,
  }
}

let wfCondSeq = 1
const workflowConditions = [] // { id, workflow_id, field, operator, value }
let wfRunSeq = 1
const workflowRuns = [] // { id, workflow_id, employee_id, trigger_event, matched, actions_executed, detail: [...], created_at }

function wfEmployeeFieldValue(employeeId, field) {
  const e = employees.find((x) => x.id === employeeId)
  if (!e) return null
  if (field === 'department') return deptName(e.department_id)
  return e[field] ?? null
}
function wfEvaluateCondition(cond, employeeId) {
  const actual = wfEmployeeFieldValue(employeeId, cond.field)
  if (actual == null) return false
  switch (cond.operator) {
    case 'eq': return String(actual) === String(cond.value)
    case 'ne': return String(actual) !== String(cond.value)
    case 'gt': return Number(actual) > Number(cond.value)
    case 'lt': return Number(actual) < Number(cond.value)
    case 'contains': return String(actual).includes(cond.value)
    default: return false
  }
}
function wfFirstHrManagerId() {
  const entry = Object.values(users).find((u) => u.role === 'hr_manager' && u.employee_id)
  return entry ? entry.employee_id : null
}
function wfResolveAssignee(label, employeeId) {
  const l = (label || '').trim()
  if (/مدير/.test(l)) {
    const e = employees.find((x) => x.id === employeeId)
    return e?.manager_id || wfFirstHrManagerId()
  }
  if (/نفسه|^الموظف$/.test(l)) return employeeId
  return wfFirstHrManagerId()
}
function wfExecuteStep(step, employeeId) {
  try {
    if (step.action_type === 'إشعار') {
      const recipient = wfResolveAssignee(step.assignee, employeeId)
      if (!recipient) return { step_id: step.id, action_type: step.action_type, ok: false, note: 'لا يوجد مستلم' }
      pushNotification({ employee_id: recipient }, { title: step.name, message: step.name, type: 'info', link: null })
      return { step_id: step.id, action_type: step.action_type, ok: true, to: recipient }
    }
    if (step.action_type === 'إسناد مهمة') {
      const assignee = wfResolveAssignee(step.assignee, employeeId)
      if (!assignee) return { step_id: step.id, action_type: step.action_type, ok: false, note: 'لا يوجد مسؤول' }
      tasks.unshift({ id: taskSeq++, title: step.name, employee_id: assignee, status: 'جديدة', priority: 'متوسطة', due_date: addDays(3), created_at: nowIso() })
      return { step_id: step.id, action_type: step.action_type, ok: true, to: assignee }
    }
    if (step.action_type === 'موافقة') {
      if (!employeeId) return { step_id: step.id, action_type: step.action_type, ok: false, note: 'لا يوجد موظف مرتبط' }
      requests.unshift({ id: reqSeq++, employee_id: employeeId, type: 'أخرى', subject: step.name, details: 'أُنشئ تلقائياً عبر مسار عمل — يظهر في مركز الموافقات.', status: 'معلقة', response: null, resolved_by: null, resolved_at: null, created_at: nowIso() })
      return { step_id: step.id, action_type: step.action_type, ok: true }
    }
    return { step_id: step.id, action_type: step.action_type, ok: false, note: 'غير مُنفَّذ تلقائياً بعد' }
  } catch {
    return { step_id: step.id, action_type: step.action_type, ok: false, note: 'خطأ أثناء التنفيذ' }
  }
}
function wfRunWorkflow(wf, employeeId) {
  const conditions = workflowConditions.filter((c) => c.workflow_id === wf.id)
  const matched = employeeId != null && conditions.every((c) => wfEvaluateCondition(c, employeeId))
  const steps = matched ? wf.steps.slice().sort((a, b) => a.step_order - b.step_order) : []
  const executed = steps.map((s) => wfExecuteStep(s, employeeId))
  wf.runs_count += 1
  const run = { id: wfRunSeq++, workflow_id: wf.id, employee_id: employeeId || null, trigger_event: wf.trigger_event, matched, actions_executed: executed.filter((e) => e.ok).length, detail: executed, created_at: nowIso() }
  workflowRuns.unshift(run)
  return run
}
function wfRunWorkflowsFor(triggerEvent, employeeId) {
  for (const wf of workflows) {
    if (wf.trigger_event === triggerEvent && wf.is_active) wfRunWorkflow(wf, employeeId)
  }
}

export const mockAutomationApi = {
  async list() {
    await delay()
    const list = [...workflows].sort((a, b) => (b.is_active - a.is_active) || (b.id - a.id)).map(wfSummaryShape)
    const summary = list.reduce((s, w) => { s.total += 1; if (w.is_active) s.active += 1; s.totalRuns += w.runs_count; return s }, { total: 0, active: 0, totalRuns: 0 })
    return { workflows: list, summary }
  },
  async get(id) {
    await delay()
    const w = workflows.find((x) => x.id === Number(id))
    if (!w) throw notFound()
    const conditions = workflowConditions.filter((c) => c.workflow_id === w.id)
    const runs = workflowRuns.filter((r) => r.workflow_id === w.id).slice(0, 20).map((r) => ({ ...r, employee_name: empName(r.employee_id) }))
    return { ...wfSummaryShape(w), steps: w.steps.slice().sort((a, b) => a.step_order - b.step_order), conditions, runs }
  },
  async create(data) {
    await delay()
    const steps = Array.isArray(data.steps) ? data.steps : []
    const w = {
      id: wfSeq++, name: data.name, trigger_event: data.trigger_event || 'طلب إجازة', description: data.description || null,
      is_active: 1, runs_count: 0, created_by: currentUser()?.employee_id || 5,
      steps: steps.map((st, i) => ({ id: wfStepSeq++, name: st.name, action_type: st.action_type || 'موافقة', assignee: st.assignee || 'المدير المباشر', step_order: st.step_order || i + 1 })),
    }
    workflows.unshift(w)
    return { message: 'تم', workflow: { id: w.id } }
  },
  async update(id, data) {
    await delay()
    const w = workflows.find((x) => x.id === Number(id))
    if (w) { if (data.name !== undefined) w.name = data.name; if (data.trigger_event !== undefined) w.trigger_event = data.trigger_event; if (data.description !== undefined) w.description = data.description; if (data.is_active !== undefined) w.is_active = data.is_active ? 1 : 0 }
    return { message: 'تم التحديث' }
  },
  async run(id, employeeId) {
    await delay()
    const w = workflows.find((x) => x.id === Number(id))
    if (!w) throw notFound()
    if (!w.is_active) throw badReq('المسار غير مفعّل')
    if (!employeeId) throw badReq('اختر موظفاً لتجربة تشغيل المسار عليه')
    const emp = employees.find((e) => e.id === Number(employeeId))
    if (!emp) { const err = new Error('bad'); err.response = { status: 404, data: { error: 'الموظف غير موجود' } }; throw err }
    const run = wfRunWorkflow(w, Number(employeeId))
    return { message: run.matched ? 'تم التنفيذ' : 'الشروط لم تتحقق لهذا الموظف', runs_count: w.runs_count, run }
  },
  async remove(id) {
    await delay()
    const i = workflows.findIndex((x) => x.id === Number(id))
    if (i > -1) workflows.splice(i, 1)
    return { message: 'تم الحذف' }
  },
  async addStep(id, data) {
    await delay()
    const w = workflows.find((x) => x.id === Number(id))
    if (!w) throw notFound()
    const order = (w.steps.reduce((m, s) => Math.max(m, s.step_order), 0)) + 1
    const st = { id: wfStepSeq++, name: data.name, action_type: data.action_type || 'موافقة', assignee: data.assignee || 'المدير المباشر', step_order: order }
    w.steps.push(st)
    return { message: 'تم', step: { id: st.id } }
  },
  async removeStep(stepId) {
    await delay()
    for (const w of workflows) w.steps = w.steps.filter((s) => s.id !== Number(stepId))
    return { message: 'تم الحذف' }
  },
  async addCondition(id, data) {
    await delay()
    const w = workflows.find((x) => x.id === Number(id))
    if (!w) throw notFound()
    const fields = ['department', 'nationality', 'contract_type', 'salary', 'work_location', 'status']
    const ops = ['eq', 'ne', 'gt', 'lt', 'contains']
    if (!fields.includes(data.field)) throw badReq('Invalid field')
    if (!ops.includes(data.operator)) throw badReq('Invalid operator')
    if (!String(data.value ?? '').trim()) throw badReq('Value is required')
    const cond = { id: wfCondSeq++, workflow_id: w.id, field: data.field, operator: data.operator, value: String(data.value).trim() }
    workflowConditions.push(cond)
    return { message: 'تم', condition: { id: cond.id } }
  },
  async removeCondition(condId) {
    await delay()
    const i = workflowConditions.findIndex((c) => c.id === Number(condId))
    if (i > -1) workflowConditions.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

let intSeq = 1
const integrations = [
  { id: intSeq++, name: 'Slack', provider: 'Slack Technologies', category: 'تواصل', description: 'إرسال إشعارات الموارد البشرية إلى قنوات سلاك', is_connected: 1, status: 'متصل', last_sync: addDays(0) },
  { id: intSeq++, name: 'Google Workspace', provider: 'Google', category: 'تخزين', description: 'مزامنة المستخدمين والمستندات مع مساحة العمل', is_connected: 1, status: 'متصل', last_sync: addDays(-1) },
  { id: intSeq++, name: 'Microsoft 365', provider: 'Microsoft', category: 'تخزين', description: 'التكامل مع بريد وأدوات مايكروسوفت', is_connected: 0, status: 'غير متصل', last_sync: null },
  { id: intSeq++, name: 'QuickBooks', provider: 'Intuit', category: 'محاسبة', description: 'مزامنة الرواتب والمصروفات مع المحاسبة', is_connected: 0, status: 'غير متصل', last_sync: null },
  { id: intSeq++, name: 'Zoom', provider: 'Zoom Video', category: 'تواصل', description: 'جدولة مقابلات واجتماعات الفيديو', is_connected: 1, status: 'متصل', last_sync: addDays(-2) },
  { id: intSeq++, name: 'LinkedIn', provider: 'LinkedIn', category: 'توظيف', description: 'نشر الوظائف واستقطاب المرشحين', is_connected: 0, status: 'غير متصل', last_sync: null },
  { id: intSeq++, name: 'Google Calendar', provider: 'Google', category: 'تقويم', description: 'مزامنة الإجازات والمقابلات مع التقويم', is_connected: 1, status: 'متصل', last_sync: addDays(0) },
  { id: intSeq++, name: 'Active Directory', provider: 'Microsoft', category: 'مصادقة', description: 'الدخول الموحّد وإدارة الهوية', is_connected: 0, status: 'خطأ', last_sync: addDays(-5) },
]

let intSyncSeq = 1
const integrationSyncs = []

// Mirrors backend runCategorySync — a real, category-specific count from
// the mock system's own in-memory data, not a no-op timestamp bump.
function runCategorySyncMock(category) {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  switch (category) {
    case 'تواصل': {
      const n = notifications.filter((x) => new Date(x.created_at).getTime() >= oneDayAgo).length
      return { item_count: n, summary: `${n} إشعاراً أُرسل خلال آخر 24 ساعة` }
    }
    case 'تخزين':
      return { item_count: documents.length, summary: `${documents.length} مستنداً مخزَّناً` }
    case 'محاسبة': {
      const n = payrollRuns.filter((r) => ['معتمد', 'مصروف'].includes(r.status)).length
      return { item_count: n, summary: `${n} مسير رواتب معتمداً جاهزاً للتصدير المحاسبي` }
    }
    case 'توظيف': {
      const openJobs = jobs.filter((j) => j.status === 'مفتوحة').length
      return { item_count: openJobs + applications.length, summary: `${openJobs} وظيفة مفتوحة و${applications.length} طلب توظيف` }
    }
    case 'تقويم': {
      const in7 = addDays(7)
      const nowStr = today()
      const n = leaves.filter((l) => l.status === 'موافقة' && l.start_date >= nowStr && l.start_date <= in7).length
      return { item_count: n, summary: `${n} إجازة معتمدة خلال الأسبوع القادم` }
    }
    case 'مصادقة': {
      const n = Object.values(users).filter((u) => u.two_factor_enabled).length
      return { item_count: n, summary: `${n} مستخدماً مفعَّلاً لديه التحقق بخطوتين` }
    }
    default:
      return { item_count: 0, summary: 'لا توجد بيانات مرتبطة بهذه الفئة للمزامنة' }
  }
}

export const mockIntegrationsApi = {
  async list({ category } = {}) {
    await delay()
    let rows = [...integrations]
    if (category) rows = rows.filter((i) => i.category === category)
    rows.sort((a, b) => (b.is_connected - a.is_connected) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    const summary = rows.reduce((s, r) => { s.total += 1; if (r.is_connected) s.connected += 1; if (r.status === 'خطأ') s.errors += 1; return s }, { total: 0, connected: 0, errors: 0 })
    return { integrations: rows, summary }
  },
  async create(data) {
    await delay()
    const i = { id: intSeq++, name: data.name, provider: data.provider || null, category: data.category || 'أخرى', description: data.description || null, is_connected: 0, status: 'غير متصل', last_sync: null, last_sync_summary: null }
    integrations.push(i)
    return { message: 'تم', integration: { id: i.id } }
  },
  async setConnection(id, connect) {
    await delay()
    const i = integrations.find((x) => x.id === Number(id))
    if (!i) throw notFound()
    i.is_connected = connect ? 1 : 0
    i.status = connect ? 'متصل' : 'غير متصل'
    i.last_sync = connect ? nowIso() : null
    return { message: connect ? 'تم الربط' : 'تم الفصل' }
  },
  async sync(id) {
    await delay()
    const i = integrations.find((x) => x.id === Number(id))
    if (!i) throw notFound()
    if (!i.is_connected) throw badReq('التكامل غير مربوط')
    const result = runCategorySyncMock(i.category)
    i.last_sync = nowIso()
    i.status = 'متصل'
    i.last_sync_summary = result.summary
    integrationSyncs.unshift({ id: intSyncSeq++, integration_id: i.id, status: 'نجاح', summary: result.summary, item_count: result.item_count, created_at: i.last_sync })
    return { message: 'تمت المزامنة', last_sync: i.last_sync, ...result }
  },
  async syncs(id) {
    await delay()
    const i = integrations.find((x) => x.id === Number(id))
    if (!i) throw notFound()
    return { syncs: integrationSyncs.filter((s) => s.integration_id === i.id).slice(0, 20) }
  },
  async remove(id) {
    await delay()
    const idx = integrations.findIndex((x) => x.id === Number(id))
    if (idx > -1) integrations.splice(idx, 1)
    return { message: 'تم الحذف' }
  },
}

let surveySeq = 1
let surveyRespSeq = 1
const surveys = [
  { id: surveySeq++, title: 'استطلاع رضا الموظفين الربعي', description: 'قيّم مدى رضاك عن بيئة العمل والمزايا خلال الربع الحالي', audience: 'الكل', is_active: 1, anonymous: 1, created_by: 5 },
  { id: surveySeq++, title: 'تقييم برنامج العمل المرن', description: 'شاركنا رأيك في سياسة العمل عن بُعد والمرونة', audience: 'الكل', is_active: 1, anonymous: 0, created_by: 5 },
  { id: surveySeq++, title: 'استطلاع الفعاليات السنوية', description: 'اقترح فعاليات وأنشطة للعام القادم', audience: 'الكل', is_active: 0, anonymous: 0, created_by: 5 },
]
const surveyResponses = [
  { id: surveyRespSeq++, survey_id: 1, employee_id: 6, rating: 4, comment: 'بيئة عمل ممتازة بشكل عام', created_at: nowIso() },
  { id: surveyRespSeq++, survey_id: 1, employee_id: 10, rating: 5, comment: 'راضٍ جداً عن المزايا', created_at: nowIso() },
  { id: surveyRespSeq++, survey_id: 1, employee_id: 4, rating: 3, comment: 'تحتاج بعض الجوانب للتحسين', created_at: nowIso() },
  { id: surveyRespSeq++, survey_id: 2, employee_id: 6, rating: 5, comment: 'المرونة رفعت إنتاجيتي', created_at: nowIso() },
]
export const mockSurveysApi = {
  async list() {
    await delay()
    const u = currentUser()
    const isEmp = u && ['employee', 'candidate'].includes(u.role)
    let rows = [...surveys]
    if (isEmp) rows = rows.filter((s) => s.is_active)
    const list = rows.sort((a, b) => (b.is_active - a.is_active) || (b.id - a.id)).map((s) => {
      const rs = surveyResponses.filter((r) => r.survey_id === s.id)
      return {
        ...s,
        created_by_name: empName(s.created_by),
        responses_count: rs.length,
        avg_rating: rs.length ? Math.round((rs.reduce((x, r) => x + r.rating, 0) / rs.length) * 10) / 10 : null,
        responded: u ? (rs.some((r) => r.employee_id === u.employee_id) ? 1 : 0) : 0,
      }
    })
    const summary = list.reduce((a, s) => { a.total += 1; if (s.is_active) a.active += 1; a.responses += s.responses_count; return a }, { total: 0, active: 0, responses: 0 })
    return { surveys: list, summary }
  },
  async results(id) {
    await delay()
    const survey = surveys.find((s) => s.id === Number(id))
    if (!survey) throw notFound()
    const rows = surveyResponses.filter((r) => r.survey_id === Number(id))
      .map((r) => ({ ...r, full_name: empName(r.employee_id), job_title: employees.find((e) => e.id === r.employee_id)?.job_title || null }))
    const responses = survey.anonymous
      ? rows.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at }))
      : rows
    const count = rows.length
    const avg_rating = count ? Math.round((rows.reduce((x, r) => x + r.rating, 0) / count) * 100) / 100 : null
    const distribution = [1, 2, 3, 4, 5].reduce((acc, n) => { acc[n] = rows.filter((r) => r.rating === n).length; return acc }, {})
    return { survey, responses, stats: { count, avg_rating }, distribution }
  },
  async create(data) {
    await delay()
    const s = { id: surveySeq++, title: data.title, description: data.description || null, audience: data.audience || 'الكل', is_active: 1, anonymous: data.anonymous ? 1 : 0, created_by: currentUser()?.employee_id || 5 }
    surveys.unshift(s)
    return { message: 'تم', survey: { id: s.id } }
  },
  async update(id, data) {
    await delay()
    const s = surveys.find((x) => x.id === Number(id))
    if (s) {
      if (data.title !== undefined) s.title = data.title
      if (data.description !== undefined) s.description = data.description
      if (data.is_active !== undefined) s.is_active = data.is_active ? 1 : 0
      if (data.anonymous !== undefined) s.anonymous = data.anonymous ? 1 : 0
    }
    return { message: 'تم التحديث' }
  },
  async respond(id, data) {
    await delay()
    const s = surveys.find((x) => x.id === Number(id))
    if (!s) throw notFound()
    if (!s.is_active) throw badReq('الاستطلاع مغلق')
    const u = currentUser()
    if (!u?.employee_id) throw badReq('لا يوجد موظف مرتبط بالحساب')
    if (!data.rating || data.rating < 1 || data.rating > 5) throw badReq('التقييم (1-5) مطلوب')
    if (surveyResponses.some((r) => r.survey_id === Number(id) && r.employee_id === u.employee_id)) throw badReq('لقد شاركت في هذا الاستطلاع مسبقاً')
    surveyResponses.push({ id: surveyRespSeq++, survey_id: Number(id), employee_id: u.employee_id, rating: data.rating, comment: data.comment || null, created_at: nowIso() })
    return { message: 'تم' }
  },
  async remove(id) {
    await delay()
    const i = surveys.findIndex((x) => x.id === Number(id))
    if (i > -1) surveys.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

let sigSeq = 1
const signatures = [
  { id: sigSeq++, employee_id: 6, title: 'عقد العمل المحدّث 2026', doc_type: 'عقد', status: 'بانتظار التوقيع', requested_by: 5, signed_at: null, employee_signed_at: null, countersigner_id: null, countersigner_status: 'غير مطلوب', countersigned_at: null, created_at: nowIso() },
  { id: sigSeq++, employee_id: 6, title: 'سياسة استخدام الأجهزة', doc_type: 'سياسة', status: 'موقّع', requested_by: 5, signed_at: addDays(-3), employee_signed_at: addDays(-3), countersigner_id: null, countersigner_status: 'غير مطلوب', countersigned_at: null, created_at: nowIso() },
  { id: sigSeq++, employee_id: 10, title: 'إقرار السرية وحماية البيانات', doc_type: 'إقرار', status: 'بانتظار التوقيع', requested_by: 5, signed_at: null, employee_signed_at: null, countersigner_id: null, countersigner_status: 'غير مطلوب', countersigned_at: null, created_at: nowIso() },
  { id: sigSeq++, employee_id: 4, title: 'ملحق تعديل الراتب', doc_type: 'ملحق', status: 'موقّع', requested_by: 5, signed_at: addDays(-10), employee_signed_at: addDays(-11), countersigner_id: 5, countersigner_status: 'موقّع', countersigned_at: addDays(-10), created_at: nowIso() },
  { id: sigSeq++, employee_id: 10, title: 'خطاب ترقية', doc_type: 'خطاب', status: 'بانتظار التوقيع', requested_by: 5, signed_at: null, employee_signed_at: addDays(-1), countersigner_id: 2, countersigner_status: 'بانتظار التوقيع', countersigned_at: null, created_at: nowIso() },
  { id: sigSeq++, employee_id: 6, title: 'عقد سرية بيانات العملاء', doc_type: 'إقرار', status: 'بانتظار التوقيع', requested_by: 5, signed_at: null, employee_signed_at: null, countersigner_id: 2, countersigner_status: 'بانتظار الموظف', countersigned_at: null, created_at: nowIso() },
]
const sigStatusOrder = { 'بانتظار التوقيع': 1, 'موقّع': 2, مرفوض: 3 }

export const mockSignaturesApi = {
  async list({ status } = {}) {
    await delay()
    const u = currentUser()
    let rows = signatures
    if (u && ['employee', 'candidate'].includes(u.role)) {
      rows = rows.filter((s) => s.employee_id === u.employee_id || s.countersigner_id === u.employee_id)
    } else if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      rows = rows.filter((s) => employees.find((e) => e.id === s.employee_id)?.department_id === dep)
    }
    if (status) rows = rows.filter((s) => s.status === status)
    const list = [...rows].sort((a, b) => (sigStatusOrder[a.status] - sigStatusOrder[b.status]) || (b.id - a.id))
      .map((s) => ({ ...s, full_name: empName(s.employee_id), job_title: employees.find((e) => e.id === s.employee_id)?.job_title || null, requested_by_name: empName(s.requested_by), countersigner_name: empName(s.countersigner_id), profile_picture: null }))
    const summary = list.reduce((acc, r) => { acc.total += 1; if (r.status === 'بانتظار التوقيع') acc.pending += 1; if (r.status === 'موقّع') acc.signed += 1; return acc }, { total: 0, pending: 0, signed: 0 })
    return { signatures: list, summary }
  },
  async create(data) {
    await delay()
    if (data.countersigner_id && Number(data.countersigner_id) === Number(data.employee_id)) throw badReq('يجب أن يكون الموقّع المساعد مختلفاً عن الموظف')
    const s = {
      id: sigSeq++, employee_id: Number(data.employee_id), title: data.title, doc_type: data.doc_type || 'عقد', status: 'بانتظار التوقيع',
      requested_by: currentUser()?.employee_id || 5, signed_at: null, employee_signed_at: null,
      countersigner_id: data.countersigner_id ? Number(data.countersigner_id) : null,
      countersigner_status: data.countersigner_id ? 'بانتظار الموظف' : 'غير مطلوب', countersigned_at: null, created_at: nowIso(),
    }
    signatures.unshift(s)
    return { message: 'تم', signature: { id: s.id } }
  },
  async sign(id) {
    await delay()
    const s = signatures.find((x) => x.id === Number(id))
    if (!s) throw notFound()
    const u = currentUser()
    if (s.employee_id !== u?.employee_id) { const e = new Error('forbidden'); e.response = { status: 403, data: { error: 'غير مصرح' } }; throw e }
    if (s.status !== 'بانتظار التوقيع' || s.employee_signed_at) throw badReq('تمت المعالجة مسبقاً')
    s.employee_signed_at = nowIso()
    if (s.countersigner_id) { s.countersigner_status = 'بانتظار التوقيع' } else { s.status = 'موقّع'; s.signed_at = nowIso() }
    return { message: 'تم' }
  },
  async countersign(id) {
    await delay()
    const s = signatures.find((x) => x.id === Number(id))
    if (!s) throw notFound()
    const u = currentUser()
    if (s.countersigner_id !== u?.employee_id) { const e = new Error('forbidden'); e.response = { status: 403, data: { error: 'غير مصرح' } }; throw e }
    if (s.countersigner_status !== 'بانتظار التوقيع') throw badReq(s.countersigner_status === 'بانتظار الموظف' ? 'بانتظار توقيع الموظف أولاً' : 'تمت المعالجة مسبقاً')
    s.countersigner_status = 'موقّع'
    s.countersigned_at = nowIso()
    s.status = 'موقّع'
    s.signed_at = nowIso()
    return { message: 'تم' }
  },
  async decline(id) {
    await delay()
    const s = signatures.find((x) => x.id === Number(id))
    if (!s) throw notFound()
    const u = currentUser()
    if (s.employee_id === u?.employee_id && s.status === 'بانتظار التوقيع' && !s.employee_signed_at) {
      s.status = 'مرفوض'
      return { message: 'تم' }
    }
    if (s.countersigner_id === u?.employee_id && s.countersigner_status === 'بانتظار التوقيع') {
      s.status = 'مرفوض'; s.countersigner_status = 'مرفوض'
      return { message: 'تم' }
    }
    if (s.employee_id !== u?.employee_id && s.countersigner_id !== u?.employee_id) {
      const e = new Error('forbidden'); e.response = { status: 403, data: { error: 'غير مصرح' } }; throw e
    }
    throw badReq('تمت المعالجة مسبقاً')
  },
  async remove(id) {
    await delay()
    const i = signatures.findIndex((x) => x.id === Number(id))
    if (i > -1) signatures.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

// Accepts an explicit user (needed when acting as someone else, e.g. a
// delegated approver) and falls back to the real logged-in user otherwise —
// every existing myDept() call with no argument is unaffected.
const myDept = (asUser) => {
  const u = asUser || currentUser()
  return u ? employees.find((e) => e.id === u.employee_id)?.department_id : null
}
const isReviewer = () => ['admin', 'hr_manager', 'super_admin'].includes(currentUser()?.role)

// A department head's approval-inbox `pending()` list is already scoped to
// their own department, but approve/reject is a separate code path here —
// without this guard a department head who knows an ID from another
// department could still approve/reject it directly.
const sameDeptAsMe = (u, employeeId) => {
  if (u.role !== 'department_head') return true
  const d = myDept(u)
  return d != null && employees.find((e) => e.id === employeeId)?.department_id === d
}
const sameDeptEitherAsMe = (u, employeeIdA, employeeIdB) => {
  if (u.role !== 'department_head') return true
  const d = myDept(u)
  if (d == null) return false
  return employees.find((e) => e.id === employeeIdA)?.department_id === d || employees.find((e) => e.id === employeeIdB)?.department_id === d
}
// For records (like succession plans) that carry a department_id directly
// rather than via an employee lookup.
const deptIdInMyScope = (u, departmentId) => {
  if (u.role !== 'department_head') return true
  const d = myDept(u)
  return d != null && departmentId != null && d === Number(departmentId)
}

let hireSeq = 1
const hiringRequests = [
  { id: hireSeq++, requested_by: 2, department_id: 1, job_title: 'مطوّر واجهات أمامية', headcount: 2, employment_type: 'دوام كامل', urgency: 'عاجل', justification: 'توسّع فريق المنتج ومشاريع جديدة', status: 'معلق', reviewed_by: null, created_at: nowIso() },
  { id: hireSeq++, requested_by: 4, department_id: 4, job_title: 'أخصائي مبيعات', headcount: 1, employment_type: 'دوام كامل', urgency: 'عادي', justification: 'تغطية منطقة جديدة', status: 'موافق عليه', reviewed_by: 5, created_at: nowIso() },
  { id: hireSeq++, requested_by: 2, department_id: 1, job_title: 'مهندس اختبار جودة', headcount: 1, employment_type: 'عقد مؤقت', urgency: 'عادي', justification: 'دعم دورة إصدار كبيرة', status: 'مرفوض', reviewed_by: 5, created_at: nowIso() },
]
const hireStatusOrder = { معلق: 1, 'موافق عليه': 2, مرفوض: 3 }
export const mockHiringApi = {
  async list({ status } = {}) {
    await delay()
    let rows = [...hiringRequests]
    if (!isReviewer()) { const me = currentUser()?.employee_id; const dep = myDept(); rows = rows.filter((h) => h.requested_by === me || h.department_id === dep) }
    if (status) rows = rows.filter((h) => h.status === status)
    const list = rows.sort((a, b) => hireStatusOrder[a.status] - hireStatusOrder[b.status] || b.id - a.id)
      .map((h) => ({ ...h, department_name: deptName(h.department_id), requested_by_name: empName(h.requested_by), reviewed_by_name: empName(h.reviewed_by) }))
    const summary = list.reduce((s, r) => { s.total += 1; if (r.status === 'معلق') s.pending += 1; if (r.status === 'موافق عليه') s.approved += r.headcount; return s }, { total: 0, pending: 0, approved: 0 })
    return { hiring: list, summary }
  },
  async create(data) {
    await delay()
    const h = { id: hireSeq++, requested_by: currentUser()?.employee_id || 2, department_id: data.department_id ? Number(data.department_id) : myDept(), job_title: data.job_title, headcount: Number(data.headcount) || 1, employment_type: data.employment_type || 'دوام كامل', urgency: data.urgency || 'عادي', justification: data.justification || null, status: 'معلق', reviewed_by: null, created_at: nowIso() }
    hiringRequests.unshift(h)
    return { message: 'تم', hiring: { id: h.id } }
  },
  async setStatus(id, status) { await delay(); const h = hiringRequests.find((x) => x.id === Number(id)); if (!h) throw notFound(); h.status = status; h.reviewed_by = currentUser()?.employee_id || 5; return { message: 'تم' } },
  async remove(id) { await delay(); const i = hiringRequests.findIndex((x) => x.id === Number(id)); if (i > -1) hiringRequests.splice(i, 1); return { message: 'تم الحذف' } },
}

let ivSeq = 1
const interviews = [
  { id: ivSeq++, candidate_name: 'سلطان الحربي', job_title: 'مطوّر واجهات أمامية', interviewer_id: 2, scheduled_at: addDays(2), mode: 'فيديو', stage: 'فنية', status: 'مجدولة', rating: null, notes: null, created_by: 2 },
  { id: ivSeq++, candidate_name: 'منى العتيبي', job_title: 'أخصائي مبيعات', interviewer_id: 4, scheduled_at: addDays(1), mode: 'حضوري', stage: 'مبدئية', status: 'مجدولة', rating: null, notes: null, created_by: 4 },
  { id: ivSeq++, candidate_name: 'طارق القحطاني', job_title: 'مطوّر واجهات أمامية', interviewer_id: 2, scheduled_at: addDays(-3), mode: 'فيديو', stage: 'نهائية', status: 'مكتملة', rating: 4, notes: 'مرشّح قوي، يُنصح بالتعيين', created_by: 2 },
]
const ivStatusOrder = { مجدولة: 1, مكتملة: 2, ملغاة: 3 }
export const mockInterviewsApi = {
  async list({ status } = {}) {
    await delay()
    let rows = [...interviews]
    if (!isReviewer()) { const me = currentUser()?.employee_id; rows = rows.filter((i) => i.interviewer_id === me || i.created_by === me) }
    if (status) rows = rows.filter((i) => i.status === status)
    const list = rows.sort((a, b) => ivStatusOrder[a.status] - ivStatusOrder[b.status] || (b.scheduled_at || '').localeCompare(a.scheduled_at || ''))
      .map((i) => ({ ...i, interviewer_name: empName(i.interviewer_id) }))
    const summary = list.reduce((s, r) => { s.total += 1; if (r.status === 'مجدولة') s.scheduled += 1; if (r.status === 'مكتملة') s.completed += 1; return s }, { total: 0, scheduled: 0, completed: 0 })
    return { interviews: list, summary }
  },
  async create(data) {
    await delay()
    const iv = { id: ivSeq++, candidate_name: data.candidate_name, job_title: data.job_title || null, interviewer_id: data.interviewer_id ? Number(data.interviewer_id) : currentUser()?.employee_id || 2, scheduled_at: data.scheduled_at || null, mode: data.mode || 'حضوري', stage: data.stage || 'مبدئية', status: 'مجدولة', rating: null, notes: null, created_by: currentUser()?.employee_id || 2 }
    interviews.unshift(iv)
    return { message: 'تم', interview: { id: iv.id } }
  },
  async update(id, data) {
    await delay()
    const iv = interviews.find((x) => x.id === Number(id))
    if (!iv) throw notFound()
    const me = currentUser()?.employee_id
    if (!isReviewer() && iv.interviewer_id !== me && iv.created_by !== me) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    for (const k of ['candidate_name', 'job_title', 'interviewer_id', 'scheduled_at', 'mode', 'stage', 'status', 'rating', 'notes']) {
      if (data[k] !== undefined) iv[k] = data[k]
    }
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const iv = interviews.find((x) => x.id === Number(id))
    if (!iv) throw notFound()
    const me = currentUser()?.employee_id
    if (!isReviewer() && iv.interviewer_id !== me && iv.created_by !== me) {
      throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    }
    const i = interviews.findIndex((x) => x.id === Number(id))
    if (i > -1) interviews.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

let promoSeq = 1
const promotions = [
  { id: promoSeq++, employee_id: 6, type: 'ترقية', current_title: 'مطوّر برمجيات', new_title: 'مطوّر برمجيات أول', new_department_id: null, effective_date: addDays(20), justification: 'أداء متميز خلال العام', status: 'معلق', requested_by: 2, reviewed_by: null, created_at: nowIso() },
  { id: promoSeq++, employee_id: 10, type: 'نقل', current_title: 'مطوّر برمجيات', new_title: 'مطوّر برمجيات', new_department_id: 1, effective_date: addDays(15), justification: 'إعادة توزيع الكوادر حسب الحاجة', status: 'موافق عليه', requested_by: 4, reviewed_by: 5, created_at: nowIso() },
]
const promoStatusOrder = { معلق: 1, 'موافق عليه': 2, مرفوض: 3 }
export const mockPromotionsApi = {
  async list({ status } = {}) {
    await delay()
    let rows = [...promotions]
    if (!isReviewer()) { const me = currentUser()?.employee_id; const dep = myDept(); rows = rows.filter((p) => p.requested_by === me || employees.find((e) => e.id === p.employee_id)?.department_id === dep) }
    if (status) rows = rows.filter((p) => p.status === status)
    const list = rows.sort((a, b) => promoStatusOrder[a.status] - promoStatusOrder[b.status] || b.id - a.id)
      .map((p) => ({ ...p, full_name: empName(p.employee_id), job_title: employees.find((e) => e.id === p.employee_id)?.job_title || null, department_id: employees.find((e) => e.id === p.employee_id)?.department_id, new_department_name: deptName(p.new_department_id), requested_by_name: empName(p.requested_by), reviewed_by_name: empName(p.reviewed_by), profile_picture: null }))
    const summary = list.reduce((s, r) => { s.total += 1; if (r.status === 'معلق') s.pending += 1; if (r.type === 'ترقية') s.promotions += 1; else s.transfers += 1; return s }, { total: 0, pending: 0, promotions: 0, transfers: 0 })
    return { promotions: list, summary }
  },
  async create(data) {
    await delay()
    const emp = employees.find((e) => e.id === Number(data.employee_id))
    const p = { id: promoSeq++, employee_id: Number(data.employee_id), type: data.type || 'ترقية', current_title: data.current_title || emp?.job_title || null, new_title: data.new_title || null, new_department_id: data.new_department_id ? Number(data.new_department_id) : null, effective_date: data.effective_date || null, justification: data.justification || null, status: 'معلق', requested_by: currentUser()?.employee_id || 2, reviewed_by: null, created_at: nowIso() }
    promotions.unshift(p)
    return { message: 'تم', promotion: { id: p.id } }
  },
  async setStatus(id, status) {
    await delay()
    const p = promotions.find((x) => x.id === Number(id))
    if (!p) throw notFound()
    p.status = status
    p.reviewed_by = currentUser()?.employee_id || 5
    // Approving actually applies the change to the employee record — the
    // new title/department were captured specifically for this.
    if (status === 'موافق عليه') {
      const emp = employees.find((e) => e.id === p.employee_id)
      if (emp) {
        if (p.new_title) emp.job_title = p.new_title
        if (p.new_department_id) emp.department_id = p.new_department_id
      }
    }
    return { message: 'تم' }
  },
  async remove(id) { await delay(); const i = promotions.findIndex((x) => x.id === Number(id)); if (i > -1) promotions.splice(i, 1); return { message: 'تم الحذف' } },
}

const candidateProfile = {
  id: 1,
  email: 'candidate@quant.com',
  full_name: 'مرشح تجريبي',
  headline: 'مطوّر واجهات أمامية',
  summary: 'مطوّر واجهات أمامية بخبرة 3 سنوات في React و Vue، شغوف ببناء تجارب مستخدم متميزة.',
  skills: 'React, JavaScript, Tailwind CSS, TypeScript, Git',
  experience_years: 3,
  education: 'بكالوريوس علوم حاسب',
  phone: '+966 55 123 4567',
  location: 'الرياض',
  linkedin: 'https://linkedin.com/in/candidate',
  portfolio: 'https://portfolio.dev',
  cv_file_name: 'cv_candidate.pdf',
  in_talent_pool: 1,
}
export const mockCandidateApi = {
  async getProfile() { await delay(); return { profile: { ...candidateProfile } } },
  async updateProfile(data) {
    await delay()
    for (const [k, v] of Object.entries(data)) {
      if (k === 'experience_years') candidateProfile[k] = parseInt(v, 10) || 0
      else if (k in candidateProfile) candidateProfile[k] = v
    }
    return { message: 'تم التحديث', profile: { ...candidateProfile } }
  },
  async setTalentPool(join) { await delay(); candidateProfile.in_talent_pool = join ? 1 : 0; return { message: join ? 'تم الانضمام' : 'تم الإلغاء', in_talent_pool: candidateProfile.in_talent_pool } },

  async interviews({ mode } = {}) {
    await delay()
    let rows = candInterviews.slice()
    if (mode) rows = rows.filter((i) => i.mode === mode)
    const order = { مجدولة: 1, مكتملة: 2, ملغاة: 3 }
    return { interviews: rows.sort((a, b) => order[a.status] - order[b.status] || (a.scheduled_at || '').localeCompare(b.scheduled_at || '')) }
  },
  async documents() {
    await delay()
    const rows = [...candDocuments].sort((a, b) => a.status.localeCompare(b.status) || a.id - b.id)
    const summary = rows.reduce((s, r) => { s.total += 1; if (r.status === 'مرفوع') s.uploaded += 1; return s }, { total: 0, uploaded: 0 })
    return { documents: rows, summary }
  },
  async updateDocument(id, data) {
    await delay()
    const doc = candDocuments.find((x) => x.id === Number(id))
    if (!doc) throw notFound()
    const upload = data.status !== 'مطلوب'
    doc.status = upload ? 'مرفوع' : 'مطلوب'
    doc.file_name = upload ? (data.file_name || `${doc.title}.pdf`) : null
    doc.uploaded_at = upload ? nowIso() : null
    return { message: 'تم' }
  },
  async forms() {
    await delay()
    const rows = [...candForms].sort((a, b) => a.status.localeCompare(b.status) || a.id - b.id)
    const summary = rows.reduce((s, r) => { s.total += 1; if (r.status === 'مكتمل') s.completed += 1; return s }, { total: 0, completed: 0 })
    return { forms: rows, summary }
  },
  async submitForm(id, data) {
    await delay()
    const form = candForms.find((x) => x.id === Number(id))
    if (!form) throw notFound()
    form.status = 'مكتمل'
    form.response = data?.response || null
    form.submitted_at = nowIso()
    return { message: 'تم' }
  },
  async offer() {
    await delay()
    const email = currentUser()?.email
    const mine = jobOffers.filter((o) => o.email === email).sort((a, b) => b.id - a.id)
    return { offer: mine[0] ? { ...mine[0] } : null }
  },
  async respondOffer(id, status) {
    await delay()
    const email = currentUser()?.email
    const offer = jobOffers.find((o) => o.id === Number(id) && o.email === email)
    if (!offer) throw notFound()
    if (!['مقبول', 'مرفوض'].includes(status)) throw badReq('حالة غير صالحة')
    if (offer.status !== 'معلّق') throw badReq('تمت الاستجابة مسبقاً')
    offer.status = status
    offer.responded_at = nowIso()

    const app = applications
      .filter((a) => a.candidate_email === email && a.stage === 'عرض وظيفي')
      .map((a) => ({ a, j: jobs.find((x) => x.id === a.job_id) }))
      .filter(({ j }) => j?.title === offer.job_title)
      .sort((x, y) => y.a.id - x.a.id)[0]?.a
    if (app) {
      app.stage = status === 'مقبول' ? 'تم التوظيف' : 'مرفوض'
      app.status = status
    }
    return { message: 'تم' }
  },
  async messages() { await delay(); return { messages: candMessages.slice() } },
  async sendMessage(body) {
    await delay()
    if (!body) throw badReq('نص الرسالة مطلوب')
    const m = { id: candMsgSeq++, email: candidateProfile.email, sender: 'candidate', body, created_at: nowIso() }
    candMessages.push(m)
    return { message: 'تم', id: m.id }
  },
}

let candIvSeq = 1
const candInterviews = [
  { id: candIvSeq++, email: candidateProfile.email, job_title: 'مطوّر واجهات أمامية', scheduled_at: addDays(2), mode: 'فيديو', stage: 'فنية', status: 'مجدولة', location: null, meeting_link: 'https://meet.quant-hr.com/iv-2201', notes: 'يرجى الحضور قبل الموعد بـ 10 دقائق' },
  { id: candIvSeq++, email: candidateProfile.email, job_title: 'مطوّر واجهات أمامية', scheduled_at: addDays(5), mode: 'حضوري', stage: 'نهائية', status: 'مجدولة', location: 'المقر الرئيسي - الرياض', meeting_link: null, notes: 'مقابلة مع مدير التقنية' },
  { id: candIvSeq++, email: candidateProfile.email, job_title: 'مطوّر واجهات أمامية', scheduled_at: addDays(-4), mode: 'هاتفي', stage: 'مبدئية', status: 'مكتملة', location: null, meeting_link: null, notes: 'مقابلة فرز أولية' },
]
let candDocSeq = 1
const candDocuments = [
  { id: candDocSeq++, email: candidateProfile.email, title: 'صورة الهوية الوطنية', doc_type: 'هوية', status: 'مرفوع', file_name: 'id.pdf', uploaded_at: addDays(-2) },
  { id: candDocSeq++, email: candidateProfile.email, title: 'الشهادة الجامعية', doc_type: 'شهادة', status: 'مطلوب', file_name: null, uploaded_at: null },
  { id: candDocSeq++, email: candidateProfile.email, title: 'شهادات الخبرة', doc_type: 'شهادة', status: 'مطلوب', file_name: null, uploaded_at: null },
  { id: candDocSeq++, email: candidateProfile.email, title: 'صورة شخصية', doc_type: 'صورة', status: 'مرفوع', file_name: 'photo.jpg', uploaded_at: addDays(-2) },
]
let candFormSeq = 1
const candForms = [
  { id: candFormSeq++, email: candidateProfile.email, title: 'نموذج البيانات الشخصية', description: 'استكمال البيانات الشخصية والوظيفية', status: 'مكتمل', response: null, submitted_at: addDays(-3) },
  { id: candFormSeq++, email: candidateProfile.email, title: 'إقرار خلو السوابق', description: 'إقرار بعدم وجود سوابق جنائية', status: 'مطلوب', response: null, submitted_at: null },
  { id: candFormSeq++, email: candidateProfile.email, title: 'نموذج المعلومات البنكية', description: 'بيانات الحساب البنكي لصرف الراتب', status: 'مطلوب', response: null, submitted_at: null },
]
let offerSeq = 2
const jobOffers = [
  { id: 1, email: candidateProfile.email, job_title: 'مطوّر واجهات أمامية', department: 'التقنية', salary: 14000, start_date: addDays(30), details: 'عقد دوام كامل، فترة تجربة 3 أشهر، تأمين طبي شامل، 30 يوم إجازة سنوية.', status: 'معلّق', responded_at: null },
]
let candMsgSeq = 1
const candMessages = [
  { id: candMsgSeq++, email: candidateProfile.email, sender: 'hr', body: 'مرحباً بك! نشكر اهتمامك بالانضمام إلينا. هل لديك أي استفسار؟', created_at: addDays(-3) },
  { id: candMsgSeq++, email: candidateProfile.email, sender: 'candidate', body: 'شكراً لكم، متى موعد المقابلة الفنية؟', created_at: addDays(-3) },
  { id: candMsgSeq++, email: candidateProfile.email, sender: 'hr', body: 'المقابلة الفنية مجدولة خلال يومين عبر الفيديو، ستصلك التفاصيل.', created_at: addDays(-2) },
]

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

// AI assistant: a rule-based FAQ that only reads existing records for the
// asking employee (or public policies) — it never approves/rejects
// anything or makes a hiring/firing recommendation.
const ASSISTANT_SUGGESTIONS = ['كم رصيد إجازتي؟', 'كم راتبي الصافي هذا الشهر؟', 'هل سجّلت حضوري اليوم؟', 'ما هي سياسة الإجازات؟', 'هل هناك إعلانات جديدة؟']
const ASSISTANT_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
let assistantLogSeq = 1
const assistantLogs = []

function detectAssistantIntent(message) {
  const m = message.toLowerCase()
  if (/سياس|لائح/.test(m)) return 'policies'
  if (/راتب|مرتب/.test(m)) return 'payslip'
  if (/رصيد|إجاز/.test(m)) return 'leave_balance'
  if (/حضور|دوام|بصمة|انصراف/.test(m)) return 'attendance'
  if (/إعلان|تعميم/.test(m)) return 'announcements'
  return 'fallback'
}
function assistantAnswerLeaveBalance(empId) {
  const e = employees.find((x) => x.id === empId)
  if (!e) return 'لم أجد بياناتك الوظيفية. تواصل مع الموارد البشرية.'
  return `رصيدك الحالي: ${e.annual_leave_balance ?? 0} يوم إجازة سنوية، ${e.sick_leave_balance ?? 0} يوم مرضية، ${e.emergency_leave_balance ?? 0} يوم طارئة.`
}
// Reads the same source as the Payslips page: the latest payroll run line
// item that has at least been approved, so the assistant's number never
// disagrees with the employee's actual payslip.
function assistantAnswerPayslip(empId) {
  const row = [...payrollRuns]
    .filter((r) => ['معتمد', 'مصروف'].includes(r.status))
    .sort((a, b) => (b.year - a.year) || (b.month - a.month))
    .map((r) => { const i = r.items.find((x) => x.employee_id === empId); return i ? { ...i, month: r.month, year: r.year, run_status: r.status } : null })
    .find(Boolean)
  if (!row) return 'لا توجد قسيمة راتب معتمدة بعد لعرضها. راجع قسم قسائم الرواتب لاحقاً.'
  const label = row.run_status === 'مصروف' ? 'الصافي المصروف' : 'الصافي المعتمد (بانتظار الصرف)'
  return `راتب ${ASSISTANT_MONTHS[row.month - 1]} ${row.year} — ${label}: ${row.net.toLocaleString('ar-SA')} ر.س (أساسي ${row.basic.toLocaleString('ar-SA')} + بدلات ${row.allowances.toLocaleString('ar-SA')} − تأمينات ${row.deductions.toLocaleString('ar-SA')}). للتفاصيل الكاملة راجع قسائم الراتب.`
}
function assistantAnswerAnnouncements(empId) {
  const rows = [...announcements]
    .sort((a, b) => (b.is_pinned - a.is_pinned) || b.id - a.id)
    .slice(0, 5)
    .map((a) => ({ ...a, read_by_me: announcementReads.some((r) => r.announcement_id === a.id && r.employee_id === empId) }))
  if (!rows.length) return 'لا توجد إعلانات حالياً.'
  const pendingAck = rows.filter((a) => a.requires_acknowledgment && !a.read_by_me)
  const list = rows.map((a) => `- ${a.title}${a.requires_acknowledgment && !a.read_by_me ? ' (يتطلب إقرارك)' : ''}`).join('\n')
  const note = pendingAck.length ? `\n\nلديك ${pendingAck.length} إعلان يتطلب إقرارك بالاطلاع — راجع قسم الإعلانات.` : ''
  return `أحدث الإعلانات:\n${list}${note}`
}
const assistantTime = (iso) => (iso && iso.length >= 16 ? iso.slice(11, 16) : iso)
function assistantAnswerAttendance(empId) {
  const today = addDays(0)
  const a = attendance.find((x) => x.employee_id === empId && x.date === today)
  if (!a) return 'لم يُسجَّل حضورك اليوم بعد.'
  if (a.check_in && !a.check_out) return `تم تسجيل حضورك اليوم الساعة ${assistantTime(a.check_in)}. لم تسجّل الانصراف بعد.`
  if (a.check_in && a.check_out) return `حضورك اليوم: من ${assistantTime(a.check_in)} إلى ${assistantTime(a.check_out)} (${a.status}).`
  return `حالتك اليوم: ${a.status}.`
}
function assistantAnswerPolicies(message) {
  const stripped = message.replace(/سياسة|سياسات|لائحة|لوائح/g, '').trim()
  const rows = stripped ? policies.filter((p) => p.title.includes(stripped) || p.body.includes(stripped)).slice(0, 3) : []
  if (rows.length) return rows.map((p) => `**${p.title}**: ${p.body.slice(0, 160)}${p.body.length > 160 ? '…' : ''}`).join('\n\n')
  if (!policies.length) return 'لا توجد سياسات مضافة بعد.'
  return `أقرب السياسات المتاحة: ${policies.slice(0, 8).map((p) => p.title).join('، ')}. اسأل عن أحدها بالاسم لمزيد من التفاصيل.`
}

export const mockAssistantApi = {
  async ask(message) {
    await delay()
    if (!aiSettings.enabled || !aiSettings.chatbot) throw (() => { const e = new Error('bad'); e.response = { status: 403, data: { error: 'المساعد الذكي غير مفعّل حالياً' } }; return e })()
    const text = (message || '').trim()
    if (!text) throw badReq('الرسالة مطلوبة')
    const u = currentUser()
    const empId = u?.employee_id
    const intent = detectAssistantIntent(text)
    let answer
    switch (intent) {
      case 'leave_balance': answer = empId ? assistantAnswerLeaveBalance(empId) : 'هذا السؤال يخص بيانات موظف — سجّل دخولك بحساب موظف لعرض رصيدك.'; break
      case 'payslip': answer = empId ? assistantAnswerPayslip(empId) : 'هذا السؤال يخص بيانات موظف — سجّل دخولك بحساب موظف لعرض راتبك.'; break
      case 'attendance': answer = empId ? assistantAnswerAttendance(empId) : 'هذا السؤال يخص بيانات موظف — سجّل دخولك بحساب موظف لعرض حضورك.'; break
      case 'policies': answer = assistantAnswerPolicies(text); break
      case 'announcements': answer = assistantAnswerAnnouncements(empId); break
      default: answer = `يمكنني الإجابة عن استفساراتك حول رصيد إجازتك، راتبك، حضورك، أو سياسات الشركة. جرّب أحد هذه الأسئلة:\n${ASSISTANT_SUGGESTIONS.join('\n')}`
    }
    assistantLogs.unshift({ id: assistantLogSeq++, employee_id: empId || null, message: text, intent, created_at: nowIso(), full_name: empName(empId) })
    return { answer, intent, suggestions: ASSISTANT_SUGGESTIONS }
  },
  async logs() {
    await delay()
    const rows = assistantLogs.slice(0, 100)
    const breakdown = rows.reduce((acc, r) => { acc[r.intent] = (acc[r.intent] || 0) + 1; return acc }, {})
    return { logs: rows, breakdown, total: rows.length }
  },
}

const HD_MANAGE = ['admin', 'hr_manager', 'super_admin']
const HD_CATEGORIES = ['استفسار عام', 'رواتب ومزايا', 'إجازات وحضور', 'مشكلة تقنية', 'شكوى', 'أخرى']
const HD_PRIORITIES = ['منخفضة', 'متوسطة', 'عالية', 'عاجلة']
const HD_STATUSES = ['مفتوحة', 'قيد المعالجة', 'بانتظار الموظف', 'مغلقة']
const HD_STATUS_ORDER = { مفتوحة: 1, 'قيد المعالجة': 2, 'بانتظار الموظف': 3, مغلقة: 4 }
const HD_PRIORITY_ORDER = { عاجلة: 1, عالية: 2, متوسطة: 3, منخفضة: 4 }
let hdTicketSeq = 1
let hdReplySeq = 1
const helpdeskTickets = [
  {
    id: hdTicketSeq++, employee_id: 6, category: 'رواتب ومزايا', subject: 'خصم غير مفهوم في راتب الشهر الماضي', description: 'لاحظت خصماً 200 ريال إضافياً عن المعتاد ولا أعرف سببه.', priority: 'عالية', status: 'قيد المعالجة', assigned_to: 5, resolved_at: null, created_at: nowIso(), updated_at: nowIso(),
    replies: [{ id: hdReplySeq++, author_id: 5, body: 'شكراً لتواصلك، جاري مراجعة كشف الرواتب والرجوع إليك خلال يوم عمل.', created_at: nowIso() }],
  },
  {
    id: hdTicketSeq++, employee_id: 10, category: 'مشكلة تقنية', subject: 'لا أستطيع الدخول لبوابة تسجيل الحضور', description: 'تظهر رسالة خطأ عند محاولة تسجيل الدخول صباحاً.', priority: 'عاجلة', status: 'مفتوحة', assigned_to: null, resolved_at: null, created_at: nowIso(), updated_at: nowIso(),
    replies: [],
  },
  {
    id: hdTicketSeq++, employee_id: 4, category: 'إجازات وحضور', subject: 'استفسار عن رصيد الإجازة الطارئة', description: 'كم يوم إجازة طارئة متبقٍ لي هذا العام؟', priority: 'منخفضة', status: 'مغلقة', assigned_to: 5, resolved_at: addDays(-3), created_at: addDays(-4), updated_at: addDays(-3),
    replies: [{ id: hdReplySeq++, author_id: 5, body: 'رصيدك الحالي 5 أيام إجازة طارئة، لم يُستخدم منها أي رصيد هذا العام.', created_at: addDays(-3) }],
  },
]

function hdWithEmp(t) {
  const { replies, ...rest } = t
  return {
    ...rest, full_name: empName(t.employee_id), job_title: employees.find((e) => e.id === t.employee_id)?.job_title, profile_picture: null,
    department_name: deptName(employees.find((e) => e.id === t.employee_id)?.department_id),
    assigned_to_name: empName(t.assigned_to), replies_count: replies.length,
  }
}

export const mockHelpdeskApi = {
  async list({ status, category, assigned_to } = {}) {
    await delay()
    const u = currentUser()
    let rows = helpdeskTickets
    if (u && !HD_MANAGE.includes(u.role)) rows = rows.filter((t) => t.employee_id === u.employee_id)
    else if (assigned_to) rows = rows.filter((t) => t.assigned_to === Number(assigned_to))
    if (status) rows = rows.filter((t) => t.status === status)
    if (category) rows = rows.filter((t) => t.category === category)
    const list = [...rows]
      .sort((a, b) => (HD_STATUS_ORDER[a.status] - HD_STATUS_ORDER[b.status]) || (HD_PRIORITY_ORDER[a.priority] - HD_PRIORITY_ORDER[b.priority]) || b.id - a.id)
      .map(hdWithEmp)
    const summary = list.reduce((s, t) => {
      s.total += 1
      if (t.status !== 'مغلقة') s.open += 1
      if (t.priority === 'عاجلة' && t.status !== 'مغلقة') s.urgent += 1
      if (!t.assigned_to && t.status !== 'مغلقة') s.unassigned += 1
      return s
    }, { total: 0, open: 0, urgent: 0, unassigned: 0 })
    return { tickets: list, summary, categories: HD_CATEGORIES, priorities: HD_PRIORITIES, statuses: HD_STATUSES }
  },
  async get(id) {
    await delay()
    const t = helpdeskTickets.find((x) => x.id === Number(id))
    if (!t) throw notFound()
    const u = currentUser()
    if (u && !HD_MANAGE.includes(u.role) && t.employee_id !== u.employee_id) { const e = new Error('bad'); e.response = { status: 403, data: { error: 'غير مسموح' } }; throw e }
    const replies = t.replies.map((r) => ({ ...r, author_name: empName(r.author_id), author_picture: null }))
    return { ...hdWithEmp(t), replies }
  },
  async create(data) {
    await delay()
    const u = currentUser()
    if (!u?.employee_id) throw badReq('لا يوجد موظف مرتبط بهذا الحساب')
    if (!data.subject) throw badReq('الموضوع مطلوب')
    if (data.category && !HD_CATEGORIES.includes(data.category)) throw badReq('تصنيف غير صالح')
    if (data.priority && !HD_PRIORITIES.includes(data.priority)) throw badReq('أولوية غير صالحة')
    const t = { id: hdTicketSeq++, employee_id: u.employee_id, category: data.category || 'استفسار عام', subject: data.subject, description: data.description || null, priority: data.priority || 'متوسطة', status: 'مفتوحة', assigned_to: null, resolved_at: null, created_at: nowIso(), updated_at: nowIso(), replies: [] }
    helpdeskTickets.unshift(t)
    return { message: 'تم', ticket: { id: t.id } }
  },
  async update(id, data) {
    await delay()
    const t = helpdeskTickets.find((x) => x.id === Number(id))
    if (!t) throw notFound()
    if (data.status && !HD_STATUSES.includes(data.status)) throw badReq('حالة غير صالحة')
    if (data.priority && !HD_PRIORITIES.includes(data.priority)) throw badReq('أولوية غير صالحة')
    const wasClosed = t.status === 'مغلقة'
    if (data.status !== undefined) t.status = data.status
    if (data.priority !== undefined) t.priority = data.priority
    if (data.assigned_to !== undefined) t.assigned_to = data.assigned_to || null
    if (t.status === 'مغلقة' && !wasClosed) t.resolved_at = nowIso()
    else if (t.status !== 'مغلقة') t.resolved_at = null
    t.updated_at = nowIso()
    return { message: 'تم التحديث' }
  },
  async reply(id, body) {
    await delay()
    const t = helpdeskTickets.find((x) => x.id === Number(id))
    if (!t) throw notFound()
    const u = currentUser()
    const isOwner = t.employee_id === u?.employee_id
    if (!isOwner && !HD_MANAGE.includes(u?.role)) { const e = new Error('bad'); e.response = { status: 403, data: { error: 'غير مسموح' } }; throw e }
    const text = (body || '').trim()
    if (!text) throw badReq('نص الرد مطلوب')
    t.replies.push({ id: hdReplySeq++, author_id: u?.employee_id || null, body: text, created_at: nowIso() })
    if (HD_MANAGE.includes(u?.role) && t.status === 'مفتوحة') t.status = 'قيد المعالجة'
    else if (isOwner && t.status === 'بانتظار الموظف') t.status = 'قيد المعالجة'
    t.updated_at = nowIso()
    return { message: 'تم' }
  },
  async remove(id) {
    await delay()
    const i = helpdeskTickets.findIndex((x) => x.id === Number(id))
    if (i > -1) helpdeskTickets.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

// workforcePlans[deptId][year] = { planned_headcount, budget, notes }
const workforcePlans = {
  3: { [new Date().getFullYear()]: { planned_headcount: 5, budget: 450000, notes: 'توسعة الفريق التقني بمطوّرين إضافيين لدعم المنتج الجديد.' } },
  2: { [new Date().getFullYear()]: { planned_headcount: 2, budget: 220000, notes: 'خطة استقطاب أخصائي توظيف إضافي لدعم فريق الموارد البشرية.' } },
  5: { [new Date().getFullYear()]: { planned_headcount: 2, budget: 300000, notes: 'تعزيز فريق المبيعات بعد نمو المحفظة في فرع جدة.' } },
  4: { [new Date().getFullYear()]: { planned_headcount: 2, budget: 180000, notes: null } },
}

export const mockWorkforceApi = {
  async list(year) {
    await delay()
    const y = year || new Date().getFullYear()
    const u = currentUser()
    let depts = departments
    if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      depts = depts.filter((d) => d.id === dep)
    }
    const rows = depts.map((d) => {
      const plan = workforcePlans[d.id]?.[y]
      const actual = employees.filter((e) => e.department_id === d.id && e.status === 'نشط').length
      const open = jobs.filter((j) => j.department === d.name && j.status === 'مفتوحة').length
      const planned = plan?.planned_headcount ?? 0
      return {
        department_id: d.id, department_name: d.name, color: d.color,
        plan_id: plan ? 1 : null, planned_headcount: plan?.planned_headcount ?? null, budget: plan?.budget ?? null, notes: plan?.notes ?? null,
        actual_headcount: actual, open_positions: open, variance: actual - planned,
      }
    })
    const summary = rows.reduce((s, p) => {
      s.planned += p.planned_headcount ?? 0
      s.actual += p.actual_headcount
      s.open_positions += p.open_positions
      s.budget += p.budget ?? 0
      if (p.plan_id && p.variance > 0) s.overStaffed += 1
      if (p.plan_id && p.variance < 0) s.understaffed += 1
      return s
    }, { planned: 0, actual: 0, open_positions: 0, budget: 0, overStaffed: 0, understaffed: 0 })
    return { year: y, departments: rows, summary }
  },
  async setPlan(departmentId, data) {
    await delay()
    const y = Number(data.year) || new Date().getFullYear()
    const planned = parseInt(data.planned_headcount, 10)
    if (!Number.isFinite(planned) || planned < 0) throw badReq('عدد الموظفين المخطط له يجب أن يكون رقماً صحيحاً')
    const budget = data.budget != null ? Number(data.budget) : 0
    if (!Number.isFinite(budget) || budget < 0) throw badReq('الميزانية يجب أن تكون رقماً صحيحاً')
    ;(workforcePlans[Number(departmentId)] ||= {})[y] = { planned_headcount: planned, budget, notes: data.notes || null }
    return { message: 'تم' }
  },
  async trend() {
    await delay()
    const u = currentUser()
    let deptIds = departments.map((d) => d.id)
    if (u && u.role === 'department_head') {
      const dep = employees.find((e) => e.id === u.employee_id)?.department_id
      deptIds = dep ? [dep] : []
    }
    const byYear = {}
    for (const did of deptIds) {
      const plansForDept = workforcePlans[did] || {}
      for (const [y, plan] of Object.entries(plansForDept)) {
        const year = Number(y)
        byYear[year] ||= { year, planned: 0, budget: 0 }
        byYear[year].planned += plan.planned_headcount || 0
        byYear[year].budget += plan.budget || 0
      }
    }
    const years = Object.values(byYear).sort((a, b) => a.year - b.year)
    const currentActual = employees.filter((e) => deptIds.includes(e.department_id) && e.status === 'نشط').length
    return { years, currentYear: new Date().getFullYear(), currentActual }
  },
}

// ---------- Approvals Inbox (مركز الموافقات) ----------
// Mirrors the real backend's facade: each source keeps its own mock array
// and status enum; this only aggregates + replicates the same
// approve/reject writes the source's own mock API already performs.

const daysSinceMock = (dateStr) => Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
const APPROVAL_OVERDUE_DAYS = 5
function approvalPriority(days, forceHigh) {
  if (forceHigh || days > 7) return 'مرتفعة'
  if (days > 3) return 'متوسطة'
  return 'عادية'
}

let approvalLogSeq = 1
const approvalActionsLog = []

const APPROVAL_SOURCES = {
  leave: {
    label: 'إجازة',
    eligible: (u) => ['admin', 'hr_manager', 'department_head'].includes(u.role),
    pending(u) {
      let rows = leaves.filter((l) => l.status === 'معلقة')
      if (u.role === 'department_head') rows = rows.filter((l) => employees.find((e) => e.id === l.employee_id)?.department_id === myDept(u))
      return rows
    },
    normalize: (r) => ({ title: `طلب إجازة ${r.type}`, subtitle: `${r.days_count} يوم · ${r.start_date} إلى ${r.end_date}`, amount: null }),
    approve(id, u) {
      const l = leaves.find((x) => x.id === Number(id))
      if (!l || l.status !== 'معلقة') return false
      if (!sameDeptAsMe(u, l.employee_id)) return false
      l.status = 'موافقة'; l.approved_by = u.employee_id || null; l.approved_at = nowIso()
      const emp = employees.find((e) => e.id === l.employee_id)
      const balanceField = { سنوية: 'annual_leave_balance', مرضية: 'sick_leave_balance', طارئة: 'emergency_leave_balance' }[l.type]
      if (emp && balanceField) emp[balanceField] -= l.days_count
      return true
    },
    reject(id, u) {
      const l = leaves.find((x) => x.id === Number(id))
      if (!l || l.status !== 'معلقة') return false
      if (!sameDeptAsMe(u, l.employee_id)) return false
      l.status = 'مرفوضة'; l.approved_by = u.employee_id || null; l.approved_at = nowIso()
      return true
    },
  },
  attendance: {
    label: 'تصحيح حضور',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending(u) {
      let rows = attendanceCorrections.filter((c) => c.status === 'معلق')
      if (u.role === 'department_head') rows = rows.filter((c) => employees.find((e) => e.id === c.employee_id)?.department_id === myDept(u))
      return rows
    },
    normalize: (r) => ({ title: 'تصحيح حضور', subtitle: `${r.date} · ${r.requested_check_in || '—'} إلى ${r.requested_check_out || '—'}`, amount: null }),
    approve(id, u) {
      const c = attendanceCorrections.find((x) => x.id === Number(id))
      if (!c || c.status !== 'معلق') return false
      if (!sameDeptAsMe(u, c.employee_id)) return false
      c.status = 'موافق عليه'; c.reviewed_by = u.employee_id || null
      return true
    },
    reject(id, u) {
      const c = attendanceCorrections.find((x) => x.id === Number(id))
      if (!c || c.status !== 'معلق') return false
      if (!sameDeptAsMe(u, c.employee_id)) return false
      c.status = 'مرفوض'; c.reviewed_by = u.employee_id || null
      return true
    },
  },
  overtime: {
    label: 'عمل إضافي',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending: (u) => approvalPendingRequests(u, 'عمل إضافي'),
    normalize: (r) => ({ title: 'طلب عمل إضافي', subtitle: r.subject, amount: null }),
    approve: (id, u) => approvalResolveRequest(id, 'مقبولة', u),
    reject: (id, u) => approvalResolveRequest(id, 'مرفوضة', u),
  },
  remote: {
    label: 'عمل عن بُعد',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending: (u) => approvalPendingRequests(u, 'عمل عن بعد'),
    normalize: (r) => ({ title: 'طلب عمل عن بُعد', subtitle: r.subject, amount: null }),
    approve: (id, u) => approvalResolveRequest(id, 'مقبولة', u),
    reject: (id, u) => approvalResolveRequest(id, 'مرفوضة', u),
  },
  hiring: {
    label: 'طلب توظيف',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => hiringRequests.filter((h) => h.status === 'معلق'),
    normalize: (r) => ({ title: `طلب توظيف: ${r.job_title}`, subtitle: `${deptName(r.department_id) || ''} · ${r.headcount} شاغر`, amount: null, forceHigh: r.urgency === 'عاجل' }),
    approve: (id, u) => approvalSetStatus(hiringRequests, id, 'موافق عليه', u, 'معلق'),
    reject: (id, u) => approvalSetStatus(hiringRequests, id, 'مرفوض', u, 'معلق'),
  },
  expense: {
    label: 'مصروف',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending: (u) => approvalPendingExpenses(u, 'مصروف'),
    normalize: (r) => ({ title: r.category || 'مصروف', subtitle: r.description || '', amount: r.amount }),
    approve: (id, u) => expenseInMyDept(id, u) && approvalSetStatus(expenses, id, 'معتمدة', u, 'معلقة', 'approved_by'),
    reject: (id, u) => expenseInMyDept(id, u) && approvalSetStatus(expenses, id, 'مرفوضة', u, 'معلقة', 'approved_by'),
  },
  advance: {
    label: 'سلفة',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending: (u) => approvalPendingExpenses(u, 'سلفة'),
    normalize: (r) => ({ title: 'طلب سلفة', subtitle: r.description || '', amount: r.amount }),
    approve: (id, u) => expenseInMyDept(id, u) && approvalSetStatus(expenses, id, 'معتمدة', u, 'معلقة', 'approved_by'),
    reject: (id, u) => expenseInMyDept(id, u) && approvalSetStatus(expenses, id, 'مرفوضة', u, 'معلقة', 'approved_by'),
  },
  payroll: {
    label: 'مسير رواتب',
    eligible: (u) => ['super_admin', 'admin', 'hr_manager'].includes(u.role),
    pending: () => payrollRuns.filter((r) => r.status === 'قيد المراجعة'),
    normalize: (r) => ({ title: `مسير رواتب ${r.month}/${r.year}`, subtitle: `${r.employee_count} موظف`, amount: r.total_net, noReject: true }),
    approve(id, u) {
      const r = payrollRuns.find((x) => x.id === Number(id))
      if (!r || r.status !== 'قيد المراجعة') return false
      r.status = 'معتمد'; r.approved_by = u.employee_id || null; r.approved_at = nowIso()
      return true
    },
    reject: () => false,
  },
  promotion: {
    label: 'ترقية',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => promotions.filter((p) => p.status === 'معلق' && p.type === 'ترقية'),
    normalize: (r) => ({ title: `ترقية: ${r.current_title || ''} ← ${r.new_title || ''}`, subtitle: r.justification || '', amount: null }),
    approve: (id, u) => approvalApprovePromotion(id, u),
    reject: (id, u) => approvalSetStatus(promotions, id, 'مرفوض', u, 'معلق'),
  },
  transfer: {
    label: 'نقل',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => promotions.filter((p) => p.status === 'معلق' && p.type === 'نقل'),
    normalize: (r) => ({ title: `نقل${r.new_department_id ? ' إلى ' + (deptName(r.new_department_id) || '') : ''}`, subtitle: r.justification || '', amount: null }),
    approve: (id, u) => approvalApprovePromotion(id, u),
    reject: (id, u) => approvalSetStatus(promotions, id, 'مرفوض', u, 'معلق'),
  },
  document: {
    label: 'مستند للتوقيع',
    eligible: () => true,
    pending: (u) => signatures.filter((s) => s.countersigner_id === u.employee_id && s.countersigner_status === 'بانتظار التوقيع'),
    normalize: (r) => ({ title: r.title, subtitle: `${r.doc_type} · بعد توقيع الموظف`, amount: null }),
    approve(id, u) {
      const s = signatures.find((x) => x.id === Number(id))
      if (!s || s.countersigner_id !== u.employee_id || s.countersigner_status !== 'بانتظار التوقيع') return false
      s.countersigner_status = 'موقّع'; s.countersigned_at = nowIso(); s.status = 'موقّع'; s.signed_at = nowIso()
      return true
    },
    reject(id, u) {
      const s = signatures.find((x) => x.id === Number(id))
      if (!s || s.countersigner_id !== u.employee_id || s.countersigner_status !== 'بانتظار التوقيع') return false
      s.status = 'مرفوض'; s.countersigner_status = 'مرفوض'
      return true
    },
  },
  raise: {
    label: 'زيادة راتب',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => compensationRequests.filter((r) => r.status === 'معلق'),
    normalize: (r) => ({ title: 'طلب زيادة راتب', subtitle: `${r.current_base_salary} ← ${r.requested_base_salary}`, amount: r.requested_base_salary - r.current_base_salary }),
    approve(id, u) {
      const r = compensationRequests.find((x) => x.id === Number(id))
      if (!r || r.status !== 'معلق') return false
      r.status = 'معتمد'; r.reviewed_by = u.employee_id || null; r.reviewed_at = nowIso()
      const pkg = r.compensation_id ? compensation.find((c) => c.id === r.compensation_id) : null
      if (pkg) {
        const oldTotal = compTotal(pkg)
        const oldBase = pkg.base_salary
        pkg.base_salary = r.requested_base_salary
        const newTotal = compTotal(pkg)
        if (newTotal !== oldTotal) {
          compensationHistory.unshift({ id: compHistSeq++, compensation_id: pkg.id, employee_id: r.employee_id, old_total: oldTotal, new_total: newTotal, old_base_salary: oldBase, new_base_salary: r.requested_base_salary, reason: r.reason, changed_by: u.employee_id || 5, created_at: nowIso() })
        }
      } else {
        compensation.unshift({ id: compSeq++, employee_id: r.employee_id, grade: 'الدرجة الأولى', base_salary: r.requested_base_salary, housing_allowance: 0, transport_allowance: 0, other_allowances: 0, bonus: 0, insurance_class: 'الفئة أ', status: 'نشط', notes: r.reason, created_by: u.employee_id || 5 })
      }
      return true
    },
    reject: (id, u) => approvalSetStatus(compensationRequests, id, 'مرفوض', u, 'معلق', 'reviewed_by', 'reviewed_at'),
  },
  asset: {
    label: 'شراء أصل',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => assetRequests.filter((r) => r.status === 'معلق'),
    normalize: (r) => ({ title: r.item_name, subtitle: r.justification || '', amount: r.estimated_cost }),
    approve: (id, u) => approvalSetStatus(assetRequests, id, 'معتمد', u, 'معلق', 'reviewed_by', 'reviewed_at'),
    reject: (id, u) => approvalSetStatus(assetRequests, id, 'مرفوض', u, 'معلق', 'reviewed_by', 'reviewed_at'),
  },
  shift_swap: {
    label: 'تبديل وردية',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending(u) {
      let rows = shiftSwapRequests.filter((r) => r.status === 'بانتظار اعتماد المدير')
      if (u.role === 'department_head') {
        const d = myDept(u)
        rows = rows.filter((r) => employees.find((e) => e.id === r.requester_id)?.department_id === d || employees.find((e) => e.id === r.target_id)?.department_id === d)
      }
      return rows.map((r) => {
        const req = employees.find((e) => e.id === r.requester_id)
        const tgt = employees.find((e) => e.id === r.target_id)
        const shiftA = shifts.find((s) => s.id === r.shift_a_id)
        const shiftB = shifts.find((s) => s.id === r.shift_b_id)
        return {
          ...r,
          requester_name: req?.full_name || null,
          requester_job_title: req?.job_title || null,
          requester_picture: req?.profile_picture || null,
          target_name: tgt?.full_name || null,
          shift_a_date: shiftA?.date || null,
          shift_b_date: shiftB?.date || null,
        }
      })
    },
    normalize: (r) => ({
      title: 'طلب تبديل وردية',
      subtitle: r.requester_name && r.target_name ? `${r.requester_name} ↔ ${r.target_name} · ${r.shift_a_date || ''} إلى ${r.shift_b_date || ''}` : '',
      amount: null,
    }),
    approve(id, u) {
      const swap = shiftSwapRequests.find((x) => x.id === Number(id))
      if (!swap || swap.status !== 'بانتظار اعتماد المدير') return false
      if (!sameDeptEitherAsMe(u, swap.requester_id, swap.target_id)) return false
      const shiftA = shifts.find((s) => s.id === swap.shift_a_id)
      const shiftB = shifts.find((s) => s.id === swap.shift_b_id)
      if (shiftA) shiftA.employee_id = swap.target_id
      if (shiftB) shiftB.employee_id = swap.requester_id
      swap.status = 'معتمد'; swap.approved_by = u.employee_id || null; swap.approved_at = nowIso()
      return true
    },
    reject(id, u) {
      const swap = shiftSwapRequests.find((x) => x.id === Number(id))
      if (!swap || swap.status !== 'بانتظار اعتماد المدير') return false
      if (!sameDeptEitherAsMe(u, swap.requester_id, swap.target_id)) return false
      swap.status = 'مرفوض'
      return true
    },
  },
  timesheet: {
    label: 'جدول ساعات',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending(u) {
      let rows = timesheets.filter((t) => t.status === 'مقدّم')
      if (u.role === 'department_head') rows = rows.filter((t) => employees.find((e) => e.id === t.employee_id)?.department_id === myDept(u))
      return rows
    },
    normalize: (r) => ({ title: `جدول ساعات: ${r.project}`, subtitle: `${r.date} · ${r.hours} ساعة${r.task ? ' · ' + r.task : ''}`, amount: null }),
    approve: (id, u) => timesheetInMyDept(id, u) && approvalSetStatus(timesheets, id, 'معتمد', u, 'مقدّم', 'approved_by'),
    reject: (id, u) => timesheetInMyDept(id, u) && approvalSetStatus(timesheets, id, 'مرفوض', u, 'مقدّم', 'approved_by'),
  },
  service_request: {
    label: 'طلب موظف',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending(u) {
      let rows = requests.filter((r) => r.status === 'معلقة' && !['عمل إضافي', 'عمل عن بعد'].includes(r.type))
      if (u.role === 'department_head') rows = rows.filter((r) => employees.find((e) => e.id === r.employee_id)?.department_id === myDept(u))
      return rows
    },
    normalize: (r) => ({ title: `${r.type}: ${r.subject}`, subtitle: r.details || '', amount: null }),
    approve: (id, u) => approvalResolveRequest(id, 'مقبولة', u),
    reject: (id, u) => approvalResolveRequest(id, 'مرفوضة', u),
  },
}

function approvalPendingRequests(u, type) {
  let rows = requests.filter((r) => r.status === 'معلقة' && r.type === type)
  if (u.role === 'department_head') rows = rows.filter((r) => employees.find((e) => e.id === r.employee_id)?.department_id === myDept(u))
  return rows
}
function approvalResolveRequest(id, status, u) {
  const r = requests.find((x) => x.id === Number(id))
  if (!r || r.status !== 'معلقة') return false
  if (!sameDeptAsMe(u, r.employee_id)) return false
  r.status = status; r.resolved_by = u.employee_id || null; r.resolved_at = nowIso()
  return true
}
function approvalPendingExpenses(u, type) {
  let rows = expenses.filter((x) => x.status === 'معلقة' && x.type === type)
  if (u.role === 'department_head') rows = rows.filter((x) => employees.find((e) => e.id === x.employee_id)?.department_id === myDept(u))
  return rows
}
function expenseInMyDept(id, u) {
  const x = expenses.find((e) => e.id === Number(id))
  return !x || sameDeptAsMe(u, x.employee_id)
}
function timesheetInMyDept(id, u) {
  const t = timesheets.find((x) => x.id === Number(id))
  return !t || sameDeptAsMe(u, t.employee_id)
}
function approvalApprovePromotion(id, u) {
  const p = promotions.find((x) => x.id === Number(id))
  if (!p || p.status !== 'معلق') return false
  p.status = 'موافق عليه'; p.reviewed_by = u.employee_id || null
  const emp = employees.find((e) => e.id === p.employee_id)
  if (emp) {
    if (p.new_title) emp.job_title = p.new_title
    if (p.new_department_id) emp.department_id = p.new_department_id
  }
  return true
}
function approvalSetStatus(arr, id, newStatus, u, expectedStatus, reviewerField = 'reviewed_by', reviewedAtField = null) {
  const row = arr.find((x) => x.id === Number(id))
  if (!row || row.status !== expectedStatus) return false
  row.status = newStatus
  row[reviewerField] = u.employee_id || null
  if (reviewedAtField) row[reviewedAtField] = nowIso()
  return true
}

function approvalBuildItem(source, row) {
  const cfg = APPROVAL_SOURCES[source]
  const extra = cfg.normalize(row)
  const days = daysSinceMock(row.created_at)
  return {
    key: `${source}:${row.id}`,
    source,
    source_label: cfg.label,
    id: row.id,
    title: extra.title,
    subtitle: extra.subtitle,
    amount: extra.amount ?? null,
    employee_name: empName(row.employee_id) || row.requester_name || null,
    employee_job_title: employees.find((e) => e.id === row.employee_id)?.job_title || row.requester_job_title || null,
    employee_picture: row.requester_picture || null,
    created_at: row.created_at,
    days_pending: days,
    priority: approvalPriority(days, extra.forceHigh),
    overdue: days > APPROVAL_OVERDUE_DAYS,
    can_reject: !extra.noReject,
  }
}

function approvalLogDecision(source, id, decision, reason, u) {
  const cfg = APPROVAL_SOURCES[source]
  const arrByTable = {
    leave: leaves, attendance: attendanceCorrections, overtime: requests, remote: requests,
    hiring: hiringRequests, expense: expenses, advance: expenses, payroll: payrollRuns,
    promotion: promotions, transfer: promotions, document: signatures, raise: compensationRequests, asset: assetRequests,
    shift_swap: shiftSwapRequests, timesheet: timesheets, service_request: requests,
  }
  const row = arrByTable[source]?.find((x) => x.id === Number(id))
  if (!row) return
  approvalActionsLog.unshift({
    id: approvalLogSeq++, source, record_id: Number(id), action: decision, reason: reason || null,
    title: cfg.normalize(row).title, employee_id: row.employee_id || row.requester_id || null, actor_id: u.employee_id || null, created_at: nowIso(),
  })
}

function approvalNotifyDecision(source, id, decision, u) {
  const cfg = APPROVAL_SOURCES[source]
  const arrByTable = {
    leave: leaves, attendance: attendanceCorrections, overtime: requests, remote: requests,
    hiring: hiringRequests, expense: expenses, advance: expenses, payroll: payrollRuns,
    promotion: promotions, transfer: promotions, document: signatures, raise: compensationRequests, asset: assetRequests,
    shift_swap: shiftSwapRequests, timesheet: timesheets, service_request: requests,
  }
  const row = arrByTable[source]?.find((x) => x.id === Number(id))
  if (!row) return
  const title = cfg.normalize(row).title
  const employeeIds = [...new Set([row.employee_id, row.requester_id, row.target_id, row.requested_by].filter(Boolean))]
  for (const empId of employeeIds) {
    if (empId === u.employee_id) continue
    pushNotification({ employee_id: empId }, {
      title: decision === 'approve' ? `تمت الموافقة: ${title}` : `تم الرفض: ${title}`,
      message: cfg.normalize(row).subtitle || '',
      type: decision === 'approve' ? 'success' : 'error',
      link: '/approvals',
    })
  }
}

// Resolves an employee to a login-account shape ({ role, employee_id }), so
// a delegator's identity can be fed into the exact same eligible()/pending()/
// approve()/reject() every real request uses — mirrors the backend's
// reviewerUserFor() over the `users` table.
function reviewerUserFor(employeeId) {
  const entry = Object.values(users).find((u) => u.employee_id === employeeId)
  return entry ? { role: entry.role, employee_id: employeeId } : null
}

let delegationSeq = 1
const approvalDelegations = []
const todayStrMock = () => new Date().toISOString().slice(0, 10)

function activeDelegationsTo(employeeId) {
  if (!employeeId) return []
  const today = todayStrMock()
  return approvalDelegations.filter((d) => d.delegate_id === employeeId && d.start_date <= today && d.end_date >= today)
}

// Real user first if their own role qualifies, then every active delegator
// too (tried in order until one actually succeeds) — department scope is
// checked inside approve()/reject() itself, using whichever candidate is
// passed in.
function reviewCandidates(u, cfg) {
  const candidates = []
  if (cfg.eligible(u)) candidates.push(u)
  for (const deleg of activeDelegationsTo(u.employee_id)) {
    const delegatorUser = reviewerUserFor(deleg.delegator_id)
    if (delegatorUser && cfg.eligible(delegatorUser)) candidates.push(delegatorUser)
  }
  return candidates
}

const CAN_DELEGATE = ['admin', 'hr_manager', 'department_head', 'super_admin']

export const mockApprovalsApi = {
  async mine() {
    await delay()
    const u = currentUser()
    if (!u) return { items: [], summary: { total: 0, overdue: 0, highPriority: 0, delegated: 0, bySource: {} } }
    const items = []
    const seen = new Set()
    for (const [source, cfg] of Object.entries(APPROVAL_SOURCES)) {
      if (!cfg.eligible(u)) continue
      for (const row of cfg.pending(u)) {
        seen.add(`${source}:${row.id}`)
        items.push(approvalBuildItem(source, row))
      }
    }
    for (const deleg of activeDelegationsTo(u.employee_id)) {
      const delegatorUser = reviewerUserFor(deleg.delegator_id)
      if (!delegatorUser) continue
      for (const [source, cfg] of Object.entries(APPROVAL_SOURCES)) {
        if (!cfg.eligible(delegatorUser)) continue
        for (const row of cfg.pending(delegatorUser)) {
          const key = `${source}:${row.id}`
          if (seen.has(key)) continue
          seen.add(key)
          const item = approvalBuildItem(source, row)
          item.delegated_from = empName(deleg.delegator_id)
          item.delegation_id = deleg.id
          items.push(item)
        }
      }
    }
    items.sort((a, b) => (b.priority === 'مرتفعة') - (a.priority === 'مرتفعة') || b.days_pending - a.days_pending)
    const summary = items.reduce((s, i) => {
      s.total += 1
      if (i.overdue) s.overdue += 1
      if (i.priority === 'مرتفعة') s.highPriority += 1
      if (i.delegated_from) s.delegated += 1
      s.bySource[i.source] = (s.bySource[i.source] || 0) + 1
      return s
    }, { total: 0, overdue: 0, highPriority: 0, delegated: 0, bySource: {} })
    return { items, summary }
  },
  async decide(source, id, decision, reason) {
    await delay()
    const u = currentUser()
    const cfg = APPROVAL_SOURCES[source]
    if (!cfg) throw notFound()
    if (!u) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (!['approve', 'reject'].includes(decision)) throw badReq('Invalid decision')
    const trimmedReason = (reason || '').trim()
    if (decision === 'reject' && !trimmedReason) throw badReq('سبب الرفض مطلوب')
    const candidates = reviewCandidates(u, cfg)
    if (candidates.length === 0) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    let ok = false
    for (const candidate of candidates) {
      ok = decision === 'approve' ? cfg.approve(id, candidate) : cfg.reject(id, candidate)
      if (ok) break
    }
    if (!ok) throw badReq('لا يمكن تنفيذ هذا الإجراء — قد يكون الطلب غير موجود أو تم البت فيه بالفعل، أو لا يدعم هذا النوع الرفض')
    approvalLogDecision(source, id, decision, trimmedReason, u)
    approvalNotifyDecision(source, id, decision, u)
    return { message: 'تم' }
  },
  async bulkApprove(items) {
    await delay()
    const u = currentUser()
    const list = Array.isArray(items) ? items : []
    const results = list.map(({ source, id }) => {
      const cfg = APPROVAL_SOURCES[source]
      if (!cfg || !u) return { source, id, ok: false }
      let ok = false
      for (const candidate of reviewCandidates(u, cfg)) {
        ok = cfg.approve(id, candidate)
        if (ok) break
      }
      if (ok) approvalLogDecision(source, id, 'approve', '', u)
      return { source, id, ok }
    })
    return { succeeded: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok), results }
  },
  async history() {
    await delay()
    return approvalActionsLog.slice(0, 100).map((h) => ({ ...h, employee_name: empName(h.employee_id), actor_name: empName(h.actor_id), source_label: APPROVAL_SOURCES[h.source]?.label || h.source }))
  },
  async delegations() {
    await delay()
    const u = currentUser()
    if (!u?.employee_id) return { given: [], received: [] }
    const today = todayStrMock()
    const withNames = (d) => ({ ...d, delegator_name: empName(d.delegator_id), delegate_name: empName(d.delegate_id), is_active: d.start_date <= today && d.end_date >= today })
    return {
      given: approvalDelegations.filter((d) => d.delegator_id === u.employee_id).map(withNames).sort((a, b) => b.end_date.localeCompare(a.end_date)),
      received: approvalDelegations.filter((d) => d.delegate_id === u.employee_id).map(withNames).sort((a, b) => b.end_date.localeCompare(a.end_date)),
    }
  },
  async createDelegation(data) {
    await delay()
    const u = currentUser()
    if (!u || !CAN_DELEGATE.includes(u.role)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    if (!u.employee_id) throw badReq('No employee associated with this account')
    const delegateId = Number(data.delegate_id)
    if (!delegateId) throw badReq('الموظف المفوَّض مطلوب')
    if (delegateId === u.employee_id) throw badReq('لا يمكن التفويض لنفسك')
    if (!data.start_date || !data.end_date) throw badReq('تاريخ البداية والنهاية مطلوبان')
    if (data.end_date < data.start_date) throw badReq('تاريخ النهاية يجب أن يكون بعد تاريخ البداية')
    if (!employees.some((e) => e.id === delegateId)) { const err = new Error('bad'); err.response = { status: 404, data: { error: 'الموظف غير موجود' } }; throw err }
    const delegation = { id: delegationSeq++, delegator_id: u.employee_id, delegate_id: delegateId, start_date: data.start_date, end_date: data.end_date, notes: data.notes || null, created_at: nowIso() }
    approvalDelegations.push(delegation)
    pushNotification({ employee_id: delegateId }, {
      title: 'تفويض موافقات جديد',
      message: `تم تفويضك لاعتماد الطلبات نيابة عن زميلك من ${data.start_date} إلى ${data.end_date}.`,
      type: 'info',
      link: '/approvals',
    })
    return { message: 'تم التفويض', delegation: { id: delegation.id } }
  },
  async removeDelegation(id) {
    await delay()
    const u = currentUser()
    const deleg = approvalDelegations.find((d) => d.id === Number(id))
    if (!deleg) { const err = new Error('bad'); err.response = { status: 404, data: { error: 'غير موجود' } }; throw err }
    const isOwner = u?.employee_id === deleg.delegator_id
    if (!isOwner && !['admin', 'super_admin'].includes(u?.role)) throw { response: { data: { error: 'Access denied' } }, message: 'denied' }
    const i = approvalDelegations.findIndex((d) => d.id === Number(id))
    if (i > -1) approvalDelegations.splice(i, 1)
    return { message: 'تم إلغاء التفويض' }
  },
}
