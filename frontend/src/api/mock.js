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
  { id: annSeq++, title: 'تحديث سياسة العمل عن بُعد', body: 'يسمح النظام الجديد بيومين عمل عن بُعد أسبوعياً بعد موافقة المدير المباشر. يُرجى تقديم الطلبات عبر بوابة الموظف.', audience: 'الجميع', is_pinned: 1, created_by: 5, created_at: nowIso() },
  { id: annSeq++, title: 'موعد صرف رواتب الشهر', body: 'سيتم صرف رواتب هذا الشهر يوم 27 كالمعتاد. لأي استفسار يُرجى التواصل مع الموارد البشرية.', audience: 'الجميع', is_pinned: 0, created_by: 5, created_at: nowIso() },
  { id: annSeq++, title: 'برنامج تدريبي جديد', body: 'انطلق التسجيل في برنامج تطوير المهارات القيادية. الأماكن محدودة — سارع بالتسجيل عبر بوابة الموظف.', audience: 'الجميع', is_pinned: 0, created_by: 5, created_at: nowIso() },
]

let reqSeq = 1
const requests = [
  { id: reqSeq++, employee_id: 6, type: 'خطاب', subject: 'خطاب تعريف بالراتب', details: 'مطلوب لغرض فتح حساب بنكي.', status: 'مكتملة', response: 'تم إصدار الخطاب.', resolved_by: 5, created_at: nowIso() },
  { id: reqSeq++, employee_id: 6, type: 'عمل عن بعد', subject: 'طلب عمل عن بُعد ليوم الخميس', details: 'لظرف عائلي.', status: 'معلقة', response: null, resolved_by: null, created_at: nowIso() },
  { id: reqSeq++, employee_id: 10, type: 'عمل إضافي', subject: 'عمل إضافي لإنهاء مشروع', details: 'ساعتان إضافيتان.', status: 'مقبولة', response: 'تمت الموافقة.', resolved_by: 2, created_at: nowIso() },
]

let polSeq = 1
const policies = [
  { id: polSeq++, title: 'سياسة الدوام والانصراف', category: 'الحضور', body: 'ساعات العمل الرسمية من 8 صباحاً حتى 5 مساءً، من الأحد إلى الخميس، بينها ساعة استراحة. يُحتسب الحضور بعد 8:15 تأخراً.', created_by: 5 },
  { id: polSeq++, title: 'سياسة الإجازات السنوية', category: 'الإجازات', body: 'يستحق الموظف 30 يوم إجازة سنوية مدفوعة. تُقدَّم الطلبات قبل 3 أيام عمل على الأقل عبر بوابة الموظف وتخضع لموافقة المدير المباشر.', created_by: 5 },
  { id: polSeq++, title: 'سياسة العمل عن بُعد', category: 'العمل المرن', body: 'يُسمح بيومين عمل عن بُعد أسبوعياً بحد أقصى بعد موافقة المدير المباشر، مع الالتزام بالتواجد الرقمي خلال ساعات العمل.', created_by: 5 },
  { id: polSeq++, title: 'مدونة السلوك المهني', category: 'عام', body: 'يلتزم جميع الموظفين بالاحترام المتبادل، السرية، وعدم تضارب المصالح. أي مخالفة تخضع للائحة الجزاءات.', created_by: 5 },
  { id: polSeq++, title: 'سياسة استخدام الأجهزة', category: 'تقنية', body: 'أجهزة الشركة مخصّصة للعمل. يُمنع تثبيت برامج غير مرخّصة، ويجب حماية بيانات الدخول وعدم مشاركتها.', created_by: 2 },
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
  { id: appSeq++, job_id: 1, candidate_email: 'candidate@quant.com', candidate_name: 'مرشح تجريبي', cover_note: 'لديّ خبرة 3 سنوات في تطوير الواجهات.', status: 'مقابلة', created_at: nowIso() },
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
]

