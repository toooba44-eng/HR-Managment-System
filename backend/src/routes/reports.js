const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'hr_manager', 'super_admin', 'department_head'));

// Aggregated HR analytics computed from existing data (no new tables).
router.get('/overview', (req, res, next) => {
  try {
    const headcount = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = \'نشط\' THEN 1 ELSE 0 END) as active FROM employees').get();

    const byDepartment = db.prepare(`
      SELECT d.name, d.color, COUNT(e.id) as count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id
      GROUP BY d.id ORDER BY count DESC
    `).all();

    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM employees GROUP BY status ORDER BY count DESC').all();
    const byEmploymentType = db.prepare('SELECT employment_type as type, COUNT(*) as count FROM employees GROUP BY employment_type ORDER BY count DESC').all();

    const hiresByYear = db.prepare(`
      SELECT strftime('%Y', hire_date) as year, COUNT(*) as count
      FROM employees WHERE hire_date IS NOT NULL
      GROUP BY year ORDER BY year
    `).all();

    const attendance30 = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'حاضر' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'غائب' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'تأخر' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'عمل عن بعد' THEN 1 ELSE 0 END) as remote,
        ROUND(AVG(work_hours), 1) as avgHours
      FROM attendance WHERE date >= date('now', '-30 days')
    `).get();

    const leavesByType = db.prepare(`
      SELECT type, COUNT(*) as count, SUM(days_count) as days
      FROM leaves GROUP BY type ORDER BY count DESC
    `).all();

    const pay = db.prepare("SELECT SUM(salary) as basic, SUM(allowances) as allowances FROM employees WHERE status = 'نشط'").get();
    const basic = pay.basic || 0;
    const allowances = pay.allowances || 0;
    const deductions = Math.round(basic * 0.1);
    const payroll = { basic, allowances, deductions, net: basic + allowances - deductions };

    const recruitment = {
      openJobs: db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'مفتوحة'").get().c,
      applications: db.prepare('SELECT COUNT(*) as c FROM applications').get().c,
      byStatus: db.prepare('SELECT status, COUNT(*) as count FROM applications GROUP BY status').all(),
    };

    const exp = db.prepare(`
      SELECT
        SUM(amount) as total,
        SUM(CASE WHEN status = 'معلقة' THEN amount ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('معتمدة','مصروفة') THEN amount ELSE 0 END) as approved
      FROM expenses
    `).get();

    const training = {
      courses: db.prepare('SELECT COUNT(*) as c FROM courses').get().c,
      enrollments: db.prepare('SELECT COUNT(*) as c FROM enrollments').get().c,
      completed: db.prepare("SELECT COUNT(*) as c FROM enrollments WHERE status = 'مكتمل'").get().c,
    };

    res.json({
      headcount,
      byDepartment,
      byStatus,
      byEmploymentType,
      hiresByYear,
      attendance30,
      leavesByType,
      payroll,
      recruitment,
      expenses: { total: exp.total || 0, pending: exp.pending || 0, approved: exp.approved || 0 },
      training,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------- Report Builder (whitelisted) ------------------------- */

// Every dataset maps user-facing field keys to safe SQL column expressions.
// Only these keys are ever interpolated — user input is otherwise parameterized.
const DATASETS = {
  employees: {
    label: 'الموظفون',
    from: `FROM employees e LEFT JOIN departments d ON e.department_id = d.id`,
    fields: {
      full_name: { label: 'الاسم', col: 'e.full_name', type: 'text' },
      employee_number: { label: 'الرقم الوظيفي', col: 'e.employee_number', type: 'text' },
      job_title: { label: 'المسمى', col: 'e.job_title', type: 'text' },
      department: { label: 'الإدارة', col: 'd.name', type: 'text' },
      status: { label: 'الحالة', col: 'e.status', type: 'text' },
      employment_type: { label: 'نوع التوظيف', col: 'e.employment_type', type: 'text' },
      nationality: { label: 'الجنسية', col: 'e.nationality', type: 'text' },
      hire_date: { label: 'تاريخ التعيين', col: 'e.hire_date', type: 'date' },
      salary: { label: 'الراتب', col: 'e.salary', type: 'number' },
    },
  },
  attendance: {
    label: 'الحضور',
    from: `FROM attendance a JOIN employees e ON a.employee_id = e.id`,
    fields: {
      full_name: { label: 'الموظف', col: 'e.full_name', type: 'text' },
      date: { label: 'التاريخ', col: 'a.date', type: 'date' },
      status: { label: 'الحالة', col: 'a.status', type: 'text' },
      work_hours: { label: 'ساعات العمل', col: 'a.work_hours', type: 'number' },
    },
  },
  leaves: {
    label: 'الإجازات',
    from: `FROM leaves l JOIN employees e ON l.employee_id = e.id`,
    fields: {
      full_name: { label: 'الموظف', col: 'e.full_name', type: 'text' },
      type: { label: 'النوع', col: 'l.type', type: 'text' },
      status: { label: 'الحالة', col: 'l.status', type: 'text' },
      days_count: { label: 'عدد الأيام', col: 'l.days_count', type: 'number' },
      start_date: { label: 'تاريخ البداية', col: 'l.start_date', type: 'date' },
    },
  },
};
const OPS = { eq: '=', ne: '!=', gt: '>', lt: '<', contains: 'LIKE' };

// Describe available datasets & fields for the builder UI
router.get('/datasets', (req, res, next) => {
  try {
    const out = Object.entries(DATASETS).map(([key, ds]) => ({
      key, label: ds.label,
      fields: Object.entries(ds.fields).map(([fk, f]) => ({ key: fk, label: f.label, type: f.type })),
    }));
    res.json({ datasets: out, operators: [
      { key: 'eq', label: 'يساوي' }, { key: 'ne', label: 'لا يساوي' },
      { key: 'gt', label: 'أكبر من' }, { key: 'lt', label: 'أصغر من' },
      { key: 'contains', label: 'يحتوي' },
    ] });
  } catch (err) { next(err); }
});

// Run a report definition
router.post('/run', (req, res, next) => {
  try {
    const { dataset, fields, filters, group_by } = req.body;
    const ds = DATASETS[dataset];
    if (!ds) return res.status(400).json({ error: 'Unknown dataset' });

    const selectedKeys = (Array.isArray(fields) ? fields : []).filter((k) => ds.fields[k]);
    const params = [];
    let where = 'WHERE 1=1';
    for (const f of (Array.isArray(filters) ? filters : [])) {
      const field = ds.fields[f.field];
      const op = OPS[f.op];
      if (!field || !op || f.value === undefined || f.value === '') continue;
      if (op === 'LIKE') { where += ` AND ${field.col} LIKE ?`; params.push(`%${f.value}%`); }
      else { where += ` AND ${field.col} ${op} ?`; params.push(field.type === 'number' ? Number(f.value) : f.value); }
    }

    // Grouped (aggregate) report
    if (group_by && ds.fields[group_by]) {
      const gcol = ds.fields[group_by].col;
      const rows = db.prepare(`SELECT ${gcol} AS group_value, COUNT(*) AS count ${ds.from} ${where} GROUP BY ${gcol} ORDER BY count DESC`).all(...params);
      return res.json({
        grouped: true,
        columns: [{ key: 'group_value', label: ds.fields[group_by].label }, { key: 'count', label: 'العدد' }],
        rows, total: rows.length,
      });
    }

    // Flat report
    const cols = (selectedKeys.length ? selectedKeys : Object.keys(ds.fields));
    const selectExpr = cols.map((k) => `${ds.fields[k].col} AS ${k}`).join(', ');
    const rows = db.prepare(`SELECT ${selectExpr} ${ds.from} ${where} LIMIT 1000`).all(...params);
    res.json({
      grouped: false,
      columns: cols.map((k) => ({ key: k, label: ds.fields[k].label })),
      rows, total: rows.length,
    });
  } catch (err) { next(err); }
});

module.exports = router;
