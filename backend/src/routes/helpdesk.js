const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];
const CATEGORIES = ['استفسار عام', 'رواتب ومزايا', 'إجازات وحضور', 'مشكلة تقنية', 'شكوى', 'أخرى'];
const PRIORITIES = ['منخفضة', 'متوسطة', 'عالية', 'عاجلة'];
const STATUSES = ['مفتوحة', 'قيد المعالجة', 'بانتظار الموظف', 'مغلقة'];

// List tickets: HR/admin see all (optionally filtered), everyone else sees
// only their own tickets.
router.get('/', (req, res, next) => {
  try {
    const { status, category, assigned_to } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (!MANAGE.includes(req.user.role)) {
      where += ' AND t.employee_id = ?';
      params.push(req.user.employee_id);
    } else {
      if (assigned_to) { where += ' AND t.assigned_to = ?'; params.push(assigned_to); }
    }
    if (status) { where += ' AND t.status = ?'; params.push(status); }
    if (category) { where += ' AND t.category = ?'; params.push(category); }

    const rows = db.prepare(`
      SELECT t.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name,
             assignee.full_name as assigned_to_name,
             (SELECT COUNT(*) FROM helpdesk_replies r WHERE r.ticket_id = t.id) as replies_count
      FROM helpdesk_tickets t
      JOIN employees e ON t.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees assignee ON t.assigned_to = assignee.id
      ${where}
      ORDER BY
        CASE t.status WHEN 'مفتوحة' THEN 1 WHEN 'قيد المعالجة' THEN 2 WHEN 'بانتظار الموظف' THEN 3 ELSE 4 END,
        CASE t.priority WHEN 'عاجلة' THEN 1 WHEN 'عالية' THEN 2 WHEN 'متوسطة' THEN 3 ELSE 4 END,
        t.created_at DESC
    `).all(...params);

    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status !== 'مغلقة') s.open += 1;
      if (r.priority === 'عاجلة' && r.status !== 'مغلقة') s.urgent += 1;
      if (!r.assigned_to && r.status !== 'مغلقة') s.unassigned += 1;
      return s;
    }, { total: 0, open: 0, urgent: 0, unassigned: 0 });

    res.json({ tickets: rows, summary, categories: CATEGORIES, priorities: PRIORITIES, statuses: STATUSES });
  } catch (err) { next(err); }
});

// One ticket + its reply thread
router.get('/:id', (req, res, next) => {
  try {
    const t = db.prepare(`
      SELECT t.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name,
             assignee.full_name as assigned_to_name
      FROM helpdesk_tickets t
      JOIN employees e ON t.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees assignee ON t.assigned_to = assignee.id
      WHERE t.id = ?
    `).get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (!MANAGE.includes(req.user.role) && t.employee_id !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const replies = db.prepare(`
      SELECT r.*, a.full_name as author_name, a.profile_picture as author_picture
      FROM helpdesk_replies r
      LEFT JOIN employees a ON r.author_id = a.id
      WHERE r.ticket_id = ?
      ORDER BY r.id ASC
    `).all(req.params.id);
    res.json({ ...t, replies });
  } catch (err) { next(err); }
});

// Raise a new ticket (any authenticated employee)
router.post('/', (req, res, next) => {
  try {
    const empId = req.user.employee_id;
    if (!empId) return res.status(400).json({ error: 'No employee associated with this account' });
    const { category, subject, description, priority } = req.body;
    if (!subject) return res.status(400).json({ error: 'Subject is required' });
    if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

    const r = db.prepare(`
      INSERT INTO helpdesk_tickets (employee_id, category, subject, description, priority)
      VALUES (?, ?, ?, ?, ?)
    `).run(empId, category || 'استفسار عام', subject, description || null, priority || 'متوسطة');
    res.status(201).json({ message: 'Created', ticket: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

// Update status/priority/assignment (HR/admin only)
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const t = db.prepare('SELECT * FROM helpdesk_tickets WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const { status, priority, assigned_to } = req.body;
    if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

    const nextStatus = status || t.status;
    db.prepare(`
      UPDATE helpdesk_tickets SET
        status = ?, priority = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP,
        resolved_at = CASE WHEN ? = 'مغلقة' AND status != 'مغلقة' THEN CURRENT_TIMESTAMP
                           WHEN ? != 'مغلقة' THEN NULL ELSE resolved_at END
      WHERE id = ?
    `).run(
      nextStatus,
      priority || t.priority,
      assigned_to !== undefined ? (assigned_to || null) : t.assigned_to,
      nextStatus, nextStatus,
      req.params.id,
    );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

// Add a reply (ticket owner or HR/admin)
router.post('/:id/replies', (req, res, next) => {
  try {
    const t = db.prepare('SELECT * FROM helpdesk_tickets WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const isOwner = t.employee_id === req.user.employee_id;
    if (!isOwner && !MANAGE.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });

    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Reply text is required' });

    db.prepare('INSERT INTO helpdesk_replies (ticket_id, author_id, body) VALUES (?, ?, ?)')
      .run(req.params.id, req.user.employee_id || null, body);

    // A reply from HR while waiting on them reopens the ticket to "in progress";
    // a reply from the employee while HR was waiting flips it back to "waiting".
    if (MANAGE.includes(req.user.role) && t.status === 'مفتوحة') {
      db.prepare(`UPDATE helpdesk_tickets SET status = 'قيد المعالجة', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);
    } else if (isOwner && t.status === 'بانتظار الموظف') {
      db.prepare(`UPDATE helpdesk_tickets SET status = 'قيد المعالجة', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);
    }

    res.status(201).json({ message: 'Created' });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM helpdesk_tickets WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
