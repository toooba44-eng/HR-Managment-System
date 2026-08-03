const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// A department head may only act on tasks within their own department —
// the list endpoint already scopes this way; enforce it here too so
// update/delete can't be reached directly by ID for someone else's
// department.
function inManagedScope(user, employeeId) {
  if (user.role !== 'department_head') return true;
  const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(user.employee_id);
  const empDept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(employeeId);
  return !!dept && !!empDept && dept.department_id === empDept.department_id;
}

// List tasks (role-scoped)
router.get('/', (req, res, next) => {
  try {
    const { status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND t.status = ?'; params.push(status); }

    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND t.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT t.*, e.full_name, e.job_title, e.profile_picture, e.department_id,
             assigner.full_name as assigned_by_name
      FROM tasks t
      JOIN employees e ON t.employee_id = e.id
      LEFT JOIN employees assigner ON t.assigned_by = assigner.id
      ${where}
      ORDER BY
        CASE t.status WHEN 'قيد التنفيذ' THEN 1 WHEN 'جديدة' THEN 2 WHEN 'مكتملة' THEN 3 ELSE 4 END,
        CASE t.priority WHEN 'عالية' THEN 1 WHEN 'متوسطة' THEN 2 ELSE 3 END,
        t.created_at DESC
    `).all(...params);

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Create/assign a task (managers/HR)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { title, description, employee_id, priority, due_date } = req.body;
    if (!title || !employee_id) {
      return res.status(400).json({ error: 'Title and assignee are required' });
    }
    if (!inManagedScope(req.user, employee_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = db.prepare(`
      INSERT INTO tasks (title, description, employee_id, assigned_by, priority, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, description || null, employee_id, req.user.employee_id || null, priority || 'متوسطة', due_date || null);

    res.status(201).json({ message: 'Task created', task: { id: result.lastInsertRowid, title, employee_id, status: 'جديدة' } });
  } catch (err) {
    next(err);
  }
});

// Update task status (assignee updates own; managers update in scope)
router.put('/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['جديدة', 'قيد التنفيذ', 'مكتملة', 'ملغاة'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isOwner = task.employee_id === req.user.employee_id;
    const isManager = MANAGE.includes(req.user.role);
    if (!isOwner && !isManager) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!isOwner && !inManagedScope(req.user, task.employee_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Task updated' });
  } catch (err) {
    next(err);
  }
});

// Delete task (managers, within their own department for a department head)
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!inManagedScope(req.user, task.employee_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
