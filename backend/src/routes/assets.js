const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

// List assets. HR sees all; employees see only assets assigned to them.
router.get('/', (req, res, next) => {
  try {
    const { status, category } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND a.status = ?'; params.push(status); }
    if (category) { where += ' AND a.category = ?'; params.push(category); }

    if (['employee', 'candidate', 'department_head'].includes(req.user.role)) {
      where += ' AND a.assigned_to = ?';
      params.push(req.user.employee_id);
    }

    const rows = db.prepare(`
      SELECT a.*, e.full_name as assigned_to_name
      FROM assets a
      LEFT JOIN employees e ON a.assigned_to = e.id
      ${where}
      ORDER BY a.created_at DESC
    `).all(...params);

    const summary = {
      total: rows.length,
      assigned: rows.filter((r) => r.status === 'مُخصّص').length,
      available: rows.filter((r) => r.status === 'متاح').length,
      maintenance: rows.filter((r) => r.status === 'صيانة').length,
    };

    res.json({ assets: rows, summary });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { name, category, serial_number, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db.prepare(`
      INSERT INTO assets (name, category, serial_number, notes) VALUES (?, ?, ?, ?)
    `).run(name, category || 'أخرى', serial_number || null, notes || null);
    res.status(201).json({ message: 'Created', asset: { id: result.lastInsertRowid, name } });
  } catch (err) {
    next(err);
  }
});

// Assign / unassign / change status
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { name, category, serial_number, notes, status, assigned_to } = req.body;
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Not found' });

    const nextAssigned = assigned_to === undefined ? asset.assigned_to : (assigned_to || null);
    let nextStatus = status || asset.status;
    // Keep status consistent with assignment
    if (assigned_to !== undefined) {
      if (nextAssigned) { nextStatus = 'مُخصّص'; }
      else if (nextStatus === 'مُخصّص') { nextStatus = 'متاح'; }
    }

    db.prepare(`
      UPDATE assets SET name = ?, category = ?, serial_number = ?, notes = ?, status = ?,
        assigned_to = ?, assigned_date = ?
      WHERE id = ?
    `).run(
      name ?? asset.name, category ?? asset.category, serial_number ?? asset.serial_number,
      notes ?? asset.notes, nextStatus, nextAssigned,
      nextAssigned ? (asset.assigned_date || new Date().toISOString().split('T')[0]) : null,
      req.params.id
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
