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

// Each category's "sync" checks something real in the system instead of
// just bumping a timestamp — it's a status snapshot, not a call to an
// actual external provider (none is configured), but the numbers it
// reports are genuine counts from the database at sync time.
function runCategorySync(category) {
  switch (category) {
    case 'تواصل': {
      const n = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE created_at >= datetime('now', '-1 day')`).get().c;
      return { item_count: n, summary: `${n} إشعاراً أُرسل خلال آخر 24 ساعة` };
    }
    case 'تخزين': {
      const n = db.prepare('SELECT COUNT(*) as c FROM documents').get().c;
      return { item_count: n, summary: `${n} مستنداً مخزَّناً` };
    }
    case 'محاسبة': {
      const n = db.prepare(`SELECT COUNT(*) as c FROM payroll_runs WHERE status IN ('معتمد', 'مصروف')`).get().c;
      return { item_count: n, summary: `${n} مسير رواتب معتمداً جاهزاً للتصدير المحاسبي` };
    }
    case 'توظيف': {
      const jobs = db.prepare(`SELECT COUNT(*) as c FROM jobs WHERE status = 'مفتوحة'`).get().c;
      const apps = db.prepare('SELECT COUNT(*) as c FROM applications').get().c;
      return { item_count: jobs + apps, summary: `${jobs} وظيفة مفتوحة و${apps} طلب توظيف` };
    }
    case 'تقويم': {
      const n = db.prepare(`SELECT COUNT(*) as c FROM leaves WHERE status = 'موافقة' AND start_date BETWEEN date('now') AND date('now', '+7 days')`).get().c;
      return { item_count: n, summary: `${n} إجازة معتمدة خلال الأسبوع القادم` };
    }
    case 'مصادقة': {
      const n = db.prepare('SELECT COUNT(*) as c FROM users WHERE two_factor_enabled = 1').get().c;
      return { item_count: n, summary: `${n} مستخدماً مفعَّلاً لديه التحقق بخطوتين` };
    }
    default:
      return { item_count: 0, summary: 'لا توجد بيانات مرتبطة بهذه الفئة للمزامنة' };
  }
}

// Trigger a sync (managers & HR)
router.post('/:id/sync', requireRole(...MANAGE), (req, res, next) => {
  try {
    const integration = db.prepare('SELECT * FROM integrations WHERE id = ?').get(req.params.id);
    if (!integration) return res.status(404).json({ error: 'Not found' });
    if (!integration.is_connected) return res.status(400).json({ error: 'Integration is not connected' });

    const result = runCategorySync(integration.category);
    const now = new Date().toISOString();
    db.prepare('UPDATE integrations SET last_sync = ?, status = ?, last_sync_summary = ? WHERE id = ?')
      .run(now, 'متصل', result.summary, req.params.id);
    db.prepare(`
      INSERT INTO integration_syncs (integration_id, status, summary, item_count)
      VALUES (?, 'نجاح', ?, ?)
    `).run(req.params.id, result.summary, result.item_count);

    res.json({ message: 'Synced', last_sync: now, ...result });
  } catch (err) {
    next(err);
  }
});

// Sync history for one integration (last 20 runs)
router.get('/:id/syncs', requireRole(...MANAGE), (req, res, next) => {
  try {
    const integration = db.prepare('SELECT id FROM integrations WHERE id = ?').get(req.params.id);
    if (!integration) return res.status(404).json({ error: 'Not found' });
    const rows = db.prepare('SELECT * FROM integration_syncs WHERE integration_id = ? ORDER BY id DESC LIMIT 20').all(req.params.id);
    res.json({ syncs: rows });
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
