const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// Payroll overview across employees (HR / admins only).
// Net = basic + allowances − GOSI (10% of basic, simple model).
router.get('/', requireRole('super_admin', 'admin', 'hr_manager'), (req, res, next) => {
  try {
    const { department_id } = req.query;
    let where = "WHERE e.status = 'نشط'";
    const params = [];
    if (department_id) { where += ' AND e.department_id = ?'; params.push(department_id); }

    const rows = db.prepare(`
      SELECT e.id, e.full_name, e.job_title, e.employee_number, e.salary, e.allowances,
             d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ${where}
      ORDER BY e.salary DESC
    `).all(...params);

    const payroll = rows.map((r) => {
      const basic = r.salary || 0;
      const allowances = r.allowances || 0;
      const deductions = Math.round(basic * 0.1);
      const net = basic + allowances - deductions;
      return { ...r, basic, allowances, deductions, net };
    });

    const totals = payroll.reduce(
      (t, p) => ({
        basic: t.basic + p.basic,
        allowances: t.allowances + p.allowances,
        deductions: t.deductions + p.deductions,
        net: t.net + p.net,
      }),
      { basic: 0, allowances: 0, deductions: 0, net: 0 }
    );

    res.json({ payroll, totals, count: payroll.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
