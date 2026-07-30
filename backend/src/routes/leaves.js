const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { leaveValidation } = require('../middleware/validation');
const router = express.Router();

router.use(authenticateToken);

// Team leave calendar for a month (leaves overlapping the month)
router.get('/calendar', (req, res, next) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : new Date().toISOString().slice(0, 7);
    const start = `${month}-01`;
    const end = `${month}-31`;

    let where = "WHERE l.status IN ('موافقة', 'معلقة') AND l.start_date <= ? AND l.end_date >= ?";
    const params = [end, start];
    if (['employee', 'candidate', 'department_head'].includes(req.user.role)) {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT l.id, l.employee_id, l.type, l.start_date, l.end_date, l.days_count, l.status,
             e.full_name, e.profile_picture, d.name as department_name, d.color as department_color
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${where}
      ORDER BY l.start_date
    `).all(...params);

    // Per-day concurrent count within the month
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const perDay = Array.from({ length: daysInMonth }, (_, i) => {
      const day = `${month}-${String(i + 1).padStart(2, '0')}`;
      return { day: i + 1, count: rows.filter((r) => r.status === 'موافقة' && r.start_date <= day && r.end_date >= day).length };
    });
    const peak = perDay.reduce((mx, d) => Math.max(mx, d.count), 0);

    res.json({
      month, days_in_month: daysInMonth, leaves: rows, per_day: perDay,
      summary: { people: new Set(rows.map((r) => r.employee_id)).size, total: rows.length, peak },
    });
  } catch (err) {
    next(err);
  }
});

// Get all leaves
router.get('/', (req, res, next) => {
  try {
    const { status, employee_id, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND l.status = ?';
      params.push(status);
    }
    if (employee_id) {
      whereClause += ' AND l.employee_id = ?';
      params.push(employee_id);
    }
    if (type) {
      whereClause += ' AND l.type = ?';
      params.push(type);
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause += ' AND l.employee_id = ?';
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
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      ${whereClause}
    `);
    const { total } = countQuery.get(...params);

    const query = db.prepare(`
      SELECT l.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name,
             approver.full_name as approved_by_name
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees approver ON l.approved_by = approver.id
      ${whereClause}
      ORDER BY 
        CASE l.status 
          WHEN 'معلقة' THEN 1 
          WHEN 'موافقة' THEN 2 
          ELSE 3 
        END,
        l.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const leaves = query.all(...params, parseInt(limit), parseInt(offset));

    res.json({
      leaves,
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

// Create leave request
router.post('/', leaveValidation.create, (req, res, next) => {
  try {
    const { employee_id, type, start_date, end_date, reason, attachments } = req.body;

    // Check if employee can only request for themselves
    if (req.user.role === 'employee' && parseInt(employee_id) !== req.user.employee_id) {
      return res.status(403).json({ error: 'You can only request leave for yourself' });
    }

    // Calculate days
    const start = new Date(start_date);
    const end = new Date(end_date);
    const daysCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance
    const employee = db.prepare('SELECT annual_leave_balance, sick_leave_balance, emergency_leave_balance FROM employees WHERE id = ?').get(employee_id);

    if (type === 'سنوية' && employee.annual_leave_balance < daysCount) {
      return res.status(400).json({ error: 'Insufficient annual leave balance' });
    }
    if (type === 'مرضية' && employee.sick_leave_balance < daysCount) {
      return res.status(400).json({ error: 'Insufficient sick leave balance' });
    }
    if (type === 'طارئة' && employee.emergency_leave_balance < daysCount) {
      return res.status(400).json({ error: 'Insufficient emergency leave balance' });
    }

    const result = db.prepare(`
      INSERT INTO leaves (employee_id, type, start_date, end_date, days_count, reason, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(employee_id, type, start_date, end_date, daysCount, reason, attachments);

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leave: { id: result.lastInsertRowid, ...req.body, days_count: daysCount, status: 'معلقة' }
    });
  } catch (err) {
    next(err);
  }
});

// Approve/Reject leave
router.put('/:id/approve', requireRole('admin', 'hr_manager', 'department_head'), leaveValidation.approve, (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leave.status !== 'معلقة') {
      return res.status(400).json({ error: 'Leave request has already been processed' });
    }

    db.prepare(`
      UPDATE leaves 
      SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, req.user.employee_id, id);

    // Deduct leave balance if approved
    if (status === 'موافقة') {
      const balanceField = {
        'سنوية': 'annual_leave_balance',
        'مرضية': 'sick_leave_balance',
        'طارئة': 'emergency_leave_balance'
      }[leave.type];

      if (balanceField) {
        db.prepare(`
          UPDATE employees 
          SET ${balanceField} = ${balanceField} - ?
          WHERE id = ?
        `).run(leave.days_count, leave.employee_id);
      }
    }

    res.json({ message: `Leave request ${status === 'موافقة' ? 'approved' : 'rejected'} successfully` });
  } catch (err) {
    next(err);
  }
});

// Cancel leave request
router.put('/:id/cancel', (req, res, next) => {
  try {
    const { id } = req.params;

    const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (req.user.role === 'employee' && leave.employee_id !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (leave.status === 'موافقة') {
      // Restore balance
      const balanceField = {
        'سنوية': 'annual_leave_balance',
        'مرضية': 'sick_leave_balance',
        'طارئة': 'emergency_leave_balance'
      }[leave.type];

      if (balanceField) {
        db.prepare(`
          UPDATE employees 
          SET ${balanceField} = ${balanceField} + ?
          WHERE id = ?
        `).run(leave.days_count, leave.employee_id);
      }
    }

    db.prepare("UPDATE leaves SET status = 'ملغاة' WHERE id = ?").run(id);
    res.json({ message: 'Leave request cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

// Get leave balance
router.get('/balance/:employee_id', (req, res, next) => {
  try {
    const { employee_id } = req.params;

    if (req.user.role === 'employee' && parseInt(employee_id) !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const balance = db.prepare(`
      SELECT 
        annual_leave_balance,
        sick_leave_balance,
        emergency_leave_balance,
        (SELECT SUM(days_count) FROM leaves WHERE employee_id = ? AND type = 'سنوية' AND status = 'موافقة' AND start_date >= date('now', '-1 year')) as used_annual,
        (SELECT SUM(days_count) FROM leaves WHERE employee_id = ? AND type = 'مرضية' AND status = 'موافقة' AND start_date >= date('now', '-1 year')) as used_sick
      FROM employees
      WHERE id = ?
    `).get(employee_id, employee_id, employee_id);

    res.json(balance);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
