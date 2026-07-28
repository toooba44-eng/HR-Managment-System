const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['super_admin', 'admin', 'hr_manager'];

// List jobs. Candidates/employees see open jobs; HR sees all with applicant counts.
router.get('/', (req, res, next) => {
  try {
    const isManager = MANAGE.includes(req.user.role);
    const jobs = db.prepare(`
      SELECT j.*, e.full_name as created_by_name,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicants
      FROM jobs j
      LEFT JOIN employees e ON j.created_by = e.id
      ${isManager ? '' : "WHERE j.status = 'مفتوحة'"}
      ORDER BY j.created_at DESC
    `).all();
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { title, department, location, type, description, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const result = db.prepare(`
      INSERT INTO jobs (title, department, location, type, description, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, department || null, location || 'الرياض - المقر الرئيسي', type || 'دوام كامل',
      description || null, status || 'مفتوحة', req.user.employee_id || null);
    res.status(201).json({ message: 'Job created', job: { id: result.lastInsertRowid, title } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { title, department, location, type, description, status } = req.body;
    db.prepare(`
      UPDATE jobs SET title = ?, department = ?, location = ?, type = ?, description = ?, status = ?
      WHERE id = ?
    `).run(title, department, location, type, description, status, req.params.id);
    res.json({ message: 'Job updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
