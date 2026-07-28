const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// List goals (role-scoped)
router.get('/', (req, res, next) => {
  try {
    const { status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND g.status = ?'; params.push(status); }

    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND g.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT g.*, e.full_name, e.job_title, e.profile_picture, e.department_id,
             creator.full_name as created_by_name
      FROM goals g
      JOIN employees e ON g.employee_id = e.id
      LEFT JOIN employees creator ON g.created_by = creator.id
      ${where}
      ORDER BY
        CASE g.status WHEN 'قيد التنفيذ' THEN 1 WHEN 'لم تبدأ' THEN 2 WHEN 'مكتملة' THEN 3 ELSE 4 END,
        g.created_at DESC
    `).all(...params);

    const summary = {
      total: rows.length,
      completed: rows.filter((g) => g.status === 'مكتملة').length,
      inProgress: rows.filter((g) => g.status === 'قيد التنفيذ').length,
      avgProgress: rows.length ? Math.round(rows.reduce((s, g) => s + (g.progress || 0), 0) / rows.length) : 0,
    };
    res.json({ goals: rows, summary });
  } catch (err) {
    next(err);
  }
});

// Assign a goal (managers/HR)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { employee_id, title, description, weight, target_date } = req.body;
    if (!employee_id || !title) return res.status(400).json({ error: 'Employee and title are required' });
    const result = db.prepare(`
      INSERT INTO goals (employee_id, title, description, weight, target_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employee_id, title, description || null, weight || 100, target_date || null, req.user.employee_id || null);
    res.status(201).json({ message: 'Goal created', goal: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Update progress/status (assignee or manager)
router.put('/:id', (req, res, next) => {
  try {
    const { progress, status } = req.body;
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Not found' });

    const isOwner = goal.employee_id === req.user.employee_id;
    if (!isOwner && !MANAGE.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let nextProgress = progress === undefined ? goal.progress : Math.max(0, Math.min(100, parseInt(progress, 10)));
    let nextStatus = status || goal.status;
    // Keep status coherent with progress
    if (status === undefined) {
      if (nextProgress >= 100) nextStatus = 'مكتملة';
      else if (nextProgress > 0) nextStatus = 'قيد التنفيذ';
    }
    if (nextStatus === 'مكتملة') nextProgress = 100;

    db.prepare('UPDATE goals SET progress = ?, status = ? WHERE id = ?').run(nextProgress, nextStatus, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
