const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ACTIVE_COMP_JOIN, buildPayItem } = require('../utils/payCalc');
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

    // Uses each employee's active compensation package when one exists, so
    // this agrees with the live payroll overview and payroll runs.
    const payRows = db.prepare(`
      SELECT e.salary, e.allowances,
             c.base_salary, c.housing_allowance, c.transport_allowance, c.other_allowances, c.bonus
      FROM employees e
      ${ACTIVE_COMP_JOIN}
      WHERE e.status = 'نشط'
    `).all();
    const payroll = payRows.reduce((t, r) => {
      const i = buildPayItem(r);
      return { basic: t.basic + i.basic, allowances: t.allowances + i.allowances, deductions: t.deductions + i.deductions, net: t.net + i.net };
    }, { basic: 0, allowances: 0, deductions: 0, net: 0 });

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
  expenses: {
    label: 'المصروفات والسلف',
    from: `FROM expenses ex JOIN employees e ON ex.employee_id = e.id`,
    fields: {
      full_name: { label: 'الموظف', col: 'e.full_name', type: 'text' },
      type: { label: 'النوع', col: 'ex.type', type: 'text' },
      category: { label: 'الفئة', col: 'ex.category', type: 'text' },
      amount: { label: 'المبلغ', col: 'ex.amount', type: 'number' },
      status: { label: 'الحالة', col: 'ex.status', type: 'text' },
      created_at: { label: 'تاريخ الطلب', col: 'ex.created_at', type: 'date' },
    },
  },
  training: {
    label: 'التدريب',
    from: `FROM enrollments en JOIN employees e ON en.employee_id = e.id JOIN courses c ON en.course_id = c.id`,
    fields: {
      full_name: { label: 'الموظف', col: 'e.full_name', type: 'text' },
      course: { label: 'الدورة', col: 'c.title', type: 'text' },
      category: { label: 'الفئة', col: 'c.category', type: 'text' },
      status: { label: 'الحالة', col: 'en.status', type: 'text' },
      progress: { label: 'نسبة الإنجاز', col: 'en.progress', type: 'number' },
      enrolled_at: { label: 'تاريخ التسجيل', col: 'en.enrolled_at', type: 'date' },
    },
  },
  compensation: {
    label: 'الرواتب والتعويضات',
    from: `FROM compensation c JOIN employees e ON c.employee_id = e.id`,
    fields: {
      full_name: { label: 'الموظف', col: 'e.full_name', type: 'text' },
      grade: { label: 'الدرجة', col: 'c.grade', type: 'text' },
      base_salary: { label: 'الراتب الأساسي', col: 'c.base_salary', type: 'number' },
      housing_allowance: { label: 'بدل السكن', col: 'c.housing_allowance', type: 'number' },
      transport_allowance: { label: 'بدل النقل', col: 'c.transport_allowance', type: 'number' },
      bonus: { label: 'المكافأة', col: 'c.bonus', type: 'number' },
      status: { label: 'الحالة', col: 'c.status', type: 'text' },
      effective_date: { label: 'تاريخ السريان', col: 'c.effective_date', type: 'date' },
    },
  },
  recruitment: {
    label: 'التوظيف والمرشحون',
    from: `FROM applications ap JOIN jobs j ON ap.job_id = j.id`,
    fields: {
      candidate_name: { label: 'المرشح', col: 'ap.candidate_name', type: 'text' },
      job_title: { label: 'الوظيفة', col: 'j.title', type: 'text' },
      status: { label: 'الحالة', col: 'ap.status', type: 'text' },
      stage: { label: 'المرحلة', col: 'ap.stage', type: 'text' },
      source: { label: 'المصدر', col: 'ap.source', type: 'text' },
      rating: { label: 'التقييم', col: 'ap.rating', type: 'number' },
      created_at: { label: 'تاريخ التقديم', col: 'ap.created_at', type: 'date' },
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
