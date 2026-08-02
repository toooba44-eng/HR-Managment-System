const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ACTIVE_COMP_JOIN, buildPayItem } = require('../utils/payCalc');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['super_admin', 'admin', 'hr_manager'];
const STATUSES = ['مسودة', 'قيد المراجعة', 'معتمد', 'مصروف'];
// Forward-only lifecycle: each status can only move to the next one (or be
// deleted while still a draft) — no skipping straight to "مصروف".
const NEXT_STATUS = { مسودة: 'قيد المراجعة', 'قيد المراجعة': 'معتمد', معتمد: 'مصروف' };

// Payroll overview across employees (HR / admins only).
// Net = basic + allowances − GOSI (10% of basic, simple model). Uses each
// employee's active compensation package when one exists.
router.get('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { department_id } = req.query;
    let where = "WHERE e.status = 'نشط'";
    const params = [];
    if (department_id) { where += ' AND e.department_id = ?'; params.push(department_id); }

    const rows = db.prepare(`
      SELECT e.id, e.full_name, e.job_title, e.employee_number, e.salary, e.allowances,
             d.name as department_name,
             c.base_salary, c.housing_allowance, c.transport_allowance, c.other_allowances, c.bonus
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ${ACTIVE_COMP_JOIN}
      ${where}
      ORDER BY e.salary DESC
    `).all(...params);

    const payroll = rows.map((r) => ({ ...r, ...buildPayItem(r) }));

    const totals = payroll.reduce(
      (t, p) => ({
        basic: t.basic + p.basic,
        allowances: t.allowances + p.allowances,
        deductions: t.deductions + p.deductions,
        net: t.net + p.net,
      }),
      { basic: 0, allowances: 0, deductions: 0, net: 0 }
    );

    res.json({ payroll, totals, count: payroll.length });
  } catch (err) {
    next(err);
  }
});

// List payroll runs (most recent first), with a summary
router.get('/runs', requireRole(...MANAGE), (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT r.*, creator.full_name as created_by_name, approver.full_name as approved_by_name
      FROM payroll_runs r
      LEFT JOIN employees creator ON r.created_by = creator.id
      LEFT JOIN employees approver ON r.approved_by = approver.id
      ORDER BY r.year DESC, r.month DESC
    `).all();
    const summary = {
      total: rows.length,
      drafts: rows.filter((r) => r.status === 'مسودة').length,
      pendingApproval: rows.filter((r) => r.status === 'قيد المراجعة').length,
      paid: rows.filter((r) => r.status === 'مصروف').length,
    };
    res.json({ runs: rows, summary });
  } catch (err) { next(err); }
});

// One run + its per-employee line items
router.get('/runs/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const run = db.prepare(`
      SELECT r.*, creator.full_name as created_by_name, approver.full_name as approved_by_name
      FROM payroll_runs r
      LEFT JOIN employees creator ON r.created_by = creator.id
      LEFT JOIN employees approver ON r.approved_by = approver.id
      WHERE r.id = ?
    `).get(req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    const items = db.prepare(`
      SELECT i.*, e.full_name, e.job_title, e.profile_picture, e.employee_number
      FROM payroll_run_items i
      JOIN employees e ON i.employee_id = e.id
      WHERE i.run_id = ?
      ORDER BY i.net DESC
    `).all(req.params.id);
    res.json({ ...run, items });
  } catch (err) { next(err); }
});

// Create a new run for a month/year, snapshotting all active employees'
// current pay figures (same simple GOSI model as the live overview above).
router.post('/runs', requireRole(...MANAGE), (req, res, next) => {
  try {
    const month = parseInt(req.body.month, 10);
    const year = parseInt(req.body.year, 10);
    if (!(month >= 1 && month <= 12) || !year) {
      return res.status(400).json({ error: 'Valid month and year are required' });
    }
    const existing = db.prepare('SELECT id FROM payroll_runs WHERE month = ? AND year = ?').get(month, year);
    if (existing) return res.status(400).json({ error: 'يوجد مسير رواتب لهذا الشهر بالفعل' });

    const employees = db.prepare(`
      SELECT e.id, e.salary, e.allowances,
             c.base_salary, c.housing_allowance, c.transport_allowance, c.other_allowances, c.bonus
      FROM employees e
      ${ACTIVE_COMP_JOIN}
      WHERE e.status = 'نشط'
    `).all();
    if (employees.length === 0) return res.status(400).json({ error: 'لا يوجد موظفون نشطون لإنشاء المسير' });

    const items = employees.map((e) => ({ employee_id: e.id, ...buildPayItem(e) }));
    const totalNet = items.reduce((s, i) => s + i.net, 0);

    const result = db.prepare(`
      INSERT INTO payroll_runs (month, year, total_net, employee_count, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(month, year, totalNet, items.length, req.user.employee_id || null);

    const runId = result.lastInsertRowid;
    const insItem = db.prepare(`
      INSERT INTO payroll_run_items
        (run_id, employee_id, basic, housing_allowance, transport_allowance, other_allowances, bonus, allowances, deductions, net)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const i of items) {
      insItem.run(runId, i.employee_id, i.basic, i.housing_allowance, i.transport_allowance, i.other_allowances, i.bonus, i.allowances, i.deductions, i.net);
    }

    res.status(201).json({ message: 'Created', run: { id: runId } });
  } catch (err) { next(err); }
});

// Advance a run one step in its lifecycle (مسودة → قيد المراجعة → معتمد → مصروف)
router.put('/runs/:id/status', requireRole(...MANAGE), (req, res, next) => {
  try {
    const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (status !== NEXT_STATUS[run.status]) {
      return res.status(400).json({ error: `لا يمكن الانتقال من "${run.status}" إلى "${status}" مباشرة` });
    }

    if (status === 'معتمد') {
      db.prepare('UPDATE payroll_runs SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(status, req.user.employee_id || null, req.params.id);
    } else if (status === 'مصروف') {
      db.prepare('UPDATE payroll_runs SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    } else {
      db.prepare('UPDATE payroll_runs SET status = ? WHERE id = ?').run(status, req.params.id);
    }
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

// Delete a run — only while still a draft, to protect an audit trail once
// review/approval has started.
router.delete('/runs/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const run = db.prepare('SELECT status FROM payroll_runs WHERE id = ?').get(req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    if (run.status !== 'مسودة') return res.status(400).json({ error: 'لا يمكن حذف مسير بعد بدء المراجعة' });
    db.prepare('DELETE FROM payroll_runs WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
