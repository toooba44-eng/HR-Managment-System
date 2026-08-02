const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const REQUEST_ROLES = ['department_head', 'admin', 'hr_manager', 'super_admin'];
const REVIEW_ROLES = ['admin', 'hr_manager', 'super_admin'];

function deptOf(employeeId) {
  const row = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(employeeId);
  return row ? row.department_id : null;
}

/* ------------------------- Hiring requests ------------------------- */

router.get('/hiring', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND h.status = ?'; params.push(req.query.status); }
    if (req.user.role === 'department_head') {
      where += ' AND (h.requested_by = ? OR h.department_id = ?)';
      params.push(req.user.employee_id, deptOf(req.user.employee_id));
    }
    const rows = db.prepare(`
      SELECT h.*, d.name as department_name, r.full_name as requested_by_name, rv.full_name as reviewed_by_name
      FROM hiring_requests h
      LEFT JOIN departments d ON h.department_id = d.id
      LEFT JOIN employees r ON h.requested_by = r.id
      LEFT JOIN employees rv ON h.reviewed_by = rv.id
      ${where}
      ORDER BY CASE h.status WHEN 'معلق' THEN 1 WHEN 'موافق عليه' THEN 2 ELSE 3 END, h.created_at DESC
    `).all(...params);
    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status === 'معلق') s.pending += 1;
      if (r.status === 'موافق عليه') s.approved += r.headcount;
      return s;
    }, { total: 0, pending: 0, approved: 0 });
    res.json({ hiring: rows, summary });
  } catch (err) { next(err); }
});

