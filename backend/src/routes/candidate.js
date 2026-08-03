const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const PROFILE_FIELDS = [
  'full_name', 'headline', 'summary', 'skills', 'experience_years',
  'education', 'phone', 'location', 'linkedin', 'portfolio', 'cv_file_name',
];

function getProfile(email, fallbackName) {
  let profile = db.prepare('SELECT * FROM candidate_profiles WHERE email = ?').get(email);
  if (!profile) {
    db.prepare('INSERT INTO candidate_profiles (email, full_name) VALUES (?, ?)').run(email, fallbackName || null);
    profile = db.prepare('SELECT * FROM candidate_profiles WHERE email = ?').get(email);
  }
  return profile;
}

// Get the current candidate's professional profile
router.get('/profile', (req, res, next) => {
  try {
    res.json({ profile: getProfile(req.user.email, req.user.name) });
  } catch (err) {
    next(err);
  }
});

// Update the professional profile / CV metadata
router.put('/profile', (req, res, next) => {
  try {
    getProfile(req.user.email, req.user.name);
    const updates = [];
    const params = [];
    for (const f of PROFILE_FIELDS) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(f === 'experience_years' ? (parseInt(req.body[f], 10) || 0) : req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(req.user.email);
    db.prepare(`UPDATE candidate_profiles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE email = ?`).run(...params);
    res.json({ message: 'Updated', profile: getProfile(req.user.email) });
  } catch (err) {
    next(err);
  }
});

// Join / leave the talent pool
router.put('/talent-pool', (req, res, next) => {
  try {
    getProfile(req.user.email, req.user.name);
    const join = !!req.body.join;
    db.prepare('UPDATE candidate_profiles SET in_talent_pool = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?')
      .run(join ? 1 : 0, req.user.email);
    res.json({ message: join ? 'Joined' : 'Left', in_talent_pool: join ? 1 : 0 });
  } catch (err) {
    next(err);
  }
});

/* ------------------------- Interviews (candidate view) ------------------------- */

router.get('/interviews', (req, res, next) => {
  try {
    const { mode } = req.query;
    let where = 'WHERE email = ?';
    const params = [req.user.email];
    if (mode) { where += ' AND mode = ?'; params.push(mode); }
    const rows = db.prepare(`
      SELECT * FROM candidate_interviews ${where}
      ORDER BY CASE status WHEN 'مجدولة' THEN 1 WHEN 'مكتملة' THEN 2 ELSE 3 END, scheduled_at ASC
    `).all(...params);
    res.json({ interviews: rows });
  } catch (err) { next(err); }
});

/* ------------------------- Required documents ------------------------- */

router.get('/documents', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM candidate_documents WHERE email = ? ORDER BY status ASC, id ASC').all(req.user.email);
    const summary = rows.reduce((s, r) => { s.total += 1; if (r.status === 'مرفوع') s.uploaded += 1; return s; }, { total: 0, uploaded: 0 });
    res.json({ documents: rows, summary });
  } catch (err) { next(err); }
});

router.put('/documents/:id', (req, res, next) => {
  try {
    const doc = db.prepare('SELECT * FROM candidate_documents WHERE id = ? AND email = ?').get(req.params.id, req.user.email);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const upload = req.body.status !== 'مطلوب';
    db.prepare('UPDATE candidate_documents SET status = ?, file_name = ?, uploaded_at = ? WHERE id = ?')
      .run(upload ? 'مرفوع' : 'مطلوب', upload ? (req.body.file_name || `${doc.title}.pdf`) : null, upload ? new Date().toISOString() : null, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

/* ------------------------- Pre-employment forms ------------------------- */

router.get('/forms', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM candidate_forms WHERE email = ? ORDER BY status ASC, id ASC').all(req.user.email);
    const summary = rows.reduce((s, r) => { s.total += 1; if (r.status === 'مكتمل') s.completed += 1; return s; }, { total: 0, completed: 0 });
    res.json({ forms: rows, summary });
  } catch (err) { next(err); }
});

router.put('/forms/:id/submit', (req, res, next) => {
  try {
    const form = db.prepare('SELECT * FROM candidate_forms WHERE id = ? AND email = ?').get(req.params.id, req.user.email);
    if (!form) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE candidate_forms SET status = ?, response = ?, submitted_at = ? WHERE id = ?')
      .run('مكتمل', req.body.response || null, new Date().toISOString(), req.params.id);
    res.json({ message: 'Submitted' });
  } catch (err) { next(err); }
});

/* ------------------------- Job offer ------------------------- */

router.get('/offer', (req, res, next) => {
  try {
    const offer = db.prepare('SELECT * FROM job_offers WHERE email = ? ORDER BY id DESC LIMIT 1').get(req.user.email);
    res.json({ offer: offer || null });
  } catch (err) { next(err); }
});

router.put('/offer/:id', (req, res, next) => {
  try {
    const offer = db.prepare('SELECT * FROM job_offers WHERE id = ? AND email = ?').get(req.params.id, req.user.email);
    if (!offer) return res.status(404).json({ error: 'Not found' });
    const { status } = req.body;
    if (!['مقبول', 'مرفوض'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (offer.status !== 'معلّق') return res.status(400).json({ error: 'Already responded' });
    db.prepare('UPDATE job_offers SET status = ?, responded_at = ? WHERE id = ?').run(status, new Date().toISOString(), req.params.id);

    // Reflect the candidate's decision on the matching pipeline application
    // (matched by email + job title) so HR sees it move to "تم التوظيف" or
    // "مرفوض" without a separate manual step.
    const app = db.prepare(`
      SELECT a.id FROM applications a JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_email = ? AND j.title = ? AND a.stage = 'عرض وظيفي'
      ORDER BY a.id DESC LIMIT 1
    `).get(req.user.email, offer.job_title);
    if (app) {
      const nextStage = status === 'مقبول' ? 'تم التوظيف' : 'مرفوض';
      db.prepare('UPDATE applications SET stage = ?, status = ? WHERE id = ?').run(nextStage, status, app.id);
    }

    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

/* ------------------------- Contact messages ------------------------- */

router.get('/messages', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM candidate_messages WHERE email = ? ORDER BY created_at ASC').all(req.user.email);
    res.json({ messages: rows });
  } catch (err) { next(err); }
});

router.post('/messages', (req, res, next) => {
  try {
    if (!req.body.body) return res.status(400).json({ error: 'Message body is required' });
    const result = db.prepare('INSERT INTO candidate_messages (email, sender, body) VALUES (?, ?, ?)')
      .run(req.user.email, 'candidate', req.body.body);
    res.status(201).json({ message: 'Sent', id: result.lastInsertRowid });
  } catch (err) { next(err); }
});

module.exports = router;
