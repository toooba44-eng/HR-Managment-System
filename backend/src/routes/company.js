const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

const PROFILE_FIELDS = [
  'name', 'legal_name', 'cr_number', 'tax_number', 'industry', 'size',
  'founded_year', 'about', 'phone', 'email', 'website', 'address', 'city', 'country',
];

function getProfile() {
  let profile = db.prepare('SELECT * FROM org_profile WHERE id = 1').get();
  if (!profile) {
    db.prepare('INSERT INTO org_profile (id) VALUES (1)').run();
    profile = db.prepare('SELECT * FROM org_profile WHERE id = 1').get();
  }
  return profile;
}

// Company profile + branches
router.get('/', (req, res, next) => {
  try {
    const profile = getProfile();
    const branches = db.prepare(`
      SELECT b.*, m.full_name as manager_name, m.job_title as manager_job_title
      FROM branches b
      LEFT JOIN employees m ON b.manager_id = m.id
      ORDER BY b.is_headquarters DESC, b.id ASC
    `).all();
    res.json({ profile, branches });
  } catch (err) {
    next(err);
  }
});

// Update company profile (managers & HR)
router.put('/profile', requireRole(...MANAGE), (req, res, next) => {
  try {
    getProfile(); // ensure the row exists
    const updates = [];
    const params = [];
    for (const field of PROFILE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    db.prepare(`UPDATE org_profile SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run(...params);
    res.json({ message: 'Updated', profile: getProfile() });
  } catch (err) {
    next(err);
  }
});

// Create a branch (managers & HR)
router.post('/branches', requireRole(...MANAGE), (req, res, next) => {
  try {
    const b = req.body;
    if (!b.name) return res.status(400).json({ error: 'Branch name is required' });
    const result = db.prepare(`
      INSERT INTO branches (name, city, address, phone, manager_id, is_headquarters, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(b.name, b.city || null, b.address || null, b.phone || null,
      b.manager_id || null, b.is_headquarters ? 1 : 0, b.status || 'نشط');
    res.status(201).json({ message: 'Created', branch: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Update a branch (managers & HR)
router.put('/branches/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare(`
      UPDATE branches SET name = ?, city = ?, address = ?, phone = ?, manager_id = ?, is_headquarters = ?, status = ?
      WHERE id = ?
    `).run(
      b.name ?? existing.name,
      b.city !== undefined ? b.city : existing.city,
      b.address !== undefined ? b.address : existing.address,
      b.phone !== undefined ? b.phone : existing.phone,
      b.manager_id !== undefined ? b.manager_id : existing.manager_id,
      b.is_headquarters !== undefined ? (b.is_headquarters ? 1 : 0) : existing.is_headquarters,
      b.status ?? existing.status,
      req.params.id,
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete a branch (managers & HR)
router.delete('/branches/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM branches WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
