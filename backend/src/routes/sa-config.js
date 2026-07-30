const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('super_admin'));

/* ------------------------- Support tickets ------------------------- */

router.get('/support', (req, res, next) => {
  try {
    const { status } = req.query;
    let where = '';
    const params = [];
    if (status) { where = 'WHERE t.status = ?'; params.push(status); }
    const rows = db.prepare(`
      SELECT t.*, c.name as company_name
      FROM support_tickets t
      LEFT JOIN companies c ON t.company_id = c.id
      ${where}
      ORDER BY
        CASE t.status WHEN 'مفتوحة' THEN 1 WHEN 'قيد المعالجة' THEN 2 ELSE 3 END,
        CASE t.priority WHEN 'حرجة' THEN 1 WHEN 'عالية' THEN 2 WHEN 'متوسطة' THEN 3 ELSE 4 END,
        t.created_at DESC
    `).all(...params);
    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status === 'مفتوحة') s.open += 1;
      if (r.status === 'قيد المعالجة') s.inProgress += 1;
      return s;
    }, { total: 0, open: 0, inProgress: 0 });
    res.json({ tickets: rows, summary });
  } catch (err) { next(err); }
});

router.post('/support', (req, res, next) => {
  try {
    const { company_id, subject, category, priority, description } = req.body;
    if (!subject) return res.status(400).json({ error: 'Subject is required' });
    const result = db.prepare(`
      INSERT INTO support_tickets (company_id, subject, category, priority, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(company_id || null, subject, category || 'عام', priority || 'متوسطة', description || null);
    res.status(201).json({ message: 'Created', ticket: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/support/:id', (req, res, next) => {
  try {
    const t = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    if (b.status && !['مفتوحة', 'قيد المعالجة', 'مغلقة'].includes(b.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare('UPDATE support_tickets SET status = ?, response = ? WHERE id = ?')
      .run(b.status ?? t.status, b.response !== undefined ? b.response : t.response, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/support/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM support_tickets WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

/* ------------------------- Platform settings ------------------------- */

const TEXT_FIELDS = ['platform_name', 'support_email', 'default_plan'];
const INT_FIELDS = ['session_timeout_min', 'max_upload_mb'];
const BOOL_FIELDS = ['maintenance_mode', 'signups_enabled'];

function getSettings() {
  let s = db.prepare('SELECT * FROM platform_settings WHERE id = 1').get();
  if (!s) {
    db.prepare('INSERT INTO platform_settings (id) VALUES (1)').run();
    s = db.prepare('SELECT * FROM platform_settings WHERE id = 1').get();
  }
  return s;
}

router.get('/settings', (req, res, next) => {
  try {
    res.json({ settings: getSettings() });
  } catch (err) { next(err); }
});

router.put('/settings', (req, res, next) => {
  try {
    getSettings();
    const updates = [];
    const params = [];
    for (const f of TEXT_FIELDS) if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
    for (const f of INT_FIELDS) if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(parseInt(req.body[f], 10) || 0); }
    for (const f of BOOL_FIELDS) if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f] ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    db.prepare(`UPDATE platform_settings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run(...params);
    res.json({ message: 'Updated', settings: getSettings() });
  } catch (err) { next(err); }
});

module.exports = router;
