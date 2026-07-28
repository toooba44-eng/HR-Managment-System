const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['super_admin', 'admin', 'hr_manager'];

// HR: all applications (with job info). Candidate: use /mine.
router.get('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { job_id, status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (job_id) { where += ' AND a.job_id = ?'; params.push(job_id); }
    if (status) { where += ' AND a.status = ?'; params.push(status); }

    const rows = db.prepare(`
      SELECT a.*, j.title as job_title, j.department as job_department
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      ${where}
      ORDER BY
        CASE a.status WHEN 'قيد المراجعة' THEN 1 WHEN 'مقابلة' THEN 2 WHEN 'مقبول' THEN 3 ELSE 4 END,
        a.created_at DESC
    `).all(...params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Candidate: my applications (matched by account email)
router.get('/mine', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT a.*, j.title as job_title, j.department as job_department, j.location as job_location
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_email = ?
      ORDER BY a.created_at DESC
    `).all(req.user.email);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Apply to a job
router.post('/', (req, res, next) => {
  try {
    const { job_id, candidate_name, cover_note } = req.body;
    if (!job_id) return res.status(400).json({ error: 'Job is required' });

    const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND status = 'مفتوحة'").get(job_id);
    if (!job) return res.status(400).json({ error: 'الوظيفة غير متاحة للتقديم' });

    const existing = db.prepare('SELECT id FROM applications WHERE job_id = ? AND candidate_email = ?')
      .get(job_id, req.user.email);
    if (existing) return res.status(400).json({ error: 'لقد تقدّمت لهذه الوظيفة مسبقاً' });

    const result = db.prepare(`
      INSERT INTO applications (job_id, candidate_email, candidate_name, cover_note)
      VALUES (?, ?, ?, ?)
    `).run(job_id, req.user.email, candidate_name || null, cover_note || null);

    res.status(201).json({ message: 'Application submitted', application: { id: result.lastInsertRowid, job_id, status: 'قيد المراجعة' } });
  } catch (err) {
    next(err);
  }
});

// HR: update application status
router.put('/:id/status', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['قيد المراجعة', 'مقابلة', 'مقبول', 'مرفوض'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Application updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
