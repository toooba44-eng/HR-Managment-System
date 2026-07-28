const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'hr_manager', 'super_admin'));

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT g.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name
      FROM grievances g
      JOIN employees e ON g.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY CASE g.status WHEN 'مفتوحة' THEN 1 WHEN 'قيد المعالجة' THEN 2 ELSE 3 END,
        CASE g.severity WHEN 'عالية' THEN 1 WHEN 'متوسطة' THEN 2 ELSE 3 END, g.created_at DESC
    `).all();
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const { employee_id, type, category, description, severity } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'Employee is required' });
    const r = db.prepare(`INSERT INTO grievances (employee_id, type, category, description, severity, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(employee_id, type || 'شكوى', category || 'أخرى', description || null, severity || 'متوسطة', req.user.employee_id || null);
    res.status(201).json({ message: 'Created', grievance: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    const { status, action } = req.body;
    db.prepare('UPDATE grievances SET status = ?, action = ? WHERE id = ?').run(status || g.status, action ?? g.action, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try { db.prepare('DELETE FROM grievances WHERE id = ?').run(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
});

module.exports = router;
