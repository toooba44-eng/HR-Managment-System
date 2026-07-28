const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

// List courses; each includes the current user's enrollment (if any) and count
router.get('/courses', (req, res, next) => {
  try {
    const empId = req.user.employee_id;
    const courses = db.prepare(`
      SELECT c.*, creator.full_name as created_by_name,
             (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count
      FROM courses c
      LEFT JOIN employees creator ON c.created_by = creator.id
      ORDER BY c.created_at DESC
    `).all();

    const withMine = courses.map((c) => {
      const mine = empId ? db.prepare('SELECT id, progress, status FROM enrollments WHERE course_id = ? AND employee_id = ?').get(c.id, empId) : null;
      return { ...c, my_enrollment: mine || null };
    });
    res.json(withMine);
  } catch (err) {
    next(err);
  }
});

router.post('/courses', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { title, category, description, hours, level, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const result = db.prepare(`
      INSERT INTO courses (title, category, description, hours, level, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, category || 'عام', description || null, hours || 0, level || 'مبتدئ', status || 'متاحة', req.user.employee_id || null);
    res.status(201).json({ message: 'Course created', course: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

router.put('/courses/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { title, category, description, hours, level, status } = req.body;
    db.prepare(`UPDATE courses SET title = ?, category = ?, description = ?, hours = ?, level = ?, status = ? WHERE id = ?`)
      .run(title, category, description, hours, level, status, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/courses/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Enroll self into a course
router.post('/courses/:id/enroll', (req, res, next) => {
  try {
    const empId = req.user.employee_id;
    if (!empId) return res.status(400).json({ error: 'No employee associated with this account' });
    const course = db.prepare("SELECT * FROM courses WHERE id = ? AND status = 'متاحة'").get(req.params.id);
    if (!course) return res.status(400).json({ error: 'الدورة غير متاحة للتسجيل' });
    const existing = db.prepare('SELECT id FROM enrollments WHERE course_id = ? AND employee_id = ?').get(req.params.id, empId);
    if (existing) return res.status(400).json({ error: 'أنت مسجّل في هذه الدورة بالفعل' });
    const result = db.prepare('INSERT INTO enrollments (course_id, employee_id) VALUES (?, ?)').run(req.params.id, empId);
    res.status(201).json({ message: 'Enrolled', enrollment: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Enrollments list (HR all; employee own)
router.get('/enrollments', (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (['employee', 'candidate', 'department_head'].includes(req.user.role)) {
      where += ' AND en.employee_id = ?';
      params.push(req.user.employee_id);
    }
    const rows = db.prepare(`
      SELECT en.*, c.title as course_title, c.category, c.hours, e.full_name, e.profile_picture
      FROM enrollments en
      JOIN courses c ON en.course_id = c.id
      JOIN employees e ON en.employee_id = e.id
      ${where}
      ORDER BY en.enrolled_at DESC
    `).all(...params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Update enrollment progress/status (owner or HR)
router.put('/enrollments/:id', (req, res, next) => {
  try {
    const enr = db.prepare('SELECT * FROM enrollments WHERE id = ?').get(req.params.id);
    if (!enr) return res.status(404).json({ error: 'Not found' });
    const isOwner = enr.employee_id === req.user.employee_id;
    if (!isOwner && !MANAGE.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });

    let progress = req.body.progress === undefined ? enr.progress : Math.max(0, Math.min(100, parseInt(req.body.progress, 10)));
    let status = enr.status;
    if (progress >= 100) status = 'مكتمل';
    else if (progress > 0) status = 'قيد التقدم';
    else status = 'مسجّل';

    db.prepare('UPDATE enrollments SET progress = ?, status = ? WHERE id = ?').run(progress, status, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
