const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// Default checklist generated for a new onboarding plan
const DEFAULT_TASKS = [
  { title: 'استكمال العقد والمستندات الرسمية', category: 'مستندات', owner: 'الموارد البشرية' },
  { title: 'فتح حساب البريد الإلكتروني والأنظمة', category: 'تجهيزات', owner: 'تقنية المعلومات' },
  { title: 'تجهيز جهاز الحاسب ومكان العمل', category: 'تجهيزات', owner: 'تقنية المعلومات' },
  { title: 'جلسة تعريفية بالمؤسسة والسياسات', category: 'تعريف', owner: 'الموارد البشرية' },
  { title: 'التعريف بالفريق والمدير المباشر', category: 'تعريف', owner: 'المدير' },
  { title: 'التدريب على المهام الأساسية للوظيفة', category: 'تدريب', owner: 'المدير' },
];

function withProgress(plan) {
  const tasks = db.prepare('SELECT COUNT(*) AS total, SUM(is_done) AS done FROM onboarding_tasks WHERE onboarding_id = ?').get(plan.id);
  const total = tasks.total || 0;
  const done = tasks.done || 0;
  return { ...plan, tasks_total: total, tasks_done: done, progress: total ? Math.round((done / total) * 100) : 0 };
}

// Keeps "متأخر" in sync with reality: a plan moves there once it has an
// incomplete task past its due date, and moves back to "قيد التنفيذ" once
// it no longer does — the same auto-promotion pattern used for overdue
// invoices in billing.js. Never touches a completed or cancelled plan.
function syncOverdueStatuses() {
  const hasOverdueTask = (planId) => !!db.prepare(`
    SELECT 1 FROM onboarding_tasks
    WHERE onboarding_id = ? AND is_done = 0 AND due_date IS NOT NULL AND due_date < date('now')
    LIMIT 1
  `).get(planId);

  const inProgress = db.prepare(`SELECT id FROM onboarding WHERE status = 'قيد التنفيذ'`).all();
  for (const p of inProgress) {
    if (hasOverdueTask(p.id)) db.prepare(`UPDATE onboarding SET status = 'متأخر' WHERE id = ?`).run(p.id);
  }
  const overdue = db.prepare(`SELECT id FROM onboarding WHERE status = 'متأخر'`).all();
  for (const p of overdue) {
    if (!hasOverdueTask(p.id)) db.prepare(`UPDATE onboarding SET status = 'قيد التنفيذ' WHERE id = ?`).run(p.id);
  }
}