let assetSeq = 1
const assets = [
  { id: assetSeq++, name: 'لابتوب Dell Latitude', category: 'أجهزة حاسب', serial_number: 'DL-2024-0012', assigned_to: 6, status: 'مُخصّص', assigned_date: addDays(-120), notes: 'مخصّص لفريق التطوير.' },
  { id: assetSeq++, name: 'شاشة LG 27"', category: 'ملحقات', serial_number: 'LG-27-0345', assigned_to: 6, status: 'مُخصّص', assigned_date: addDays(-120), notes: null },
  { id: assetSeq++, name: 'هاتف iPhone 15', category: 'أجهزة جوال', serial_number: 'IP-15-0088', assigned_to: 4, status: 'مُخصّص', assigned_date: addDays(-60), notes: 'لمندوب المبيعات.' },
  { id: assetSeq++, name: 'لابتوب MacBook Pro', category: 'أجهزة حاسب', serial_number: 'MBP-2024-0021', assigned_to: null, status: 'متاح', assigned_date: null, notes: 'متاح للتخصيص.' },
  { id: assetSeq++, name: 'طابعة HP LaserJet', category: 'أجهزة مكتبية', serial_number: 'HP-LJ-0007', assigned_to: null, status: 'صيانة', assigned_date: null, notes: 'قيد الصيانة الدورية.' },
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
]

let offSeq = 1
const offboardings = [
  { id: offSeq++, employee_id: 9, type: 'انتهاء عقد', reason: 'انتهاء مدة العقد محدد المدة.', last_working_day: addDays(20), status: 'قيد المعالجة', notes: 'بانتظار إجراءات المخالصة.', created_by: 5, created_at: nowIso() },
]

let grvSeq = 1
const grievances = [
  { id: grvSeq++, employee_id: 10, type: 'مخالفة', category: 'الالتزام بالدوام', description: 'تأخر متكرر عن موعد الحضور.', severity: 'متوسطة', status: 'قيد المعالجة', action: 'تم توجيه إنذار شفهي.', created_by: 5, created_at: nowIso() },
  { id: grvSeq++, employee_id: 6, type: 'شكوى', category: 'بيئة العمل', description: 'شكوى بخصوص ضوضاء في مساحة العمل.', severity: 'منخفضة', status: 'مفتوحة', action: null, created_by: 5, created_at: nowIso() },
]

let incSeq = 1
const incidents = [
  { id: incSeq++, title: 'انزلاق في الممر', type: 'حادث', employee_id: 6, location: 'الطابق الثاني - الممر', severity: 'منخفضة', description: 'أرضية مبللة دون لافتة تحذير.', status: 'مغلق', incident_date: addDays(-10), reported_by: 5, created_at: nowIso() },
  { id: incSeq++, title: 'فحص طفايات الحريق', type: 'ملاحظة سلامة', employee_id: null, location: 'المبنى الرئيسي', severity: 'متوسطة', description: 'حان موعد الفحص الدوري لطفايات الحريق.', status: 'مفتوح', incident_date: addDays(-2), reported_by: 5, created_at: nowIso() },
]

let shiftSeq = 1
const shifts = [
  { id: shiftSeq++, employee_id: 6, date: addDays(0), shift_type: 'صباحية', start_time: '08:00', end_time: '16:00', location: 'المقر الرئيسي', notes: null, created_by: 5 },
  { id: shiftSeq++, employee_id: 6, date: addDays(1), shift_type: 'صباحية', start_time: '08:00', end_time: '16:00', location: 'المقر الرئيسي', notes: null, created_by: 5 },
  { id: shiftSeq++, employee_id: 10, date: addDays(0), shift_type: 'مسائية', start_time: '16:00', end_time: '00:00', location: 'فرع جدة', notes: null, created_by: 5 },
  { id: shiftSeq++, employee_id: 4, date: addDays(0), shift_type: 'صباحية', start_time: '09:00', end_time: '17:00', location: 'فرع جدة', notes: null, created_by: 5 },
]

