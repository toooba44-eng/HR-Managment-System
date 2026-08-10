const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { notifyEmployee } = require('../utils/notify');
const router = express.Router();

router.use(authenticateToken);

// List requests (role-filtered)
router.get('/', (req, res, next) => {
  try {
    const { type, status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (type) { where += ' AND r.type = ?'; params.push(type); }
    if (status) { where += ' AND r.status = ?'; params.push(status); }

    // Role-based scoping
    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND r.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT r.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name,
             resolver.full_name as resolved_by_name
      FROM requests r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees resolver ON r.resolved_by = resolver.id
      ${where}
      ORDER BY
        CASE r.status WHEN 'معلقة' THEN 1 WHEN 'مقبولة' THEN 2 ELSE 3 END,
        r.created_at DESC
    `).all(...params);

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Request types gated behind an organization-wide feature toggle — filing
// one while the org has disabled the feature would create a request no
// policy actually allows, so it's rejected at submission time instead of
// leaving HR to catch it during review.
const TOGGLE_GATED_TYPES = {
  'عمل إضافي': { column: 'overtime_enabled', label: 'احتساب العمل الإضافي' },
  'عمل عن بعد': { column: 'remote_work_enabled', label: 'العمل عن بُعد' },
};

// Create a request (employees create for themselves)
router.post('/', (req, res, next) => {
  try {
    const { type, subject, details } = req.body;
    let { employee_id } = req.body;

    // Employees can only file for themselves
    if (['employee', 'candidate', 'department_head'].includes(req.user.role) || !employee_id) {
      employee_id = req.user.employee_id;
    }
    if (!employee_id) {
      return res.status(400).json({ error: 'No employee associated with this account' });
    }
    if (!type || !subject) {
      return res.status(400).json({ error: 'Type and subject are required' });
    }

    const gate = TOGGLE_GATED_TYPES[type];
    if (gate) {
      const org = db.prepare(`SELECT ${gate.column} FROM org_settings WHERE id = 1`).get();
      if (org && !org[gate.column]) {
        return res.status(400).json({ error: `ميزة "${gate.label}" غير مفعَّلة حالياً في إعدادات المؤسسة` });
      }
    }

    const result = db.prepare(`
      INSERT INTO requests (employee_id, type, subject, details)
      VALUES (?, ?, ?, ?)
    `).run(employee_id, type, subject, details || null);

    res.status(201).json({
      message: 'Request submitted',
      request: { id: result.lastInsertRowid, employee_id, type, subject, status: 'معلقة' }
    });
  } catch (err) {
    next(err);
  }
});

// Withdraw my own request — only while still pending, so a record a
// manager has already acted on stays in place for the audit trail.
router.delete('/:id', (req, res, next) => {
  try {
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.employee_id !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (request.status !== 'معلقة') {
      return res.status(400).json({ error: 'لا يمكن سحب طلب تم البت فيه' });
    }
    db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
    res.json({ message: 'Request withdrawn' });
  } catch (err) {
    next(err);
  }
});

// Resolve a request (managers / HR)
router.put('/:id/resolve', requireRole('admin', 'hr_manager', 'department_head', 'super_admin'), (req, res, next) => {
  try {
    const { status, response } = req.body;
    if (!['مقبولة', 'مرفوضة', 'مكتملة'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // A department head may only resolve requests within their own
    // department — the list endpoint already scopes this way; enforce it
    // here too so the action can't be reached directly by ID.
    if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      const empDept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(request.employee_id);
      if (!dept || !empDept || dept.department_id !== empDept.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare(`
      UPDATE requests
      SET status = ?, response = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, response || null, req.user.employee_id || null, req.params.id);

    const STATUS_LABEL = { 'مقبولة': 'قبول', 'مرفوضة': 'رفض', 'مكتملة': 'إنجاز' };
    notifyEmployee(request.employee_id, {
      title: `تم ${STATUS_LABEL[status] || 'تحديث'} طلبك: ${request.subject}`,
      message: response || request.type,
      type: status === 'مرفوضة' ? 'error' : 'success',
      link: null,
    });

    res.json({ message: 'Request updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
