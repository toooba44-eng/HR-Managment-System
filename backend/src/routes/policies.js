const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['super_admin', 'admin', 'hr_manager'];

// List policies (all authenticated users), with each one's acknowledgment
// count and whether the current employee has acknowledged it.
router.get('/', (req, res, next) => {
  try {
    const policies = db.prepare(`
      SELECT p.*, e.full_name as created_by_name,
             (SELECT COUNT(*) FROM policy_acknowledgments a WHERE a.policy_id = p.id) as ack_count,
             (SELECT COUNT(*) FROM policy_acknowledgments a WHERE a.policy_id = p.id AND a.employee_id = ?) as acked_by_me
      FROM policies p
      LEFT JOIN employees e ON p.created_by = e.id
      ORDER BY p.category, p.title
    `).all(req.user.employee_id || 0);
    res.json(policies.map((p) => ({ ...p, acked_by_me: !!p.acked_by_me })));
  } catch (err) {
    next(err);
  }
});

// Acknowledge a policy (idempotent — any authenticated employee)
router.post('/:id/acknowledge', (req, res, next) => {
  try {
    const employee_id = req.user.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    const p = db.prepare('SELECT id FROM policies WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    db.prepare(`
      INSERT INTO policy_acknowledgments (policy_id, employee_id) VALUES (?, ?)
      ON CONFLICT(policy_id, employee_id) DO NOTHING
    `).run(req.params.id, employee_id);
    res.json({ message: 'Acknowledged' });
  } catch (err) {
    next(err);
  }
});

// Who has (and hasn't) acknowledged it (HR/admin only)
router.get('/:id/acknowledgments', requireRole(...MANAGE), (req, res, next) => {
  try {
    const p = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const ackers = db.prepare(`
      SELECT a.acknowledged_at, e.id as employee_id, e.full_name, e.job_title, e.profile_picture
      FROM policy_acknowledgments a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.policy_id = ?
      ORDER BY a.acknowledged_at ASC
    `).all(req.params.id);
    const ackedIds = new Set(ackers.map((a) => a.employee_id));
    const notAcked = db.prepare("SELECT id as employee_id, full_name, job_title, profile_picture FROM employees WHERE status = 'نشط'")
      .all()
      .filter((e) => !ackedIds.has(e.employee_id));
    res.json({ policy: p, ackers, notAcked, total: ackers.length + notAcked.length });
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
