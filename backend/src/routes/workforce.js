const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'hr_manager', 'super_admin', 'department_head'));

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

// Headcount plan per department for a year, vs. actual headcount and open
// requisitions (jobs.department matches the department name and is still
// 'مفتوحة'). Department heads are scoped to their own department.
router.get('/', (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    let where = '';
    const params = [year];
    if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where = 'WHERE d.id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT d.id as department_id, d.name as department_name, d.color,
             p.id as plan_id, p.planned_headcount, p.budget, p.notes,
             (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'نشط') as actual_headcount,
             (SELECT COUNT(*) FROM jobs j WHERE j.department = d.name AND j.status = 'مفتوحة') as open_positions
      FROM departments d
      LEFT JOIN workforce_plans p ON p.department_id = d.id AND p.year = ?
      ${where}
      ORDER BY d.name
    `).all(...params);

    const plans = rows.map((r) => {
      const planned = r.planned_headcount ?? 0;
      return { ...r, variance: r.actual_headcount - planned };
    });

    const summary = plans.reduce((s, p) => {
      s.planned += p.planned_headcount ?? 0;
      s.actual += p.actual_headcount;
      s.open_positions += p.open_positions;
      s.budget += p.budget ?? 0;
      if (p.plan_id && p.variance > 0) s.overStaffed += 1;
      if (p.plan_id && p.variance < 0) s.understaffed += 1;
      return s;
    }, { planned: 0, actual: 0, open_positions: 0, budget: 0, overStaffed: 0, understaffed: 0 });

    res.json({ year, departments: plans, summary });
  } catch (err) { next(err); }
});

// Upsert a department's headcount plan for a year (HR/admin only)
router.put('/:departmentId', requireRole(...MANAGE), (req, res, next) => {
  try {
    const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(req.params.departmentId);
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    const year = parseInt(req.body.year, 10) || new Date().getFullYear();
    const plannedHeadcount = parseInt(req.body.planned_headcount, 10);
    if (!Number.isFinite(plannedHeadcount) || plannedHeadcount < 0) {
      return res.status(400).json({ error: 'Valid planned headcount is required' });
    }
    const budget = req.body.budget != null ? Number(req.body.budget) : 0;
    if (!Number.isFinite(budget) || budget < 0) return res.status(400).json({ error: 'Valid budget is required' });

    db.prepare(`
      INSERT INTO workforce_plans (department_id, year, planned_headcount, budget, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(department_id, year) DO UPDATE SET
        planned_headcount = excluded.planned_headcount, budget = excluded.budget,
        notes = excluded.notes, updated_at = CURRENT_TIMESTAMP
    `).run(req.params.departmentId, year, plannedHeadcount, budget, req.body.notes || null, req.user.employee_id || null);

    res.json({ message: 'Saved' });
  } catch (err) { next(err); }
});

module.exports = router;
