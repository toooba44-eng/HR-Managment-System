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

module.exports = router;
