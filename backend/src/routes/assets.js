const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];
const HISTORY_ACTIONS = ['تخصيص', 'إرجاع', 'صيانة', 'إتلاف'];
const CONDITIONS = ['ممتازة', 'جيدة', 'متوسطة', 'تالفة'];

function logHistory(assetId, employeeId, action, condition, notes, performedBy) {
  db.prepare(`
    INSERT INTO asset_history (asset_id, employee_id, action, condition, notes, performed_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(assetId, employeeId || null, action, condition || null, notes || null, performedBy || null);
}

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
      SELECT a.*, e.full_name as assigned_to_name,
             (SELECT COUNT(*) FROM asset_history h WHERE h.asset_id = a.id) as history_count
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

// Assign / unassign / change status — every change that affects custody
// or condition is appended to the asset's history log.
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { name, category, serial_number, notes, status, assigned_to, return_condition, history_notes } = req.body;
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Not found' });
    if (return_condition !== undefined && return_condition !== null && !CONDITIONS.includes(return_condition)) {
      return res.status(400).json({ error: 'Invalid condition' });
    }

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

    const performedBy = req.user.employee_id;
    if (assigned_to !== undefined && nextAssigned && nextAssigned !== asset.assigned_to) {
      logHistory(req.params.id, nextAssigned, 'تخصيص', null, history_notes, performedBy);
    } else if (assigned_to !== undefined && !nextAssigned && asset.assigned_to) {
      logHistory(req.params.id, asset.assigned_to, 'إرجاع', return_condition, history_notes, performedBy);
    }
    if (status === 'صيانة' && asset.status !== 'صيانة') {
      logHistory(req.params.id, asset.assigned_to, 'صيانة', null, history_notes, performedBy);
    }
    if (status === 'مُتلف' && asset.status !== 'مُتلف') {
      logHistory(req.params.id, asset.assigned_to, 'إتلاف', return_condition || 'تالفة', history_notes, performedBy);
    }

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

// Custody/maintenance history for one asset (HR sees any; an employee only
// the history of an asset currently or previously assigned to them)
router.get('/:id/history', (req, res, next) => {
  try {
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Not found' });
    if (!MANAGE.includes(req.user.role)) {
      const wasInvolved = db.prepare('SELECT 1 FROM asset_history WHERE asset_id = ? AND employee_id = ?').get(req.params.id, req.user.employee_id);
      if (asset.assigned_to !== req.user.employee_id && !wasInvolved) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    const rows = db.prepare(`
      SELECT h.*, e.full_name as employee_name, p.full_name as performed_by_name
      FROM asset_history h
      LEFT JOIN employees e ON h.employee_id = e.id
      LEFT JOIN employees p ON h.performed_by = p.id
      WHERE h.asset_id = ?
      ORDER BY h.created_at DESC
    `).all(req.params.id);
    res.json(rows);
  } catch (err) { next(err); }
});

// Log a standalone maintenance/condition event without changing assignment
router.post('/:id/history', requireRole(...MANAGE), (req, res, next) => {
  try {
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Not found' });
    const { action, condition, notes } = req.body;
    if (!HISTORY_ACTIONS.includes(action)) return res.status(400).json({ error: 'Invalid action' });
    if (condition && !CONDITIONS.includes(condition)) return res.status(400).json({ error: 'Invalid condition' });
    logHistory(req.params.id, asset.assigned_to, action, condition, notes, req.user.employee_id);
    res.status(201).json({ message: 'Created' });
  } catch (err) { next(err); }
});

module.exports = router;