let tsSeq = 1
const timesheets = [
  { id: tsSeq++, employee_id: 6, date: addDays(-1), project: 'منصة الموارد البشرية', task: 'تطوير وحدة التقارير', hours: 6, status: 'معتمد', approved_by: 2, created_at: nowIso() },
  { id: tsSeq++, employee_id: 6, date: addDays(0), project: 'منصة الموارد البشرية', task: 'إصلاح أخطاء', hours: 3, status: 'مقدّم', approved_by: null, created_at: nowIso() },
  { id: tsSeq++, employee_id: 10, date: addDays(0), project: 'تطبيق الجوال', task: 'تصميم الواجهات', hours: 5, status: 'مسودة', approved_by: null, created_at: nowIso() },
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
        full_name: emp?.full_name || u.name || 'مستخدم', job_title: emp?.job_title || u.name || '',
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
    return documents.filter((d) => d.employee_id === Number(employeeId))
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
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('quant-hr-auth') || 'null')?.state?.user || null
  } catch {
    return null
  }
}

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export const mockAnnouncementsApi = {
  async list() {
    await delay()
    return [...announcements]
      .sort((a, b) => (b.is_pinned - a.is_pinned) || b.id - a.id)
      .map((a) => ({ ...a, created_by_name: empName(a.created_by) }))
  },
  async create(data) {
    await delay()
    const ann = { id: annSeq++, is_pinned: data.is_pinned ? 1 : 0, audience: data.audience || 'الجميع', created_by: currentUser()?.employee_id || null, created_at: nowIso(), ...data }
    announcements.unshift(ann)
    return { message: 'تم النشر', announcement: ann }
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
    const u = currentUser()
    const req = { id: reqSeq++, employee_id: u?.employee_id || data.employee_id, status: 'معلقة', response: null, resolved_by: null, created_at: nowIso(), ...data }
    requests.unshift(req)
    return { message: 'تم إرسال الطلب', request: req }
  },
  async resolve(id, { status, response }) {
    await delay()
    const r = requests.find((x) => x.id === Number(id))
    if (r) { r.status = status; r.response = response || null; r.resolved_by = currentUser()?.employee_id || 5; r.resolved_at = nowIso() }
    return { message: 'تم تحديث الطلب' }
  },
}

export const mockPayslipsApi = {
  async forEmployee(employeeId) {
    await delay()
    const emp = employees.find((e) => e.id === Number(employeeId))
    if (!emp) throw notFound()
    const basic = emp.salary || 0
    const allowances = emp.allowances || 0
    const gosi = Math.round(basic * 0.1)
    const gross = basic + allowances
    const net = gross - gosi
    const now = new Date()
    const payslips = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      payslips.push({ id: `${d.getFullYear()}-${d.getMonth() + 1}`, month: AR_MONTHS[d.getMonth()], year: d.getFullYear(), basic, allowances, deductions: gosi, gross, net, status: 'مدفوع' })
    }
    return {
      employee: { id: emp.id, full_name: emp.full_name, employee_number: emp.employee_number, job_title: emp.job_title, bank_name: emp.bank_name, bank_account: emp.bank_account },
      payslips,
    }
  },
}

