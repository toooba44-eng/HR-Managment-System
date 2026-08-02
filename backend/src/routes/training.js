const express = require('express');
const crypto = require('crypto');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

// Generate a shareable, unique certificate code like "QNT-9F3A2B1C"
function genCertCode() {
  return `QNT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Public certificate verification — no auth, so anyone with the code
// (e.g. shared on LinkedIn) can confirm it was really issued by us.
router.get('/certificates/verify/:code', (req, res, next) => {
  try {
    const cert = db.prepare(`
      SELECT cert.code, cert.issued_at, e.full_name as employee_name, c.title as course_title, c.hours, c.level
      FROM course_certificates cert
      JOIN employees e ON cert.employee_id = e.id
      JOIN courses c ON cert.course_id = c.id
      WHERE cert.code = ?
    `).get(req.params.code);
    if (!cert) return res.status(404).json({ valid: false, error: 'الشهادة غير موجودة' });
    res.json({ valid: true, certificate: cert });
  } catch (err) {
    next(err);
  }
});

router.use(authenticateToken);

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

    let certificate = null;
    if (status === 'مكتمل') {
      const existing = db.prepare('SELECT * FROM course_certificates WHERE enrollment_id = ?').get(enr.id);
      if (existing) {
        certificate = existing;
      } else {
        let code;
        do { code = genCertCode(); } while (db.prepare('SELECT 1 FROM course_certificates WHERE code = ?').get(code));
        const result = db.prepare(`
          INSERT INTO course_certificates (enrollment_id, employee_id, course_id, code)
          VALUES (?, ?, ?, ?)
        `).run(enr.id, enr.employee_id, enr.course_id, code);
        certificate = { id: result.lastInsertRowid, code };
      }
    }

    res.json({ message: 'Updated', certificate });
  } catch (err) {
    next(err);
  }
});

// My certificates (or all, for HR)
router.get('/certificates', (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (!MANAGE.includes(req.user.role)) {
      where += ' AND cert.employee_id = ?';
      params.push(req.user.employee_id);
    }
    const rows = db.prepare(`
      SELECT cert.*, e.full_name as employee_name, e.profile_picture, c.title as course_title, c.hours, c.level, c.category
      FROM course_certificates cert
      JOIN employees e ON cert.employee_id = e.id
      JOIN courses c ON cert.course_id = c.id
      ${where}
      ORDER BY cert.issued_at DESC
    `).all(...params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
