const bcrypt = require('bcryptjs');
const db = require('./database');

function seedData() {
  console.log('🌱 Seeding database...');

  // Check if data already exists
  const existing = db.prepare('SELECT COUNT(*) as count FROM employees').get();
  if (existing.count > 0) {
    console.log('⚠️ Database already seeded. Skipping...');
    return;
  }

  // Insert Departments
  const insertDept = db.prepare(`
    INSERT INTO departments (name, description, color) VALUES (?, ?, ?)
  `);

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

  // Insert Employees
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
  console.log('✅ Employees seeded');

  // Update department manager_ids
  db.prepare('UPDATE departments SET manager_id = 1 WHERE id = 1').run();
  db.prepare('UPDATE departments SET manager_id = 5 WHERE id = 2').run();
  db.prepare('UPDATE departments SET manager_id = 2 WHERE id = 3').run();
  db.prepare('UPDATE departments SET manager_id = 3 WHERE id = 4').run();
  db.prepare('UPDATE departments SET manager_id = 4 WHERE id = 5').run();
  db.prepare('UPDATE departments SET manager_id = 7 WHERE id = 6').run();
  db.prepare('UPDATE departments SET manager_id = 8 WHERE id = 7').run();
  db.prepare('UPDATE departments SET manager_id = 9 WHERE id = 8').run();

  // Update employee manager_ids
  db.prepare('UPDATE employees SET manager_id = 2 WHERE id IN (6, 10)').run(); // Tech team
  db.prepare('UPDATE employees SET manager_id = 4 WHERE id = 4').run(); // Sales
  db.prepare('UPDATE employees SET manager_id = 1 WHERE id IN (2, 3, 5, 7, 8, 9)').run(); // Report to CEO

  // Update department employee counts
  db.prepare(`
    UPDATE departments SET employee_count = (
      SELECT COUNT(*) FROM employees WHERE department_id = departments.id
    )
  `).run();

  // Insert Users with passwords
  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, role, employee_id) VALUES (?, ?, ?, ?)
  `);

  const password = bcrypt.hashSync('password123', 10);

  const users = [
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

  users.forEach(user => insertUser.run(user));
  console.log('✅ Users seeded');

  // Insert Sample Attendance
  const insertAttendance = db.prepare(`
    INSERT INTO attendance (employee_id, date, check_in, check_out, work_hours, status) VALUES (?, ?, ?, ?, ?, ?)
  `);

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

  // Insert Sample Leaves
  const insertLeave = db.prepare(`
    INSERT INTO leaves (employee_id, type, start_date, end_date, days_count, reason, status, approved_by, approved_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const leaves = [
    [6, 'سنوية', '2026-07-25', '2026-07-30', 6, 'إجازة عائلية', 'موافقة', 5, '2026-07-20 10:00:00'],
    [10, 'مرضية', '2026-07-24', '2026-07-26', 3, 'مراجعة طبية', 'معلقة', null, null],
    [3, 'طارئة', '2026-07-28', '2026-07-28', 1, 'ظروف طارئة', 'معلقة', null, null],
  ];

  leaves.forEach(leave => insertLeave.run(leave));
  console.log('✅ Leaves seeded');

  // Insert Sample Documents
  const insertDoc = db.prepare(`
    INSERT INTO documents (employee_id, type, title, file_name, uploaded_by) VALUES (?, ?, ?, ?, ?)
  `);

  const docs = [
    [1, 'هوية', 'بطاقة الهوية الوطنية', 'id_card_ceo.pdf', 1],
    [1, 'عقد عمل', 'عقد العقد الرئيسي', 'contract_ceo.pdf', 1],
    [2, 'هوية', 'بطاقة الهوية الوطنية', 'id_card_tech.pdf', 5],
    [2, 'شهادة', 'شهادة البكالوريوس', 'degree_tech.pdf', 5],
    [2, 'عقد عمل', 'عقد العمل الحالي', 'contract_tech.pdf', 5],
    [3, 'هوية', 'بطاقة الهوية الوطنية', 'id_card_finance.pdf', 5],
    [3, 'عقد عمل', 'عقد العمل', 'contract_finance.pdf', 5],
  ];

  docs.forEach(doc => insertDoc.run(doc));
  console.log('✅ Documents seeded');

  console.log('🎉 Database seeding completed successfully!');
}

seedData();
