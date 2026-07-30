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

// Ordered ATS pipeline stages
const STAGES = ['متقدم جديد', 'مراجعة أولية', 'اختبار', 'مقابلة', 'عرض وظيفي', 'تم التوظيف', 'مرفوض'];
// Keep the legacy status column in sync with the richer stage
const STAGE_TO_STATUS = {
  'متقدم جديد': 'قيد المراجعة', 'مراجعة أولية': 'قيد المراجعة', اختبار: 'قيد المراجعة',
  مقابلة: 'مقابلة', 'عرض وظيفي': 'مقابلة', 'تم التوظيف': 'مقبول', مرفوض: 'مرفوض',
};

// HR: Kanban pipeline grouped by stage
router.get('/pipeline', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { job_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (job_id) { where += ' AND a.job_id = ?'; params.push(job_id); }
    const rows = db.prepare(`
      SELECT a.*, j.title as job_title, j.department as job_department
      FROM applications a JOIN jobs j ON a.job_id = j.id
      ${where}
      ORDER BY a.rating DESC, a.created_at DESC
    `).all(...params);

    const columns = STAGES.map((stage) => ({
      stage,
      cards: rows.filter((r) => (r.stage || 'متقدم جديد') === stage),
    }));
    const summary = {
      total: rows.length,
      hired: rows.filter((r) => r.stage === 'تم التوظيف').length,
      rejected: rows.filter((r) => r.stage === 'مرفوض').length,
      active: rows.filter((r) => !['تم التوظيف', 'مرفوض'].includes(r.stage)).length,
    };
    res.json({ columns, stages: STAGES, summary });
  } catch (err) {
    next(err);
  }
});

// HR: move a candidate to a pipeline stage
router.put('/:id/stage', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { stage } = req.body;
    if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
    const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE applications SET stage = ?, status = ? WHERE id = ?')
      .run(stage, STAGE_TO_STATUS[stage] || 'قيد المراجعة', req.params.id);
    res.json({ message: 'Moved' });
  } catch (err) {
    next(err);
  }
});

// HR: rate a candidate (1-5)
router.put('/:id/rating', requireRole(...MANAGE), (req, res, next) => {
  try {
    const rating = parseInt(req.body.rating, 10);
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Rating must be 1-5' });
    const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE applications SET rating = ? WHERE id = ?').run(rating, req.params.id);
    res.json({ message: 'Rated' });
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
