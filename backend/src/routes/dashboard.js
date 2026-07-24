const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// Get dashboard statistics
router.get('/stats', (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total employees
    const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get();

    // Active employees
    const activeEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'نشط'").get();

    // Today's attendance
    const todayAttendance = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'حاضر' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'غائب' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'تأخر' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'عمل عن بعد' THEN 1 ELSE 0 END) as remote,
        ROUND(AVG(work_hours), 1) as avg_hours
      FROM attendance
      WHERE date = ?
    `).get(today);

    // Pending leaves
    const pendingLeaves = db.prepare("SELECT COUNT(*) as count FROM leaves WHERE status = 'معلقة'").get();

    // Departments count
    const departments = db.prepare('SELECT COUNT(*) as count FROM departments').get();

    // New employees this month
    const newEmployees = db.prepare(`
      SELECT COUNT(*) as count FROM employees 
      WHERE strftime('%Y-%m', hire_date) = strftime('%Y-%m', 'now')
    `).get();

    // Recent activity
    const recentActivity = db.prepare(`
      SELECT 
        'attendance' as type,
        a.check_in as timestamp,
        e.full_name,
        e.profile_picture,
        'سجل دخول' as action
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = ?
      UNION ALL
      SELECT 
        'leave' as type,
        l.created_at as timestamp,
        e.full_name,
        e.profile_picture,
        'طلب إجازة' as action
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      WHERE date(l.created_at) = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(today, today);

    res.json({
      employees: {
        total: totalEmployees.count,
        active: activeEmployees.count,
        newThisMonth: newEmployees.count
      },
      attendance: todayAttendance,
      pendingLeaves: pendingLeaves.count,
      departments: departments.count,
      recentActivity
    });
  } catch (err) {
    next(err);
  }
});

// Get weekly attendance chart data
router.get('/attendance-chart', (req, res, next) => {
  try {
    const data = db.prepare(`
      SELECT 
        date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'حاضر' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'غائب' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'تأخر' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE date >= date('now', '-7 days')
      GROUP BY date
      ORDER BY date
    `).all();

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Get department distribution
router.get('/department-distribution', (req, res, next) => {
  try {
    const data = db.prepare(`
      SELECT d.name, d.color, COUNT(e.id) as count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'نشط'
      GROUP BY d.id
      ORDER BY count DESC
    `).all();

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Get upcoming leaves
router.get('/upcoming-leaves', (req, res, next) => {
  try {
    const leaves = db.prepare(`
      SELECT l.*, e.full_name, e.profile_picture, d.name as department_name
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE l.start_date >= date('now') AND l.status = 'موافقة'
      ORDER BY l.start_date
      LIMIT 10
    `).all();

    res.json(leaves);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
