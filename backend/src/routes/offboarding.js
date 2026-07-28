const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'hr_manager', 'super_admin'));

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT o.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name
      FROM offboarding o
      JOIN employees e ON o.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY CASE o.status WHEN 'قيد المعالجة' THEN 1 WHEN 'مكتملة' THEN 2 ELSE 3 END, o.created_at DESC
    `).all();
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const { employee_id, type, reason, last_working_day, notes } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'Employee is required' });
    const r = db.prepare(`INSERT INTO offboarding (employee_id, type, reason, last_working_day, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(employee_id, type || 'استقالة', reason || null, last_working_day || null, notes || null, req.user.employee_id || null);
    res.status(201).json({ message: 'Created', offboarding: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const o = db.prepare('SELECT * FROM offboarding WHERE id = ?').get(req.params.id);
    if (!o) return res.status(404).json({ error: 'Not found' });
    const { status, notes } = req.body;
    db.prepare('UPDATE offboarding SET status = ?, notes = ? WHERE id = ?')
      .run(status || o.status, notes ?? o.notes, req.params.id);
    // Reflect completed offboarding on the employee status
    if (status === 'مكتملة') {
      const map = { استقالة: 'مستقيل', فصل: 'مفصول', 'انتهاء عقد': 'مستقيل', تقاعد: 'مستقيل' };
      db.prepare('UPDATE employees SET status = ? WHERE id = ?').run(map[o.type] || 'مستقيل', o.employee_id);
    }
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try { db.prepare('DELETE FROM offboarding WHERE id = ?').run(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
});

module.exports = router;
