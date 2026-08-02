const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// List succession plans (management-only data) with a talent-risk summary
router.get('/', (req, res, next) => {
  try {
    // Succession planning is confidential — non-managers get nothing
    if (['employee', 'candidate'].includes(req.user.role)) {
      return res.json({ succession: [], summary: { count: 0, atRisk: 0, readyNow: 0, noSuccessor: 0 } });
    }

    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND s.status = ?'; params.push(req.query.status); }
    if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND s.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT s.*, d.name as department_name,
             inc.full_name as incumbent_name, inc.job_title as incumbent_job_title,
             suc.full_name as successor_name, suc.job_title as successor_job_title
      FROM succession s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN employees inc ON s.incumbent_id = inc.id
      LEFT JOIN employees suc ON s.successor_id = suc.id
      ${where}
      ORDER BY
        CASE s.risk_level WHEN 'مرتفع' THEN 1 WHEN 'متوسط' THEN 2 ELSE 3 END,
        s.created_at DESC
    `).all(...params);

    const summary = rows.reduce((acc, r) => {
      acc.count += 1;
      if (r.status === 'نشط' && r.risk_level === 'مرتفع') acc.atRisk += 1;
      if (r.status === 'نشط' && r.readiness === 'جاهز الآن') acc.readyNow += 1;
      if (r.status === 'نشط' && !r.successor_id) acc.noSuccessor += 1;
      return acc;
    }, { count: 0, atRisk: 0, readyNow: 0, noSuccessor: 0 });

    res.json({ succession: rows, summary });
  } catch (err) {
    next(err);
  }
});

// Create a succession plan (managers & HR)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const b = req.body;
    if (!b.position_title) return res.status(400).json({ error: 'Position title is required' });
    if (b.successor_id && b.incumbent_id && Number(b.successor_id) === Number(b.incumbent_id)) {
      return res.status(400).json({ error: 'لا يمكن أن يكون الموظف خليفة لنفسه' });
    }
    const result = db.prepare(`
      INSERT INTO succession
        (position_title, department_id, incumbent_id, successor_id, readiness, risk_level, potential, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.position_title, b.department_id || null, b.incumbent_id || null, b.successor_id || null,
      b.readiness || 'خلال سنة', b.risk_level || 'متوسط', b.potential || 'أداء عالٍ',
      b.notes || null, req.user.employee_id || null,
    );
    res.status(201).json({ message: 'Created', succession: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Update a succession plan (managers & HR)
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM succession WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    const nextIncumbent = b.incumbent_id !== undefined ? b.incumbent_id : existing.incumbent_id;
    const nextSuccessor = b.successor_id !== undefined ? b.successor_id : existing.successor_id;
    if (nextSuccessor && nextIncumbent && Number(nextSuccessor) === Number(nextIncumbent)) {
      return res.status(400).json({ error: 'لا يمكن أن يكون الموظف خليفة لنفسه' });
    }
    db.prepare(`
      UPDATE succession SET
        position_title = ?, department_id = ?, incumbent_id = ?, successor_id = ?,
        readiness = ?, risk_level = ?, potential = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(
      b.position_title ?? existing.position_title,
      b.department_id !== undefined ? b.department_id : existing.department_id,
      b.incumbent_id !== undefined ? b.incumbent_id : existing.incumbent_id,
      b.successor_id !== undefined ? b.successor_id : existing.successor_id,
      b.readiness ?? existing.readiness,
      b.risk_level ?? existing.risk_level,
      b.potential ?? existing.potential,
      b.status ?? existing.status,
      b.notes ?? existing.notes,
      req.params.id,
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete a succession plan (managers & HR)
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM succession WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
