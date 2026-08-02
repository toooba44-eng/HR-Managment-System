const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'hr_manager', 'super_admin'));

// Default exit checklist generated for a new offboarding case
const DEFAULT_TASKS = [
  { title: 'استرجاع الحاسب والعهد والبطاقة التعريفية', category: 'عهدة', owner: 'تقنية المعلومات' },
  { title: 'إلغاء صلاحيات الأنظمة والبريد الإلكتروني', category: 'صلاحيات', owner: 'تقنية المعلومات' },
  { title: 'تصفية الرصيد المالي ومستحقات نهاية الخدمة', category: 'تصفية مالية', owner: 'الموارد البشرية' },
  { title: 'إجراء مقابلة خروج (Exit Interview)', category: 'مقابلة خروج', owner: 'الموارد البشرية' },
  { title: 'تسليم مستند إخلاء الطرف', category: 'مستندات', owner: 'الموارد البشرية' },
];

// Maps an offboarding type to the employee status once the case is completed
const TYPE_TO_EMP_STATUS = { استقالة: 'مستقيل', فصل: 'مفصول', 'انتهاء عقد': 'مستقيل', تقاعد: 'مستقيل' };

function withProgress(row) {
  const tasks = db.prepare('SELECT COUNT(*) AS total, SUM(is_done) AS done FROM offboarding_tasks WHERE offboarding_id = ?').get(row.id);
  const total = tasks.total || 0;
  const done = tasks.done || 0;
  return { ...row, tasks_total: total, tasks_done: done, progress: total ? Math.round((done / total) * 100) : 0 };
}

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT o.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name
      FROM offboarding o
      JOIN employees e ON o.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY CASE o.status WHEN 'قيد المعالجة' THEN 1 WHEN 'مكتملة' THEN 2 ELSE 3 END, o.created_at DESC
    `).all();
    const cases = rows.map(withProgress);
    const summary = cases.reduce((s, c) => {
      s.total += 1;
      if (c.status === 'قيد المعالجة') s.active += 1;
      if (c.status === 'مكتملة') s.completed += 1;
      return s;
    }, { total: 0, active: 0, completed: 0 });
    res.json({ offboarding: cases, summary });
  } catch (err) { next(err); }
});

// Get one case with its exit checklist
router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare(`
      SELECT o.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name
      FROM offboarding o
      JOIN employees e ON o.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE o.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const tasks = db.prepare('SELECT * FROM offboarding_tasks WHERE offboarding_id = ? ORDER BY id ASC').all(req.params.id);
    res.json({ ...withProgress(row), tasks });
  } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const { employee_id, type, reason, last_working_day, notes, tasks } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'Employee is required' });
    const r = db.prepare(`INSERT INTO offboarding (employee_id, type, reason, last_working_day, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(employee_id, type || 'استقالة', reason || null, last_working_day || null, notes || null, req.user.employee_id || null);

    const caseId = r.lastInsertRowid;
    const list = Array.isArray(tasks) && tasks.length ? tasks : DEFAULT_TASKS;
    const insTask = db.prepare('INSERT INTO offboarding_tasks (offboarding_id, title, category, owner, due_date) VALUES (?, ?, ?, ?, ?)');
    for (const t of list) {
      insTask.run(caseId, t.title, t.category || 'أخرى', t.owner || 'الموارد البشرية', t.due_date || last_working_day || null);
    }
    res.status(201).json({ message: 'Created', offboarding: { id: caseId } });
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const o = db.prepare('SELECT * FROM offboarding WHERE id = ?').get(req.params.id);
    if (!o) return res.status(404).json({ error: 'Not found' });
    const { status, notes } = req.body;
    db.prepare('UPDATE offboarding SET status = ?, notes = ? WHERE id = ?')
      .run(status || o.status, notes ?? o.notes, req.params.id);
    // Reflect completed offboarding on the employee status
    if (status === 'مكتملة') {
      db.prepare('UPDATE employees SET status = ? WHERE id = ?').run(TYPE_TO_EMP_STATUS[o.type] || 'مستقيل', o.employee_id);
    }
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try { db.prepare('DELETE FROM offboarding WHERE id = ?').run(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
});

// Add a checklist task
router.post('/:id/tasks', (req, res, next) => {
  try {
    const kase = db.prepare('SELECT id FROM offboarding WHERE id = ?').get(req.params.id);
    if (!kase) return res.status(404).json({ error: 'Not found' });
    const { title, category, owner, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const result = db.prepare('INSERT INTO offboarding_tasks (offboarding_id, title, category, owner, due_date) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, title, category || 'أخرى', owner || 'الموارد البشرية', due_date || null);
    res.status(201).json({ message: 'Created', task: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

// Toggle / update a checklist task; auto-completes the case (and syncs the
// employee's status) once every task on the exit checklist is done.
router.put('/tasks/:taskId', (req, res, next) => {
  try {
    const task = db.prepare('SELECT * FROM offboarding_tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare('UPDATE offboarding_tasks SET title = ?, category = ?, owner = ?, due_date = ?, is_done = ? WHERE id = ?')
      .run(
        b.title ?? task.title,
        b.category ?? task.category,
        b.owner ?? task.owner,
        b.due_date !== undefined ? b.due_date : task.due_date,
        b.is_done !== undefined ? (b.is_done ? 1 : 0) : task.is_done,
        req.params.taskId,
      );

    const kase = db.prepare('SELECT * FROM offboarding WHERE id = ?').get(task.offboarding_id);
    if (kase && kase.status !== 'ملغاة') {
      const counts = db.prepare('SELECT COUNT(*) AS total, SUM(is_done) AS done FROM offboarding_tasks WHERE offboarding_id = ?').get(kase.id);
      const allDone = counts.total > 0 && counts.total === counts.done;
      const newStatus = allDone ? 'مكتملة' : (kase.status === 'مكتملة' ? 'قيد المعالجة' : kase.status);
      if (newStatus !== kase.status) {
        db.prepare('UPDATE offboarding SET status = ? WHERE id = ?').run(newStatus, kase.id);
        if (newStatus === 'مكتملة') {
          db.prepare('UPDATE employees SET status = ? WHERE id = ?').run(TYPE_TO_EMP_STATUS[kase.type] || 'مستقيل', kase.employee_id);
        }
      }
    }
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/tasks/:taskId', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM offboarding_tasks WHERE id = ?').run(req.params.taskId);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
