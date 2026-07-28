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

module.exports = router;