// List onboarding plans (role-scoped) with progress + summary
router.get('/', (req, res, next) => {
  try {
    syncOverdueStatuses();
    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND o.status = ?'; params.push(req.query.status); }
    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND o.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT o.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name,
             b.full_name as buddy_name
      FROM onboarding o
      JOIN employees e ON o.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees b ON o.buddy_id = b.id
      ${where}
      ORDER BY
        CASE o.status WHEN 'متأخر' THEN 1 WHEN 'قيد التنفيذ' THEN 2 WHEN 'مكتمل' THEN 3 ELSE 4 END,
        o.start_date DESC
    `).all(...params);

    const plans = rows.map(withProgress);
    const summary = plans.reduce((s, p) => {
      s.total += 1;
      if (p.status === 'قيد التنفيذ') s.active += 1;
      if (p.status === 'مكتمل') s.completed += 1;
      if (p.status === 'متأخر') s.overdue += 1;
      return s;
    }, { total: 0, active: 0, completed: 0, overdue: 0 });

    res.json({ onboarding: plans, summary });
  } catch (err) {
    next(err);
  }
});

// Get one plan with its checklist
router.get('/:id', (req, res, next) => {
  try {
    syncOverdueStatuses();
    const plan = db.prepare(`
      SELECT o.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name,
             b.full_name as buddy_name
      FROM onboarding o
      JOIN employees e ON o.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees b ON o.buddy_id = b.id
      WHERE o.id = ?
    `).get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Not found' });

    if (['employee', 'candidate'].includes(req.user.role) && plan.employee_id !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = db.prepare('SELECT * FROM onboarding_tasks WHERE onboarding_id = ? ORDER BY id ASC').all(req.params.id);
    res.json({ ...withProgress(plan), tasks });
  } catch (err) {
    next(err);
  }
});

// Create a plan with default checklist (managers & HR)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { employee_id, start_date, buddy_id, notes, tasks } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'Employee is required' });
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const result = db.prepare(`
      INSERT INTO onboarding (employee_id, start_date, buddy_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(employee_id, start_date || null, buddy_id || null, notes || null, req.user.employee_id || null);

    const planId = result.lastInsertRowid;
    const list = Array.isArray(tasks) && tasks.length ? tasks : DEFAULT_TASKS;
    const insTask = db.prepare('INSERT INTO onboarding_tasks (onboarding_id, title, category, owner, due_date) VALUES (?, ?, ?, ?, ?)');
    for (const t of list) {
      insTask.run(planId, t.title, t.category || 'أخرى', t.owner || 'الموارد البشرية', t.due_date || start_date || null);
    }
    res.status(201).json({ message: 'Created', onboarding: { id: planId } });
  } catch (err) {
    next(err);
  }
});

// Update plan (managers & HR)
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM onboarding WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare('UPDATE onboarding SET start_date = ?, buddy_id = ?, status = ?, notes = ? WHERE id = ?')
      .run(
        b.start_date !== undefined ? b.start_date : existing.start_date,
        b.buddy_id !== undefined ? b.buddy_id : existing.buddy_id,
        b.status ?? existing.status,
        b.notes !== undefined ? b.notes : existing.notes,
        req.params.id,
      );
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete plan (managers & HR)
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM onboarding WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Add a checklist task (managers & HR)
router.post('/:id/tasks', requireRole(...MANAGE), (req, res, next) => {
  try {
    const plan = db.prepare('SELECT id FROM onboarding WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Not found' });
    const { title, category, owner, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const result = db.prepare('INSERT INTO onboarding_tasks (onboarding_id, title, category, owner, due_date) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, title, category || 'أخرى', owner || 'الموارد البشرية', due_date || null);
    res.status(201).json({ message: 'Created', task: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Toggle / update a checklist task (managers & HR)
router.put('/tasks/:taskId', requireRole(...MANAGE), (req, res, next) => {
  try {
    const task = db.prepare('SELECT * FROM onboarding_tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare('UPDATE onboarding_tasks SET title = ?, category = ?, owner = ?, due_date = ?, is_done = ? WHERE id = ?')
      .run(
        b.title ?? task.title,
        b.category ?? task.category,
        b.owner ?? task.owner,
        b.due_date !== undefined ? b.due_date : task.due_date,
        b.is_done !== undefined ? (b.is_done ? 1 : 0) : task.is_done,
        req.params.taskId,
      );

    // Auto-complete the plan when all tasks are done
    const plan = db.prepare('SELECT * FROM onboarding WHERE id = ?').get(task.onboarding_id);
    if (plan && plan.status !== 'ملغى') {
      const counts = db.prepare('SELECT COUNT(*) AS total, SUM(is_done) AS done FROM onboarding_tasks WHERE onboarding_id = ?').get(plan.id);
      const allDone = counts.total > 0 && counts.total === counts.done;
      const newStatus = allDone ? 'مكتمل' : (plan.status === 'مكتمل' ? 'قيد التنفيذ' : plan.status);
      if (newStatus !== plan.status) db.prepare('UPDATE onboarding SET status = ? WHERE id = ?').run(newStatus, plan.id);
    }
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete a checklist task (managers & HR)
router.delete('/tasks/:taskId', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM onboarding_tasks WHERE id = ?').run(req.params.taskId);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