export const mockPoliciesApi = {
  async list() {
    await delay()
    return [...policies]
      .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
      .map((p) => ({ ...p, created_by_name: empName(p.created_by) }))
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
  async remove(id) {
    await delay()
    const i = policies.findIndex((x) => x.id === Number(id))
    if (i > -1) policies.splice(i, 1)
    return { message: 'تم الحذف' }
  },
}

export const mockPayrollApi = {
  async overview({ department_id } = {}) {
    await delay()
    let rows = employees.filter((e) => e.status === 'نشط')
    if (department_id) rows = rows.filter((e) => e.department_id === Number(department_id))
    const payroll = rows
      .map((e) => {
        const basic = e.salary || 0
        const allowances = e.allowances || 0
        const deductions = Math.round(basic * 0.1)
        return { id: e.id, full_name: e.full_name, job_title: e.job_title, employee_number: e.employee_number, department_name: deptName(e.department_id), basic, allowances, deductions, net: basic + allowances - deductions }
      })
      .sort((a, b) => b.basic - a.basic)
    const totals = payroll.reduce((t, p) => ({ basic: t.basic + p.basic, allowances: t.allowances + p.allowances, deductions: t.deductions + p.deductions, net: t.net + p.net }), { basic: 0, allowances: 0, deductions: 0, net: 0 })
    return { payroll, totals, count: payroll.length }
  },
}

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
    const t = { id: taskSeq++, status: 'جديدة', priority: data.priority || 'متوسطة', assigned_by: currentUser()?.employee_id || null, created_at: nowIso(), ...data }
    tasks.unshift(t)
    return { message: 'تم إنشاء المهمة', task: t }
  },
  async setStatus(id, status) {
    await delay()
    const t = tasks.find((x) => x.id === Number(id))
    if (t) t.status = status
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
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
    if (i > -1) jobs.splice(i, 1)
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
      return s
    }, { count: 0, total: 0, pending: 0, approved: 0 })
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
    if (x) { x.status = status; x.approved_by = currentUser()?.employee_id || 5 }
    return { message: 'تم التحديث' }
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
    const list = rows.map((a) => ({ ...a, assigned_to_name: empName(a.assigned_to) }))
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
    if (a) {
      Object.assign(a, data)
      if (data.assigned_to !== undefined) {
        if (data.assigned_to) { a.status = 'مُخصّص'; a.assigned_date = a.assigned_date || addDays(0) }
        else { if (a.status === 'مُخصّص') a.status = 'متاح'; a.assigned_date = null }
      }
    }
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const i = assets.findIndex((x) => x.id === Number(id))
    if (i > -1) assets.splice(i, 1)
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
    const summary = {
      total: list.length,
      completed: list.filter((g) => g.status === 'مكتملة').length,
      inProgress: list.filter((g) => g.status === 'قيد التنفيذ').length,
      avgProgress: list.length ? Math.round(list.reduce((s, g) => s + (g.progress || 0), 0) / list.length) : 0,
    }
    return { goals: list, summary }
  },
  async create(data) {
    await delay()
    const g = { id: goalSeq++, weight: data.weight || 100, progress: 0, status: 'لم تبدأ', created_by: currentUser()?.employee_id || null, ...data }
    goals.unshift(g)
    return { message: 'تم إنشاء الهدف', goal: g }
  },
  async update(id, data) {
    await delay()
    const g = goals.find((x) => x.id === Number(id))
    if (g) {
      if (data.progress !== undefined) {
        g.progress = Math.max(0, Math.min(100, parseInt(data.progress, 10)))
        if (data.status === undefined) g.status = g.progress >= 100 ? 'مكتملة' : g.progress > 0 ? 'قيد التنفيذ' : g.status
      }
      if (data.status !== undefined) { g.status = data.status; if (data.status === 'مكتملة') g.progress = 100 }
    }
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
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
    if (e) {
      e.progress = Math.max(0, Math.min(100, parseInt(progress, 10)))
      e.status = e.progress >= 100 ? 'مكتمل' : e.progress > 0 ? 'قيد التقدم' : 'مسجّل'
    }
    return { message: 'تم التحديث' }
  },
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
    const basic = active.reduce((s, e) => s + (e.salary || 0), 0)
    const allowances = active.reduce((s, e) => s + (e.allowances || 0), 0)
    const deductions = Math.round(basic * 0.1)

    const appStatus = groupCount(applications, 'status')
    const expTotal = expenses.reduce((s, x) => s + x.amount, 0)
    const expPending = expenses.filter((x) => x.status === 'معلقة').reduce((s, x) => s + x.amount, 0)
    const expApproved = expenses.filter((x) => ['معتمدة', 'مصروفة'].includes(x.status)).reduce((s, x) => s + x.amount, 0)

    return {
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
  },
}

const withEmp = (r) => ({ ...r, full_name: empName(r.employee_id), job_title: employees.find((e) => e.id === r.employee_id)?.job_title, department_name: deptName(employees.find((e) => e.id === r.employee_id)?.department_id), profile_picture: null })

export const mockOffboardingApi = {
  async list() { await delay(); return offboardings.map(withEmp) },
  async create(data) { await delay(); const o = { id: offSeq++, type: data.type || 'استقالة', status: 'قيد المعالجة', created_by: currentUser()?.employee_id || 5, created_at: nowIso(), ...data }; offboardings.unshift(o); return { message: 'تم', offboarding: o } },
  async update(id, data) { await delay(); const o = offboardings.find((x) => x.id === Number(id)); if (o) Object.assign(o, data); return { message: 'تم التحديث' } },
  async remove(id) { await delay(); const i = offboardings.findIndex((x) => x.id === Number(id)); if (i > -1) offboardings.splice(i, 1); return { message: 'تم الحذف' } },
}

