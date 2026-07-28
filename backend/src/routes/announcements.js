const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// List announcements (all authenticated users)
router.get('/', (req, res, next) => {
  try {
    const announcements = db.prepare(`
      SELECT a.*, e.full_name as created_by_name
      FROM announcements a
      LEFT JOIN employees e ON a.created_by = e.id
      ORDER BY a.is_pinned DESC, a.created_at DESC
    `).all();
    res.json(announcements);
  } catch (err) {
    next(err);
  }
});

// Create announcement (platform/HR admins)
router.post('/', requireRole('super_admin', 'admin', 'hr_manager'), (req, res, next) => {
  try {
    const { title, body, audience, is_pinned } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    const result = db.prepare(`
      INSERT INTO announcements (title, body, audience, is_pinned, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, body, audience || 'الجميع', is_pinned ? 1 : 0, req.user.employee_id || null);

    res.status(201).json({
      message: 'Announcement created',
      announcement: { id: result.lastInsertRowid, title, body, audience: audience || 'الجميع' }
    });
  } catch (err) {
    next(err);
  }
});

// Delete announcement
router.delete('/:id', requireRole('super_admin', 'admin', 'hr_manager'), (req, res, next) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
