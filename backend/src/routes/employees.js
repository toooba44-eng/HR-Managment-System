const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole, requireOwnershipOrRole } = require('../middleware/auth');
const { employeeValidation } = require('../middleware/validation');
const { runWorkflowsFor } = require('../utils/workflowEngine');
const router = express.Router();

// Apply auth to all routes
router.use(authenticateToken);

// Get all employees (with filters)
router.get('/', (req, res, next) => {
  try {
    const { department_id, status, search, contract_expiring, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (department_id) {
      whereClause += ' AND e.department_id = ?';
      params.push(department_id);
    }
    if (status) {
      whereClause += ' AND e.status = ?';
      params.push(status);
    }
    if (search) {
      whereClause += ` AND (e.full_name LIKE ? OR e.email LIKE ? OR e.job_title LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    // Contracts expiring within 60 days — same window as the dashboard alert,
    // so clicking through shows exactly the employees it's counting.
    if (contract_expiring) {
      whereClause += ` AND e.contract_end IS NOT NULL AND e.contract_end BETWEEN date('now') AND date('now', '+60 days')`;
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause += ' AND e.id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) {
        whereClause += ' AND e.department_id = ?';
        params.push(dept.department_id);
      }
    }

    const countQuery = db.prepare(`SELECT COUNT(*) as total FROM employees e ${whereClause}`);
    const { total } = countQuery.get(...params);

    const query = db.prepare(`
      SELECT e.*, d.name as department_name, m.full_name as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
      ${whereClause}
      ORDER BY ${contract_expiring ? 'e.contract_end ASC' : 'e.created_at DESC'}
      LIMIT ? OFFSET ?
    `);

    const employees = query.all(...params, parseInt(limit), parseInt(offset));

    res.json({
      employees,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Reporting-hierarchy org chart (built from manager_id)
router.get('/org-chart', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT e.id, e.full_name, e.job_title, e.profile_picture, e.status, e.manager_id, e.department_id,
             d.name as department_name, d.color as department_color
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY e.job_title
    `).all();

    const byManager = new Map();
    for (const r of rows) {
      const key = r.manager_id || 'root';
      if (!byManager.has(key)) byManager.set(key, []);
      byManager.get(key).push(r);
    }
    const build = (node) => {
      const children = (byManager.get(node.id) || []).map(build);
      const directReports = children.length;
      const totalReports = children.reduce((s, c) => s + c.total_reports + 1, 0);
      return { ...node, children, direct_reports: directReports, total_reports: totalReports };
    };
    const roots = (byManager.get('root') || []).map(build);
    res.json({ tree: roots, total: rows.length });
  } catch (err) {
    next(err);
  }
});

// Export employees (all matching rows, no pagination) for CSV download.
// Same filters and role-scoping as the list endpoint.
router.get('/export', requireRole('admin', 'hr_manager', 'department_head'), (req, res, next) => {
  try {
    const { department_id, status, search } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (department_id) { whereClause += ' AND e.department_id = ?'; params.push(department_id); }
    if (status) { whereClause += ' AND e.status = ?'; params.push(status); }
    if (search) {
      whereClause += ` AND (e.full_name LIKE ? OR e.email LIKE ? OR e.job_title LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { whereClause += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const employees = db.prepare(`
      SELECT e.employee_number, e.full_name, e.email, e.phone, e.job_title, d.name as department_name,
             e.employment_type, e.work_location, e.status, e.hire_date, e.salary
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY e.full_name
    `).all(...params);

    res.json({ employees });
  } catch (err) {
    next(err);
  }
});

// Qiwa (Saudi Ministry of Labor platform) contract-documentation readiness:
// flags active employees missing the data a work-contract registration
// needs, so HR can close gaps before filing rather than discovering them at
// submission time. Saudi national ID and Iqama (resident ID) numbers both
// start with 1 or 2, followed by 9 digits.
const QIWA_ID_RE = /^[12]\d{9}$/;
router.get('/qiwa-readiness', requireRole('admin', 'hr_manager', 'super_admin'), (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT e.id, e.full_name, e.job_title, e.national_id, e.nationality, e.contract_type,
             e.contract_start, e.salary, e.work_location, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'نشط'
      ORDER BY e.full_name ASC
    `).all();

    const items = rows.map((r) => {
      const issues = [];
      if (!r.national_id || !QIWA_ID_RE.test(r.national_id)) issues.push('رقم الهوية/الإقامة مفقود أو غير صالح');
      if (!r.nationality) issues.push('الجنسية غير مُحدَّدة');
      if (!r.contract_type) issues.push('نوع العقد غير محدد');
      if (!r.contract_start) issues.push('تاريخ بداية العقد مفقود');
      if (!r.salary || r.salary <= 0) issues.push('الراتب الأساسي غير محدد');
      if (!r.work_location) issues.push('موقع العمل غير محدد');
      return {
        employee_id: r.id, full_name: r.full_name, job_title: r.job_title, department_name: r.department_name,
        national_id: r.national_id, nationality: r.nationality, contract_type: r.contract_type,
        ok: issues.length === 0, issues,
      };
    });

    const readyCount = items.filter((i) => i.ok).length;
    res.json({ items, summary: { total: items.length, ready: readyCount, not_ready: items.length - readyCount } });
  } catch (err) { next(err); }
});

// Bulk-import employees from parsed CSV rows. Best-effort: each row is
// applied independently so one bad row doesn't block the rest — same
// pattern as the approvals inbox's bulk-approve.
router.post('/import', requireRole('admin', 'hr_manager'), (req, res, next) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (rows.length === 0) return res.status(400).json({ error: 'No rows to import' });
    if (rows.length > 500) return res.status(400).json({ error: 'الحد الأقصى 500 صف لكل استيراد' });

    const departments = db.prepare('SELECT id, name FROM departments').all();
    const deptByName = new Map(departments.map((d) => [d.name.trim().toLowerCase(), d.id]));

    const org = db.prepare('SELECT annual_leave_days, sick_leave_days FROM org_settings WHERE id = 1').get() || {};
    const annualLeaveBalance = org.annual_leave_days ?? 30;
    const sickLeaveBalance = org.sick_leave_days ?? 10;

    const insert = db.prepare(`
      INSERT INTO employees (full_name, email, phone, job_title, department_id, hire_date, employment_type, work_location, salary, employee_number, annual_leave_balance, sick_leave_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const emailExists = db.prepare('SELECT 1 FROM employees WHERE email = ?');

    let created = 0;
    const failed = [];
    rows.forEach((row, i) => {
      const full_name = (row.full_name || '').trim();
      const email = (row.email || '').trim();
      const job_title = (row.job_title || '').trim();
      const hire_date = (row.hire_date || '').trim();
      if (!full_name || !email || !job_title || !hire_date) {
        failed.push({ row: i + 1, email, error: 'الاسم والبريد والمسمى الوظيفي وتاريخ التعيين مطلوبة' });
        return;
      }
      if (emailExists.get(email)) {
        failed.push({ row: i + 1, email, error: 'البريد الإلكتروني مستخدم بالفعل' });
        return;
      }
      let department_id = null;
      if (row.department) {
        department_id = deptByName.get(String(row.department).trim().toLowerCase()) || null;
        if (!department_id) {
          failed.push({ row: i + 1, email, error: `الإدارة "${row.department}" غير موجودة` });
          return;
        }
      }
      try {
        insert.run(
          full_name, email, row.phone || null, job_title, department_id, hire_date,
          row.employment_type || 'دوام كامل', row.work_location || 'الرياض - المقر الرئيسي',
          row.salary ? Number(row.salary) : 0, `EMP-${Date.now()}-${i}`,
          annualLeaveBalance, sickLeaveBalance,
        );
        created += 1;
        if (department_id) {
          db.prepare(`UPDATE departments SET employee_count = (SELECT COUNT(*) FROM employees WHERE department_id = ?) WHERE id = ?`)
            .run(department_id, department_id);
        }
      } catch (e) {
        failed.push({ row: i + 1, email, error: 'تعذّر إنشاء السجل' });
      }
    });

    res.json({ created, failed });
  } catch (err) {
    next(err);
  }
});

// Get single employee
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    // Check permissions
    if (req.user.role === 'employee' && parseInt(id) !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const employee = db.prepare(`
      SELECT e.*, d.name as department_name, d.color as department_color,
             m.full_name as manager_name, m.job_title as manager_job_title
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = ?
    `).get(id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get subordinates
    const subordinates = db.prepare(`
      SELECT id, full_name, job_title, profile_picture, status
      FROM employees WHERE manager_id = ?
    `).all(id);

    // Get recent attendance
    const attendance = db.prepare(`
      SELECT * FROM attendance 
      WHERE employee_id = ? 
      ORDER BY date DESC 
      LIMIT 10
    `).all(id);

    // Get leaves
    const leaves = db.prepare(`
      SELECT l.*, approver.full_name as approved_by_name
      FROM leaves l
      LEFT JOIN employees approver ON l.approved_by = approver.id
      WHERE l.employee_id = ?
      ORDER BY l.created_at DESC
      LIMIT 10
    `).all(id);

    // Get documents
    const documents = db.prepare(`
      SELECT d.*, uploader.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN employees uploader ON d.uploaded_by = uploader.id
      WHERE d.employee_id = ?
      ORDER BY d.uploaded_at DESC
    `).all(id);

    // Optional related data (tables may not exist on older databases)
    const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

    const goals = safe(() => db.prepare(`
      SELECT * FROM goals WHERE employee_id = ? ORDER BY
        CASE status WHEN 'قيد التنفيذ' THEN 1 WHEN 'لم تبدأ' THEN 2 WHEN 'مكتملة' THEN 3 ELSE 4 END, id DESC
    `).all(id), []);

    const training = safe(() => db.prepare(`
      SELECT en.*, c.title, c.category, c.hours
      FROM enrollments en JOIN courses c ON en.course_id = c.id
      WHERE en.employee_id = ? ORDER BY en.id DESC
    `).all(id), []);

    const assets = safe(() => db.prepare(`
      SELECT * FROM assets WHERE assigned_to = ? ORDER BY assigned_date DESC
    `).all(id), []);

    const compensation = safe(() => db.prepare(`
      SELECT * FROM compensation WHERE employee_id = ? AND status = 'نشط' ORDER BY id DESC LIMIT 1
    `).get(id), null);

    const history = safe(() => db.prepare(`
      SELECT id, type, current_title, new_title, effective_date, status, created_at
      FROM promotions WHERE employee_id = ? ORDER BY COALESCE(effective_date, created_at) DESC
    `).all(id), []);

    res.json({
      ...employee,
      subordinates,
      attendance,
      leaves,
      documents,
      goals,
      training,
      assets,
      compensation,
      history,
    });
  } catch (err) {
    next(err);
  }
});

// Create employee (Admin & HR only)
router.post('/', requireRole('admin', 'hr_manager'), employeeValidation.create, (req, res, next) => {
  try {
    const {
      full_name, email, phone, national_id, date_of_birth, nationality, marital_status, address,
      emergency_contact, job_title, department_id, manager_id, hire_date, employment_type,
      work_location, team, salary, allowances, bank_name, bank_account, contract_type,
      contract_start, contract_end
    } = req.body;

    const employeeNumber = `EMP-${Date.now()}`;

    // New hires start with the leave balances HR configured for the whole
    // organization (org_settings.annual_leave_days/sick_leave_days) instead
    // of the schema's hardcoded fallback — those settings were previously
    // editable in the Settings page but never actually applied anywhere.
    const org = db.prepare('SELECT annual_leave_days, sick_leave_days FROM org_settings WHERE id = 1').get() || {};
    const annualLeaveBalance = org.annual_leave_days ?? 30;
    const sickLeaveBalance = org.sick_leave_days ?? 10;

    const result = db.prepare(`
      INSERT INTO employees (
        full_name, email, phone, national_id, date_of_birth, nationality, marital_status, address,
        emergency_contact, employee_number, job_title, department_id, manager_id, hire_date,
        employment_type, work_location, team, salary, allowances, bank_name, bank_account,
        contract_type, contract_start, contract_end, annual_leave_balance, sick_leave_balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full_name, email, phone, national_id, date_of_birth, nationality, marital_status, address,
      emergency_contact, employeeNumber, job_title, department_id, manager_id, hire_date,
      employment_type, work_location, team, salary || 0, allowances || 0, bank_name, bank_account,
      contract_type, contract_start, contract_end, annualLeaveBalance, sickLeaveBalance
    );

    // Update department count
    db.prepare(`
      UPDATE departments SET employee_count = (
        SELECT COUNT(*) FROM employees WHERE department_id = ?
      ) WHERE id = ?
    `).run(department_id, department_id);

    runWorkflowsFor('تعيين موظف', result.lastInsertRowid);

    res.status(201).json({
      message: 'Employee created successfully',
      employee: { id: result.lastInsertRowid, ...req.body, employee_number: employeeNumber }
    });
  } catch (err) {
    next(err);
  }
});

