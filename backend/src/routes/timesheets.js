const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// List timesheets (role-scoped) with an hours summary
router.get('/', (req, res, next) => {
  try {
    const { status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND t.status = ?'; params.push(status); }

    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND t.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT t.*, e.full_name, e.job_title, e.profile_picture, approver.full_name as approved_by_name
      FROM timesheets t
      JOIN employees e ON t.employee_id = e.id
      LEFT JOIN employees approver ON t.approved_by = approver.id
      ${where}
      ORDER BY
        CASE t.status WHEN 'مقدّم' THEN 1 WHEN 'مسودة' THEN 2 WHEN 'معتمد' THEN 3 ELSE 4 END,
        t.date DESC
    `).all(...params);

    const summary = rows.reduce((s, r) => {
      s.totalHours += r.hours;
      if (r.status === 'معتمد') s.approvedHours += r.hours;
      if (r.status === 'مقدّم') s.pending += 1;
      return s;
    }, { totalHours: 0, approvedHours: 0, pending: 0, count: rows.length });

    res.json({ timesheets: rows, summary });
  } catch (err) { next(err); }
});

// Log time (for self)
router.post('/', (req, res, next) => {
  try {
    const { date, project, task, hours } = req.body;
    const employee_id = req.user.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    if (!date || !project || !hours) return res.status(400).json({ error: 'Date, project and hours are required' });
    const r = db.prepare(`INSERT INTO timesheets (employee_id, date, project, task, hours) VALUES (?, ?, ?, ?, ?)`)
      .run(employee_id, date, project, task || null, hours);
    res.status(201).json({ message: 'Logged', timesheet: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

// Submit own draft
router.put('/:id/submit', (req, res, next) => {
  try {
    const t = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (t.employee_id !== req.user.employee_id) return res.status(403).json({ error: 'Access denied' });
    db.prepare("UPDATE timesheets SET status = 'مقدّم' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Submitted' });
  } catch (err) { next(err); }
});

// Approve / reject (managers & HR)
router.put('/:id/review', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['معتمد', 'مرفوض'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const t = db.prepare('SELECT id FROM timesheets WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE timesheets SET status = ?, approved_by = ? WHERE id = ?').run(status, req.user.employee_id || null, req.params.id);
    res.json({ message: 'Reviewed' });
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const t = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (t.employee_id !== req.user.employee_id && !MANAGE.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    db.prepare('DELETE FROM timesheets WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
