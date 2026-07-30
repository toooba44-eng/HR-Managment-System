const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

// List integrations (management-only) with a summary
router.get('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { category } = req.query;
    let where = '';
    const params = [];
    if (category) { where = 'WHERE category = ?'; params.push(category); }
    const rows = db.prepare(`SELECT * FROM integrations ${where} ORDER BY is_connected DESC, category ASC, name ASC`).all(...params);
    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.is_connected) s.connected += 1;
      if (r.status === 'خطأ') s.errors += 1;
      return s;
    }, { total: 0, connected: 0, errors: 0 });
    res.json({ integrations: rows, summary });
  } catch (err) {
    next(err);
  }
});

// Create a custom integration (managers & HR)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { name, provider, category, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db.prepare(`
      INSERT INTO integrations (name, provider, category, description)
      VALUES (?, ?, ?, ?)
    `).run(name, provider || null, category || 'أخرى', description || null);
    res.status(201).json({ message: 'Created', integration: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Connect / disconnect an integration (managers & HR)
router.put('/:id/connection', requireRole(...MANAGE), (req, res, next) => {
  try {
    const integration = db.prepare('SELECT * FROM integrations WHERE id = ?').get(req.params.id);
    if (!integration) return res.status(404).json({ error: 'Not found' });
    const connect = !!req.body.connect;
    db.prepare('UPDATE integrations SET is_connected = ?, status = ?, last_sync = ? WHERE id = ?')
      .run(connect ? 1 : 0, connect ? 'متصل' : 'غير متصل', connect ? new Date().toISOString() : null, req.params.id);
    res.json({ message: connect ? 'Connected' : 'Disconnected' });
  } catch (err) {
    next(err);
  }
});

// Trigger a sync (managers & HR)
router.post('/:id/sync', requireRole(...MANAGE), (req, res, next) => {
  try {
    const integration = db.prepare('SELECT * FROM integrations WHERE id = ?').get(req.params.id);
    if (!integration) return res.status(404).json({ error: 'Not found' });
    if (!integration.is_connected) return res.status(400).json({ error: 'Integration is not connected' });
    const now = new Date().toISOString();
    db.prepare('UPDATE integrations SET last_sync = ?, status = ? WHERE id = ?').run(now, 'متصل', req.params.id);
    res.json({ message: 'Synced', last_sync: now });
  } catch (err) {
    next(err);
  }
});

// Delete an integration (managers & HR)
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM integrations WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
