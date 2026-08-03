const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// Employee self-view: basic status of my own cases (filed complaints or
// disciplinary matters concerning me) — registered before the HR/admin
// gate below so it stays open to anyone. Deliberately excludes the
// confidential investigation notes and severity assessment, exposing only
// what's needed to track progress: type, category, status, and the final
// action once resolved.
router.get('/mine', (req, res, next) => {
  try {
    if (!req.user.employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    const rows = db.prepare(`
      SELECT id, type, category, status, action, created_at
      FROM grievances
      WHERE employee_id = ?
      ORDER BY created_at DESC
    `).all(req.user.employee_id);
    res.json(rows);
  } catch (err) { next(err); }
});

const isHR = (role) => ['admin', 'hr_manager', 'super_admin'].includes(role);

// Self-service filing: any employee can report a complaint concerning
// themselves. HR/admin retain the original unrestricted form (any employee,
// either type, own severity assessment) for logging disciplinary matters or
// filing on someone else's behalf.
router.post('/', (req, res, next) => {
  try {
    const hr = isHR(req.user.role);
    let { employee_id, type, category, description, severity } = req.body;
    if (!hr) {
      if (!req.user.employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
      employee_id = req.user.employee_id;
      type = 'شكوى';
      severity = 'متوسطة';
    }
    if (!employee_id) return res.status(400).json({ error: 'Employee is required' });
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    const r = db.prepare(`INSERT INTO grievances (employee_id, type, category, description, severity, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(employee_id, type || 'شكوى', category || 'أخرى', description || null, severity || 'متوسطة', req.user.employee_id || null);
    res.status(201).json({ message: 'Created', grievance: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

// Withdraw: the employee who filed a still-open complaint can retract it;
// HR/admin can remove any record at any time.
router.delete('/:id', (req, res, next) => {
  try {
    const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    if (!isHR(req.user.role)) {
      if (g.employee_id !== req.user.employee_id) return res.status(403).json({ error: 'Access denied' });
      if (g.status !== 'مفتوحة') return res.status(400).json({ error: 'لا يمكن سحب الشكوى بعد بدء معالجتها' });
    }
    db.prepare('DELETE FROM grievances WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

router.use(requireRole('admin', 'hr_manager', 'super_admin'));

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT g.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name,
             assignee.full_name as assigned_to_name,
             (SELECT COUNT(*) FROM grievance_notes n WHERE n.grievance_id = g.id) as notes_count
      FROM grievances g
      JOIN employees e ON g.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees assignee ON g.assigned_to = assignee.id
      ORDER BY CASE g.status WHEN 'مفتوحة' THEN 1 WHEN 'قيد المعالجة' THEN 2 ELSE 3 END,
        CASE g.severity WHEN 'عالية' THEN 1 WHEN 'متوسطة' THEN 2 ELSE 3 END, g.created_at DESC
    `).all();
    res.json(rows);
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    const { status, action, assigned_to, severity } = req.body;
    db.prepare('UPDATE grievances SET status = ?, action = ?, assigned_to = ?, severity = ? WHERE id = ?')
      .run(status || g.status, action ?? g.action, assigned_to !== undefined ? (assigned_to || null) : g.assigned_to, severity || g.severity, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

// Confidential investigation timeline — HR/admin only, never exposed to the
// employee the case is about.
router.get('/:id/notes', (req, res, next) => {
  try {
    const g = db.prepare('SELECT id FROM grievances WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    const rows = db.prepare(`
      SELECT n.*, a.full_name as author_name, a.profile_picture as author_picture
      FROM grievance_notes n
      LEFT JOIN employees a ON n.author_id = a.id
      WHERE n.grievance_id = ?
      ORDER BY n.created_at ASC
    `).all(req.params.id);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:id/notes', (req, res, next) => {
  try {
    const g = db.prepare('SELECT id FROM grievances WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    const note = (req.body.note || '').trim();
    if (!note) return res.status(400).json({ error: 'Note is required' });
    db.prepare('INSERT INTO grievance_notes (grievance_id, author_id, note) VALUES (?, ?, ?)')
      .run(req.params.id, req.user.employee_id || null, note);
    res.status(201).json({ message: 'Created' });
  } catch (err) { next(err); }
});

module.exports = router;
