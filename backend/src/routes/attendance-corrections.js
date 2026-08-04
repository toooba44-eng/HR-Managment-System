const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { notifyEmployee } = require('../utils/notify');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// List correction requests (role-scoped) with a summary
router.get('/', (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND c.status = ?'; params.push(req.query.status); }
    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND c.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }
    const rows = db.prepare(`
      SELECT c.*, e.full_name, e.job_title, e.profile_picture, rv.full_name as reviewed_by_name
      FROM attendance_corrections c
      JOIN employees e ON c.employee_id = e.id
      LEFT JOIN employees rv ON c.reviewed_by = rv.id
      ${where}
      ORDER BY CASE c.status WHEN 'معلق' THEN 1 WHEN 'موافق عليه' THEN 2 ELSE 3 END, c.created_at DESC
    `).all(...params);
    const summary = rows.reduce((s, r) => { s.total += 1; if (r.status === 'معلق') s.pending += 1; return s; }, { total: 0, pending: 0 });
    res.json({ corrections: rows, summary });
  } catch (err) { next(err); }
});

// Submit a correction (self)
router.post('/', (req, res, next) => {
  try {
    const employee_id = req.user.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    const { date, requested_check_in, requested_check_out, reason } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!requested_check_in && !requested_check_out) return res.status(400).json({ error: 'At least one time is required' });
    const result = db.prepare(`
      INSERT INTO attendance_corrections (employee_id, date, requested_check_in, requested_check_out, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(employee_id, date, requested_check_in || null, requested_check_out || null, reason || null);
    res.status(201).json({ message: 'Submitted', correction: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

// Review a correction (managers & HR) — approval writes to the attendance record
router.put('/:id/status', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['موافق عليه', 'مرفوض', 'معلق'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const c = db.prepare('SELECT * FROM attendance_corrections WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });

    // A department head may only review corrections within their own
    // department — the list endpoint already scopes this way; enforce it
    // here too so the action can't be reached directly by ID.
    if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      const empDept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(c.employee_id);
      if (!dept || !empDept || dept.department_id !== empDept.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare('UPDATE attendance_corrections SET status = ?, reviewed_by = ? WHERE id = ?')
      .run(status, req.user.employee_id || null, req.params.id);

    if (status === 'موافق عليه') {
      const checkIn = c.requested_check_in ? `${c.date} ${c.requested_check_in}` : null;
      const checkOut = c.requested_check_out ? `${c.date} ${c.requested_check_out}` : null;
      const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(c.employee_id, c.date);
      const finalIn = checkIn || (existing ? existing.check_in : null);
      const finalOut = checkOut || (existing ? existing.check_out : null);
      let hours = existing ? (existing.work_hours || 0) : 0;
      if (finalIn && finalOut) hours = Math.max(0, Math.round(((new Date(finalOut) - new Date(finalIn)) / 3600000) * 10) / 10);
      if (existing) {
        db.prepare('UPDATE attendance SET check_in = ?, check_out = ?, work_hours = ?, status = ? WHERE id = ?')
          .run(finalIn, finalOut, hours, 'حاضر', existing.id);
      } else {
        db.prepare('INSERT INTO attendance (employee_id, date, check_in, check_out, work_hours, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(c.employee_id, c.date, finalIn, finalOut, hours, 'حاضر', 'تصحيح معتمد');
      }
    }

    if (status !== 'معلق') {
      notifyEmployee(c.employee_id, {
        title: status === 'موافق عليه' ? 'تمت الموافقة على تصحيح الحضور' : 'تم رفض تصحيح الحضور',
        message: `${c.date} · ${c.requested_check_in || '—'} إلى ${c.requested_check_out || '—'}`,
        type: status === 'موافق عليه' ? 'success' : 'error',
        link: '/ess/attendance-corrections',
      });
    }

    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

// Delete a request (owner while pending, or managers)
router.delete('/:id', (req, res, next) => {
  try {
    const c = db.prepare('SELECT * FROM attendance_corrections WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const isManager = MANAGE.includes(req.user.role);
    if (!isManager && !(c.employee_id === req.user.employee_id && c.status === 'معلق')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM attendance_corrections WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
