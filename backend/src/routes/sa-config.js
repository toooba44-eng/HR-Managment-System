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

/* ------------------------- Localization ------------------------- */

router.get('/locales', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM platform_locales ORDER BY type ASC, is_default DESC, name ASC').all();
    const grouped = { دولة: [], عملة: [], لغة: [] };
    for (const r of rows) { (grouped[r.type] = grouped[r.type] || []).push(r); }
    res.json({ locales: rows, grouped });
  } catch (err) { next(err); }
});

router.post('/locales', (req, res, next) => {
  try {
    const { type, name, code } = req.body;
    if (!['دولة', 'عملة', 'لغة'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db.prepare('INSERT INTO platform_locales (type, name, code) VALUES (?, ?, ?)').run(type, name, code || null);
    res.status(201).json({ message: 'Created', locale: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/locales/:id', (req, res, next) => {
  try {
    const loc = db.prepare('SELECT * FROM platform_locales WHERE id = ?').get(req.params.id);
    if (!loc) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    if (b.is_default) {
      // Only one default per type
      db.prepare('UPDATE platform_locales SET is_default = 0 WHERE type = ?').run(loc.type);
    }
    db.prepare('UPDATE platform_locales SET name = ?, code = ?, is_default = ?, enabled = ? WHERE id = ?')
      .run(
        b.name ?? loc.name,
        b.code !== undefined ? b.code : loc.code,
        b.is_default !== undefined ? (b.is_default ? 1 : 0) : loc.is_default,
        b.enabled !== undefined ? (b.enabled ? 1 : 0) : loc.enabled,
        req.params.id,
      );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/locales/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM platform_locales WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

/* ------------------------- System templates ------------------------- */

router.get('/templates', (req, res, next) => {
  try {
    const { type } = req.query;
    let where = '';
    const params = [];
    if (type) { where = 'WHERE type = ?'; params.push(type); }
    const rows = db.prepare(`SELECT * FROM system_templates ${where} ORDER BY type ASC, name ASC`).all(...params);
    res.json({ templates: rows });
  } catch (err) { next(err); }
});

router.post('/templates', (req, res, next) => {
  try {
    const { name, type, subject, body } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db.prepare('INSERT INTO system_templates (name, type, subject, body) VALUES (?, ?, ?, ?)')
      .run(name, type || 'بريد', subject || null, body || null);
    res.status(201).json({ message: 'Created', template: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/templates/:id', (req, res, next) => {
  try {
    const t = db.prepare('SELECT * FROM system_templates WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare('UPDATE system_templates SET name = ?, type = ?, subject = ?, body = ?, enabled = ? WHERE id = ?')
      .run(
        b.name ?? t.name, b.type ?? t.type,
        b.subject !== undefined ? b.subject : t.subject,
        b.body !== undefined ? b.body : t.body,
        b.enabled !== undefined ? (b.enabled ? 1 : 0) : t.enabled,
        req.params.id,
      );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/templates/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM system_templates WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

/* ------------------------- AI settings ------------------------- */

const AI_TEXT = ['provider', 'model'];
const AI_INT = ['monthly_token_limit'];
const AI_BOOL = ['enabled', 'resume_screening', 'chatbot', 'insights', 'auto_summaries'];

function getAi() {
  let s = db.prepare('SELECT * FROM ai_settings WHERE id = 1').get();
  if (!s) {
    db.prepare('INSERT INTO ai_settings (id) VALUES (1)').run();
    s = db.prepare('SELECT * FROM ai_settings WHERE id = 1').get();
  }
  return s;
}

router.get('/ai', (req, res, next) => {
  try {
    res.json({ ai: getAi() });
  } catch (err) { next(err); }
});

router.put('/ai', (req, res, next) => {
  try {
    getAi();
    const updates = [];
    const params = [];
    for (const f of AI_TEXT) if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
    for (const f of AI_INT) if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(parseInt(req.body[f], 10) || 0); }
    for (const f of AI_BOOL) if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f] ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    db.prepare(`UPDATE ai_settings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run(...params);
    res.json({ message: 'Updated', ai: getAi() });
  } catch (err) { next(err); }
});

module.exports = router;