export const mockGrievancesApi = {
  async list() { await delay(); return grievances.map(withEmp) },
  async create(data) { await delay(); const g = { id: grvSeq++, type: data.type || 'شكوى', category: data.category || 'أخرى', severity: data.severity || 'متوسطة', status: 'مفتوحة', action: null, created_by: currentUser()?.employee_id || 5, created_at: nowIso(), ...data }; grievances.unshift(g); return { message: 'تم', grievance: g } },
  async update(id, data) { await delay(); const g = grievances.find((x) => x.id === Number(id)); if (g) Object.assign(g, data); return { message: 'تم التحديث' } },
  async remove(id) { await delay(); const i = grievances.findIndex((x) => x.id === Number(id)); if (i > -1) grievances.splice(i, 1); return { message: 'تم الحذف' } },
}

export const mockIncidentsApi = {
  async list() {
    await delay()
    const list = incidents.map((r) => ({ ...r, full_name: empName(r.employee_id), reported_by_name: empName(r.reported_by) }))
    return { incidents: list, summary: { total: list.length, open: list.filter((r) => r.status !== 'مغلق').length, high: list.filter((r) => r.severity === 'عالية').length } }
  },
  async create(data) { await delay(); const i = { id: incSeq++, type: data.type || 'ملاحظة سلامة', severity: data.severity || 'متوسطة', status: 'مفتوح', incident_date: data.incident_date || addDays(0), reported_by: currentUser()?.employee_id || 5, created_at: nowIso(), ...data }; incidents.unshift(i); return { message: 'تم', incident: i } },
  async update(id, data) { await delay(); const i = incidents.find((x) => x.id === Number(id)); if (i) Object.assign(i, data); return { message: 'تم التحديث' } },
  async remove(id) { await delay(); const idx = incidents.findIndex((x) => x.id === Number(id)); if (idx > -1) incidents.splice(idx, 1); return { message: 'تم الحذف' } },
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
  async create(data) { await delay(); const s = { id: shiftSeq++, shift_type: data.shift_type || 'صباحية', location: data.location || 'المقر الرئيسي', created_by: currentUser()?.employee_id || 5, ...data }; shifts.unshift(s); return { message: 'تم', shift: s } },
  async update(id, data) { await delay(); const s = shifts.find((x) => x.id === Number(id)); if (s) Object.assign(s, data); return { message: 'تم التحديث' } },
  async remove(id) { await delay(); const i = shifts.findIndex((x) => x.id === Number(id)); if (i > -1) shifts.splice(i, 1); return { message: 'تم الحذف' } },
}

export const mockTimesheetsApi = {
  async list({ status } = {}) {
    await delay()
    let rows = scopeByRole(timesheets)
    if (status) rows = rows.filter((t) => t.status === status)
    const so = { 'مقدّم': 1, مسودة: 2, معتمد: 3, مرفوض: 4 }
    const list = [...rows].sort((a, b) => (so[a.status] - so[b.status]) || b.date.localeCompare(a.date))
      .map((t) => ({ ...t, full_name: empName(t.employee_id), job_title: employees.find((e) => e.id === t.employee_id)?.job_title, profile_picture: null, approved_by_name: empName(t.approved_by) }))
    const summary = list.reduce((s, r) => { s.totalHours += r.hours; if (r.status === 'معتمد') s.approvedHours += r.hours; if (r.status === 'مقدّم') s.pending += 1; return s }, { totalHours: 0, approvedHours: 0, pending: 0, count: list.length })
    return { timesheets: list, summary }
  },
  async create(data) { await delay(); const t = { id: tsSeq++, employee_id: currentUser()?.employee_id, status: 'مسودة', approved_by: null, created_at: nowIso(), ...data }; timesheets.unshift(t); return { message: 'تم', timesheet: t } },
  async submit(id) { await delay(); const t = timesheets.find((x) => x.id === Number(id)); if (t) t.status = 'مقدّم'; return { message: 'تم' } },
  async review(id, status) { await delay(); const t = timesheets.find((x) => x.id === Number(id)); if (t) { t.status = status; t.approved_by = currentUser()?.employee_id || 5 } return { message: 'تم' } },
  async remove(id) { await delay(); const i = timesheets.findIndex((x) => x.id === Number(id)); if (i > -1) timesheets.splice(i, 1); return { message: 'تم الحذف' } },
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
  async update(id, data) { await delay(); const c = compensation.find((x) => x.id === Number(id)); if (c) Object.assign(c, data); return { message: 'تم التحديث' } },
  async remove(id) { await delay(); const i = compensation.findIndex((x) => x.id === Number(id)); if (i > -1) compensation.splice(i, 1); return { message: 'تم الحذف' } },
}

