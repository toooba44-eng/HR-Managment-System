const db = require('./database');

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('super_admin', 'admin', 'hr_manager', 'department_head', 'employee', 'candidate')),
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
    expiry_date DATE,
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
  )`,

  // Announcements table
  `CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    audience TEXT DEFAULT 'الجميع',
    is_pinned INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Employee self-service requests table
  `CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('شهادة', 'خطاب', 'تحديث بيانات', 'عمل عن بعد', 'عمل إضافي', 'شكوى', 'أخرى')),
    subject TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'معلقة' CHECK(status IN ('معلقة', 'مقبولة', 'مرفوضة', 'مكتملة')),
    response TEXT,
    resolved_by INTEGER,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // HR policies table
  `CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'عام',
    body TEXT NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Tasks / goals table (manager ↔ employee)
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    employee_id INTEGER NOT NULL,
    assigned_by INTEGER,
    status TEXT DEFAULT 'جديدة' CHECK(status IN ('جديدة', 'قيد التنفيذ', 'مكتملة', 'ملغاة')),
    priority TEXT DEFAULT 'متوسطة' CHECK(priority IN ('منخفضة', 'متوسطة', 'عالية')),
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Recruitment: job openings
  `CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department TEXT,
    location TEXT DEFAULT 'الرياض - المقر الرئيسي',
    type TEXT DEFAULT 'دوام كامل',
    description TEXT,
    status TEXT DEFAULT 'مفتوحة' CHECK(status IN ('مفتوحة', 'مغلقة')),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Recruitment: candidate applications
  `CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    candidate_email TEXT NOT NULL,
    candidate_name TEXT,
    cover_note TEXT,
    status TEXT DEFAULT 'قيد المراجعة' CHECK(status IN ('قيد المراجعة', 'مقابلة', 'مقبول', 'مرفوض')),
    stage TEXT DEFAULT 'متقدم جديد',
    source TEXT DEFAULT 'الموقع',
    rating INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`,

  // Platform tenants (Super Admin / SaaS)
  `CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_email TEXT,
    plan TEXT DEFAULT 'أساسية' CHECK(plan IN ('أساسية', 'احترافية', 'مؤسسية')),
    users_limit INTEGER DEFAULT 25,
    storage_limit_gb INTEGER DEFAULT 10,
    status TEXT DEFAULT 'نشطة' CHECK(status IN ('نشطة', 'معلّقة')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Billing invoices (per company subscription)
  `CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    plan TEXT DEFAULT 'أساسية',
    period TEXT,
    amount REAL NOT NULL DEFAULT 0,
    issue_date DATE,
    due_date DATE,
    status TEXT DEFAULT 'غير مدفوعة' CHECK(status IN ('مدفوعة', 'غير مدفوعة', 'متأخرة', 'ملغاة')),
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  )`,

  // Expenses & advances
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'مصروف' CHECK(type IN ('مصروف', 'سلفة')),
    category TEXT DEFAULT 'أخرى',
    amount REAL NOT NULL DEFAULT 0,
    description TEXT,
    status TEXT DEFAULT 'معلقة' CHECK(status IN ('معلقة', 'معتمدة', 'مرفوضة', 'مصروفة')),
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Assets & custody
  `CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'أخرى',
    serial_number TEXT,
    assigned_to INTEGER,
    status TEXT DEFAULT 'متاح' CHECK(status IN ('متاح', 'مُخصّص', 'صيانة', 'مُتلف')),
    assigned_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Performance goals (OKR/KPI style)
  `CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    weight INTEGER DEFAULT 100,
    progress INTEGER DEFAULT 0,
    target_date DATE,
    status TEXT DEFAULT 'لم تبدأ' CHECK(status IN ('لم تبدأ', 'قيد التنفيذ', 'مكتملة', 'ملغاة')),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Training: courses
  `CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'عام',
    description TEXT,
    hours INTEGER DEFAULT 0,
    level TEXT DEFAULT 'مبتدئ' CHECK(level IN ('مبتدئ', 'متوسط', 'متقدم')),
    status TEXT DEFAULT 'متاحة' CHECK(status IN ('متاحة', 'مغلقة')),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Training: enrollments
  `CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'مسجّل' CHECK(status IN ('مسجّل', 'قيد التقدم', 'مكتمل')),
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(course_id, employee_id)
  )`,

  // Offboarding / end of service
  `CREATE TABLE IF NOT EXISTS offboarding (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'استقالة' CHECK(type IN ('استقالة', 'فصل', 'انتهاء عقد', 'تقاعد')),
    reason TEXT,
    last_working_day DATE,
    status TEXT DEFAULT 'قيد المعالجة' CHECK(status IN ('قيد المعالجة', 'مكتملة', 'ملغاة')),
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Grievances / disciplinary cases
  `CREATE TABLE IF NOT EXISTS grievances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'شكوى' CHECK(type IN ('مخالفة', 'شكوى')),
    category TEXT DEFAULT 'أخرى',
    description TEXT,
    severity TEXT DEFAULT 'متوسطة' CHECK(severity IN ('منخفضة', 'متوسطة', 'عالية')),
    status TEXT DEFAULT 'مفتوحة' CHECK(status IN ('مفتوحة', 'قيد المعالجة', 'مغلقة')),
    action TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Health & safety incidents
  `CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'ملاحظة سلامة' CHECK(type IN ('حادث', 'إصابة', 'ملاحظة سلامة', 'فحص طبي')),
    employee_id INTEGER,
    location TEXT,
    severity TEXT DEFAULT 'متوسطة' CHECK(severity IN ('منخفضة', 'متوسطة', 'عالية')),
    description TEXT,
    status TEXT DEFAULT 'مفتوح' CHECK(status IN ('مفتوح', 'قيد المعالجة', 'مغلق')),
    incident_date DATE,
    reported_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Shifts & schedules
  `CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    shift_type TEXT DEFAULT 'صباحية' CHECK(shift_type IN ('صباحية', 'مسائية', 'ليلية', 'راحة')),
    start_time TEXT,
    end_time TEXT,
    location TEXT DEFAULT 'المقر الرئيسي',
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Timesheets (project hours)
  `CREATE TABLE IF NOT EXISTS timesheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    project TEXT NOT NULL,
    task TEXT,
    hours REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'مسودة' CHECK(status IN ('مسودة', 'مقدّم', 'معتمد', 'مرفوض')),
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Compensation & benefits (salary package per employee)
  `CREATE TABLE IF NOT EXISTS compensation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    grade TEXT DEFAULT 'الدرجة الأولى',
    base_salary REAL NOT NULL DEFAULT 0,
    housing_allowance REAL NOT NULL DEFAULT 0,
    transport_allowance REAL NOT NULL DEFAULT 0,
    other_allowances REAL NOT NULL DEFAULT 0,
    bonus REAL NOT NULL DEFAULT 0,
    insurance_class TEXT DEFAULT 'الفئة أ' CHECK(insurance_class IN ('الفئة أ', 'الفئة ب', 'الفئة ج', 'بدون')),
    effective_date DATE,
    status TEXT DEFAULT 'نشط' CHECK(status IN ('نشط', 'مؤرشف')),
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Talent 9-box reviews (performance x potential)
  `CREATE TABLE IF NOT EXISTS talent_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL UNIQUE,
    performance INTEGER DEFAULT 2 CHECK(performance IN (1, 2, 3)),
    potential INTEGER DEFAULT 2 CHECK(potential IN (1, 2, 3)),
    cycle TEXT DEFAULT 'الدورة الحالية',
    notes TEXT,
    created_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Talent & succession planning (critical positions + successors)
  `CREATE TABLE IF NOT EXISTS succession (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position_title TEXT NOT NULL,
    department_id INTEGER,
    incumbent_id INTEGER,
    successor_id INTEGER,
    readiness TEXT DEFAULT 'خلال سنة' CHECK(readiness IN ('جاهز الآن', 'خلال سنة', 'خلال سنتين', 'غير جاهز')),
    risk_level TEXT DEFAULT 'متوسط' CHECK(risk_level IN ('مرتفع', 'متوسط', 'منخفض')),
    potential TEXT DEFAULT 'أداء عالٍ' CHECK(potential IN ('نجم صاعد', 'أداء عالٍ', 'موثوق', 'يحتاج تطوير')),
    status TEXT DEFAULT 'نشط' CHECK(status IN ('نشط', 'مؤرشف')),
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (incumbent_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (successor_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Organization profile (single row) + branches
  `CREATE TABLE IF NOT EXISTS org_profile (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    name TEXT NOT NULL DEFAULT 'كوانت للموارد البشرية',
    legal_name TEXT,
    cr_number TEXT,
    tax_number TEXT,
    industry TEXT,
    size TEXT,
    founded_year INTEGER,
    about TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'السعودية',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    phone TEXT,
    manager_id INTEGER,
    is_headquarters INTEGER DEFAULT 0,
    status TEXT DEFAULT 'نشط' CHECK(status IN ('نشط', 'مغلق')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Onboarding plans + checklist tasks
  `CREATE TABLE IF NOT EXISTS onboarding (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    start_date DATE,
    buddy_id INTEGER,
    status TEXT DEFAULT 'قيد التنفيذ' CHECK(status IN ('قيد التنفيذ', 'مكتمل', 'متأخر', 'ملغى')),
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (buddy_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    onboarding_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'أخرى' CHECK(category IN ('مستندات', 'تجهيزات', 'تدريب', 'تعريف', 'أخرى')),
    owner TEXT DEFAULT 'الموارد البشرية',
    due_date DATE,
    is_done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (onboarding_id) REFERENCES onboarding(id) ON DELETE CASCADE
  )`,

  // Automation workflows + steps
  `CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL DEFAULT 'طلب إجازة' CHECK(trigger_event IN ('طلب إجازة', 'طلب مصروف', 'تعيين موظف', 'إنهاء خدمة', 'طلب مستند', 'تقييم أداء', 'طلب عام')),
    description TEXT,
    is_active INTEGER DEFAULT 1,
    runs_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS workflow_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    action_type TEXT DEFAULT 'موافقة' CHECK(action_type IN ('موافقة', 'إشعار', 'إسناد مهمة', 'تحديث حالة')),
    assignee TEXT DEFAULT 'المدير المباشر',
    step_order INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
  )`,

  // External integrations catalog
  `CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    provider TEXT,
    category TEXT DEFAULT 'أخرى' CHECK(category IN ('تواصل', 'تخزين', 'محاسبة', 'توظيف', 'تقويم', 'مصادقة', 'أخرى')),
    description TEXT,
    is_connected INTEGER DEFAULT 0,
    status TEXT DEFAULT 'غير متصل' CHECK(status IN ('متصل', 'غير متصل', 'خطأ')),
    last_sync DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Platform: support tickets (from client organizations)
  `CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    subject TEXT NOT NULL,
    category TEXT DEFAULT 'عام',
    priority TEXT DEFAULT 'متوسطة' CHECK(priority IN ('منخفضة', 'متوسطة', 'عالية', 'حرجة')),
    status TEXT DEFAULT 'مفتوحة' CHECK(status IN ('مفتوحة', 'قيد المعالجة', 'مغلقة')),
    description TEXT,
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
  )`,

  // Platform: localization (countries / currencies / languages)
  `CREATE TABLE IF NOT EXISTS platform_locales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('دولة', 'عملة', 'لغة')),
    name TEXT NOT NULL,
    code TEXT,
    is_default INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Platform: system templates
  `CREATE TABLE IF NOT EXISTS system_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'بريد' CHECK(type IN ('بريد', 'رسالة نصية', 'مستند', 'إشعار')),
    subject TEXT,
    body TEXT,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Platform: AI settings (single row)
  `CREATE TABLE IF NOT EXISTS ai_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    enabled INTEGER DEFAULT 1,
    provider TEXT DEFAULT 'Claude',
    model TEXT DEFAULT 'claude-sonnet',
    resume_screening INTEGER DEFAULT 1,
    chatbot INTEGER DEFAULT 1,
    insights INTEGER DEFAULT 1,
    auto_summaries INTEGER DEFAULT 0,
    monthly_token_limit INTEGER DEFAULT 1000000,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Platform: system-wide settings (single row)
  `CREATE TABLE IF NOT EXISTS platform_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    platform_name TEXT DEFAULT 'كوانت للموارد البشرية',
    support_email TEXT DEFAULT 'support@quant-hr.com',
    default_plan TEXT DEFAULT 'أساسية',
    session_timeout_min INTEGER DEFAULT 60,
    max_upload_mb INTEGER DEFAULT 10,
    maintenance_mode INTEGER DEFAULT 0,
    signups_enabled INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Platform: backups
  `CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT DEFAULT 'يدوي' CHECK(type IN ('يدوي', 'تلقائي')),
    size_mb REAL DEFAULT 0,
    status TEXT DEFAULT 'مكتمل' CHECK(status IN ('مكتمل', 'قيد التنفيذ', 'فشل')),
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Platform: audit log
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT,
    action TEXT NOT NULL,
    entity TEXT,
    severity TEXT DEFAULT 'معلومة' CHECK(severity IN ('معلومة', 'تحذير', 'حرج')),
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Platform: subscription change requests
  `CREATE TABLE IF NOT EXISTS subscription_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    type TEXT DEFAULT 'ترقية' CHECK(type IN ('ترقية', 'تخفيض', 'إلغاء')),
    requested_plan TEXT,
    reason TEXT,
    status TEXT DEFAULT 'معلق' CHECK(status IN ('معلق', 'موافق عليه', 'مرفوض')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  )`,

  // Platform: per-company module toggles
  `CREATE TABLE IF NOT EXISTS company_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    module_key TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    UNIQUE(company_id, module_key),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  )`,

  // Candidate professional profile (keyed by account email)
  `CREATE TABLE IF NOT EXISTS candidate_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    headline TEXT,
    summary TEXT,
    skills TEXT,
    experience_years INTEGER,
    education TEXT,
    phone TEXT,
    location TEXT,
    linkedin TEXT,
    portfolio TEXT,
    cv_file_name TEXT,
    in_talent_pool INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Candidate journey: interviews, documents, forms, offers, messages
  `CREATE TABLE IF NOT EXISTS candidate_interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    job_title TEXT,
    scheduled_at DATETIME,
    mode TEXT DEFAULT 'حضوري' CHECK(mode IN ('حضوري', 'فيديو', 'هاتفي')),
    stage TEXT DEFAULT 'مبدئية',
    status TEXT DEFAULT 'مجدولة' CHECK(status IN ('مجدولة', 'مكتملة', 'ملغاة')),
    location TEXT,
    meeting_link TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS candidate_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    title TEXT NOT NULL,
    doc_type TEXT DEFAULT 'أخرى',
    status TEXT DEFAULT 'مطلوب' CHECK(status IN ('مطلوب', 'مرفوع')),
    file_name TEXT,
    uploaded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS candidate_forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'مطلوب' CHECK(status IN ('مطلوب', 'مكتمل')),
    response TEXT,
    submitted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS job_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    job_title TEXT NOT NULL,
    department TEXT,
    salary REAL,
    start_date DATE,
    details TEXT,
    status TEXT DEFAULT 'معلّق' CHECK(status IN ('معلّق', 'مقبول', 'مرفوض')),
    responded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS candidate_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    sender TEXT DEFAULT 'candidate' CHECK(sender IN ('candidate', 'hr')),
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Attendance correction requests
  `CREATE TABLE IF NOT EXISTS attendance_corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    requested_check_in TEXT,
    requested_check_out TEXT,
    reason TEXT,
    status TEXT DEFAULT 'معلق' CHECK(status IN ('معلق', 'موافق عليه', 'مرفوض')),
    reviewed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Manager: hiring requests
  `CREATE TABLE IF NOT EXISTS hiring_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_by INTEGER,
    department_id INTEGER,
    job_title TEXT NOT NULL,
    headcount INTEGER DEFAULT 1,
    employment_type TEXT DEFAULT 'دوام كامل' CHECK(employment_type IN ('دوام كامل', 'دوام جزئي', 'عقد مؤقت', 'تدريب')),
    urgency TEXT DEFAULT 'عادي' CHECK(urgency IN ('عادي', 'عاجل')),
    justification TEXT,
    status TEXT DEFAULT 'معلق' CHECK(status IN ('معلق', 'موافق عليه', 'مرفوض')),
    reviewed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Manager: interviews
  `CREATE TABLE IF NOT EXISTS interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_name TEXT NOT NULL,
    job_title TEXT,
    interviewer_id INTEGER,
    scheduled_at DATETIME,
    mode TEXT DEFAULT 'حضوري' CHECK(mode IN ('حضوري', 'فيديو', 'هاتفي')),
    stage TEXT DEFAULT 'مبدئية' CHECK(stage IN ('مبدئية', 'فنية', 'نهائية')),
    status TEXT DEFAULT 'مجدولة' CHECK(status IN ('مجدولة', 'مكتملة', 'ملغاة')),
    rating INTEGER,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interviewer_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Manager: promotions & transfers
  `CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT DEFAULT 'ترقية' CHECK(type IN ('ترقية', 'نقل')),
    current_title TEXT,
    new_title TEXT,
    new_department_id INTEGER,
    effective_date DATE,
    justification TEXT,
    status TEXT DEFAULT 'معلق' CHECK(status IN ('معلق', 'موافق عليه', 'مرفوض')),
    requested_by INTEGER,
    reviewed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (new_department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Employee surveys + responses
  `CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    audience TEXT DEFAULT 'الكل',
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS survey_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    rating INTEGER,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(survey_id, employee_id),
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  )`,

  // Document e-signature requests
  `CREATE TABLE IF NOT EXISTS signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    doc_type TEXT DEFAULT 'عقد',
    status TEXT DEFAULT 'بانتظار التوقيع' CHECK(status IN ('بانتظار التوقيع', 'موقّع', 'مرفوض')),
    requested_by INTEGER,
    signed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES employees(id) ON DELETE SET NULL
  )`,

  // Organization settings (single row)
  `CREATE TABLE IF NOT EXISTS org_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    currency TEXT DEFAULT 'ريال سعودي',
    timezone TEXT DEFAULT 'Asia/Riyadh',
    language TEXT DEFAULT 'العربية',
    week_start TEXT DEFAULT 'الأحد',
    fiscal_year_start TEXT DEFAULT 'يناير',
    work_days_per_week INTEGER DEFAULT 5,
    work_hours_per_day INTEGER DEFAULT 8,
    probation_months INTEGER DEFAULT 3,
    annual_leave_days INTEGER DEFAULT 30,
    sick_leave_days INTEGER DEFAULT 30,
    overtime_enabled INTEGER DEFAULT 1,
    remote_work_enabled INTEGER DEFAULT 1,
    two_factor_required INTEGER DEFAULT 0,
    self_service_enabled INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

const indexes = `
  CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
  CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
  CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
  CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_requests_employee ON requests(employee_id);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id);
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

  // Additive column migrations for tables that already exist on older databases
  const columnAdditions = [
    `ALTER TABLE documents ADD COLUMN expiry_date DATE`,
    `ALTER TABLE applications ADD COLUMN stage TEXT DEFAULT 'متقدم جديد'`,
    `ALTER TABLE applications ADD COLUMN source TEXT DEFAULT 'الموقع'`,
    `ALTER TABLE applications ADD COLUMN rating INTEGER`,
  ];
  for (const stmt of columnAdditions) {
    try {
      db.exec(stmt);
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.error('❌ Column migration error:', err.message);
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
