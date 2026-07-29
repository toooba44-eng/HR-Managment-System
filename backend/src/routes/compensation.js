const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];
const NUM = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const total = (r) => r.base_salary + r.housing_allowance + r.transport_allowance + r.other_allowances + r.bonus;

// List compensation packages (role-scoped) with a payroll summary
router.get('/', (req, res, next) => {
  try {
    const { status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND c.status = ?'; params.push(status); }

    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND c.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT c.*, e.full_name, e.job_title, e.profile_picture, d.name as department_name
      FROM compensation c
      JOIN employees e ON c.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${where}
      ORDER BY CASE c.status WHEN 'نشط' THEN 1 ELSE 2 END, c.base_salary DESC
    `).all(...params);

    const items = rows.map((r) => ({ ...r, total_salary: total(r) }));
    const active = items.filter((r) => r.status === 'نشط');
    const summary = {
      count: items.length,
      monthlyPayroll: active.reduce((s, r) => s + r.total_salary, 0),
      avgSalary: active.length ? Math.round(active.reduce((s, r) => s + r.total_salary, 0) / active.length) : 0,
      insured: active.filter((r) => r.insurance_class !== 'بدون').length,
    };

    res.json({ compensation: items, summary });
  } catch (err) {
    next(err);
  }
});

// Create a compensation package (managers & HR)
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const b = req.body;
    if (!b.employee_id) return res.status(400).json({ error: 'Employee is required' });
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(b.employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const result = db.prepare(`
      INSERT INTO compensation
        (employee_id, grade, base_salary, housing_allowance, transport_allowance,
         other_allowances, bonus, insurance_class, effective_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.employee_id, b.grade || 'الدرجة الأولى', NUM(b.base_salary), NUM(b.housing_allowance),
      NUM(b.transport_allowance), NUM(b.other_allowances), NUM(b.bonus),
      b.insurance_class || 'الفئة أ', b.effective_date || null, b.notes || null,
      req.user.employee_id || null,
    );
    res.status(201).json({ message: 'Created', compensation: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Update a compensation package (managers & HR)
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM compensation WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare(`
      UPDATE compensation SET
        grade = ?, base_salary = ?, housing_allowance = ?, transport_allowance = ?,
        other_allowances = ?, bonus = ?, insurance_class = ?, effective_date = ?,
        status = ?, notes = ?
      WHERE id = ?
    `).run(
      b.grade ?? existing.grade,
      b.base_salary != null ? NUM(b.base_salary) : existing.base_salary,
      b.housing_allowance != null ? NUM(b.housing_allowance) : existing.housing_allowance,
      b.transport_allowance != null ? NUM(b.transport_allowance) : existing.transport_allowance,
      b.other_allowances != null ? NUM(b.other_allowances) : existing.other_allowances,
      b.bonus != null ? NUM(b.bonus) : existing.bonus,
      b.insurance_class ?? existing.insurance_class,
      b.effective_date ?? existing.effective_date,
      b.status ?? existing.status,
      b.notes ?? existing.notes,
      req.params.id,
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete a compensation package (managers & HR)
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM compensation WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
