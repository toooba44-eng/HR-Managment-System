const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// Get all departments
router.get('/', (req, res, next) => {
  try {
    const departments = db.prepare(`
      SELECT d.*, m.full_name as manager_name, m.job_title as manager_job_title,
             p.name as parent_department_name
      FROM departments d
      LEFT JOIN employees m ON d.manager_id = m.id
      LEFT JOIN departments p ON d.parent_department_id = p.id
      ORDER BY d.name
    `).all();

    res.json(departments);
  } catch (err) {
    next(err);
  }
});

// Get department with employees
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const department = db.prepare(`
      SELECT d.*, m.full_name as manager_name, m.job_title as manager_job_title
      FROM departments d
      LEFT JOIN employees m ON d.manager_id = m.id
      WHERE d.id = ?
    `).get(id);

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const employees = db.prepare(`
      SELECT id, full_name, job_title, email, phone, status, profile_picture, hire_date
      FROM employees
      WHERE department_id = ?
      ORDER BY job_title
    `).all(id);

    const subDepartments = db.prepare(`
      SELECT id, name, employee_count
      FROM departments
      WHERE parent_department_id = ?
    `).all(id);

    res.json({ ...department, employees, sub_departments: subDepartments });
  } catch (err) {
    next(err);
  }
});

// Create department (Admin & HR only)
router.post('/', requireRole('admin', 'hr_manager'), (req, res, next) => {
  try {
    const { name, description, color, manager_id, parent_department_id } = req.body;

    const result = db.prepare(`
      INSERT INTO departments (name, description, color, manager_id, parent_department_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, description, color || '#3B82F6', manager_id, parent_department_id);

    res.status(201).json({
      message: 'Department created successfully',
      department: { id: result.lastInsertRowid, ...req.body }
    });
  } catch (err) {
    next(err);
  }
});

// Update department
router.put('/:id', requireRole('admin', 'hr_manager'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, color, manager_id, parent_department_id } = req.body;

    db.prepare(`
      UPDATE departments 
      SET name = ?, description = ?, color = ?, manager_id = ?, parent_department_id = ?
      WHERE id = ?
    `).run(name, description, color, manager_id, parent_department_id, id);

    res.json({ message: 'Department updated successfully' });
  } catch (err) {
    next(err);
  }
});

// Delete department
router.delete('/:id', requireRole('admin'), (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if department has employees
    const count = db.prepare('SELECT COUNT(*) as count FROM employees WHERE department_id = ?').get(id);
    if (count.count > 0) {
      return res.status(400).json({ error: 'Cannot delete department with employees' });
    }

    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Get organization chart
router.get('/org-chart/tree', (req, res, next) => {
  try {
    function buildTree(parentId = null) {
      const depts = db.prepare(`
        SELECT d.*, m.full_name as manager_name, m.job_title as manager_job_title, m.profile_picture
        FROM departments d
        LEFT JOIN employees m ON d.manager_id = m.id
        WHERE d.parent_department_id ${parentId ? '= ?' : 'IS NULL'}
      `).all(parentId || []);

      return depts.map(dept => {
        const employees = db.prepare(`
          SELECT id, full_name, job_title, profile_picture, status
          FROM employees
          WHERE department_id = ? AND id != ?
          ORDER BY job_title
        `).all(dept.id, dept.manager_id || 0);

        return {
          ...dept,
          employees,
          children: buildTree(dept.id)
        };
      });
    }

    const tree = buildTree();
    res.json(tree);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
