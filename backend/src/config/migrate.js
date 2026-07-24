const db = require('./database');

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin', 'hr_manager', 'department_head', 'employee')),
    employee_id INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Departments table
  `CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    manager_id INTEGER,
    parent_department_id INTEGER,
    employee_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL
  )`,

  // Employees table
  `CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    national_id TEXT UNIQUE,
    date_of_birth DATE,
    nationality TEXT DEFAULT 'سعودي',
    marital_status TEXT CHECK(marital_status IN ('أعزب', 'عزباء', 'متزوج', 'متزوجة', 'مطلق', 'مطلقة', 'أرمل', 'أرملة')),
    address TEXT,
    emergency_contact TEXT,
    profile_picture TEXT,

    -- Work Info
    employee_number TEXT UNIQUE,
    job_title TEXT NOT NULL,
    department_id INTEGER,
    manager_id INTEGER,
    hire_date DATE NOT NULL,
    employment_type TEXT DEFAULT 'دوام كامل' CHECK(employment_type IN ('دوام كامل', 'دوام جزئي', 'عقد', 'متدرب')),
    work_location TEXT DEFAULT 'الرياض - المقر الرئيسي',
    team TEXT,
    status TEXT DEFAULT 'نشط' CHECK(status IN ('نشط', 'إجازة', 'معلق', 'مستقيل', 'مفصول')),

    -- Contract Info
    salary REAL DEFAULT 0,
    allowances REAL DEFAULT 0,
    bank_name TEXT,
    bank_account TEXT,
    contract_type TEXT DEFAULT 'غير محدد' CHECK(contract_type IN ('غير محدد', 'محدد', 'عقد مشروع')),
    contract_start DATE,
    contract_end DATE,

    -- Leave Balance
    annual_leave_balance INTEGER DEFAULT 30,
    sick_leave_balance INTEGER DEFAULT 10,
    emergency_leave_balance INTEGER DEFAULT 5,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Attendance table
  `CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    check_in DATETIME,
    check_out DATETIME,
    check_in_location TEXT,
    check_out_location TEXT,
    work_hours REAL DEFAULT 0,
    status TEXT DEFAULT 'حاضر' CHECK(status IN ('حاضر', 'غائب', 'إجازة', 'عمل عن بعد', 'تأخر')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, date)
  )`,

  // Leaves table
  `CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('سنوية', 'مرضية', 'طارئة', 'بدون راتب', 'أمومة', 'حج', 'عمرة')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'معلقة' CHECK(status IN ('معلقة', 'موافقة', 'مرفوضة', 'ملغاة')),
    approved_by INTEGER,
    approved_at DATETIME,
    attachments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Documents table
  `CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('هوية', 'جواز', 'عقد عمل', 'شهادة', 'تأمين', 'أخرى')),
    title TEXT NOT NULL,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    uploaded_by INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Notifications table
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'error')),
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`
];

const indexes = `
  CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
  CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
  CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
  CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
`;

function runMigrations() {
  console.log('🔄 Running migrations...');

  // Create tables first
  for (const migration of migrations) {
    try {
      db.exec(migration);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('❌ Migration error:', err.message);
      }
    }
  }

  // Create indexes after the tables exist
  try {
    db.exec(indexes);
  } catch (err) {
    console.error('❌ Index error:', err.message);
  }

  console.log('✅ All migrations completed!');
}

runMigrations();

module.exports = { runMigrations };
