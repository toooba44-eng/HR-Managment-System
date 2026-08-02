const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

const MANAGE = ['super_admin', 'admin', 'hr_manager'];

router.use(authenticateToken);

// List announcements (all authenticated users), with each one's read count
// and whether the current employee has read/acknowledged it.
router.get('/', (req, res, next) => {
  try {
    const announcements = db.prepare(`
      SELECT a.*, e.full_name as created_by_name,
             (SELECT COUNT(*) FROM announcement_reads r WHERE r.announcement_id = a.id) as read_count,
             (SELECT COUNT(*) FROM announcement_reads r WHERE r.announcement_id = a.id AND r.employee_id = ?) as read_by_me
      FROM announcements a
      LEFT JOIN employees e ON a.created_by = e.id
      ORDER BY a.is_pinned DESC, a.created_at DESC
    `).all(req.user.employee_id || 0);
    res.json(announcements.map((a) => ({ ...a, read_by_me: !!a.read_by_me })));
  } catch (err) {
    next(err);
  }
});

// Create announcement (platform/HR admins)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { title, body, audience, is_pinned, requires_acknowledgment } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    const result = db.prepare(`
      INSERT INTO announcements (title, body, audience, is_pinned, requires_acknowledgment, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, body, audience || 'الجميع', is_pinned ? 1 : 0, requires_acknowledgment ? 1 : 0, req.user.employee_id || null);

    res.status(201).json({
      message: 'Announcement created',
      announcement: { id: result.lastInsertRowid, title, body, audience: audience || 'الجميع' }
    });
  } catch (err) {
    next(err);
  }
});

// Mark as read/acknowledged by the current employee (idempotent)
router.post('/:id/read', (req, res, next) => {
  try {
    const employee_id = req.user.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    const a = db.prepare('SELECT id FROM announcements WHERE id = ?').get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    db.prepare(`
      INSERT INTO announcement_reads (announcement_id, employee_id) VALUES (?, ?)
      ON CONFLICT(announcement_id, employee_id) DO NOTHING
    `).run(req.params.id, employee_id);
    res.json({ message: 'Acknowledged' });
  } catch (err) {
    next(err);
  }
});

// Who has (and hasn't) read/acknowledged it (HR/admin only)
router.get('/:id/reads', requireRole(...MANAGE), (req, res, next) => {
  try {
    const a = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    const readers = db.prepare(`
      SELECT r.read_at, e.id as employee_id, e.full_name, e.job_title, e.profile_picture
      FROM announcement_reads r
      JOIN employees e ON r.employee_id = e.id
      WHERE r.announcement_id = ?
      ORDER BY r.read_at ASC
    `).all(req.params.id);
    const readIds = new Set(readers.map((r) => r.employee_id));
    const notRead = db.prepare("SELECT id as employee_id, full_name, job_title, profile_picture FROM employees WHERE status = 'نشط'")
      .all()
      .filter((e) => !readIds.has(e.employee_id));
    res.json({ announcement: a, readers, notRead, total: readers.length + notRead.length });
  } catch (err) {
    next(err);
  }
});

// Delete announcement
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
