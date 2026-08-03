const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// Proficiency scale (1-5) labels
const LEVELS = {
  1: 'مبتدئ', 2: 'أساسي', 3: 'كفؤ', 4: 'متقدم', 5: 'خبير',
};

// Employee self-view: my own skill ratings — no manager role required,
// registered before the requireRole gate below so it stays open to anyone.
router.get('/me', (req, res, next) => {
  try {
    if (!req.user.employee_id) return res.status(400).json({ error: 'No employee associated with this account' });
    const rows = db.prepare('SELECT skill, level, updated_at FROM employee_skills WHERE employee_id = ? ORDER BY level DESC, skill ASC').all(req.user.employee_id);
    res.json({
      skills: rows.map((r) => ({ ...r, label: LEVELS[r.level] })),
      levels: LEVELS,
      gaps: rows.filter((r) => r.level <= 2).length,
    });
  } catch (err) { next(err); }
});

router.use(requireRole('admin', 'hr_manager', 'super_admin', 'department_head'));

// department_head is scoped to their own department; everyone else sees all
function scope(req) {
  if (req.user.role === 'department_head') {
    const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
    return dept ? { where: 'AND e.department_id = ?', param: dept.department_id } : { where: '', param: null };
  }
  return { where: '', param: null };
}

// A department head may only rate/remove skills within their own
// department — the matrix endpoint already scopes this way; enforce it
// here too so it can't be reached directly by ID for someone else's
// department.
function inManagedScope(user, employeeId) {
  if (user.role !== 'department_head') return true;
  const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(user.employee_id);
  const empDept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(employeeId);
  return !!dept && !!empDept && dept.department_id === empDept.department_id;
}

// Competency matrix: active employees x distinct skills, with per-skill stats
router.get('/matrix', (req, res, next) => {
  try {
    const s = scope(req);
    const params = s.param != null ? [s.param] : [];
    const employees = db.prepare(`
      SELECT e.id, e.full_name, e.job_title, e.profile_picture, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'نشط' ${s.where}
      ORDER BY e.full_name
    `).all(...params);

    const ids = employees.map((e) => e.id);
    let ratings = [];
    if (ids.length) {
      ratings = db.prepare(`
        SELECT employee_id, skill, level FROM employee_skills
        WHERE employee_id IN (${ids.map(() => '?').join(',')})
      `).all(...ids);
    }

    // ratings[employeeId][skill] = level
    const byEmp = {};
    const skillSet = new Map(); // skill -> { sum, count }
    for (const r of ratings) {
      (byEmp[r.employee_id] ||= {})[r.skill] = r.level;
      const agg = skillSet.get(r.skill) || { sum: 0, count: 0 };
      agg.sum += r.level; agg.count += 1;
      skillSet.set(r.skill, agg);
    }

    const skills = [...skillSet.keys()].sort((a, b) => a.localeCompare(b, 'ar')).map((name) => {
      const agg = skillSet.get(name);
      return { name, avg: Number((agg.sum / agg.count).toFixed(1)), rated: agg.count };
    });

    const summary = {
      employees: employees.length,
      skills: skills.length,
      ratings: ratings.length,
      // "gaps": ratings at the two lowest levels (needing development)
      gaps: ratings.filter((r) => r.level <= 2).length,
      experts: ratings.filter((r) => r.level === 5).length,
    };

    res.json({
      employees: employees.map((e) => ({ ...e, skills: byEmp[e.id] || {} })),
      skills,
      levels: LEVELS,
      summary,
    });
  } catch (err) { next(err); }
});

// Upsert a skill rating for an employee
router.put('/:employeeId', (req, res, next) => {
  try {
    const { skill, level } = req.body;
    const name = (skill || '').trim();
    if (!name) return res.status(400).json({ error: 'Skill is required' });
    if (![1, 2, 3, 4, 5].includes(level)) return res.status(400).json({ error: 'Level must be 1-5' });
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(req.params.employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (!inManagedScope(req.user, req.params.employeeId)) return res.status(403).json({ error: 'Access denied' });
    db.prepare(`
      INSERT INTO employee_skills (employee_id, skill, level, created_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(employee_id, skill) DO UPDATE SET level = excluded.level, updated_at = CURRENT_TIMESTAMP
    `).run(req.params.employeeId, name, level, req.user.employee_id || null);
    res.json({ message: 'Saved' });
  } catch (err) { next(err); }
});

// Remove a skill rating for an employee
router.delete('/:employeeId', (req, res, next) => {
  try {
    const name = (req.query.skill || '').trim();
    if (!name) return res.status(400).json({ error: 'Skill is required' });
    if (!inManagedScope(req.user, req.params.employeeId)) return res.status(403).json({ error: 'Access denied' });
    db.prepare('DELETE FROM employee_skills WHERE employee_id = ? AND skill = ?').run(req.params.employeeId, name);
    res.json({ message: 'Removed' });
  } catch (err) { next(err); }
});

module.exports = router;
