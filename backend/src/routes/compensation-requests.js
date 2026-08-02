const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// Anyone who can request one; only HR/admin can review/decide.
const REQUEST_ROLES = ['department_head', 'admin', 'hr_manager', 'super_admin'];
const REVIEW_ROLES = ['admin', 'hr_manager', 'super_admin'];

const total = (r) => r.base_salary + r.housing_allowance + r.transport_allowance + r.other_allowances + r.bonus;

function deptOf(employeeId) {
  const row = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(employeeId);
  return row ? row.department_id : null;
}

router.use(requireRole(...REQUEST_ROLES));

// List raise requests (role-scoped) with a summary
router.get('/', (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND r.status = ?'; params.push(req.query.status); }
    if (req.user.role === 'department_head') {
      where += ' AND (r.requested_by = ? OR e.department_id = ?)';
      params.push(req.user.employee_id, deptOf(req.user.employee_id));
    }
    const rows = db.prepare(`
      SELECT r.*, e.full_name, e.job_title, e.profile_picture, e.department_id,
             req.full_name as requested_by_name, rv.full_name as reviewed_by_name
      FROM compensation_requests r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN employees req ON r.requested_by = req.id
      LEFT JOIN employees rv ON r.reviewed_by = rv.id
      ${where}
      ORDER BY CASE r.status WHEN 'معلق' THEN 1 ELSE 2 END, r.created_at DESC
    `).all(...params);
    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status === 'معلق') s.pending += 1;
      return s;
    }, { total: 0, pending: 0 });
    res.json({ requests: rows, summary });
  } catch (err) { next(err); }
});

// Request a raise for an employee — department heads are scoped to their
// own department, matching every other request-then-review workflow here.
router.post('/', (req, res, next) => {
  try {
    const { employee_id, requested_base_salary, reason } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'Employee is required' });
    const amount = Number(requested_base_salary);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Valid requested salary is required' });

    const emp = db.prepare('SELECT id, department_id FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (req.user.role === 'department_head' && emp.department_id !== deptOf(req.user.employee_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pkg = db.prepare(`SELECT * FROM compensation WHERE employee_id = ? AND status = 'نشط' ORDER BY effective_date DESC, id DESC LIMIT 1`).get(employee_id);
    if (pkg && amount <= pkg.base_salary) {
      return res.status(400).json({ error: 'الراتب المطلوب يجب أن يكون أعلى من الراتب الأساسي الحالي' });
    }

    const result = db.prepare(`
      INSERT INTO compensation_requests (employee_id, compensation_id, current_base_salary, requested_base_salary, reason, requested_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employee_id, pkg ? pkg.id : null, pkg ? pkg.base_salary : 0, amount, reason || null, req.user.employee_id || null);

    res.status(201).json({ message: 'Requested', request: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

// Approve/reject (HR/admin only). Approving writes through to the
// compensation package — creating one if the employee never had one, or
// updating the existing one and logging compensation_history when the
// total actually changes, exactly like a direct edit would.
router.put('/:id/status', requireRole(...REVIEW_ROLES), (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['معتمد', 'مرفوض', 'معلق'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const reqRow = db.prepare('SELECT * FROM compensation_requests WHERE id = ?').get(req.params.id);
    if (!reqRow) return res.status(404).json({ error: 'Not found' });

    db.prepare('UPDATE compensation_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.user.employee_id || null, req.params.id);

    if (status === 'معتمد') {
      const pkg = reqRow.compensation_id ? db.prepare('SELECT * FROM compensation WHERE id = ?').get(reqRow.compensation_id) : null;
      if (pkg) {
        const oldTotal = total(pkg);
        const newTotal = oldTotal - pkg.base_salary + reqRow.requested_base_salary;
        db.prepare('UPDATE compensation SET base_salary = ? WHERE id = ?').run(reqRow.requested_base_salary, pkg.id);
        if (newTotal !== oldTotal) {
          db.prepare(`
            INSERT INTO compensation_history (compensation_id, employee_id, old_total, new_total, old_base_salary, new_base_salary, reason, changed_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(pkg.id, reqRow.employee_id, oldTotal, newTotal, pkg.base_salary, reqRow.requested_base_salary, reqRow.reason, req.user.employee_id || null);
        }
      } else {
        db.prepare(`
          INSERT INTO compensation (employee_id, base_salary, notes, created_by)
          VALUES (?, ?, ?, ?)
        `).run(reqRow.employee_id, reqRow.requested_base_salary, reqRow.reason, req.user.employee_id || null);
      }
    }

    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

// Withdraw a request — the requester (while pending) or HR/admin
router.delete('/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT requested_by, status FROM compensation_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'department_head' && row.requested_by !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM compensation_requests WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
