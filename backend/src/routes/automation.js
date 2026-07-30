const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

function withSteps(wf) {
  const c = db.prepare('SELECT COUNT(*) AS steps FROM workflow_steps WHERE workflow_id = ?').get(wf.id);
  return { ...wf, steps_count: c.steps || 0 };
}

// List workflows (management-only) with step counts + summary
router.get('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT w.*, c.full_name as created_by_name
      FROM workflows w
      LEFT JOIN employees c ON w.created_by = c.id
      ORDER BY w.is_active DESC, w.id DESC
    `).all();
    const workflows = rows.map(withSteps);
    const summary = workflows.reduce((s, w) => {
      s.total += 1;
      if (w.is_active) s.active += 1;
      s.totalRuns += w.runs_count;
      return s;
    }, { total: 0, active: 0, totalRuns: 0 });
    res.json({ workflows, summary });
  } catch (err) {
    next(err);
  }
});

// Get one workflow with its steps
router.get('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const wf = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Not found' });
    const steps = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC, id ASC').all(req.params.id);
    res.json({ ...withSteps(wf), steps });
  } catch (err) {
    next(err);
  }
});

// Create a workflow (optionally with steps)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { name, trigger_event, description, steps } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db.prepare(`
      INSERT INTO workflows (name, trigger_event, description, created_by)
      VALUES (?, ?, ?, ?)
    `).run(name, trigger_event || 'طلب إجازة', description || null, req.user.employee_id || null);
    const wfId = result.lastInsertRowid;
    if (Array.isArray(steps)) {
      const ins = db.prepare('INSERT INTO workflow_steps (workflow_id, name, action_type, assignee, step_order) VALUES (?, ?, ?, ?, ?)');
      steps.forEach((st, i) => ins.run(wfId, st.name, st.action_type || 'موافقة', st.assignee || 'المدير المباشر', st.step_order || i + 1));
    }
    res.status(201).json({ message: 'Created', workflow: { id: wfId } });
  } catch (err) {
    next(err);
  }
});

// Update a workflow (managers & HR)
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare('UPDATE workflows SET name = ?, trigger_event = ?, description = ?, is_active = ? WHERE id = ?')
      .run(
        b.name ?? existing.name,
        b.trigger_event ?? existing.trigger_event,
        b.description !== undefined ? b.description : existing.description,
        b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active,
        req.params.id,
      );
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Simulate running a workflow (increments the run counter)
router.post('/:id/run', requireRole(...MANAGE), (req, res, next) => {
  try {
    const wf = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Not found' });
    if (!wf.is_active) return res.status(400).json({ error: 'Workflow is inactive' });
    db.prepare('UPDATE workflows SET runs_count = runs_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Executed', runs_count: wf.runs_count + 1 });
  } catch (err) {
    next(err);
  }
});

// Delete a workflow (managers & HR)
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM workflows WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Add a step (managers & HR)
router.post('/:id/steps', requireRole(...MANAGE), (req, res, next) => {
  try {
    const wf = db.prepare('SELECT id FROM workflows WHERE id = ?').get(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Not found' });
    const { name, action_type, assignee } = req.body;
    if (!name) return res.status(400).json({ error: 'Step name is required' });
    const next_order = (db.prepare('SELECT MAX(step_order) AS m FROM workflow_steps WHERE workflow_id = ?').get(req.params.id).m || 0) + 1;
    const result = db.prepare('INSERT INTO workflow_steps (workflow_id, name, action_type, assignee, step_order) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, name, action_type || 'موافقة', assignee || 'المدير المباشر', next_order);
    res.status(201).json({ message: 'Created', step: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Delete a step (managers & HR)
router.delete('/steps/:stepId', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM workflow_steps WHERE id = ?').run(req.params.stepId);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
