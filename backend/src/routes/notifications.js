const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// My notifications, most recent first, plus an unread count.
router.get('/', (req, res, next) => {
  try {
    const { unread } = req.query;
    let where = 'WHERE user_id = ?';
    const params = [req.user.id];
    if (unread === '1' || unread === 'true') where += ' AND is_read = 0';
    const rows = db.prepare(`SELECT * FROM notifications ${where} ORDER BY id DESC LIMIT 50`).all(...params);
    const unread_count = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).c;
    res.json({ notifications: rows, unread_count });
  } catch (err) { next(err); }
});

router.put('/:id/read', (req, res, next) => {
  try {
    const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
    if (!n) return res.status(404).json({ error: 'Not found' });
    if (n.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.put('/read-all', (req, res, next) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
    if (!n) return res.status(404).json({ error: 'Not found' });
    if (n.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
