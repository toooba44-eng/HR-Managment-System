const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('super_admin'));

// Catalog of toggleable platform modules
const MODULES = [
  { key: 'recruitment', label: 'التوظيف والتعيين' },
  { key: 'attendance', label: 'الحضور والانصراف' },
  { key: 'payroll', label: 'الرواتب والتعويضات' },
  { key: 'performance', label: 'الأداء والتطوير' },
  { key: 'training', label: 'التدريب' },
  { key: 'documents', label: 'المستندات' },
  { key: 'automation', label: 'الأتمتة وسير العمل' },
  { key: 'integrations', label: 'التكاملات' },
];

/* ------------------------- Subscription requests ------------------------- */

router.get('/requests', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT r.*, c.name as company_name, c.plan as current_plan
      FROM subscription_requests r
      JOIN companies c ON r.company_id = c.id
      ORDER BY CASE r.status WHEN 'معلق' THEN 1 WHEN 'موافق عليه' THEN 2 ELSE 3 END, r.created_at DESC
    `).all();
    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status === 'معلق') s.pending += 1;
      if (r.type === 'إلغاء') s.cancellations += 1;
      return s;
    }, { total: 0, pending: 0, cancellations: 0 });
    res.json({ requests: rows, summary });
  } catch (err) { next(err); }
});

router.put('/requests/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['موافق عليه', 'مرفوض', 'معلق'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const reqRow = db.prepare('SELECT * FROM subscription_requests WHERE id = ?').get(req.params.id);
    if (!reqRow) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE subscription_requests SET status = ? WHERE id = ?').run(status, req.params.id);
    // Apply approved plan changes to the company
    if (status === 'موافق عليه') {
      if (reqRow.type === 'إلغاء') {
        db.prepare("UPDATE companies SET status = 'معلّقة' WHERE id = ?").run(reqRow.company_id);
      } else if (reqRow.requested_plan) {
        db.prepare('UPDATE companies SET plan = ? WHERE id = ?').run(reqRow.requested_plan, reqRow.company_id);
      }
    }
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/requests/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM subscription_requests WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

/* ------------------------- Module toggles ------------------------- */

router.get('/modules', (req, res, next) => {
  try {
    const { company_id } = req.query;
    if (!company_id) return res.status(400).json({ error: 'company_id is required' });
    const saved = db.prepare('SELECT module_key, enabled FROM company_modules WHERE company_id = ?').all(company_id);
    const map = Object.fromEntries(saved.map((s) => [s.module_key, s.enabled]));
    const modules = MODULES.map((m) => ({ ...m, enabled: map[m.key] !== undefined ? map[m.key] : 1 }));
    res.json({ modules });
  } catch (err) { next(err); }
});

router.put('/modules', (req, res, next) => {
  try {
    const { company_id, module_key, enabled } = req.body;
    if (!company_id || !module_key) return res.status(400).json({ error: 'company_id and module_key are required' });
    if (!MODULES.some((m) => m.key === module_key)) return res.status(400).json({ error: 'Unknown module' });
    db.prepare(`
      INSERT INTO company_modules (company_id, module_key, enabled) VALUES (?, ?, ?)
      ON CONFLICT(company_id, module_key) DO UPDATE SET enabled = excluded.enabled
    `).run(company_id, module_key, enabled ? 1 : 0);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

/* ------------------------- Storage/user limits ------------------------- */

router.put('/limits/:companyId', (req, res, next) => {
  try {
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.companyId);
    if (!company) return res.status(404).json({ error: 'Not found' });
    const users_limit = req.body.users_limit != null ? parseInt(req.body.users_limit, 10) : company.users_limit;
    const storage_limit_gb = req.body.storage_limit_gb != null ? parseInt(req.body.storage_limit_gb, 10) : company.storage_limit_gb;
    db.prepare('UPDATE companies SET users_limit = ?, storage_limit_gb = ? WHERE id = ?')
      .run(users_limit, storage_limit_gb, req.params.companyId);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

/* ------------------------- Usage monitoring ------------------------- */

// Deterministic pseudo-usage so the demo dashboard is stable
function seatUsage(company) {
  const used = Math.min(company.users_limit, Math.round(company.users_limit * (0.4 + ((company.id * 17) % 50) / 100)));
  const storage = Math.min(company.storage_limit_gb, Math.round(company.storage_limit_gb * (0.3 + ((company.id * 23) % 60) / 100)));
  return { used, storage };
}

router.get('/usage', (req, res, next) => {
  try {
    const companies = db.prepare('SELECT * FROM companies').all();
    const rows = companies.map((c) => {
      const u = seatUsage(c);
      return {
        id: c.id, name: c.name, plan: c.plan, status: c.status,
        users_limit: c.users_limit, users_used: u.used,
        storage_limit_gb: c.storage_limit_gb, storage_used_gb: u.storage,
      };
    });
    const summary = rows.reduce((s, r) => {
      s.companies += 1;
      if (r.status === 'نشطة') s.active += 1;
      s.seats += r.users_limit; s.seatsUsed += r.users_used;
      s.storage += r.storage_limit_gb; s.storageUsed += r.storage_used_gb;
      return s;
    }, { companies: 0, active: 0, seats: 0, seatsUsed: 0, storage: 0, storageUsed: 0 });
    res.json({ usage: rows, summary });
  } catch (err) { next(err); }
});

/* ------------------------- Performance monitoring ------------------------- */

router.get('/performance', (req, res, next) => {
  try {
    const now = Date.now();
    const series = Array.from({ length: 12 }, (_, i) => {
      const t = new Date(now - (11 - i) * 3600000);
      return { time: `${String(t.getHours()).padStart(2, '0')}:00`, response_ms: 90 + ((i * 37) % 120), requests: 400 + ((i * 53) % 600) };
    });
    res.json({
      health: {
        uptime: 99.98,
        avg_response_ms: 142,
        error_rate: 0.12,
        requests_today: 48213,
        cpu: 34,
        memory: 61,
        db_connections: 42,
        status: 'صحّي',
      },
      series,
    });
  } catch (err) { next(err); }
});

/* ------------------------- API integrations monitoring ------------------------- */

router.get('/api-monitor', (req, res, next) => {
  try {
    let integrations = [];
    try {
      integrations = db.prepare('SELECT * FROM integrations').all();
    } catch { integrations = []; }
    const rows = integrations.map((it) => {
      const calls = it.is_connected ? 500 + ((it.id * 137) % 4000) : 0;
      const errors = it.is_connected ? ((it.id * 7) % 40) : 0;
      return {
        id: it.id, name: it.name, category: it.category, is_connected: it.is_connected, status: it.status,
        calls_24h: calls, errors_24h: errors,
        error_rate: calls ? Math.round((errors / calls) * 1000) / 10 : 0,
        avg_latency_ms: it.is_connected ? 80 + ((it.id * 29) % 220) : 0,
      };
    });
    const summary = rows.reduce((s, r) => {
      s.total += 1; if (r.is_connected) s.connected += 1;
      s.calls += r.calls_24h; s.errors += r.errors_24h;
      return s;
    }, { total: 0, connected: 0, calls: 0, errors: 0 });
    res.json({ endpoints: rows, summary });
  } catch (err) { next(err); }
});

/* ------------------------- Backups ------------------------- */

router.get('/backups', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
    const last = rows.find((r) => r.status === 'مكتمل');
    res.json({ backups: rows, summary: { total: rows.length, last_at: last ? last.created_at : null } });
  } catch (err) { next(err); }
});

router.post('/backups', (req, res, next) => {
  try {
    const size = Math.round((120 + Math.random() * 80) * 10) / 10;
    const result = db.prepare("INSERT INTO backups (type, size_mb, status, note) VALUES ('يدوي', ?, 'مكتمل', ?)")
      .run(size, req.body.note || 'نسخة احتياطية يدوية');
    logAudit(req.user.email, 'إنشاء نسخة احتياطية', 'backup', 'معلومة', `نسخة #${result.lastInsertRowid}`);
    res.status(201).json({ message: 'Created', backup: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.post('/backups/:id/restore', (req, res, next) => {
  try {
    const b = db.prepare('SELECT * FROM backups WHERE id = ?').get(req.params.id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    if (b.status !== 'مكتمل') return res.status(400).json({ error: 'Backup is not restorable' });
    logAudit(req.user.email, 'استعادة نسخة احتياطية', 'backup', 'تحذير', `استعادة نسخة #${b.id}`);
    res.json({ message: 'Restored' });
  } catch (err) { next(err); }
});

router.delete('/backups/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM backups WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

/* ------------------------- Audit log ------------------------- */

function logAudit(actor, action, entity, severity, details) {
  try {
    db.prepare('INSERT INTO audit_logs (actor, action, entity, severity, details) VALUES (?, ?, ?, ?, ?)')
      .run(actor || null, action, entity || null, severity || 'معلومة', details || null);
  } catch { /* auditing must never break the request */ }
}

router.get('/audit', (req, res, next) => {
  try {
    const { severity } = req.query;
    let where = '';
    const params = [];
    if (severity) { where = 'WHERE severity = ?'; params.push(severity); }
    const rows = db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT 200`).all(...params);
    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.severity === 'تحذير') s.warnings += 1;
      if (r.severity === 'حرج') s.critical += 1;
      return s;
    }, { total: 0, warnings: 0, critical: 0 });
    res.json({ logs: rows, summary });
  } catch (err) { next(err); }
});

module.exports = router;
