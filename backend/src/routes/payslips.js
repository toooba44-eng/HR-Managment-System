const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// An employee's payslips are the line items of actual payroll runs that have
// at least been approved (drafts and runs still under review aren't final,
// so they're never shown as a payslip).
router.get('/:employee_id', (req, res, next) => {
  try {
    const employeeId = parseInt(req.params.employee_id, 10);

    // Permission: own payslips, or a manager/HR role (department heads only
    // for their own department's employees)
    const privileged = ['admin', 'hr_manager', 'super_admin'].includes(req.user.role);
    if (!privileged && employeeId !== req.user.employee_id) {
      if (req.user.role !== 'department_head') {
        return res.status(403).json({ error: 'Access denied' });
      }
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      const target = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(employeeId);
      if (!dept || !target || dept.department_id !== target.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const emp = db.prepare(`
      SELECT id, full_name, employee_number, job_title, bank_name, bank_account
      FROM employees WHERE id = ?
    `).get(employeeId);

    if (!emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const rows = db.prepare(`
      SELECT i.*, r.month, r.year, r.status as run_status, r.approved_at, r.paid_at
      FROM payroll_run_items i
      JOIN payroll_runs r ON i.run_id = r.id
      WHERE i.employee_id = ? AND r.status IN ('معتمد', 'مصروف')
      ORDER BY r.year DESC, r.month DESC
    `).all(employeeId);

    const payslips = rows.map((r) => ({
      id: r.run_id,
      month: AR_MONTHS[r.month - 1],
      year: r.year,
      basic: r.basic,
      housing_allowance: r.housing_allowance,
      transport_allowance: r.transport_allowance,
      other_allowances: r.other_allowances,
      bonus: r.bonus,
      allowances: r.allowances,
      deductions: r.deductions,
      gross: r.basic + r.allowances,
      net: r.net,
      status: r.run_status === 'مصروف' ? 'مدفوع' : 'معتمد',
      paid_at: r.paid_at,
    }));

    res.json({
      employee: { id: emp.id, full_name: emp.full_name, employee_number: emp.employee_number, job_title: emp.job_title, bank_name: emp.bank_name, bank_account: emp.bank_account },
      payslips
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
