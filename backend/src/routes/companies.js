const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// Platform-level tenant management — Super Admin only.
router.use(authenticateToken);
router.use(requireRole('super_admin'));

router.get('/', (req, res, next) => {
  try {
    const companies = db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all();

    // Simple plan distribution summary
    const byPlan = {};
    for (const c of companies) byPlan[c.plan] = (byPlan[c.plan] || 0) + 1;

    res.json({
      companies,
      summary: {
        total: companies.length,
        active: companies.filter((c) => c.status === 'نشطة').length,
        suspended: companies.filter((c) => c.status === 'معلّقة').length,
        byPlan,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { name, contact_email, plan, users_limit, storage_limit_gb, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db.prepare(`
      INSERT INTO companies (name, contact_email, plan, users_limit, storage_limit_gb, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, contact_email || null, plan || 'أساسية', users_limit || 25, storage_limit_gb || 10, status || 'نشطة');
    res.status(201).json({ message: 'Company created', company: { id: result.lastInsertRowid, name } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const { name, contact_email, plan, users_limit, storage_limit_gb, status } = req.body;
    db.prepare(`
      UPDATE companies SET name = ?, contact_email = ?, plan = ?, users_limit = ?, storage_limit_gb = ?, status = ?
      WHERE id = ?
    `).run(name, contact_email, plan, users_limit, storage_limit_gb, status, req.params.id);
    res.json({ message: 'Company updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    res.json({ message: 'Company deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