const riskOrder = { مرتفع: 1, متوسط: 2, منخفض: 3 }
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
  async create(data) { await delay(); const s = { id: succSeq++, readiness: 'خلال سنة', risk_level: 'متوسط', potential: 'أداء عالٍ', status: 'نشط', notes: null, created_by: currentUser()?.employee_id || 5, ...data, department_id: data.department_id ? Number(data.department_id) : null, incumbent_id: data.incumbent_id ? Number(data.incumbent_id) : null, successor_id: data.successor_id ? Number(data.successor_id) : null }; succession.unshift(s); return { message: 'تم', succession: s } },
  async update(id, data) { await delay(); const s = succession.find((x) => x.id === Number(id)); if (s) Object.assign(s, data); return { message: 'تم التحديث' } },
  async remove(id) { await delay(); const i = succession.findIndex((x) => x.id === Number(id)); if (i > -1) succession.splice(i, 1); return { message: 'تم الحذف' } },
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

export const mockOnboardingApi = {
  async list({ status } = {}) {
    await delay()
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
    const p = onboarding.find((x) => x.id === Number(id))
    if (!p) throw notFound()
    return { ...obProgress(p), tasks: p.tasks.slice() }
  },
  async create(data) {
    await delay()
    const list = Array.isArray(data.tasks) && data.tasks.length ? data.tasks : OB_DEFAULT_TASKS
    const p = {
      id: obSeq++, employee_id: Number(data.employee_id), start_date: data.start_date || null,
      buddy_id: data.buddy_id ? Number(data.buddy_id) : null, status: 'قيد التنفيذ', notes: data.notes || null,
      created_by: currentUser()?.employee_id || 5,
      tasks: list.map((t) => ({ id: obTaskSeq++, title: t.title, category: t.category || 'أخرى', owner: t.owner || 'الموارد البشرية', due_date: t.due_date || data.start_date || null, is_done: 0 })),
    }
    onboarding.unshift(p)
    return { message: 'تم', onboarding: { id: p.id } }
  },
  async update(id, data) {
    await delay()
    const p = onboarding.find((x) => x.id === Number(id))
    if (p) { if (data.start_date !== undefined) p.start_date = data.start_date; if (data.buddy_id !== undefined) p.buddy_id = data.buddy_id ? Number(data.buddy_id) : null; if (data.status !== undefined) p.status = data.status; if (data.notes !== undefined) p.notes = data.notes }
    return { message: 'تم التحديث' }
  },
  async remove(id) {
    await delay()
    const i = onboarding.findIndex((x) => x.id === Number(id))
    if (i > -1) onboarding.splice(i, 1)
    return { message: 'تم الحذف' }
  },
  async addTask(id, data) {
    await delay()
    const p = onboarding.find((x) => x.id === Number(id))
    if (!p) throw notFound()
    const t = { id: obTaskSeq++, title: data.title, category: data.category || 'أخرى', owner: data.owner || 'الموارد البشرية', due_date: data.due_date || null, is_done: 0 }
    p.tasks.push(t)
    return { message: 'تم', task: { id: t.id } }
  },
  async updateTask(taskId, data) {
    await delay()
    const { plan, task } = findTask(taskId)
    if (!task) throw notFound()
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
    if (plan) plan.tasks = plan.tasks.filter((t) => t.id !== Number(taskId))
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
    return { ...wfSummaryShape(w), steps: w.steps.slice().sort((a, b) => a.step_order - b.step_order) }
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
  async run(id) {
    await delay()
    const w = workflows.find((x) => x.id === Number(id))
    if (!w) throw notFound()
    if (!w.is_active) throw badReq('المسار غير مفعّل')
    w.runs_count += 1
    return { message: 'تم التنفيذ', runs_count: w.runs_count }
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
    const i = { id: intSeq++, name: data.name, provider: data.provider || null, category: data.category || 'أخرى', description: data.description || null, is_connected: 0, status: 'غير متصل', last_sync: null }
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
    i.last_sync = nowIso()
    i.status = 'متصل'
    return { message: 'تمت المزامنة', last_sync: i.last_sync }
  },
  async remove(id) {
    await delay()
    const idx = integrations.findIndex((x) => x.id === Number(id))
    if (idx > -1) integrations.splice(idx, 1)
    return { message: 'تم الحذف' }
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
