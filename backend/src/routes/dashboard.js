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

// Rich HR/admin overview (single call powering the executive dashboard)
router.get('/hr-overview', requireRole('admin', 'hr_manager', 'super_admin', 'department_head'), (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const one = (sql, ...p) => (db.prepare(sql).get(...p) || {});
    const val = (sql, ...p) => (one(sql, ...p).count ?? 0);

    const total = val('SELECT COUNT(*) as count FROM employees');
    const active = val("SELECT COUNT(*) as count FROM employees WHERE status = 'نشط'");
    const onLeave = val("SELECT COUNT(*) as count FROM employees WHERE status = 'إجازة'");
    const leavers = val("SELECT COUNT(*) as count FROM employees WHERE status IN ('مستقيل', 'مفصول')");
    const newHires30 = val("SELECT COUNT(*) as count FROM employees WHERE hire_date >= date('now','-30 days')");
    const newHires90 = val("SELECT COUNT(*) as count FROM employees WHERE hire_date >= date('now','-90 days')");
    const probation = val("SELECT COUNT(*) as count FROM employees WHERE status = 'نشط' AND hire_date >= date('now','-3 months')");
    const turnover = total ? Math.round((leavers / total) * 1000) / 10 : 0;

    const att = one(`
      SELECT
        SUM(CASE WHEN status='حاضر' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status='تأخر' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status='غائب' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status='عمل عن بعد' THEN 1 ELSE 0 END) as remote
      FROM attendance WHERE date = ?`, today);

    const pendingLeaves = val("SELECT COUNT(*) as count FROM leaves WHERE status='معلقة'");
    let pendingRequests = 0; let pendingExpenses = 0;
    try { pendingRequests = val("SELECT COUNT(*) as count FROM requests WHERE status='معلق'"); } catch { /* table optional */ }
    try { pendingExpenses = val("SELECT COUNT(*) as count FROM expenses WHERE status='معلقة'"); } catch { /* optional */ }
    const pendingApprovals = pendingLeaves + pendingRequests + pendingExpenses;

    const expiringContracts = val("SELECT COUNT(*) as count FROM employees WHERE contract_end IS NOT NULL AND contract_end BETWEEN date('now') AND date('now','+60 days')");
    let expiringDocs = 0;
    try { expiringDocs = val("SELECT COUNT(*) as count FROM documents WHERE expiry_date IS NOT NULL AND expiry_date BETWEEN date('now') AND date('now','+30 days')"); } catch { /* optional */ }

    let openJobs = 0; let todayInterviews = 0;
    try { openJobs = val("SELECT COUNT(*) as count FROM jobs WHERE status='مفتوحة'"); } catch { /* optional */ }
    try { todayInterviews = val("SELECT COUNT(*) as count FROM interviews WHERE date(scheduled_at) = ? AND status='مجدولة'", today); } catch { /* optional */ }

    let overdueReviews = 0;
    try { overdueReviews = val("SELECT COUNT(*) as count FROM goals WHERE target_date IS NOT NULL AND target_date < date('now') AND status != 'مكتملة'"); } catch { /* optional */ }

    // Birthdays & work anniversaries this month
    const birthdays = db.prepare(`
      SELECT full_name, profile_picture, date_of_birth FROM employees
      WHERE date_of_birth IS NOT NULL AND strftime('%m', date_of_birth) = strftime('%m','now') AND status='نشط'
      ORDER BY strftime('%d', date_of_birth) LIMIT 10`).all();
    const anniversaries = db.prepare(`
      SELECT full_name, profile_picture, hire_date,
        (strftime('%Y','now') - strftime('%Y', hire_date)) as years FROM employees
      WHERE strftime('%m', hire_date) = strftime('%m','now') AND status='نشط' AND hire_date < date('now','-11 months')
      ORDER BY strftime('%d', hire_date) LIMIT 10`).all();

    // Distributions
    const byDepartment = db.prepare(`
      SELECT d.name, d.color, COUNT(e.id) as count FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status='نشط'
      GROUP BY d.id ORDER BY count DESC`).all();
    const byNationality = db.prepare(`
      SELECT nationality as name, COUNT(*) as count FROM employees WHERE status='نشط'
      GROUP BY nationality ORDER BY count DESC`).all();
    const byGender = db.prepare(`
      SELECT CASE WHEN marital_status IN ('عزباء','متزوجة','مطلقة','أرملة') THEN 'أنثى' ELSE 'ذكر' END as name,
        COUNT(*) as count FROM employees WHERE status='نشط' GROUP BY name`).all();
    const byAge = db.prepare(`
      SELECT CASE
        WHEN (strftime('%Y','now') - strftime('%Y', date_of_birth)) < 30 THEN 'أقل من 30'
        WHEN (strftime('%Y','now') - strftime('%Y', date_of_birth)) < 40 THEN '30-39'
        WHEN (strftime('%Y','now') - strftime('%Y', date_of_birth)) < 50 THEN '40-49'
        ELSE '50+' END as name, COUNT(*) as count
      FROM employees WHERE date_of_birth IS NOT NULL AND status='نشط' GROUP BY name`).all();
    const byType = db.prepare(`
      SELECT employment_type as name, COUNT(*) as count FROM employees WHERE status='نشط'
      GROUP BY employment_type ORDER BY count DESC`).all();

    // Monthly hiring vs resignation trend (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const hired = val("SELECT COUNT(*) as count FROM employees WHERE strftime('%Y-%m', hire_date) = ?", ym);
      const resigned = val("SELECT COUNT(*) as count FROM employees WHERE status IN ('مستقيل','مفصول') AND strftime('%Y-%m', updated_at) = ?", ym);
      months.push({ month: ym, hired, resigned });
    }

    // Alerts
    const alerts = [];
    if (expiringDocs > 0) alerts.push({ severity: 'تحذير', text: `${expiringDocs} مستند/هوية قارب على الانتهاء` });
    if (expiringContracts > 0) alerts.push({ severity: 'تحذير', text: `${expiringContracts} عقد قارب على الانتهاء` });
    if (pendingApprovals > 0) alerts.push({ severity: 'معلومة', text: `${pendingApprovals} طلب بانتظار الموافقة` });
    if (overdueReviews > 0) alerts.push({ severity: 'تحذير', text: `${overdueReviews} تقييم أداء متأخر` });
    if ((att.absent || 0) > 0) alerts.push({ severity: 'معلومة', text: `${att.absent || 0} موظف غائب اليوم` });

    res.json({
      workforce: { total, active, onLeave, leavers, newHires30, newHires90, probation, turnover },
      attendanceToday: { present: att.present || 0, late: att.late || 0, absent: att.absent || 0, remote: att.remote || 0, onLeave },
      actions: { pendingApprovals, pendingLeaves, pendingRequests, pendingExpenses, expiringContracts, expiringDocs, openJobs, todayInterviews, overdueReviews },
      celebrations: { birthdays, anniversaries },
      distributions: { byDepartment, byNationality, byGender, byAge, byType },
      trend: months,
      alerts,
    });
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
