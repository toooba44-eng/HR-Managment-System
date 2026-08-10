const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { runWorkflow } = require('../utils/workflowEngine');
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

// Get one workflow with its steps, conditions, and recent execution history
router.get('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const wf = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Not found' });
    const steps = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC, id ASC').all(req.params.id);
    const conditions = db.prepare('SELECT * FROM workflow_conditions WHERE workflow_id = ? ORDER BY id ASC').all(req.params.id);
    const runs = db.prepare(`
      SELECT r.*, e.full_name as employee_name
      FROM workflow_runs r LEFT JOIN employees e ON r.employee_id = e.id
      WHERE r.workflow_id = ? ORDER BY r.id DESC LIMIT 20
    `).all(req.params.id).map((r) => ({ ...r, detail: JSON.parse(r.detail || '[]') }));
    res.json({ ...withSteps(wf), steps, conditions, runs });
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

// Test-run a workflow against a specific employee: evaluates its real
// conditions and, if they pass, actually performs its steps (sends the
// notification, creates the task, opens the approval request) — the same
// runWorkflow() a live trigger uses, not a simulation.
router.post('/:id/run', requireRole(...MANAGE), (req, res, next) => {
  try {
    const wf = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Not found' });
    if (!wf.is_active) return res.status(400).json({ error: 'Workflow is inactive' });
    const employeeId = req.body.employee_id ? parseInt(req.body.employee_id, 10) : null;
    if (!employeeId) return res.status(400).json({ error: 'اختر موظفاً لتجربة تشغيل المسار عليه' });
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(employeeId);
    if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

    const run = runWorkflow(wf, employeeId);
    const updated = db.prepare('SELECT runs_count FROM workflows WHERE id = ?').get(req.params.id);
    res.json({ message: run.matched ? 'تم التنفيذ' : 'الشروط لم تتحقق لهذا الموظف', runs_count: updated.runs_count, run });
  } catch (err) {
    next(err);
  }
});

// ------------------------- Conditions -------------------------

const COND_FIELDS = ['department', 'nationality', 'contract_type', 'salary', 'work_location', 'status'];
const COND_OPS = ['eq', 'ne', 'gt', 'lt', 'contains'];

router.post('/:id/conditions', requireRole(...MANAGE), (req, res, next) => {
  try {
    const wf = db.prepare('SELECT id FROM workflows WHERE id = ?').get(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Not found' });
    const { field, operator, value } = req.body;
    if (!COND_FIELDS.includes(field)) return res.status(400).json({ error: 'Invalid field' });
    if (!COND_OPS.includes(operator)) return res.status(400).json({ error: 'Invalid operator' });
    if (value === undefined || value === null || String(value).trim() === '') return res.status(400).json({ error: 'Value is required' });
    const result = db.prepare('INSERT INTO workflow_conditions (workflow_id, field, operator, value) VALUES (?, ?, ?, ?)')
      .run(req.params.id, field, operator, String(value).trim());
    res.status(201).json({ message: 'Created', condition: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

router.delete('/conditions/:condId', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM workflow_conditions WHERE id = ?').run(req.params.condId);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
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
