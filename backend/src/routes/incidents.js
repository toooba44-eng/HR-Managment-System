const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'hr_manager', 'super_admin'));

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT i.*, e.full_name, reporter.full_name as reported_by_name
      FROM incidents i
      LEFT JOIN employees e ON i.employee_id = e.id
      LEFT JOIN employees reporter ON i.reported_by = reporter.id
      ORDER BY CASE i.status WHEN 'مفتوح' THEN 1 WHEN 'قيد المعالجة' THEN 2 ELSE 3 END,
        CASE i.severity WHEN 'عالية' THEN 1 WHEN 'متوسطة' THEN 2 ELSE 3 END, i.created_at DESC
    `).all();
    const summary = {
      total: rows.length,
      open: rows.filter((r) => r.status !== 'مغلق').length,
      high: rows.filter((r) => r.severity === 'عالية').length,
    };
    res.json({ incidents: rows, summary });
  } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const { title, type, employee_id, location, severity, description, incident_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const r = db.prepare(`INSERT INTO incidents (title, type, employee_id, location, severity, description, incident_date, reported_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(title, type || 'ملاحظة سلامة', employee_id || null, location || null, severity || 'متوسطة', description || null,
        incident_date || new Date().toISOString().split('T')[0], req.user.employee_id || null);
    res.status(201).json({ message: 'Created', incident: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const i = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!i) return res.status(404).json({ error: 'Not found' });
    const { status } = req.body;
    db.prepare('UPDATE incidents SET status = ? WHERE id = ?').run(status || i.status, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try { db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
});

module.exports = router;
