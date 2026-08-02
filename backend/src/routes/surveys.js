const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// List surveys (employees see active ones; managers see all) with response state
router.get('/', (req, res, next) => {
  try {
    const isEmployee = ['employee', 'candidate'].includes(req.user.role);
    const where = isEmployee ? 'WHERE s.is_active = 1' : '';
    const rows = db.prepare(`
      SELECT s.*, c.full_name as created_by_name,
             (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id) as responses_count,
             (SELECT ROUND(AVG(rating), 1) FROM survey_responses r WHERE r.survey_id = s.id) as avg_rating,
             (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id AND r.employee_id = ?) as responded
      FROM surveys s
      LEFT JOIN employees c ON s.created_by = c.id
      ${where}
      ORDER BY s.is_active DESC, s.id DESC
    `).all(req.user.employee_id || 0);

    const summary = rows.reduce((acc, r) => {
      acc.total += 1;
      if (r.is_active) acc.active += 1;
      acc.responses += r.responses_count;
      return acc;
    }, { total: 0, active: 0, responses: 0 });

    res.json({ surveys: rows, summary });
  } catch (err) {
    next(err);
  }
});

// Survey results with individual responses (managers & HR). For an
// anonymous survey, responses are returned without any employee identity —
// only the rating/comment/date — while the one-response-per-employee rule
// is still enforced server-side via the UNIQUE constraint.
router.get('/:id/results', requireRole(...MANAGE), (req, res, next) => {
  try {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });
    const rows = db.prepare(`
      SELECT r.*, e.full_name, e.job_title
      FROM survey_responses r
      JOIN employees e ON r.employee_id = e.id
      WHERE r.survey_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.id);
    const responses = survey.anonymous
      ? rows.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at }))
      : rows;
    const stats = db.prepare('SELECT COUNT(*) AS count, ROUND(AVG(rating), 2) AS avg_rating FROM survey_responses WHERE survey_id = ?').get(req.params.id);
    const distribution = [1, 2, 3, 4, 5].reduce((acc, n) => {
      acc[n] = rows.filter((r) => r.rating === n).length;
      return acc;
    }, {});
    res.json({ survey, responses, stats, distribution });
  } catch (err) {
    next(err);
  }
});

// Create a survey (managers & HR)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { title, description, audience, anonymous } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const result = db.prepare('INSERT INTO surveys (title, description, audience, anonymous, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(title, description || null, audience || 'الكل', anonymous ? 1 : 0, req.user.employee_id || null);
    res.status(201).json({ message: 'Created', survey: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Toggle active (managers & HR)
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare('UPDATE surveys SET title = ?, description = ?, is_active = ?, anonymous = ? WHERE id = ?')
      .run(b.title ?? existing.title, b.description !== undefined ? b.description : existing.description,
        b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active,
        b.anonymous !== undefined ? (b.anonymous ? 1 : 0) : existing.anonymous, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Submit a response (the current employee, once)
router.post('/:id/respond', (req, res, next) => {
  try {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });
    if (!survey.is_active) return res.status(400).json({ error: 'Survey is closed' });
    const employee_id = req.user.employee_id;
    if (!employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating (1-5) is required' });
    try {
      db.prepare('INSERT INTO survey_responses (survey_id, employee_id, rating, comment) VALUES (?, ?, ?, ?)')
        .run(req.params.id, employee_id, rating, comment || null);
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) return res.status(400).json({ error: 'لقد شاركت في هذا الاستطلاع مسبقاً' });
      throw e;
    }
    res.status(201).json({ message: 'Submitted' });
  } catch (err) {
    next(err);
  }
});

// Delete a survey (managers & HR)
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM surveys WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
