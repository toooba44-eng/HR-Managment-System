const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// List expense/advance claims (role-scoped) with a totals summary
router.get('/', (req, res, next) => {
  try {
    const { type, status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (type) { where += ' AND x.type = ?'; params.push(type); }
    if (status) { where += ' AND x.status = ?'; params.push(status); }

    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND x.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT x.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name,
             approver.full_name as approved_by_name
      FROM expenses x
      JOIN employees e ON x.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees approver ON x.approved_by = approver.id
      ${where}
      ORDER BY
        CASE x.status WHEN 'معلقة' THEN 1 WHEN 'معتمدة' THEN 2 ELSE 3 END,
        x.created_at DESC
    `).all(...params);

    const summary = rows.reduce((s, r) => {
      s.count += 1;
      s.total += r.amount;
      if (r.status === 'معلقة') s.pending += r.amount;
      if (r.status === 'معتمدة' || r.status === 'مصروفة') s.approved += r.amount;
      // Disbursed advances still awaiting settlement
      if (r.type === 'سلفة' && r.status === 'مصروفة' && r.settled_at == null) {
        s.outstanding += r.amount;
      }
      return s;
    }, { count: 0, total: 0, pending: 0, approved: 0, outstanding: 0 });

    res.json({ expenses: rows, summary });
  } catch (err) {
    next(err);
  }
});

// Submit an expense/advance (for self)
router.post('/', (req, res, next) => {
  try {
    const { type, category, amount, description } = req.body;
    const employee_id = req.user.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });

    const result = db.prepare(`
      INSERT INTO expenses (employee_id, type, category, amount, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(employee_id, type || 'مصروف', category || 'أخرى', amount, description || null);

    res.status(201).json({ message: 'Submitted', expense: { id: result.lastInsertRowid, status: 'معلقة' } });
  } catch (err) {
    next(err);
  }
});

// Approve / reject / mark paid (managers & HR)
router.put('/:id/status', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['معتمدة', 'مرفوضة', 'مصروفة'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const exists = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Not found' });

    // A department head may only act on claims within their own department —
    // the list endpoint already scopes this way; enforce it here too so the
    // action can't be reached directly by ID.
    if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      const empDept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(exists.employee_id);
      if (!dept || !empDept || dept.department_id !== empDept.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare('UPDATE expenses SET status = ?, approved_by = ? WHERE id = ?')
      .run(status, req.user.employee_id || null, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Settle a disbursed cash advance: record what was actually spent and
// compute the balance (positive = employee refunds the company; negative =
// company owes the employee an extra reimbursement). Owner or a manager.
router.put('/:id/settle', (req, res, next) => {
  try {
    const settledAmount = Number(req.body.settled_amount);
    if (!Number.isFinite(settledAmount) || settledAmount < 0) {
      return res.status(400).json({ error: 'Valid settled amount is required' });
    }
    const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.type !== 'سلفة') return res.status(400).json({ error: 'Only advances can be settled' });
    if (row.status !== 'مصروفة') return res.status(400).json({ error: 'Advance must be disbursed before settlement' });

    const isOwner = req.user.employee_id === row.employee_id;
    if (!isOwner && !MANAGE.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    db.prepare("UPDATE expenses SET settled_amount = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(settledAmount, req.params.id);

    res.json({ message: 'Settled', balance: Number((row.amount - settledAmount).toFixed(2)) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
