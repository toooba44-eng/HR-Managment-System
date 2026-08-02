const bcrypt = require('bcryptjs');
const db = require('./database');

function addDaysStr(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// A table is seeded only when it's still empty, so this runs safely on an
// existing database: it tops up newly-added tables/rows without touching or
// duplicating existing data (no volume reset needed).
const isEmpty = (table) => db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c === 0;

function seedData() {
  console.log('🌱 Seeding database (idempotent, per-table)...');

  // Departments
  if (isEmpty('departments')) {
    const insertDept = db.prepare(`INSERT INTO departments (name, description, color) VALUES (?, ?, ?)`);
    const departments = [
      ['الإدارة العليا', 'الإدارة العليا والرؤساء التنفيذيون', '#1E3A5F'],
      ['الموارد البشرية', 'إدارة الموارد البشرية والتوظيف', '#E63946'],
      ['التقنية', 'تطوير البرمجيات والبنية التحتية التقنية', '#4361EE'],
      ['المالية', 'المحاسبة والميزانيات والتقارير المالية', '#2A9D8F'],
      ['المبيعات', 'المبيعات وخدمة العملاء', '#F4A261'],
      ['التسويق', 'التسويق الرقمي والعلامة التجارية', '#9B5DE5'],
      ['القانونية', 'الشؤون القانونية والعقود', '#00B4D8'],
      ['العمليات', 'إدارة العمليات واللوجستيات', '#FB8500']
    ];
    departments.forEach(dept => insertDept.run(dept));
    console.log('✅ Departments seeded');
  }

  // Employees (+ manager links and counts)
  if (isEmpty('employees')) {
    const insertEmployee = db.prepare(`
      INSERT INTO employees (
        full_name, email, phone, national_id, date_of_birth, nationality, marital_status, address,
        employee_number, job_title, department_id, hire_date, employment_type, work_location,
        salary, allowances, bank_name, bank_account, contract_type, contract_start, contract_end,
        annual_leave_balance, sick_leave_balance, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const employees = [
      ['أحمد عبدالله العلي', 'ahmed.ceo@quant.com', '+966 50 111 0001', '1000000001', '1975-03-15', 'سعودي', 'متزوج', 'الرياض، حي الدبلوماسية',
       'EMP-001', 'الرئيس التنفيذي', 1, '2015-01-01', 'دوام كامل', 'الرياض - المقر الرئيسي',
       50000, 8000, 'البنك الأهلي', 'SA0010001', 'غير محدد', '2015-01-01', null, 30, 10, 'نشط'],
      ['محمد أحمد علام', 'mohamed.tech@quant.com', '+966 50 123 4567', '1000000002', '1990-05-20', 'سعودي', 'متزوج', 'الرياض، حي العليا',
       'EMP-002', 'مدير تقني', 3, '2020-03-01', 'دوام كامل', 'الرياض - المقر الرئيسي',
       25000, 3500, 'البنك الأهلي', 'SA0010002', 'غير محدد', '2020-03-01', null, 30, 10, 'نشط'],
      ['سارة خالد الفهد', 'sara.finance@quant.com', '+966 50 234 5678', '1000000003', '1988-08-12', 'سعودية', 'متزوجة', 'الرياض، حي النزهة',
       'EMP-003', 'مديرة مالية', 4, '2018-06-15', 'دوام كامل', 'الرياض - المقر الرئيسي',
       28000, 4000, 'بنك الرياض', 'SA0020003', 'غير محدد', '2018-06-15', null, 30, 10, 'نشط'],
      ['عمر حسن السالم', 'omar.sales@quant.com', '+966 50 345 6789', '1000000004', '1992-11-03', 'سعودي', 'أعزب', 'جدة، حي الروضة',
       'EMP-004', 'مدير مبيعات', 5, '2019-01-10', 'دوام كامل', 'جدة - فرع جدة',
       22000, 3000, 'البنك الأهلي', 'SA0010004', 'غير محدد', '2019-01-10', null, 30, 10, 'نشط'],
      ['نورة عبدالرحمن', 'noura.hr@quant.com', '+966 50 456 7890', '1000000005', '1993-02-28', 'سعودية', 'أعزب', 'الرياض، حي الياسمين',
       'EMP-005', 'مديرة موارد بشرية', 2, '2021-04-20', 'دوام كامل', 'الرياض - المقر الرئيسي',
       20000, 2500, 'بنك الرياض', 'SA0020005', 'غير محدد', '2021-04-20', null, 30, 10, 'نشط'],
      ['خالد سعد المطيري', 'khaled.dev@quant.com', '+966 50 567 8901', '1000000006', '1994-07-14', 'سعودي', 'أعزب', 'الرياض، حي الملقا',
       'EMP-006', 'مطور برمجيات أول', 3, '2022-08-01', 'دوام كامل', 'الرياض - المقر الرئيسي',
       18000, 2000, 'البنك الأهلي', 'SA0010006', 'غير محدد', '2022-08-01', null, 30, 10, 'نشط'],
      ['ليلى محمد الشمري', 'laila.marketing@quant.com', '+966 50 678 9012', '1000000007', '1991-09-05', 'سعودية', 'متزوجة', 'الدمام، حي الفيصلية',
       'EMP-007', 'مديرة تسويق', 6, '2020-11-15', 'دوام كامل', 'الدمام - فرع الدمام',
       21000, 2800, 'بنك الرياض', 'SA0020007', 'غير محدد', '2020-11-15', null, 30, 10, 'نشط'],
      ['فهد عبدالعزيز', 'fahd.legal@quant.com', '+966 50 789 0123', '1000000008', '1987-04-22', 'سعودي', 'متزوج', 'الرياض، حي الصحافة',
       'EMP-008', 'مدير قانوني', 7, '2017-02-01', 'دوام كامل', 'الرياض - المقر الرئيسي',
       24000, 3500, 'البنك الأهلي', 'SA0010008', 'غير محدد', '2017-02-01', null, 30, 10, 'نشط'],
      ['ريم عبدالله العتيبي', 'reem.ops@quant.com', '+966 50 890 1234', '1000000009', '1995-12-10', 'سعودية', 'أعزب', 'الرياض، حي النرجس',
       'EMP-009', 'مديرة عمليات', 8, '2023-01-05', 'دوام كامل', 'الرياض - المقر الرئيسي',
       19000, 2200, 'بنك الرياض', 'SA0020009', 'محدد', '2023-01-05', '2025-01-05', 30, 10, 'نشط'],
      ['عبدالرحمن سليمان', 'abdulrahman.dev@quant.com', '+966 50 901 2345', '1000000010', '1996-03-18', 'سعودي', 'أعزب', 'جدة، حي الشاطئ',
       'EMP-010', 'مطور واجهات أمامية', 3, '2023-06-01', 'دوام كامل', 'جدة - فرع جدة',
       14000, 1500, 'البنك الأهلي', 'SA0010010', 'محدد', '2023-06-01', '2025-06-01', 30, 10, 'نشط']
    ];
    employees.forEach(emp => insertEmployee.run(emp));

    db.prepare('UPDATE departments SET manager_id = 1 WHERE id = 1').run();
    db.prepare('UPDATE departments SET manager_id = 5 WHERE id = 2').run();
    db.prepare('UPDATE departments SET manager_id = 2 WHERE id = 3').run();
    db.prepare('UPDATE departments SET manager_id = 3 WHERE id = 4').run();
    db.prepare('UPDATE departments SET manager_id = 4 WHERE id = 5').run();
    db.prepare('UPDATE departments SET manager_id = 7 WHERE id = 6').run();
    db.prepare('UPDATE departments SET manager_id = 8 WHERE id = 7').run();
    db.prepare('UPDATE departments SET manager_id = 9 WHERE id = 8').run();
    db.prepare('UPDATE employees SET manager_id = 2 WHERE id IN (6, 10)').run();
    db.prepare('UPDATE employees SET manager_id = 4 WHERE id = 4').run();
    db.prepare('UPDATE employees SET manager_id = 1 WHERE id IN (2, 3, 5, 7, 8, 9)').run();
    db.prepare(`UPDATE departments SET employee_count = (
      SELECT COUNT(*) FROM employees WHERE department_id = departments.id
    )`).run();
    console.log('✅ Employees seeded');
  }

  // Users — insert any that are missing (adds new roles without duplicating)
  {
    const insertUser = db.prepare(`INSERT OR IGNORE INTO users (email, password_hash, role, employee_id) VALUES (?, ?, ?, ?)`);
    const password = bcrypt.hashSync('password123', 10);
    const users = [
      ['superadmin@quant.com', bcrypt.hashSync('super123', 10), 'super_admin', null],
      ['candidate@quant.com', bcrypt.hashSync('candidate123', 10), 'candidate', null],
      ['admin@quant.com', bcrypt.hashSync('admin123', 10), 'admin', null],
      ['ahmed.ceo@quant.com', password, 'admin', 1],
      ['mohamed.tech@quant.com', password, 'department_head', 2],
      ['sara.finance@quant.com', password, 'department_head', 3],
      ['omar.sales@quant.com', password, 'department_head', 4],
      ['noura.hr@quant.com', password, 'hr_manager', 5],
      ['khaled.dev@quant.com', password, 'employee', 6],
      ['laila.marketing@quant.com', password, 'department_head', 7],
      ['fahd.legal@quant.com', password, 'department_head', 8],
      ['reem.ops@quant.com', password, 'department_head', 9],
      ['abdulrahman.dev@quant.com', password, 'employee', 10]
    ];
    const before = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    users.forEach(user => insertUser.run(user));
    const added = db.prepare('SELECT COUNT(*) AS c FROM users').get().c - before;
    console.log(`✅ Users ensured (${added} new)`);
  }

  // Attendance
  if (isEmpty('attendance')) {
    const insertAttendance = db.prepare(`INSERT INTO attendance (employee_id, date, check_in, check_out, work_hours, status) VALUES (?, ?, ?, ?, ?, ?)`);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const attendanceRecords = [
      [1, today, `${today} 07:55:00`, `${today} 16:05:00`, 8.17, 'حاضر'],
      [2, today, `${today} 08:00:00`, null, 4.5, 'حاضر'],
      [3, today, `${today} 08:10:00`, `${today} 16:00:00`, 7.83, 'حاضر'],
      [4, today, `${today} 07:45:00`, null, 4.75, 'حاضر'],
      [5, today, `${today} 08:05:00`, `${today} 16:10:00`, 8.08, 'حاضر'],
      [6, today, `${today} 08:00:00`, null, 4.5, 'حاضر'],
      [7, today, `${today} 08:20:00`, `${today} 15:50:00`, 7.5, 'حاضر'],
      [8, today, `${today} 07:50:00`, null, 4.67, 'حاضر'],
      [9, today, `${today} 08:15:00`, `${today} 16:00:00`, 7.75, 'حاضر'],
      [10, today, `${today} 08:00:00`, null, 4.5, 'حاضر'],
      [1, yesterday, `${yesterday} 08:00:00`, `${yesterday} 16:00:00`, 8.0, 'حاضر'],
      [2, yesterday, `${yesterday} 08:00:00`, `${yesterday} 16:00:00`, 8.0, 'حاضر'],
      [3, yesterday, `${yesterday} 08:00:00`, `${yesterday} 16:00:00`, 8.0, 'حاضر'],
    ];
    attendanceRecords.forEach(record => insertAttendance.run(record));
    console.log('✅ Attendance seeded');
  }

  // Attendance correction requests
  if (isEmpty('attendance_corrections')) {
    const ins = db.prepare(`INSERT INTO attendance_corrections (employee_id, date, requested_check_in, requested_check_out, reason, status, reviewed_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    ins.run(6, addDaysStr(-1), '08:05', '16:10', 'نسيت تسجيل الدخول بسبب اجتماع صباحي', 'معلق', null);
    ins.run(10, addDaysStr(-2), '09:00', '17:00', 'عطل في جهاز البصمة', 'موافق عليه', 5);
    ins.run(4, addDaysStr(-3), null, '16:30', 'نسيت تسجيل الخروج', 'مرفوض', 5);
    console.log('✅ Attendance corrections seeded');
  }

  // Leaves
  if (isEmpty('leaves')) {
    const insertLeave = db.prepare(`INSERT INTO leaves (employee_id, type, start_date, end_date, days_count, reason, status, approved_by, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const leaves = [
      [6, 'سنوية', addDaysStr(3), addDaysStr(8), 6, 'إجازة عائلية', 'موافقة', 5, addDaysStr(-2) + ' 10:00:00'],
      [10, 'مرضية', addDaysStr(1), addDaysStr(3), 3, 'مراجعة طبية', 'معلقة', null, null],
      [3, 'طارئة', addDaysStr(5), addDaysStr(5), 1, 'ظروف طارئة', 'معلقة', null, null],
    ];
    leaves.forEach(leave => insertLeave.run(leave));
    console.log('✅ Leaves seeded');
  }

  // Documents
  if (isEmpty('documents')) {
    const insertDoc = db.prepare(`INSERT INTO documents (employee_id, type, title, file_name, expiry_date, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`);
    const docs = [
      [1, 'هوية', 'بطاقة الهوية الوطنية', 'id_card_ceo.pdf', addDaysStr(400), 1],
      [1, 'عقد عمل', 'عقد العقد الرئيسي', 'contract_ceo.pdf', addDaysStr(180), 1],
      [2, 'هوية', 'بطاقة الهوية الوطنية', 'id_card_tech.pdf', addDaysStr(20), 5],
      [2, 'شهادة', 'شهادة البكالوريوس', 'degree_tech.pdf', null, 5],
      [2, 'عقد عمل', 'عقد العمل الحالي', 'contract_tech.pdf', addDaysStr(90), 5],
      [2, 'تأمين', 'وثيقة التأمين الطبي', 'insurance_tech.pdf', addDaysStr(-10), 5],
      [3, 'هوية', 'بطاقة الهوية الوطنية', 'id_card_finance.pdf', addDaysStr(15), 5],
      [3, 'عقد عمل', 'عقد العمل', 'contract_finance.pdf', addDaysStr(365), 5],
      [3, 'جواز', 'جواز السفر', 'passport_finance.pdf', addDaysStr(-45), 5],
    ];
    docs.forEach(doc => insertDoc.run(doc));
    console.log('✅ Documents seeded');
  }

  // Announcements
  if (isEmpty('announcements')) {
    const insertAnn = db.prepare(`INSERT INTO announcements (title, body, audience, is_pinned, requires_acknowledgment, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
    const policyId = insertAnn.run('تحديث سياسة العمل عن بُعد', 'يسمح النظام الجديد بيومين عمل عن بُعد أسبوعياً بعد موافقة المدير المباشر. يُرجى تقديم الطلبات عبر بوابة الموظف.', 'الجميع', 1, 1, 5).lastInsertRowid;
    insertAnn.run('موعد صرف رواتب الشهر', 'سيتم صرف رواتب هذا الشهر يوم 27 كالمعتاد. لأي استفسار يُرجى التواصل مع الموارد البشرية.', 'الجميع', 0, 0, 5);
    insertAnn.run('برنامج تدريبي جديد', 'انطلق التسجيل في برنامج تطوير المهارات القيادية. الأماكن محدودة — سارع بالتسجيل عبر بوابة الموظف.', 'الجميع', 0, 0, 5);
    console.log('✅ Announcements seeded');

    if (isEmpty('announcement_reads')) {
      const insertRead = db.prepare(`INSERT INTO announcement_reads (announcement_id, employee_id, read_at) VALUES (?, ?, ?)`);
      insertRead.run(policyId, 6, addDaysStr(-1));
      insertRead.run(policyId, 2, addDaysStr(-1));
      console.log('✅ Announcement reads seeded');
    }
  }

  // Requests
  if (isEmpty('requests')) {
    const insertReq = db.prepare(`INSERT INTO requests (employee_id, type, subject, details, status, response, resolved_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const requests = [
      [6, 'خطاب', 'خطاب تعريف بالراتب', 'مطلوب لغرض فتح حساب بنكي.', 'مكتملة', 'تم إصدار الخطاب وإرساله على بريدك.', 5],
      [6, 'عمل عن بعد', 'طلب عمل عن بُعد ليوم الخميس', 'لظرف عائلي.', 'معلقة', null, null],
      [10, 'عمل إضافي', 'عمل إضافي لإنهاء مشروع', 'ساعتان إضافيتان يومي الاثنين والثلاثاء.', 'مقبولة', 'تمت الموافقة.', 2],
      [10, 'تحديث بيانات', 'تحديث رقم الجوال', 'الرقم الجديد: 0501234567', 'معلقة', null, null],
    ];
    requests.forEach(r => insertReq.run(r));
    console.log('✅ Requests seeded');
  }

  // HR Help Desk tickets + reply threads
  if (isEmpty('helpdesk_tickets')) {
    const insertTicket = db.prepare(`INSERT INTO helpdesk_tickets (employee_id, category, subject, description, priority, status, assigned_to, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const t1 = insertTicket.run(6, 'رواتب ومزايا', 'خصم غير مفهوم في راتب الشهر الماضي', 'لاحظت خصماً 200 ريال إضافياً عن المعتاد ولا أعرف سببه.', 'عالية', 'قيد المعالجة', 5, null).lastInsertRowid;
    const t2 = insertTicket.run(10, 'مشكلة تقنية', 'لا أستطيع الدخول لبوابة تسجيل الحضور', 'تظهر رسالة خطأ عند محاولة تسجيل الدخول صباحاً.', 'عاجلة', 'مفتوحة', null, null).lastInsertRowid;
    const t3 = insertTicket.run(4, 'إجازات وحضور', 'استفسار عن رصيد الإجازة الطارئة', 'كم يوم إجازة طارئة متبقٍ لي هذا العام؟', 'منخفضة', 'مغلقة', 5, addDaysStr(-3)).lastInsertRowid;
    console.log('✅ Help desk tickets seeded');

    if (isEmpty('helpdesk_replies')) {
      const insertReply = db.prepare(`INSERT INTO helpdesk_replies (ticket_id, author_id, body) VALUES (?, ?, ?)`);
      insertReply.run(t1, 5, 'شكراً لتواصلك، جاري مراجعة كشف الرواتب والرجوع إليك خلال يوم عمل.');
      insertReply.run(t3, 5, 'رصيدك الحالي 5 أيام إجازة طارئة، لم يُستخدم منها أي رصيد هذا العام.');
      console.log('✅ Help desk replies seeded');
    }
  }

  // Workforce planning: budgeted headcount per department for the current year
  if (isEmpty('workforce_plans')) {
    const year = new Date().getFullYear();
    const insertPlan = db.prepare(`INSERT INTO workforce_plans (department_id, year, planned_headcount, budget, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
    insertPlan.run(3, year, 5, 450000, 'توسعة الفريق التقني بمطوّرين إضافيين لدعم المنتج الجديد.', 5);
    insertPlan.run(2, year, 2, 220000, 'خطة استقطاب أخصائي توظيف إضافي لدعم فريق الموارد البشرية.', 5);
    insertPlan.run(5, year, 2, 300000, 'تعزيز فريق المبيعات بعد نمو المحفظة في فرع جدة.', 5);
    insertPlan.run(4, year, 2, 180000, null, 5);
    console.log('✅ Workforce plans seeded');
  }

  // Policies
  if (isEmpty('policies')) {
    const insertPolicy = db.prepare(`INSERT INTO policies (title, category, body, created_by) VALUES (?, ?, ?, ?)`);
    const policies = [
      ['سياسة الدوام والانصراف', 'الحضور', 'ساعات العمل الرسمية من 8 صباحاً حتى 5 مساءً، من الأحد إلى الخميس، بينها ساعة استراحة. يُحتسب الحضور بعد 8:15 تأخراً.', 5],
      ['سياسة الإجازات السنوية', 'الإجازات', 'يستحق الموظف 30 يوم إجازة سنوية مدفوعة. تُقدَّم الطلبات قبل 3 أيام عمل على الأقل عبر بوابة الموظف وتخضع لموافقة المدير المباشر.', 5],
      ['سياسة العمل عن بُعد', 'العمل المرن', 'يُسمح بيومين عمل عن بُعد أسبوعياً بحد أقصى بعد موافقة المدير المباشر، مع الالتزام بالتواجد الرقمي خلال ساعات العمل.', 5],
      ['مدونة السلوك المهني', 'عام', 'يلتزم جميع الموظفين بالاحترام المتبادل، السرية، وعدم تضارب المصالح. أي مخالفة تخضع للائحة الجزاءات.', 5],
      ['سياسة استخدام الأجهزة', 'تقنية', 'أجهزة الشركة مخصّصة للعمل. يُمنع تثبيت برامج غير مرخّصة، ويجب حماية بيانات الدخول وعدم مشاركتها.', 2],
    ];
    policies.forEach(p => insertPolicy.run(p));
    console.log('✅ Policies seeded');
  }

  // Tasks
  if (isEmpty('tasks')) {
    const insertTask = db.prepare(`INSERT INTO tasks (title, description, employee_id, assigned_by, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const tasks = [
      ['إنهاء وحدة تسجيل الدخول', 'استكمال اختبارات وحدة المصادقة وتوثيقها.', 6, 2, 'قيد التنفيذ', 'عالية', addDaysStr(3)],
      ['مراجعة كود واجهة الموظفين', 'مراجعة طلب الدمج الخاص بصفحة الموظفين.', 10, 2, 'جديدة', 'متوسطة', addDaysStr(5)],
      ['تحديث التوثيق التقني', 'تحديث ملف README بمتغيرات البيئة الجديدة.', 6, 2, 'مكتملة', 'منخفضة', addDaysStr(-2)],
      ['إعداد تقرير المبيعات الشهري', 'تجهيز تقرير مبيعات الربع الحالي.', 4, 4, 'قيد التنفيذ', 'عالية', addDaysStr(2)],
    ];
    tasks.forEach(t => insertTask.run(t));
    console.log('✅ Tasks seeded');
  }

  // Jobs (+ one demo application)
  if (isEmpty('jobs')) {
    const insertJob = db.prepare(`INSERT INTO jobs (title, department, location, type, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const jobs = [
      ['مطور واجهات أمامية (React)', 'التقنية', 'الرياض - المقر الرئيسي', 'دوام كامل', 'نبحث عن مطوّر واجهات متمكّن من React وTailwind للانضمام لفريق المنتج.', 'مفتوحة', 5],
      ['أخصائي موارد بشرية', 'الموارد البشرية', 'الرياض - المقر الرئيسي', 'دوام كامل', 'مسؤول عن التوظيف وإدارة شؤون الموظفين والسياسات.', 'مفتوحة', 5],
      ['مندوب مبيعات', 'المبيعات', 'جدة - فرع جدة', 'دوام كامل', 'تطوير علاقات العملاء وتحقيق أهداف المبيعات.', 'مفتوحة', 5],
      ['محاسب', 'المالية', 'الرياض - المقر الرئيسي', 'عقد', 'إعداد التقارير المالية ومتابعة الميزانيات.', 'مغلقة', 5],
    ];
    const jobIds = jobs.map(j => insertJob.run(j).lastInsertRowid);
    let scoredAppIds = [];
    if (isEmpty('applications')) {
      const insApp = db.prepare(`INSERT INTO applications (job_id, candidate_email, candidate_name, cover_note, status, stage, source, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const S2ST = { 'متقدم جديد': 'قيد المراجعة', 'مراجعة أولية': 'قيد المراجعة', 'اختبار': 'قيد المراجعة', 'مقابلة': 'مقابلة', 'عرض وظيفي': 'مقابلة', 'تم التوظيف': 'مقبول', 'مرفوض': 'مرفوض' };
      const app = (job, email, name, note, stage, source, rating) => insApp.run(job, email, name, note, S2ST[stage], stage, source, rating).lastInsertRowid;
      const app1 = app(jobIds[0], 'candidate@quant.com', 'مرشح تجريبي', 'لديّ خبرة 3 سنوات في تطوير الواجهات.', 'مقابلة', 'LinkedIn', 4);
      app(jobIds[0], 'sultan.dev@mail.com', 'سلطان الحربي', 'خبرة قوية في React و TypeScript.', 'اختبار', 'الموقع', null);
      const app3 = app(jobIds[0], 'tariq.dev@mail.com', 'طارق القحطاني', 'مطوّر شغوف بواجهات المستخدم.', 'عرض وظيفي', 'LinkedIn', 5);
      app(jobIds[0], 'huda.dev@mail.com', 'هدى العنزي', 'حديثة تخرّج بمشاريع متميزة.', 'متقدم جديد', 'إحالة موظف', null);
      app(jobIds[1], 'mona.hr@mail.com', 'منى العتيبي', 'خبرة 5 سنوات في التوظيف.', 'مراجعة أولية', 'الموقع', 3);
      const app6 = app(jobIds[1], 'faisal.hr@mail.com', 'فيصل النمر', 'أخصائي موارد بشرية معتمد.', 'مقابلة', 'Indeed', 4);
      app(jobIds[2], 'saad.sales@mail.com', 'سعد الدوسري', 'سجل مبيعات حافل.', 'تم التوظيف', 'إحالة موظف', 5);
      app(jobIds[2], 'noor.sales@mail.com', 'نور الشهري', 'خبرة في مبيعات التجزئة.', 'مرفوض', 'الموقع', 2);
      scoredAppIds = [app1, app3, app6];
    }
    console.log('✅ Jobs & applications seeded');

    if (isEmpty('interview_scorecards') && scoredAppIds.length) {
      const [app1, app3, app6] = scoredAppIds;
      const insSc = db.prepare(`INSERT INTO interview_scorecards (application_id, interviewer_id, technical, communication, problem_solving, culture_fit, recommendation, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      // Two interviewers scored the same candidate (app1) — a mild disagreement to demo comparison
      insSc.run(app1, 2, 4, 4, 4, 4, 'يوصى', 'أداء تقني جيد ومهارات تواصل ممتازة.');
      insSc.run(app1, 5, 2, 2, 2, 3, 'لا يوصى', 'أرى فجوات واضحة في الأساسيات لم يستطع تجاوزها.');
      // A candidate everyone agrees strongly on
      insSc.run(app3, 2, 5, 5, 4, 5, 'يوصى بشدة', 'من أفضل من قابلنا هذا الربع.');
      insSc.run(app3, 4, 5, 4, 5, 5, 'يوصى بشدة', 'حل المسائل التقنية بسرعة وثقة عالية.');
      // Single interviewer so far
      insSc.run(app6, 5, 4, 5, 3, 4, 'يوصى', 'خبرة جيدة في التوظيف، تحتاج دعماً في القرارات الصعبة.');
      console.log('✅ Interview scorecards seeded');
    }
  }

  // Companies (platform tenants)
  if (isEmpty('companies')) {
    const insertCompany = db.prepare(`INSERT INTO companies (name, contact_email, plan, users_limit, storage_limit_gb, status) VALUES (?, ?, ?, ?, ?, ?)`);
    const companies = [
      ['شركة كوانت التقنية', 'admin@quant.com', 'مؤسسية', 200, 100, 'نشطة'],
      ['مجموعة الأفق', 'it@alufuq.com', 'احترافية', 75, 50, 'نشطة'],
      ['مؤسسة النخبة', 'hr@alnukhba.com', 'أساسية', 25, 10, 'نشطة'],
      ['شركة الريادة', 'info@alriyada.com', 'احترافية', 75, 50, 'معلّقة'],
    ];
    companies.forEach(c => insertCompany.run(c));
    console.log('✅ Companies seeded');
  }

  // Billing invoices
  if (isEmpty('invoices')) {
    const ins = db.prepare(`INSERT INTO invoices (company_id, invoice_number, plan, period, amount, issue_date, due_date, status, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const rows = [
      [1, 'INV-2026-0001', 'مؤسسية', 'يناير 2026', 24000, addDaysStr(-60), addDaysStr(-45), 'مدفوعة', addDaysStr(-50)],
      [1, 'INV-2026-0002', 'مؤسسية', 'فبراير 2026', 24000, addDaysStr(-30), addDaysStr(-15), 'مدفوعة', addDaysStr(-20)],
      [2, 'INV-2026-0003', 'احترافية', 'فبراير 2026', 9000, addDaysStr(-30), addDaysStr(-15), 'مدفوعة', addDaysStr(-18)],
      [2, 'INV-2026-0004', 'احترافية', 'مارس 2026', 9000, addDaysStr(-5), addDaysStr(10), 'غير مدفوعة', null],
      [3, 'INV-2026-0005', 'أساسية', 'مارس 2026', 3000, addDaysStr(-5), addDaysStr(10), 'غير مدفوعة', null],
      [4, 'INV-2026-0006', 'احترافية', 'فبراير 2026', 9000, addDaysStr(-40), addDaysStr(-25), 'متأخرة', null],
    ];
    rows.forEach((r) => ins.run(...r));
    console.log('✅ Invoices seeded');
  }

  // Expenses & advances
  if (isEmpty('expenses')) {
    const insertExpense = db.prepare(`INSERT INTO expenses (employee_id, type, category, amount, description, status, approved_by, settled_amount, settled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const expenses = [
      [6, 'مصروف', 'مواصلات', 350, 'أجرة مواصلات لزيارة عميل.', 'معلقة', null, null, null],
      [6, 'سلفة', 'سلفة راتب', 3000, 'سلفة على راتب الشهر القادم.', 'معتمدة', 2, null, null],
      [10, 'مصروف', 'قرطاسية', 180, 'شراء مستلزمات مكتبية.', 'مصروفة', 5, null, null],
      [4, 'مصروف', 'ضيافة', 620, 'ضيافة اجتماع مبيعات.', 'معلقة', null, null, null],
      [3, 'سلفة', 'سفر', 5000, 'سلفة سفر لحضور مؤتمر في الرياض.', 'مصروفة', 2, null, null],
      [5, 'سلفة', 'سفر', 4000, 'سلفة سفر — زيارة فرع جدة.', 'مصروفة', 2, 3450, addDaysStr(-2)],
    ];
    expenses.forEach(x => insertExpense.run(x));
    console.log('✅ Expenses seeded');
  }

  // Assets & custody
  if (isEmpty('assets')) {
    const insertAsset = db.prepare(`INSERT INTO assets (name, category, serial_number, assigned_to, status, assigned_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const laptopId = insertAsset.run('لابتوب Dell Latitude', 'أجهزة حاسب', 'DL-2024-0012', 6, 'مُخصّص', addDaysStr(-120), 'مخصّص لفريق التطوير.').lastInsertRowid;
    insertAsset.run('شاشة LG 27"', 'ملحقات', 'LG-27-0345', 6, 'مُخصّص', addDaysStr(-120), null);
    const phoneId = insertAsset.run('هاتف iPhone 15', 'أجهزة جوال', 'IP-15-0088', 4, 'مُخصّص', addDaysStr(-60), 'لمندوب المبيعات.').lastInsertRowid;
    insertAsset.run('لابووب MacBook Pro', 'أجهزة حاسب', 'MBP-2024-0021', null, 'متاح', null, 'متاح للتخصيص.');
    const printerId = insertAsset.run('طابعة HP LaserJet', 'أجهزة مكتبية', 'HP-LJ-0007', null, 'صيانة', null, 'قيد الصيانة الدورية.').lastInsertRowid;
    console.log('✅ Assets seeded');

    if (isEmpty('asset_history')) {
      const insertHistory = db.prepare(`INSERT INTO asset_history (asset_id, employee_id, action, condition, notes, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      insertHistory.run(laptopId, 6, 'تخصيص', null, 'تسليم عند الالتحاق بفريق التطوير.', 5, addDaysStr(-120));
      insertHistory.run(phoneId, 4, 'تخصيص', null, 'تسليم لمندوب المبيعات.', 5, addDaysStr(-60));
      insertHistory.run(printerId, null, 'صيانة', null, 'انحشار ورق متكرر — أُرسلت للصيانة الدورية.', 5, addDaysStr(-3));
      console.log('✅ Asset history seeded');
    }
  }

  // Performance goals
  if (isEmpty('goals')) {
    const insertGoal = db.prepare(`INSERT INTO goals (employee_id, title, description, weight, progress, target_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const goals = [
      [6, 'إطلاق الوحدة الجديدة', 'إنهاء وإطلاق وحدة التقارير قبل نهاية الربع.', 40, 60, addDaysStr(30), 'قيد التنفيذ', 2],
      [6, 'تحسين تغطية الاختبارات', 'رفع تغطية الاختبارات إلى 80%.', 30, 25, addDaysStr(45), 'قيد التنفيذ', 2],
      [10, 'تطوير مهارات React المتقدمة', 'إكمال مسار تدريبي وتطبيقه عملياً.', 30, 100, addDaysStr(-5), 'مكتملة', 2],
      [4, 'تحقيق هدف المبيعات الربعي', 'الوصول إلى 110% من المستهدف.', 50, 45, addDaysStr(20), 'قيد التنفيذ', 4],
    ];
    goals.forEach(g => insertGoal.run(g));
    console.log('✅ Goals seeded');
  }

  // Training courses & enrollments
  if (isEmpty('courses')) {
    const insertCourse = db.prepare(`INSERT INTO courses (title, category, description, hours, level, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const courses = [
      ['أساسيات إدارة المشاريع', 'إدارة', 'مقدمة في منهجيات إدارة المشاريع وأدواتها.', 12, 'مبتدئ', 'متاحة', 5],
      ['React المتقدم', 'تقنية', 'أنماط متقدمة في React وتحسين الأداء.', 20, 'متقدم', 'متاحة', 5],
      ['مهارات التواصل الفعّال', 'مهارات', 'تطوير مهارات التواصل والعرض والإقناع.', 8, 'مبتدئ', 'متاحة', 5],
      ['الأمن السيبراني للموظفين', 'أمن معلومات', 'أساسيات حماية البيانات والوعي الأمني.', 6, 'مبتدئ', 'متاحة', 5],
      ['القيادة وإدارة الفرق', 'قيادة', 'برنامج تطوير المهارات القيادية.', 16, 'متوسط', 'مغلقة', 5],
    ];
    const courseIds = courses.map(c => insertCourse.run(c).lastInsertRowid);
    if (isEmpty('enrollments')) {
      const insertEnroll = db.prepare(`INSERT INTO enrollments (course_id, employee_id, progress, status) VALUES (?, ?, ?, ?)`);
      insertEnroll.run(courseIds[1], 6, 40, 'قيد التقدم');
      const cert1 = insertEnroll.run(courseIds[3], 6, 100, 'مكتمل').lastInsertRowid;
      insertEnroll.run(courseIds[0], 10, 10, 'قيد التقدم');
      const cert2 = insertEnroll.run(courseIds[2], 10, 100, 'مكتمل').lastInsertRowid;

      if (isEmpty('course_certificates')) {
        const insertCert = db.prepare(`INSERT INTO course_certificates (enrollment_id, employee_id, course_id, code) VALUES (?, ?, ?, ?)`);
        insertCert.run(cert1, 6, courseIds[3], 'QNT-8A21FC03');
        insertCert.run(cert2, 10, courseIds[2], 'QNT-5B9E7D14');
        console.log('✅ Course certificates seeded');
      }
    }
    console.log('✅ Courses & enrollments seeded');
  }

  // Offboarding
  if (isEmpty('offboarding')) {
    const ins = db.prepare(`INSERT INTO offboarding (employee_id, type, reason, last_working_day, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const caseId = ins.run(9, 'انتهاء عقد', 'انتهاء مدة العقد محدد المدة.', addDaysStr(20), 'قيد المعالجة', 'بانتظار إجراءات المخالصة.', 5).lastInsertRowid;
    console.log('✅ Offboarding seeded');

    if (isEmpty('offboarding_tasks')) {
      const insTask = db.prepare(`INSERT INTO offboarding_tasks (offboarding_id, title, category, owner, due_date, is_done) VALUES (?, ?, ?, ?, ?, ?)`);
      insTask.run(caseId, 'استرجاع الحاسب والعهد والبطاقة التعريفية', 'عهدة', 'تقنية المعلومات', addDaysStr(18), 1);
      insTask.run(caseId, 'إلغاء صلاحيات الأنظمة والبريد الإلكتروني', 'صلاحيات', 'تقنية المعلومات', addDaysStr(20), 0);
      insTask.run(caseId, 'تصفية الرصيد المالي ومستحقات نهاية الخدمة', 'تصفية مالية', 'الموارد البشرية', addDaysStr(22), 0);
      insTask.run(caseId, 'إجراء مقابلة خروج (Exit Interview)', 'مقابلة خروج', 'الموارد البشرية', addDaysStr(19), 0);
      insTask.run(caseId, 'تسليم مستند إخلاء الطرف', 'مستندات', 'الموارد البشرية', addDaysStr(22), 0);
      console.log('✅ Offboarding checklist seeded');
    }
  }

  // Grievances
  if (isEmpty('grievances')) {
    const ins = db.prepare(`INSERT INTO grievances (employee_id, type, category, description, severity, status, action, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const case1 = ins.run(10, 'مخالفة', 'الالتزام بالدوام', 'تأخر متكرر عن موعد الحضور.', 'متوسطة', 'قيد المعالجة', 'تم توجيه إنذار شفهي.', 5, 5).lastInsertRowid;
    ins.run(6, 'شكوى', 'بيئة العمل', 'شكوى بخصوص ضوضاء في مساحة العمل.', 'منخفضة', 'مفتوحة', null, null, 5);
    console.log('✅ Grievances seeded');

    if (isEmpty('grievance_notes')) {
      const insNote = db.prepare(`INSERT INTO grievance_notes (grievance_id, author_id, note, created_at) VALUES (?, ?, ?, ?)`);
      insNote.run(case1, 5, 'راجعت سجل الحضور — 4 حالات تأخر خلال الشهرين الماضيين.', addDaysStr(-4));
      insNote.run(case1, 5, 'اجتمعت مع الموظف وتم توجيه إنذار شفهي مع متابعة الحضور أسبوعياً.', addDaysStr(-2));
      console.log('✅ Grievance notes seeded');
    }
  }

  // Health & safety incidents
  if (isEmpty('incidents')) {
    const ins = db.prepare(`INSERT INTO incidents (title, type, employee_id, location, severity, description, status, incident_date, reported_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const slip = ins.run('انزلاق في الممر', 'حادث', 6, 'الطابق الثاني - الممر', 'منخفضة', 'أرضية مبللة دون لافتة تحذير.', 'مغلق', addDaysStr(-10), 5).lastInsertRowid;
    const extinguisher = ins.run('فحص طفايات الحريق', 'ملاحظة سلامة', null, 'المبنى الرئيسي', 'متوسطة', 'حان موعد الفحص الدوري لطفايات الحريق.', 'مفتوح', addDaysStr(-2), 5).lastInsertRowid;
    console.log('✅ Incidents seeded');

    if (isEmpty('incident_actions')) {
      const insAction = db.prepare(`INSERT INTO incident_actions (incident_id, description, owner_id, due_date, status, created_by, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      insAction.run(slip, 'تركيب لافتات تحذير من الانزلاق في نقاط التنظيف.', 5, addDaysStr(-8), 'مكتمل', 5, addDaysStr(-8));
      insAction.run(slip, 'تدريب طاقم النظافة على وضع اللافتات فوراً.', 5, addDaysStr(-5), 'مكتمل', 5, addDaysStr(-6));
      insAction.run(extinguisher, 'التنسيق مع مورد خارجي لفحص وصيانة الطفايات.', 2, addDaysStr(5), 'مفتوح', 5, null);
      insAction.run(extinguisher, 'تحديث سجل الفحص الدوري بعد الصيانة.', 5, addDaysStr(7), 'مفتوح', 5, null);
      console.log('✅ Incident actions seeded');
    }
  }

  // Shifts
  if (isEmpty('shifts')) {
    const ins = db.prepare(`INSERT INTO shifts (employee_id, date, shift_type, start_time, end_time, location, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const shift1 = ins.run(6, addDaysStr(0), 'صباحية', '08:00', '16:00', 'المقر الرئيسي', 5).lastInsertRowid;
    ins.run(6, addDaysStr(1), 'صباحية', '08:00', '16:00', 'المقر الرئيسي', 5);
    ins.run(10, addDaysStr(0), 'مسائية', '16:00', '00:00', 'فرع جدة', 5);
    ins.run(4, addDaysStr(0), 'صباحية', '09:00', '17:00', 'فرع جدة', 5);
    const shift2 = ins.run(10, addDaysStr(3), 'مسائية', '16:00', '00:00', 'فرع جدة', 5).lastInsertRowid;
    const shift3 = ins.run(6, addDaysStr(3), 'صباحية', '08:00', '16:00', 'المقر الرئيسي', 5).lastInsertRowid;
    console.log('✅ Shifts seeded');

    if (isEmpty('shift_swap_requests')) {
      db.prepare(`INSERT INTO shift_swap_requests (requester_id, shift_a_id, target_id, shift_b_id, reason, status) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(6, shift3, 10, shift2, 'لدي موعد شخصي في ذلك اليوم وأودّ التبديل.', 'بانتظار موافقة الزميل');
      console.log('✅ Shift swap requests seeded');
    }
  }

  // Timesheets
  if (isEmpty('timesheets')) {
    const ins = db.prepare(`INSERT INTO timesheets (employee_id, date, project, task, hours, billable, status, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run(6, addDaysStr(-1), 'منصة الموارد البشرية', 'تطوير وحدة التقارير', 6, 1, 'معتمد', 2);
    ins.run(6, addDaysStr(0), 'منصة الموارد البشرية', 'إصلاح أخطاء', 3, 1, 'مقدّم', null);
    ins.run(10, addDaysStr(0), 'تطبيق الجوال', 'تصميم الواجهات', 5, 1, 'مسودة', null);
    ins.run(6, addDaysStr(-2), 'داخلي', 'اجتماع الفريق الأسبوعي', 1, 0, 'معتمد', 2);
    console.log('✅ Timesheets seeded');
  }

  // Compensation & benefits
  if (isEmpty('compensation')) {
    const ins = db.prepare(`INSERT INTO compensation (employee_id, grade, base_salary, housing_allowance, transport_allowance, other_allowances, bonus, insurance_class, effective_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run(1, 'الدرجة التنفيذية', 35000, 8000, 2000, 3000, 5000, 'الفئة أ', addDaysStr(-120), 'نشط', 5);
    ins.run(2, 'الدرجة الأولى', 22000, 5000, 1500, 1000, 2000, 'الفئة أ', addDaysStr(-90), 'نشط', 5);
    ins.run(3, 'الدرجة الأولى', 21000, 5000, 1500, 800, 1500, 'الفئة أ', addDaysStr(-90), 'نشط', 5);
    ins.run(5, 'الدرجة الثانية', 18000, 4000, 1200, 500, 1000, 'الفئة ب', addDaysStr(-60), 'نشط', 5);
    const comp6 = ins.run(6, 'الدرجة الثالثة', 12000, 3000, 1000, 0, 500, 'الفئة ب', addDaysStr(-45), 'نشط', 5).lastInsertRowid;
    ins.run(10, 'الدرجة الرابعة', 9000, 2500, 800, 0, 0, 'الفئة ج', addDaysStr(-30), 'نشط', 5);
    console.log('✅ Compensation seeded');

    if (isEmpty('compensation_history')) {
      db.prepare(`INSERT INTO compensation_history (compensation_id, employee_id, old_total, new_total, old_base_salary, new_base_salary, reason, changed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(comp6, 6, 15000, 16500, 10500, 12000, 'ترقية سنوية بعد تقييم الأداء.', 5, addDaysStr(-45));
      console.log('✅ Compensation history seeded');
    }
  }

  // Payroll runs: last month (paid) + current month (pending review)
  if (isEmpty('payroll_runs')) {
    const now = new Date();
    const activeEmployees = db.prepare("SELECT id, salary, allowances FROM employees WHERE status = 'نشط'").all();
    const insRun = db.prepare(`INSERT INTO payroll_runs (month, year, status, total_net, employee_count, created_by, approved_by, approved_at, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insItem = db.prepare(`INSERT INTO payroll_run_items (run_id, employee_id, basic, allowances, deductions, net) VALUES (?, ?, ?, ?, ?, ?)`);

    const buildItems = () => activeEmployees.map((e) => {
      const basic = e.salary || 0;
      const allowances = e.allowances || 0;
      const deductions = Math.round(basic * 0.1);
      return { employee_id: e.id, basic, allowances, deductions, net: basic + allowances - deductions };
    });

    // Last month: fully paid
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastItems = buildItems();
    const lastTotal = lastItems.reduce((s, i) => s + i.net, 0);
    const lastRunId = insRun.run(
      lastMonthDate.getMonth() + 1, lastMonthDate.getFullYear(), 'مصروف', lastTotal, lastItems.length,
      5, 5, addDaysStr(-25), addDaysStr(-20), addDaysStr(-28)
    ).lastInsertRowid;
    lastItems.forEach((i) => insItem.run(lastRunId, i.employee_id, i.basic, i.allowances, i.deductions, i.net));

    // This month: awaiting review
    const thisItems = buildItems();
    const thisTotal = thisItems.reduce((s, i) => s + i.net, 0);
    const thisRunId = insRun.run(
      now.getMonth() + 1, now.getFullYear(), 'قيد المراجعة', thisTotal, thisItems.length,
      5, null, null, null, addDaysStr(-1)
    ).lastInsertRowid;
    thisItems.forEach((i) => insItem.run(thisRunId, i.employee_id, i.basic, i.allowances, i.deductions, i.net));

    console.log('✅ Payroll runs seeded');
  }

  // Talent & succession planning
  if (isEmpty('succession')) {
    const ins = db.prepare(`INSERT INTO succession (position_title, department_id, incumbent_id, successor_id, readiness, risk_level, potential, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run('الرئيس التنفيذي', 1, 1, 2, 'خلال سنتين', 'مرتفع', 'نجم صاعد', 'يحتاج برنامج تطوير قيادي', 5);
    ins.run('مدير التقنية', 1, 2, 6, 'خلال سنة', 'متوسط', 'أداء عالٍ', 'خبرة تقنية قوية', 5);
    ins.run('مدير المالية', 3, 3, null, 'غير جاهز', 'مرتفع', 'موثوق', 'لا يوجد مرشح داخلي — يُنصح بالتوظيف الخارجي', 5);
    ins.run('مدير الموارد البشرية', 5, 5, 7, 'جاهز الآن', 'منخفض', 'نجم صاعد', 'جاهز للترقية الفورية', 5);
    console.log('✅ Succession seeded');
  }

  // Talent 9-box reviews
  if (isEmpty('talent_reviews')) {
    const ins = db.prepare(`INSERT INTO talent_reviews (employee_id, performance, potential, notes, created_by) VALUES (?, ?, ?, ?, ?)`);
    ins.run(2, 3, 3, 'أداء وإمكانات عالية — مرشّح للقيادة', 5);
    ins.run(6, 2, 3, 'إمكانات عالية بحاجة لتطوير الأداء', 5);
    ins.run(3, 3, 2, 'أداء عالٍ ومستقر', 5);
    ins.run(5, 3, 3, 'نجمة في الموارد البشرية', 5);
    ins.run(10, 2, 2, 'أداء أساسي جيد', 5);
    ins.run(4, 3, 1, 'خبير موثوق في مجاله', 5);
    console.log('✅ Talent reviews seeded');
  }

  // Skills / competency matrix
  if (isEmpty('employee_skills')) {
    const ins = db.prepare(`INSERT INTO employee_skills (employee_id, skill, level, created_by) VALUES (?, ?, ?, ?)`);
    const rows = [
      // Tech (dept 1: emps 2, 6, 10)
      [2, 'إدارة المشاريع', 5], [2, 'JavaScript', 4], [2, 'قواعد البيانات', 4], [2, 'القيادة', 4],
      [6, 'JavaScript', 5], [6, 'قواعد البيانات', 3], [6, 'التواصل', 3], [6, 'إدارة المشاريع', 2],
      [10, 'JavaScript', 3], [10, 'قواعد البيانات', 2], [10, 'التواصل', 4],
      // Finance (emp 3)
      [3, 'التحليل المالي', 5], [3, 'Excel المتقدم', 4], [3, 'إدارة المشاريع', 3], [3, 'القيادة', 3],
      // HR (emp 5)
      [5, 'التوظيف', 5], [5, 'التواصل', 5], [5, 'القيادة', 4], [5, 'إدارة المشاريع', 3],
      // Sales (emp 4)
      [4, 'التفاوض', 5], [4, 'التواصل', 4], [4, 'Excel المتقدم', 2],
    ];
    rows.forEach(([e, sk, lv]) => ins.run(e, sk, lv, 5));
    console.log('✅ Employee skills seeded');
  }

  // Organization profile + branches
  if (isEmpty('org_profile')) {
    db.prepare(`INSERT INTO org_profile (id, name, legal_name, cr_number, tax_number, industry, size, founded_year, about, phone, email, website, address, city, country)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'كوانت للموارد البشرية', 'شركة كوانت لتقنية الموارد البشرية', '1010123456', '300012345600003',
      'التقنية والبرمجيات', '201-500 موظف', 2018,
      'منصة سعودية متكاملة لإدارة الموارد البشرية تخدم المؤسسات في المملكة والخليج.',
      '+966 11 234 5678', 'info@quant-hr.com', 'https://quant-hr.com',
      'طريق الملك فهد، حي العليا', 'الرياض', 'السعودية',
    );
    console.log('✅ Org profile seeded');
  }
  if (isEmpty('branches')) {
    const ins = db.prepare(`INSERT INTO branches (name, city, address, phone, manager_id, is_headquarters, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    ins.run('المقر الرئيسي', 'الرياض', 'طريق الملك فهد، حي العليا', '+966 11 234 5678', 1, 1, 'نشط');
    ins.run('فرع جدة', 'جدة', 'طريق الأمير سلطان', '+966 12 345 6789', 4, 0, 'نشط');
    ins.run('فرع الدمام', 'الدمام', 'شارع الملك سعود', '+966 13 456 7890', 9, 0, 'نشط');
    console.log('✅ Branches seeded');
  }

  // Automation workflows + steps
  if (isEmpty('workflows')) {
    const insWf = db.prepare(`INSERT INTO workflows (name, trigger_event, description, is_active, runs_count, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
    const insStep = db.prepare(`INSERT INTO workflow_steps (workflow_id, name, action_type, assignee, step_order) VALUES (?, ?, ?, ?, ?)`);
    const wf = (name, trigger, desc, active, runs, steps) => {
      const id = insWf.run(name, trigger, desc, active, runs, 5).lastInsertRowid;
      steps.forEach((s, i) => insStep.run(id, s[0], s[1], s[2], i + 1));
    };
    wf('اعتماد طلبات الإجازة', 'طلب إجازة', 'مسار اعتماد الإجازات على مرحلتين', 1, 128, [
      ['موافقة المدير المباشر', 'موافقة', 'المدير المباشر'],
      ['موافقة الموارد البشرية', 'موافقة', 'الموارد البشرية'],
      ['إشعار الموظف بالنتيجة', 'إشعار', 'الموظف'],
    ]);
    wf('اعتماد المصروفات', 'طلب مصروف', 'اعتماد المصروفات والسلف المالية', 1, 64, [
      ['موافقة المدير المباشر', 'موافقة', 'المدير المباشر'],
      ['موافقة المالية', 'موافقة', 'الإدارة المالية'],
    ]);
    wf('تهيئة الموظف الجديد', 'تعيين موظف', 'أتمتة مهام تهيئة الموظفين الجدد', 1, 12, [
      ['إسناد مهام التهيئة', 'إسناد مهمة', 'الموارد البشرية'],
      ['تجهيز الحسابات والأجهزة', 'إسناد مهمة', 'تقنية المعلومات'],
      ['إشعار المدير المباشر', 'إشعار', 'المدير المباشر'],
    ]);
    wf('إجراءات إنهاء الخدمة', 'إنهاء خدمة', 'مسار إنهاء الخدمة والمخالصة', 0, 5, [
      ['استرجاع العهد والأجهزة', 'إسناد مهمة', 'تقنية المعلومات'],
      ['المخالصة المالية', 'موافقة', 'الإدارة المالية'],
      ['تحديث حالة الموظف', 'تحديث حالة', 'الموارد البشرية'],
    ]);
    console.log('✅ Workflows seeded');
  }

  // External integrations catalog
  if (isEmpty('integrations')) {
    const ins = db.prepare(`INSERT INTO integrations (name, provider, category, description, is_connected, status, last_sync) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const rows = [
      ['Slack', 'Slack Technologies', 'تواصل', 'إرسال إشعارات الموارد البشرية إلى قنوات سلاك', 1, 'متصل', addDaysStr(0)],
      ['Google Workspace', 'Google', 'تخزين', 'مزامنة المستخدمين والمستندات مع مساحة العمل', 1, 'متصل', addDaysStr(-1)],
      ['Microsoft 365', 'Microsoft', 'تخزين', 'التكامل مع بريد وأدوات مايكروسوفت', 0, 'غير متصل', null],
      ['QuickBooks', 'Intuit', 'محاسبة', 'مزامنة الرواتب والمصروفات مع المحاسبة', 0, 'غير متصل', null],
      ['Zoom', 'Zoom Video', 'تواصل', 'جدولة مقابلات واجتماعات الفيديو', 1, 'متصل', addDaysStr(-2)],
      ['LinkedIn', 'LinkedIn', 'توظيف', 'نشر الوظائف واستقطاب المرشحين', 0, 'غير متصل', null],
      ['Google Calendar', 'Google', 'تقويم', 'مزامنة الإجازات والمقابلات مع التقويم', 1, 'متصل', addDaysStr(0)],
      ['Active Directory', 'Microsoft', 'مصادقة', 'الدخول الموحّد وإدارة الهوية', 0, 'خطأ', addDaysStr(-5)],
    ];
    rows.forEach((r) => ins.run(...r));
    console.log('✅ Integrations seeded');
  }

  // Platform: support tickets
  if (isEmpty('support_tickets')) {
    const ins = db.prepare(`INSERT INTO support_tickets (company_id, subject, category, priority, status, description) VALUES (?, ?, ?, ?, ?, ?)`);
    ins.run(2, 'مشكلة في تسجيل الدخول لبعض المستخدمين', 'تقني', 'عالية', 'مفتوحة', 'يواجه 3 مستخدمين خطأ عند تسجيل الدخول');
    ins.run(3, 'استفسار عن ترقية الباقة', 'اشتراكات', 'متوسطة', 'قيد المعالجة', 'ما الفرق بين الباقة الاحترافية والمؤسسية؟');
    ins.run(1, 'طلب تفعيل وحدة التكاملات', 'ميزات', 'منخفضة', 'مفتوحة', 'نرغب بتفعيل تكامل Slack');
    ins.run(4, 'بطء في تحميل التقارير', 'أداء', 'حرجة', 'مغلقة', 'تم حل المشكلة بعد التحديث');
    console.log('✅ Support tickets seeded');
  }

  // Platform: system settings (defaults)
  if (isEmpty('platform_settings')) {
    db.prepare('INSERT INTO platform_settings (id) VALUES (1)').run();
    console.log('✅ Platform settings seeded');
  }

  // Platform: localization
  if (isEmpty('platform_locales')) {
    const ins = db.prepare(`INSERT INTO platform_locales (type, name, code, is_default, enabled) VALUES (?, ?, ?, ?, ?)`);
    ins.run('دولة', 'السعودية', 'SA', 1, 1);
    ins.run('دولة', 'الإمارات', 'AE', 0, 1);
    ins.run('دولة', 'الكويت', 'KW', 0, 1);
    ins.run('دولة', 'مصر', 'EG', 0, 0);
    ins.run('عملة', 'ريال سعودي', 'SAR', 1, 1);
    ins.run('عملة', 'درهم إماراتي', 'AED', 0, 1);
    ins.run('عملة', 'دولار أمريكي', 'USD', 0, 1);
    ins.run('لغة', 'العربية', 'ar', 1, 1);
    ins.run('لغة', 'English', 'en', 0, 1);
    console.log('✅ Locales seeded');
  }

  // Platform: system templates
  if (isEmpty('system_templates')) {
    const ins = db.prepare(`INSERT INTO system_templates (name, type, subject, body, enabled) VALUES (?, ?, ?, ?, ?)`);
    ins.run('ترحيب بموظف جديد', 'بريد', 'مرحباً بك في {{company}}', 'عزيزي {{name}}، يسعدنا انضمامك إلى فريق {{company}}.', 1);
    ins.run('اعتماد طلب إجازة', 'إشعار', 'تم اعتماد إجازتك', 'تمت الموافقة على طلب إجازتك من {{start}} إلى {{end}}.', 1);
    ins.run('تذكير بالمقابلة', 'رسالة نصية', null, 'تذكير: لديك مقابلة يوم {{date}} الساعة {{time}}.', 1);
    ins.run('عقد عمل', 'مستند', 'عقد عمل - {{name}}', 'هذا العقد مبرم بين {{company}} و {{name}} بوظيفة {{title}}.', 1);
    ins.run('إشعار انتهاء مستند', 'إشعار', 'مستند على وشك الانتهاء', 'ينتهي المستند {{document}} بتاريخ {{expiry}}.', 0);
    console.log('✅ System templates seeded');
  }

  // Platform: AI settings (defaults)
  if (isEmpty('ai_settings')) {
    db.prepare('INSERT INTO ai_settings (id) VALUES (1)').run();
    console.log('✅ AI settings seeded');
  }

  // Platform: backups
  if (isEmpty('backups')) {
    const ins = db.prepare(`INSERT INTO backups (type, size_mb, status, note, created_at) VALUES (?, ?, ?, ?, ?)`);
    ins.run('تلقائي', 182.4, 'مكتمل', 'نسخة يومية تلقائية', addDaysStr(0));
    ins.run('تلقائي', 179.1, 'مكتمل', 'نسخة يومية تلقائية', addDaysStr(-1));
    ins.run('يدوي', 176.8, 'مكتمل', 'قبل تحديث النظام', addDaysStr(-2));
    ins.run('تلقائي', 175.0, 'مكتمل', 'نسخة يومية تلقائية', addDaysStr(-3));
    console.log('✅ Backups seeded');
  }

  // Platform: audit log
  if (isEmpty('audit_logs')) {
    const ins = db.prepare(`INSERT INTO audit_logs (actor, action, entity, severity, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
    ins.run('superadmin@quant.com', 'تسجيل دخول', 'auth', 'معلومة', 'دخول ناجح لبوابة إدارة المنصة', addDaysStr(0));
    ins.run('superadmin@quant.com', 'اعتماد طلب اشتراك', 'subscription', 'معلومة', 'ترقية باقة مجموعة الأفق', addDaysStr(0));
    ins.run('noura.hr@quant.com', 'تعديل بيانات موظف', 'employee', 'معلومة', 'تحديث بيانات موظف #6', addDaysStr(-1));
    ins.run('نظام', 'محاولة دخول فاشلة', 'auth', 'تحذير', '3 محاولات دخول فاشلة متتالية', addDaysStr(-1));
    ins.run('superadmin@quant.com', 'استعادة نسخة احتياطية', 'backup', 'تحذير', 'استعادة نسخة #3', addDaysStr(-2));
    ins.run('نظام', 'فشل تكامل خارجي', 'integration', 'حرج', 'انقطاع الاتصال مع Active Directory', addDaysStr(-2));
    console.log('✅ Audit logs seeded');
  }

  // Platform: subscription change requests
  if (isEmpty('subscription_requests')) {
    const ins = db.prepare(`INSERT INTO subscription_requests (company_id, type, requested_plan, reason, status) VALUES (?, ?, ?, ?, ?)`);
    ins.run(2, 'ترقية', 'مؤسسية', 'نمو عدد الموظفين وحاجة لتكاملات API', 'معلق');
    ins.run(3, 'ترقية', 'احترافية', 'الحاجة لوحدة الرواتب والتقارير', 'معلق');
    ins.run(4, 'إلغاء', null, 'إعادة هيكلة داخلية', 'معلق');
    ins.run(1, 'ترقية', 'مؤسسية', 'تجديد الباقة', 'موافق عليه');
    console.log('✅ Subscription requests seeded');
  }

  // Candidate professional profile
  if (isEmpty('candidate_profiles')) {
    db.prepare(`INSERT INTO candidate_profiles (email, full_name, headline, summary, skills, experience_years, education, phone, location, linkedin, portfolio, cv_file_name, in_talent_pool)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'candidate@quant.com', 'مرشح تجريبي', 'مطوّر واجهات أمامية',
      'مطوّر واجهات أمامية بخبرة 3 سنوات في React و Vue، شغوف ببناء تجارب مستخدم متميزة.',
      'React, JavaScript, Tailwind CSS, TypeScript, Git', 3, 'بكالوريوس علوم حاسب',
      '+966 55 123 4567', 'الرياض', 'https://linkedin.com/in/candidate', 'https://portfolio.dev',
      'cv_candidate.pdf', 1,
    );
    console.log('✅ Candidate profile seeded');
  }

  // Candidate journey: interviews, documents, forms, offer, messages
  const CAND = 'candidate@quant.com';
  if (isEmpty('candidate_interviews')) {
    const ins = db.prepare(`INSERT INTO candidate_interviews (email, job_title, scheduled_at, mode, stage, status, location, meeting_link, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run(CAND, 'مطوّر واجهات أمامية', addDaysStr(2), 'فيديو', 'فنية', 'مجدولة', null, 'https://meet.quant-hr.com/iv-2201', 'يرجى الحضور قبل الموعد بـ 10 دقائق');
    ins.run(CAND, 'مطوّر واجهات أمامية', addDaysStr(5), 'حضوري', 'نهائية', 'مجدولة', 'المقر الرئيسي - الرياض', null, 'مقابلة مع مدير التقنية');
    ins.run(CAND, 'مطوّر واجهات أمامية', addDaysStr(-4), 'هاتفي', 'مبدئية', 'مكتملة', null, null, 'مقابلة فرز أولية');
    console.log('✅ Candidate interviews seeded');
  }
  if (isEmpty('candidate_documents')) {
    const ins = db.prepare(`INSERT INTO candidate_documents (email, title, doc_type, status, file_name, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)`);
    ins.run(CAND, 'صورة الهوية الوطنية', 'هوية', 'مرفوع', 'id.pdf', addDaysStr(-2));
    ins.run(CAND, 'الشهادة الجامعية', 'شهادة', 'مطلوب', null, null);
    ins.run(CAND, 'شهادات الخبرة', 'شهادة', 'مطلوب', null, null);
    ins.run(CAND, 'صورة شخصية', 'صورة', 'مرفوع', 'photo.jpg', addDaysStr(-2));
    console.log('✅ Candidate documents seeded');
  }
  if (isEmpty('candidate_forms')) {
    const ins = db.prepare(`INSERT INTO candidate_forms (email, title, description, status, submitted_at) VALUES (?, ?, ?, ?, ?)`);
    ins.run(CAND, 'نموذج البيانات الشخصية', 'استكمال البيانات الشخصية والوظيفية', 'مكتمل', addDaysStr(-3));
    ins.run(CAND, 'إقرار خلو السوابق', 'إقرار بعدم وجود سوابق جنائية', 'مطلوب', null);
    ins.run(CAND, 'نموذج المعلومات البنكية', 'بيانات الحساب البنكي لصرف الراتب', 'مطلوب', null);
    console.log('✅ Candidate forms seeded');
  }
  if (isEmpty('job_offers')) {
    db.prepare(`INSERT INTO job_offers (email, job_title, department, salary, start_date, details, status) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(CAND, 'مطوّر واجهات أمامية', 'التقنية', 14000, addDaysStr(30), 'عقد دوام كامل، فترة تجربة 3 أشهر، تأمين طبي شامل، 30 يوم إجازة سنوية.', 'معلّق');
    console.log('✅ Job offer seeded');
  }
  if (isEmpty('candidate_messages')) {
    const ins = db.prepare(`INSERT INTO candidate_messages (email, sender, body) VALUES (?, ?, ?)`);
    ins.run(CAND, 'hr', 'مرحباً بك! نشكر اهتمامك بالانضمام إلينا. هل لديك أي استفسار؟');
    ins.run(CAND, 'candidate', 'شكراً لكم، متى موعد المقابلة الفنية؟');
    ins.run(CAND, 'hr', 'المقابلة الفنية مجدولة خلال يومين عبر الفيديو، ستصلك التفاصيل.');
    console.log('✅ Candidate messages seeded');
  }

  // Manager: hiring requests
  if (isEmpty('hiring_requests')) {
    const ins = db.prepare(`INSERT INTO hiring_requests (requested_by, department_id, job_title, headcount, employment_type, urgency, justification, status, reviewed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run(2, 1, 'مطوّر واجهات أمامية', 2, 'دوام كامل', 'عاجل', 'توسّع فريق المنتج ومشاريع جديدة', 'معلق', null);
    ins.run(4, 4, 'أخصائي مبيعات', 1, 'دوام كامل', 'عادي', 'تغطية منطقة جديدة', 'موافق عليه', 5);
    ins.run(2, 1, 'مهندس اختبار جودة', 1, 'عقد مؤقت', 'عادي', 'دعم دورة إصدار كبيرة', 'مرفوض', 5);
    console.log('✅ Hiring requests seeded');
  }

  // Manager: interviews
  if (isEmpty('interviews')) {
    const ins = db.prepare(`INSERT INTO interviews (candidate_name, job_title, interviewer_id, scheduled_at, mode, stage, status, rating, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run('سلطان الحربي', 'مطوّر واجهات أمامية', 2, addDaysStr(2), 'فيديو', 'فنية', 'مجدولة', null, null, 2);
    ins.run('منى العتيبي', 'أخصائي مبيعات', 4, addDaysStr(1), 'حضوري', 'مبدئية', 'مجدولة', null, null, 4);
    ins.run('طارق القحطاني', 'مطوّر واجهات أمامية', 2, addDaysStr(-3), 'فيديو', 'نهائية', 'مكتملة', 4, 'مرشّح قوي، يُنصح بالتعيين', 2);
    console.log('✅ Interviews seeded');
  }

  // Manager: promotions & transfers
  if (isEmpty('promotions')) {
    const ins = db.prepare(`INSERT INTO promotions (employee_id, type, current_title, new_title, new_department_id, effective_date, justification, status, requested_by, reviewed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run(6, 'ترقية', 'مطوّر برمجيات', 'مطوّر برمجيات أول', null, addDaysStr(20), 'أداء متميز خلال العام', 'معلق', 2, null);
    ins.run(10, 'نقل', 'مطوّر برمجيات', 'مطوّر برمجيات', 1, addDaysStr(15), 'إعادة توزيع الكوادر حسب الحاجة', 'موافق عليه', 4, 5);
    console.log('✅ Promotions seeded');
  }

  // Employee surveys + responses
  if (isEmpty('surveys')) {
    const insS = db.prepare(`INSERT INTO surveys (title, description, audience, is_active, anonymous, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
    const insR = db.prepare(`INSERT INTO survey_responses (survey_id, employee_id, rating, comment) VALUES (?, ?, ?, ?)`);
    const s1 = insS.run('استطلاع رضا الموظفين الربعي', 'قيّم مدى رضاك عن بيئة العمل والمزايا خلال الربع الحالي', 'الكل', 1, 1, 5).lastInsertRowid;
    const s2 = insS.run('تقييم برنامج العمل المرن', 'شاركنا رأيك في سياسة العمل عن بُعد والمرونة', 'الكل', 1, 0, 5).lastInsertRowid;
    insS.run('استطلاع الفعاليات السنوية', 'اقترح فعاليات وأنشطة للعام القادم', 'الكل', 0, 0, 5);
    insR.run(s1, 6, 4, 'بيئة عمل ممتازة بشكل عام');
    insR.run(s1, 10, 5, 'راضٍ جداً عن المزايا');
    insR.run(s1, 4, 3, 'تحتاج بعض الجوانب للتحسين');
    insR.run(s2, 6, 5, 'المرونة رفعت إنتاجيتي');
    console.log('✅ Surveys seeded');
  }

  // Document e-signature requests
  if (isEmpty('signatures')) {
    const ins = db.prepare(`INSERT INTO signatures (employee_id, title, doc_type, status, requested_by, signed_at, employee_signed_at, countersigner_id, countersigner_status, countersigned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run(6, 'عقد العمل المحدّث 2026', 'عقد', 'بانتظار التوقيع', 5, null, null, null, 'غير مطلوب', null);
    ins.run(6, 'سياسة استخدام الأجهزة', 'سياسة', 'موقّع', 5, addDaysStr(-3), addDaysStr(-3), null, 'غير مطلوب', null);
    ins.run(10, 'إقرار السرية وحماية البيانات', 'إقرار', 'بانتظار التوقيع', 5, null, null, null, 'غير مطلوب', null);
    // Two-party envelopes: employee + manager countersigner
    ins.run(4, 'ملحق تعديل الراتب', 'ملحق', 'موقّع', 5, addDaysStr(-10), addDaysStr(-11), 5, 'موقّع', addDaysStr(-10));
    ins.run(10, 'خطاب ترقية', 'خطاب', 'بانتظار التوقيع', 5, null, addDaysStr(-1), 2, 'بانتظار التوقيع', null);
    ins.run(6, 'عقد سرية بيانات العملاء', 'إقرار', 'بانتظار التوقيع', 5, null, null, 2, 'بانتظار الموظف', null);
    console.log('✅ Signatures seeded');
  }

  // Organization settings (defaults)
  if (isEmpty('org_settings')) {
    db.prepare('INSERT INTO org_settings (id) VALUES (1)').run();
    console.log('✅ Org settings seeded');
  }

  // Onboarding plans + checklist tasks
  if (isEmpty('onboarding')) {
    const insPlan = db.prepare(`INSERT INTO onboarding (employee_id, start_date, buddy_id, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
    const insTask = db.prepare(`INSERT INTO onboarding_tasks (onboarding_id, title, category, owner, due_date, is_done) VALUES (?, ?, ?, ?, ?, ?)`);
    const plan = (emp, days, buddy, status, notes, tasks) => {
      const id = insPlan.run(emp, addDaysStr(days), buddy, status, notes, 5).lastInsertRowid;
      tasks.forEach((t) => insTask.run(id, t[0], t[1], t[2], addDaysStr(days + (t[3] || 0)), t[4] || 0));
    };
    plan(6, -10, 2, 'قيد التنفيذ', 'موظف جديد في فريق التطوير', [
      ['استكمال العقد والمستندات الرسمية', 'مستندات', 'الموارد البشرية', 0, 1],
      ['فتح حساب البريد الإلكتروني والأنظمة', 'تجهيزات', 'تقنية المعلومات', 1, 1],
      ['تجهيز جهاز الحاسب ومكان العمل', 'تجهيزات', 'تقنية المعلومات', 1, 1],
      ['جلسة تعريفية بالمؤسسة والسياسات', 'تعريف', 'الموارد البشرية', 2, 0],
      ['التعريف بالفريق والمدير المباشر', 'تعريف', 'المدير', 2, 0],
      ['التدريب على المهام الأساسية للوظيفة', 'تدريب', 'المدير', 5, 0],
    ]);
    plan(10, -3, 4, 'قيد التنفيذ', 'موظف جديد في فريق المبيعات', [
      ['استكمال العقد والمستندات الرسمية', 'مستندات', 'الموارد البشرية', 0, 1],
      ['فتح حساب البريد الإلكتروني والأنظمة', 'تجهيزات', 'تقنية المعلومات', 1, 0],
      ['جلسة تعريفية بالمؤسسة والسياسات', 'تعريف', 'الموارد البشرية', 2, 0],
      ['التدريب على نظام إدارة العملاء', 'تدريب', 'المدير', 4, 0],
    ]);
    plan(7, -40, 5, 'مكتمل', 'اكتملت التهيئة بنجاح', [
      ['استكمال العقد والمستندات الرسمية', 'مستندات', 'الموارد البشرية', 0, 1],
      ['فتح حساب البريد الإلكتروني والأنظمة', 'تجهيزات', 'تقنية المعلومات', 1, 1],
      ['جلسة تعريفية بالمؤسسة والسياسات', 'تعريف', 'الموارد البشرية', 2, 1],
    ]);
    console.log('✅ Onboarding seeded');
  }

  console.log('🎉 Database seeding completed!');
}

seedData();
