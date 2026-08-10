const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { attendanceValidation } = require('../middleware/validation');
const router = express.Router();

router.use(authenticateToken);

// Get attendance records
router.get('/', (req, res, next) => {
  try {
    const { date, employee_id, department_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (date) {
      whereClause += ' AND a.date = ?';
      params.push(date);
    }
    if (employee_id) {
      whereClause += ' AND a.employee_id = ?';
      params.push(employee_id);
    }
    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }
    if (department_id) {
      whereClause += ' AND e.department_id = ?';
      params.push(department_id);
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause += ' AND a.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) {
        whereClause += ' AND e.department_id = ?';
        params.push(dept.department_id);
      }
    }

    const countQuery = db.prepare(`
      SELECT COUNT(*) as total 
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      ${whereClause}
    `);
    const { total } = countQuery.get(...params);

    const query = db.prepare(`
      SELECT a.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY a.date DESC, a.check_in DESC
      LIMIT ? OFFSET ?
    `);

    const records = query.all(...params, parseInt(limit), parseInt(offset));

    // Calculate summary for today
    const today = new Date().toISOString().split('T')[0];
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'حاضر' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'غائب' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'تأخر' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'عمل عن بعد' THEN 1 ELSE 0 END) as remote,
        AVG(work_hours) as avg_hours
      FROM attendance
      WHERE date = ?
    `).get(today);

    res.json({
      records,
      summary,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Check-in — first entry of the day creates the record; re-entering later
// the same day (after a check-out) reopens a new session on the same row
// instead of being blocked, so a lunch break or errand doesn't cost the
// employee their ability to keep logging hours until midnight.
router.post('/checkin', attendanceValidation.checkIn, (req, res, next) => {
  try {
    const { employee_id, location } = req.body;
    if (parseInt(employee_id, 10) !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee_id, today);

    if (existing && !existing.check_out) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    if (existing) {
      // Re-entry: keep the day's original check_in and accumulated
      // work_hours, just open a new active session.
      db.prepare(`
        UPDATE attendance SET check_out = NULL, session_start = ?, check_in_location = ?
        WHERE id = ?
      `).run(now, location, existing.id);
      return res.status(201).json({
        message: 'Checked in successfully',
        attendance: { ...existing, check_out: null, session_start: now }
      });
    }

    const result = db.prepare(`
      INSERT INTO attendance (employee_id, date, check_in, session_start, check_in_location, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employee_id, today, now, now, location, 'حاضر');

    res.status(201).json({
      message: 'Checked in successfully',
      attendance: { id: result.lastInsertRowid, employee_id, date: today, check_in: now, session_start: now }
    });
  } catch (err) {
    next(err);
  }
});

// Check-out — closes the currently active session and adds its duration to
// the day's running total, so multiple check-in/check-out cycles before
// midnight accumulate into one daily work_hours figure instead of only the
// last session counting.
router.post('/checkout', attendanceValidation.checkOut, (req, res, next) => {
  try {
    const { employee_id } = req.body;
    if (parseInt(employee_id, 10) !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const record = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee_id, today);
    if (!record) {
      return res.status(400).json({ error: 'No check-in record found for today' });
    }
    if (record.check_out) {
      return res.status(400).json({ error: 'Already checked out today' });
    }

    // Fall back to check_in for records created before session_start existed.
    const sessionStart = new Date(record.session_start || record.check_in);
    const checkOut = new Date(now);
    const sessionHours = (checkOut - sessionStart) / (1000 * 60 * 60);
    const workHours = Math.round(((record.work_hours || 0) + sessionHours) * 100) / 100;

    let status = record.status;
    if (workHours < 4) status = 'غائب';
    else if (workHours < 8) status = 'تأخر';
    else status = 'حاضر';

    db.prepare(`
      UPDATE attendance
      SET check_out = ?, work_hours = ?, status = ?, session_start = NULL
      WHERE id = ?
    `).run(now, workHours, status, record.id);

    res.json({
      message: 'Checked out successfully',
      attendance: { ...record, check_out: now, work_hours: workHours, status, session_start: null }
    });
  } catch (err) {
    next(err);
  }
});

// Get my attendance
router.get('/my/:employee_id', (req, res, next) => {
  try {
    const { employee_id } = req.params;

    if (['employee', 'candidate'].includes(req.user.role) && parseInt(employee_id) !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'department_head' && parseInt(employee_id) !== req.user.employee_id) {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      const target = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(employee_id);
      if (!dept || !target || dept.department_id !== target.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const records = db.prepare(`
      SELECT * FROM attendance 
      WHERE employee_id = ? 
      ORDER BY date DESC 
      LIMIT 30
    `).all(employee_id);

    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Get attendance report
router.get('/report/summary', requireRole('admin', 'hr_manager', 'department_head'), (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    let { department_id } = req.query;

    let whereClause = 'WHERE a.date BETWEEN ? AND ?';
    const params = [start_date, end_date];

    if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      department_id = dept ? dept.department_id : -1;
    }
    if (department_id) {
      whereClause += ' AND e.department_id = ?';
      params.push(department_id);
    }

    const report = db.prepare(`
      SELECT 
        e.full_name,
        e.job_title,
        d.name as department_name,
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'حاضر' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'غائب' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status = 'تأخر' THEN 1 ELSE 0 END) as late_days,
        ROUND(AVG(a.work_hours), 2) as avg_hours,
        ROUND(SUM(a.work_hours), 2) as total_hours
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      GROUP BY e.id
      ORDER BY total_days DESC
    `).all(...params);

    res.json(report);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
