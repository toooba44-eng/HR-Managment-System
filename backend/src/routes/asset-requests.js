const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const REVIEW_ROLES = ['admin', 'hr_manager', 'super_admin'];

function deptOf(employeeId) {
  const row = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(employeeId);
  return row ? row.department_id : null;
}

// List asset requests (role-scoped) with a summary
router.get('/', (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND r.status = ?'; params.push(req.query.status); }
    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND r.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      where += ' AND (r.requested_by = ? OR e.department_id = ?)';
      params.push(req.user.employee_id, deptOf(req.user.employee_id));
    }
    const rows = db.prepare(`
      SELECT r.*, e.full_name, e.job_title, e.profile_picture, e.department_id,
             req.full_name as requested_by_name, rv.full_name as reviewed_by_name
      FROM asset_requests r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN employees req ON r.requested_by = req.id
      LEFT JOIN employees rv ON r.reviewed_by = rv.id
      ${where}
      ORDER BY CASE r.status WHEN 'معلق' THEN 1 ELSE 2 END, r.created_at DESC
    `).all(...params);
    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status === 'معلق') s.pending += 1;
      s.estimatedTotal += r.estimated_cost || 0;
      return s;
    }, { total: 0, pending: 0, estimatedTotal: 0 });
    res.json({ requests: rows, summary });
  } catch (err) { next(err); }
});

// Request an asset — for myself, or (department heads) for my department,
// or (HR/admin) for anyone.
router.post('/', (req, res, next) => {
  try {
    const { item_name, category, justification, estimated_cost } = req.body;
    let { employee_id } = req.body;
    if (!['admin', 'hr_manager', 'super_admin', 'department_head'].includes(req.user.role) || !employee_id) {
      employee_id = req.user.employee_id;
    }
    if (!employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    if (!item_name) return res.status(400).json({ error: 'Item name is required' });

    const emp = db.prepare('SELECT id, department_id FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (req.user.role === 'department_head' && employee_id !== req.user.employee_id && emp.department_id !== deptOf(req.user.employee_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = db.prepare(`
      INSERT INTO asset_requests (employee_id, category, item_name, justification, estimated_cost, requested_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employee_id, category || 'أخرى', item_name, justification || null,
      estimated_cost != null ? Number(estimated_cost) : null, req.user.employee_id || null);

    res.status(201).json({ message: 'Requested', request: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

// Approve/reject (HR/admin only) — approval is a procurement green light,
// not the asset itself; HR registers the actual asset separately once it's
// been bought, the same way an approved hiring request doesn't auto-create
// the job posting.
router.put('/:id/status', requireRole(...REVIEW_ROLES), (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['معتمد', 'مرفوض', 'معلق'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const exists = db.prepare('SELECT id FROM asset_requests WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE asset_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.user.employee_id || null, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

// Withdraw — the requester (while pending) or HR/admin
router.delete('/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT requested_by, employee_id, status FROM asset_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const isReviewer = REVIEW_ROLES.includes(req.user.role);
    const isOwner = row.requested_by === req.user.employee_id || row.employee_id === req.user.employee_id;
    if (!isReviewer && !isOwner) return res.status(403).json({ error: 'Access denied' });
    if (!isReviewer && row.status !== 'معلق') return res.status(400).json({ error: 'لا يمكن حذف طلب تم البت فيه' });
    db.prepare('DELETE FROM asset_requests WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
