const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// Self-service: any employee can report a safety incident/hazard they
// witnessed or were involved in — "see something, say something". The
// reporter is always the logged-in user (never trusted from the body), so
// opening this up carries no privilege-escalation risk. Registered before
// the HR/admin gate below so it stays open to anyone.
router.post('/', (req, res, next) => {
  try {
    if (!req.user.employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    const { title, type, employee_id, location, severity, description, incident_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const r = db.prepare(`INSERT INTO incidents (title, type, employee_id, location, severity, description, incident_date, reported_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(title, type || 'ملاحظة سلامة', employee_id || null, location || null, severity || 'متوسطة', description || null,
        incident_date || new Date().toISOString().split('T')[0], req.user.employee_id);
    res.status(201).json({ message: 'Created', incident: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

// Employee self-view: status of incidents I reported — no investigation
// detail or CAPA actions, just enough to track that it was received.
router.get('/mine', (req, res, next) => {
  try {
    if (!req.user.employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    const rows = db.prepare(`
      SELECT id, title, type, severity, status, incident_date, created_at
      FROM incidents WHERE reported_by = ? ORDER BY created_at DESC
    `).all(req.user.employee_id);
    res.json(rows);
  } catch (err) { next(err); }
});

router.use(requireRole('admin', 'hr_manager', 'super_admin'));

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT i.*, e.full_name, reporter.full_name as reported_by_name,
        (SELECT COUNT(*) FROM incident_actions a WHERE a.incident_id = i.id) as actions_count,
        (SELECT COUNT(*) FROM incident_actions a WHERE a.incident_id = i.id AND a.status = 'مفتوح') as open_actions_count
      FROM incidents i
      LEFT JOIN employees e ON i.employee_id = e.id
      LEFT JOIN employees reporter ON i.reported_by = reporter.id
      ORDER BY CASE i.status WHEN 'مفتوح' THEN 1 WHEN 'قيد المعالجة' THEN 2 ELSE 3 END,
        CASE i.severity WHEN 'عالية' THEN 1 WHEN 'متوسطة' THEN 2 ELSE 3 END, i.created_at DESC
    `).all();
    const summary = {
      total: rows.length,
      open: rows.filter((r) => r.status !== 'مغلق').length,
      high: rows.filter((r) => r.severity === 'عالية').length,
      openActions: rows.reduce((s, r) => s + r.open_actions_count, 0),
    };
    res.json({ incidents: rows, summary });
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const i = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!i) return res.status(404).json({ error: 'Not found' });
    const { status } = req.body;
    db.prepare('UPDATE incidents SET status = ? WHERE id = ?').run(status || i.status, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try { db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
});

// Corrective / preventive actions (CAPA) for an incident
router.get('/:id/actions', (req, res, next) => {
  try {
    const incident = db.prepare('SELECT id FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    const rows = db.prepare(`
      SELECT a.*, owner.full_name as owner_name, owner.profile_picture as owner_picture
      FROM incident_actions a
      LEFT JOIN employees owner ON a.owner_id = owner.id
      WHERE a.incident_id = ?
      ORDER BY CASE a.status WHEN 'مفتوح' THEN 1 ELSE 2 END, a.due_date IS NULL, a.due_date ASC
    `).all(req.params.id);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:id/actions', (req, res, next) => {
  try {
    const incident = db.prepare('SELECT id FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    const { description, owner_id, due_date } = req.body;
    if (!description) return res.status(400).json({ error: 'Description is required' });
    const r = db.prepare(`
      INSERT INTO incident_actions (incident_id, description, owner_id, due_date, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, description, owner_id || null, due_date || null, req.user.employee_id || null);
    res.status(201).json({ message: 'Created', action: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/actions/:actionId', (req, res, next) => {
  try {
    const action = db.prepare('SELECT * FROM incident_actions WHERE id = ?').get(req.params.actionId);
    if (!action) return res.status(404).json({ error: 'Not found' });
    const { status, description, owner_id, due_date } = req.body;
    const nextStatus = status && ['مفتوح', 'مكتمل'].includes(status) ? status : action.status;
    db.prepare(`
      UPDATE incident_actions SET
        description = ?, owner_id = ?, due_date = ?, status = ?,
        completed_at = CASE WHEN ? = 'مكتمل' AND status != 'مكتمل' THEN CURRENT_TIMESTAMP
                            WHEN ? != 'مكتمل' THEN NULL ELSE completed_at END
      WHERE id = ?
    `).run(
      description ?? action.description,
      owner_id !== undefined ? owner_id : action.owner_id,
      due_date !== undefined ? due_date : action.due_date,
      nextStatus, nextStatus, nextStatus,
      req.params.actionId
    );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/actions/:actionId', (req, res, next) => {
  try {
    db.prepare('DELETE FROM incident_actions WHERE id = ?').run(req.params.actionId);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
