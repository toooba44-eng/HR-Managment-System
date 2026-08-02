const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'hr_manager', 'super_admin', 'department_head'));

const CRITERIA = ['technical', 'communication', 'problem_solving', 'culture_fit'];
const RECOMMENDATIONS = ['يوصى بشدة', 'يوصى', 'محايد', 'لا يوصى'];

function overall(row) {
  return Number(((row.technical + row.communication + row.problem_solving + row.culture_fit) / 4).toFixed(2));
}

// All scorecards for a candidate's application, with a comparison summary
router.get('/:applicationId', (req, res, next) => {
  try {
    const app = db.prepare('SELECT id, candidate_name FROM applications WHERE id = ?').get(req.params.applicationId);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const rows = db.prepare(`
      SELECT s.*, e.full_name as interviewer_name, e.job_title as interviewer_title, e.profile_picture as interviewer_picture
      FROM interview_scorecards s
      JOIN employees e ON s.interviewer_id = e.id
      WHERE s.application_id = ?
      ORDER BY s.created_at ASC
    `).all(req.params.applicationId);

    const withOverall = rows.map((r) => ({ ...r, overall: overall(r) }));
    const n = withOverall.length;
    const averages = n === 0 ? null : {
      technical: Number((withOverall.reduce((s, r) => s + r.technical, 0) / n).toFixed(2)),
      communication: Number((withOverall.reduce((s, r) => s + r.communication, 0) / n).toFixed(2)),
      problem_solving: Number((withOverall.reduce((s, r) => s + r.problem_solving, 0) / n).toFixed(2)),
      culture_fit: Number((withOverall.reduce((s, r) => s + r.culture_fit, 0) / n).toFixed(2)),
      overall: Number((withOverall.reduce((s, r) => s + r.overall, 0) / n).toFixed(2)),
    };
    const recommendationCounts = RECOMMENDATIONS.reduce((acc, r) => {
      acc[r] = withOverall.filter((x) => x.recommendation === r).length;
      return acc;
    }, {});
    // Interviewers disagree if the spread between the highest and lowest
    // overall score is 1.5+ points on the 1-5 scale.
    const spread = n > 1 ? Math.max(...withOverall.map((r) => r.overall)) - Math.min(...withOverall.map((r) => r.overall)) : 0;

    const mine = req.user.employee_id
      ? withOverall.find((r) => r.interviewer_id === req.user.employee_id) || null
      : null;

    res.json({
      candidate_name: app.candidate_name,
      scorecards: withOverall,
      averages,
      recommendationCounts,
      disagreement: spread >= 1.5,
      mine,
    });
  } catch (err) { next(err); }
});

// Submit or update my own scorecard for this application
router.put('/:applicationId', (req, res, next) => {
  try {
    if (!req.user.employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.applicationId);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const scores = {};
    for (const key of CRITERIA) {
      const v = parseInt(req.body[key], 10);
      if (!(v >= 1 && v <= 5)) return res.status(400).json({ error: `${key} must be 1-5` });
      scores[key] = v;
    }
    const recommendation = req.body.recommendation;
    if (!RECOMMENDATIONS.includes(recommendation)) return res.status(400).json({ error: 'Invalid recommendation' });

    db.prepare(`
      INSERT INTO interview_scorecards (application_id, interviewer_id, technical, communication, problem_solving, culture_fit, recommendation, notes)
      VALUES (@application_id, @interviewer_id, @technical, @communication, @problem_solving, @culture_fit, @recommendation, @notes)
      ON CONFLICT(application_id, interviewer_id) DO UPDATE SET
        technical = excluded.technical, communication = excluded.communication,
        problem_solving = excluded.problem_solving, culture_fit = excluded.culture_fit,
        recommendation = excluded.recommendation, notes = excluded.notes, updated_at = CURRENT_TIMESTAMP
    `).run({
      application_id: req.params.applicationId,
      interviewer_id: req.user.employee_id,
      ...scores,
      recommendation,
      notes: req.body.notes || null,
    });
    res.json({ message: 'Saved' });
  } catch (err) { next(err); }
});

// Withdraw my own scorecard
router.delete('/:applicationId', (req, res, next) => {
  try {
    db.prepare('DELETE FROM interview_scorecards WHERE application_id = ? AND interviewer_id = ?')
      .run(req.params.applicationId, req.user.employee_id || null);
    res.json({ message: 'Removed' });
  } catch (err) { next(err); }
});

module.exports = router;
