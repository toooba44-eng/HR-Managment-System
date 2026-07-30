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

module.exports = router;