router.post('/hiring', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    const b = req.body;
    if (!b.job_title) return res.status(400).json({ error: 'Job title is required' });
    const department_id = b.department_id || deptOf(req.user.employee_id);
    const result = db.prepare(`
      INSERT INTO hiring_requests (requested_by, department_id, job_title, headcount, employment_type, urgency, justification)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.employee_id || null, department_id, b.job_title, b.headcount || 1,
      b.employment_type || 'دوام كامل', b.urgency || 'عادي', b.justification || null);
    res.status(201).json({ message: 'Created', hiring: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/hiring/:id/status', requireRole(...REVIEW_ROLES), (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['موافق عليه', 'مرفوض', 'معلق'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const exists = db.prepare('SELECT id FROM hiring_requests WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE hiring_requests SET status = ?, reviewed_by = ? WHERE id = ?')
      .run(status, req.user.employee_id || null, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/hiring/:id', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    const row = db.prepare('SELECT requested_by FROM hiring_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'department_head' && row.requested_by !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM hiring_requests WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

/* ------------------------- Interviews ------------------------- */

router.get('/interviews', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND i.status = ?'; params.push(req.query.status); }
    if (req.user.role === 'department_head') {
      where += ' AND (i.interviewer_id = ? OR i.created_by = ?)';
      params.push(req.user.employee_id, req.user.employee_id);
    }
    const rows = db.prepare(`
      SELECT i.*, iv.full_name as interviewer_name
      FROM interviews i
      LEFT JOIN employees iv ON i.interviewer_id = iv.id
      ${where}
      ORDER BY CASE i.status WHEN 'مجدولة' THEN 1 WHEN 'مكتملة' THEN 2 ELSE 3 END, i.scheduled_at DESC
    `).all(...params);
    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status === 'مجدولة') s.scheduled += 1;
      if (r.status === 'مكتملة') s.completed += 1;
      return s;
    }, { total: 0, scheduled: 0, completed: 0 });
    res.json({ interviews: rows, summary });
  } catch (err) { next(err); }
});

router.post('/interviews', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    const b = req.body;
    if (!b.candidate_name) return res.status(400).json({ error: 'Candidate name is required' });
    const result = db.prepare(`
      INSERT INTO interviews (candidate_name, job_title, interviewer_id, scheduled_at, mode, stage, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(b.candidate_name, b.job_title || null, b.interviewer_id || req.user.employee_id || null,
      b.scheduled_at || null, b.mode || 'حضوري', b.stage || 'مبدئية', req.user.employee_id || null);
    res.status(201).json({ message: 'Created', interview: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/interviews/:id', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM interviews WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare(`
      UPDATE interviews SET candidate_name = ?, job_title = ?, interviewer_id = ?, scheduled_at = ?,
        mode = ?, stage = ?, status = ?, rating = ?, notes = ? WHERE id = ?
    `).run(
      b.candidate_name ?? existing.candidate_name,
      b.job_title !== undefined ? b.job_title : existing.job_title,
      b.interviewer_id !== undefined ? b.interviewer_id : existing.interviewer_id,
      b.scheduled_at !== undefined ? b.scheduled_at : existing.scheduled_at,
      b.mode ?? existing.mode,
      b.stage ?? existing.stage,
      b.status ?? existing.status,
      b.rating !== undefined ? b.rating : existing.rating,
      b.notes !== undefined ? b.notes : existing.notes,
      req.params.id,
    );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/interviews/:id', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM interviews WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

/* ------------------------- Promotions & transfers ------------------------- */

router.get('/promotions', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND p.status = ?'; params.push(req.query.status); }
    if (req.user.role === 'department_head') {
      where += ' AND (p.requested_by = ? OR e.department_id = ?)';
      params.push(req.user.employee_id, deptOf(req.user.employee_id));
    }
    const rows = db.prepare(`
      SELECT p.*, e.full_name, e.job_title, e.profile_picture, e.department_id,
             nd.name as new_department_name, r.full_name as requested_by_name, rv.full_name as reviewed_by_name
      FROM promotions p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments nd ON p.new_department_id = nd.id
      LEFT JOIN employees r ON p.requested_by = r.id
      LEFT JOIN employees rv ON p.reviewed_by = rv.id
      ${where}
      ORDER BY CASE p.status WHEN 'معلق' THEN 1 WHEN 'موافق عليه' THEN 2 ELSE 3 END, p.created_at DESC
    `).all(...params);
    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status === 'معلق') s.pending += 1;
      if (r.type === 'ترقية') s.promotions += 1; else s.transfers += 1;
      return s;
    }, { total: 0, pending: 0, promotions: 0, transfers: 0 });
    res.json({ promotions: rows, summary });
  } catch (err) { next(err); }
});

router.post('/promotions', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    const b = req.body;
    if (!b.employee_id) return res.status(400).json({ error: 'Employee is required' });
    const emp = db.prepare('SELECT id, job_title FROM employees WHERE id = ?').get(b.employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    const result = db.prepare(`
      INSERT INTO promotions (employee_id, type, current_title, new_title, new_department_id, effective_date, justification, requested_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(b.employee_id, b.type || 'ترقية', b.current_title || emp.job_title, b.new_title || null,
      b.new_department_id || null, b.effective_date || null, b.justification || null, req.user.employee_id || null);
    res.status(201).json({ message: 'Created', promotion: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

// Approving a promotion/transfer applies it to the employee record — the
// new title and/or department were captured specifically for this, but
// were never actually written through until now.
router.put('/promotions/:id/status', requireRole(...REVIEW_ROLES), (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['موافق عليه', 'مرفوض', 'معلق'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const promo = db.prepare('SELECT * FROM promotions WHERE id = ?').get(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE promotions SET status = ?, reviewed_by = ? WHERE id = ?')
      .run(status, req.user.employee_id || null, req.params.id);

    if (status === 'موافق عليه') {
      const updates = [];
      const params = [];
      if (promo.new_title) { updates.push('job_title = ?'); params.push(promo.new_title); }
      if (promo.new_department_id) { updates.push('department_id = ?'); params.push(promo.new_department_id); }
      if (updates.length) {
        params.push(promo.employee_id);
        db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }
    }
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/promotions/:id', requireRole(...REQUEST_ROLES), (req, res, next) => {
  try {
    const row = db.prepare('SELECT requested_by FROM promotions WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'department_head' && row.requested_by !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.prepare('DELETE FROM promotions WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
