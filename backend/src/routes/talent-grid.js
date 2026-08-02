const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'hr_manager', 'super_admin', 'department_head'));

// 9-box cell labels keyed by "performance-potential" (1..3 each)
const BOXES = {
  '1-3': 'لغز (Enigma)', '2-3': 'صاعد (Growth)', '3-3': 'نجم (Star)',
  '1-2': 'أداء غير متسق', '2-2': 'أساسي (Core)', '3-2': 'أداء عالٍ',
  '1-1': 'مخاطرة (Risk)', '2-1': 'فعّال (Effective)', '3-1': 'خبير موثوق',
};

// Grid: employees placed by their latest talent review
router.get('/', (req, res, next) => {
  try {
    let where = '';
    const params = [];
    if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where = 'WHERE e.department_id = ?'; params.push(dept.department_id); }
    }
    const rows = db.prepare(`
      SELECT e.id, e.full_name, e.job_title, e.profile_picture, d.name as department_name,
             t.performance, t.potential, t.notes
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN talent_reviews t ON t.employee_id = e.id
      ${where ? where + ' AND' : 'WHERE'} e.status = 'نشط'
      ORDER BY e.full_name
    `).all(...params);

    const reviewed = rows.filter((r) => r.performance && r.potential);
    const summary = {
      total: rows.length,
      reviewed: reviewed.length,
      unreviewed: rows.length - reviewed.length,
      stars: reviewed.filter((r) => r.performance === 3 && r.potential === 3).length,
      risks: reviewed.filter((r) => r.performance === 1 && r.potential === 1).length,
    };
    res.json({ employees: rows, boxes: BOXES, summary });
  } catch (err) { next(err); }
});

// Upsert a review for an employee — logs a history snapshot whenever the
// 9-box placement (performance x potential) actually moves, so shifts
// across review cycles stay auditable.
router.put('/:employeeId', (req, res, next) => {
  try {
    const { performance, potential, notes } = req.body;
    if (![1, 2, 3].includes(performance) || ![1, 2, 3].includes(potential)) {
      return res.status(400).json({ error: 'Performance and potential must be 1-3' });
    }
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(req.params.employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const existing = db.prepare('SELECT performance, potential FROM talent_reviews WHERE employee_id = ?').get(req.params.employeeId);
    const moved = !existing || existing.performance !== performance || existing.potential !== potential;

    db.prepare(`
      INSERT INTO talent_reviews (employee_id, performance, potential, notes, created_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(employee_id) DO UPDATE SET performance = excluded.performance,
        potential = excluded.potential, notes = excluded.notes, updated_at = CURRENT_TIMESTAMP
    `).run(req.params.employeeId, performance, potential, notes || null, req.user.employee_id || null);

    if (moved) {
      db.prepare(`
        INSERT INTO talent_review_history (employee_id, performance, potential, notes, changed_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.params.employeeId, performance, potential, notes || null, req.user.employee_id || null);
    }

    res.json({ message: 'Saved' });
  } catch (err) { next(err); }
});

// Placement history for one employee (most recent first)
router.get('/:employeeId/history', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT h.*, e.full_name as changed_by_name
      FROM talent_review_history h
      LEFT JOIN employees e ON h.changed_by = e.id
      WHERE h.employee_id = ?
      ORDER BY h.created_at DESC
    `).all(req.params.employeeId);
    res.json(rows.map((r) => ({ ...r, box: BOXES[`${r.performance}-${r.potential}`] })));
  } catch (err) { next(err); }
});

// Clear a review
router.delete('/:employeeId', (req, res, next) => {
  try {
    db.prepare('DELETE FROM talent_reviews WHERE employee_id = ?').run(req.params.employeeId);
    res.json({ message: 'Cleared' });
  } catch (err) { next(err); }
});

module.exports = router;
