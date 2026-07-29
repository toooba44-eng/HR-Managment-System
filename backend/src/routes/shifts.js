const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// List shifts (role-scoped). Optional ?from&to date range.
router.get('/', (req, res, next) => {
  try {
    const { from, to } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (from) { where += ' AND s.date >= ?'; params.push(from); }
    if (to) { where += ' AND s.date <= ?'; params.push(to); }

    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND s.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT s.*, e.full_name, e.job_title, e.profile_picture
      FROM shifts s
      JOIN employees e ON s.employee_id = e.id
      ${where}
      ORDER BY s.date DESC, e.full_name
    `).all(...params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { employee_id, date, shift_type, start_time, end_time, location, notes } = req.body;
    if (!employee_id || !date) return res.status(400).json({ error: 'Employee and date are required' });
    const r = db.prepare(`INSERT INTO shifts (employee_id, date, shift_type, start_time, end_time, location, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(employee_id, date, shift_type || 'صباحية', start_time || null, end_time || null, location || 'المقر الرئيسي', notes || null, req.user.employee_id || null);
    res.status(201).json({ message: 'Created', shift: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const s = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    const { date, shift_type, start_time, end_time, location, notes } = req.body;
    db.prepare(`UPDATE shifts SET date = ?, shift_type = ?, start_time = ?, end_time = ?, location = ?, notes = ? WHERE id = ?`)
      .run(date ?? s.date, shift_type ?? s.shift_type, start_time ?? s.start_time, end_time ?? s.end_time, location ?? s.location, notes ?? s.notes, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try { db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
});

module.exports = router;
