const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

// List signature requests (role-scoped) with summary
router.get('/', (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND sg.status = ?'; params.push(req.query.status); }
    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND sg.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }
    const rows = db.prepare(`
      SELECT sg.*, e.full_name, e.job_title, e.profile_picture, req.full_name as requested_by_name
      FROM signatures sg
      JOIN employees e ON sg.employee_id = e.id
      LEFT JOIN employees req ON sg.requested_by = req.id
      ${where}
      ORDER BY
        CASE sg.status WHEN 'بانتظار التوقيع' THEN 1 WHEN 'موقّع' THEN 2 ELSE 3 END,
        sg.created_at DESC
    `).all(...params);

    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status === 'بانتظار التوقيع') s.pending += 1;
      if (r.status === 'موقّع') s.signed += 1;
      return s;
    }, { total: 0, pending: 0, signed: 0 });

    res.json({ signatures: rows, summary });
  } catch (err) {
    next(err);
  }
});

// Request a signature (managers & HR)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { employee_id, title, doc_type } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'Employee is required' });
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    const result = db.prepare('INSERT INTO signatures (employee_id, title, doc_type, requested_by) VALUES (?, ?, ?, ?)')
      .run(employee_id, title, doc_type || 'عقد', req.user.employee_id || null);
    res.status(201).json({ message: 'Requested', signature: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Sign / decline (the owner only)
function setStatus(status) {
  return (req, res, next) => {
    try {
      const sig = db.prepare('SELECT * FROM signatures WHERE id = ?').get(req.params.id);
      if (!sig) return res.status(404).json({ error: 'Not found' });
      if (sig.employee_id !== req.user.employee_id) return res.status(403).json({ error: 'Access denied' });
      if (sig.status !== 'بانتظار التوقيع') return res.status(400).json({ error: 'Already processed' });
      const signed_at = status === 'موقّع' ? new Date().toISOString() : null;
      db.prepare('UPDATE signatures SET status = ?, signed_at = ? WHERE id = ?').run(status, signed_at, req.params.id);
      res.json({ message: 'Updated' });
    } catch (err) {
      next(err);
    }
  };
}
router.put('/:id/sign', setStatus('موقّع'));
router.put('/:id/decline', setStatus('مرفوض'));

// Delete a request (managers & HR)
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM signatures WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
