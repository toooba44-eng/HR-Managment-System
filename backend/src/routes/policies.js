const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['super_admin', 'admin', 'hr_manager'];

// List policies (all authenticated users)
router.get('/', (req, res, next) => {
  try {
    const policies = db.prepare(`
      SELECT p.*, e.full_name as created_by_name
      FROM policies p
      LEFT JOIN employees e ON p.created_by = e.id
      ORDER BY p.category, p.title
    `).all();
    res.json(policies);
  } catch (err) {
    next(err);
  }
});

// Create policy
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { title, category, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    const result = db.prepare(`
      INSERT INTO policies (title, category, body, created_by) VALUES (?, ?, ?, ?)
    `).run(title, category || 'عام', body, req.user.employee_id || null);
    res.status(201).json({ message: 'Policy created', policy: { id: result.lastInsertRowid, title, category, body } });
  } catch (err) {
    next(err);
  }
});

// Update policy
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { title, category, body } = req.body;
    db.prepare(`
      UPDATE policies SET title = ?, category = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(title, category || 'عام', body, req.params.id);
    res.json({ message: 'Policy updated' });
  } catch (err) {
    next(err);
  }
});

// Delete policy
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    db.prepare('DELETE FROM policies WHERE id = ?').run(req.params.id);
    res.json({ message: 'Policy deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
