const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// Generate the last N payslips for an employee from their contract salary.
// GOSI deduction ~ 10% of basic (Saudi employee share) as a simple model.
router.get('/:employee_id', (req, res, next) => {
  try {
    const employeeId = parseInt(req.params.employee_id, 10);

    // Permission: own payslips, or a manager/HR role
    const privileged = ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(req.user.role);
    if (!privileged && employeeId !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const emp = db.prepare(`
      SELECT id, full_name, employee_number, job_title, salary, allowances, bank_name, bank_account
      FROM employees WHERE id = ?
    `).get(employeeId);

    if (!emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const basic = emp.salary || 0;
    const allowances = emp.allowances || 0;
    const gosi = Math.round(basic * 0.1);
    const gross = basic + allowances;
    const net = gross - gosi;

    const months = 6;
    const now = new Date();
    const payslips = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      payslips.push({
        id: `${d.getFullYear()}-${d.getMonth() + 1}`,
        month: AR_MONTHS[d.getMonth()],
        year: d.getFullYear(),
        basic,
        allowances,
        deductions: gosi,
        gross,
        net,
        status: 'مدفوع'
      });
    }

    res.json({
      employee: {
        id: emp.id, full_name: emp.full_name, employee_number: emp.employee_number,
        job_title: emp.job_title, bank_name: emp.bank_name, bank_account: emp.bank_account
      },
      payslips
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