// Update employee
router.put('/:id', employeeValidation.update, (req, res, next) => {
  try {
    const { id } = req.params;

    // Check permissions
    if (req.user.role === 'candidate') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'employee' && parseInt(id) !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // A department head may edit their own profile, or an employee's basic
    // fields within their own department — not org-wide.
    if (req.user.role === 'department_head' && parseInt(id) !== req.user.employee_id) {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      const targetDept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(id);
      if (!dept || !targetDept || dept.department_id !== targetDept.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const allowedFields = [
      'full_name', 'phone', 'date_of_birth', 'marital_status', 'address',
      'emergency_contact', 'profile_picture'
    ];

    if (['admin', 'hr_manager'].includes(req.user.role)) {
      allowedFields.push(
        'email', 'national_id', 'job_title', 'department_id', 'manager_id',
        'hire_date', 'employment_type', 'work_location', 'team', 'status',
        'salary', 'allowances', 'bank_name', 'bank_account', 'contract_type',
        'contract_start', 'contract_end'
      );
    }

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    db.prepare(`UPDATE employees SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    next(err);
  }
});

// Delete employee (Admin only)
router.delete('/:id', requireRole('admin'), (req, res, next) => {
  try {
    const { id } = req.params;

    const employee = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    db.prepare('DELETE FROM employees WHERE id = ?').run(id);

    // Update department count
    if (employee.department_id) {
      db.prepare(`
        UPDATE departments SET employee_count = (
          SELECT COUNT(*) FROM employees WHERE department_id = ?
        ) WHERE id = ?
      `).run(employee.department_id, employee.department_id);
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Get employee statistics
router.get('/:id/stats', (req, res, next) => {
  try {
    const { id } = req.params;

    const attendanceStats = db.prepare(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'حاضر' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'غائب' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'تأخر' THEN 1 ELSE 0 END) as late_days,
        AVG(work_hours) as avg_hours,
        SUM(work_hours) as total_hours
      FROM attendance
      WHERE employee_id = ? AND date >= date('now', '-30 days')
    `).get(id);

    const leaveStats = db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'موافقة' THEN days_count ELSE 0 END) as approved_days,
        SUM(CASE WHEN status = 'معلقة' THEN 1 ELSE 0 END) as pending_requests
      FROM leaves
      WHERE employee_id = ? AND created_at >= date('now', '-1 year')
    `).get(id);

    res.json({ attendance: attendanceStats, leaves: leaveStats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
