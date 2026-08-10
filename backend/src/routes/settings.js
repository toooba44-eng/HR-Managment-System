const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

const TEXT_FIELDS = ['currency', 'timezone', 'language', 'week_start', 'fiscal_year_start', 'wps_establishment_id', 'wps_bank_code', 'wps_employer_iban'];
const INT_FIELDS = ['work_days_per_week', 'work_hours_per_day', 'probation_months', 'annual_leave_days', 'sick_leave_days'];
const BOOL_FIELDS = ['overtime_enabled', 'remote_work_enabled', 'two_factor_required', 'self_service_enabled'];

// Static roles/permissions reference (organization access model)
const ROLES = [
  { role: 'super_admin', label: 'مدير المنصة', scope: 'كامل المنصة', access: ['إدارة المؤسسات', 'الفوترة', 'إعدادات النظام', 'الوصول الكامل'] },
  { role: 'admin', label: 'مدير النظام', scope: 'المؤسسة بالكامل', access: ['إدارة الموظفين', 'الإعدادات', 'التقارير', 'الرواتب'] },
  { role: 'hr_manager', label: 'مدير الموارد البشرية', scope: 'الموارد البشرية', access: ['إدارة الموظفين', 'التوظيف', 'الإجازات', 'المستندات'] },
  { role: 'department_head', label: 'رئيس قسم', scope: 'القسم', access: ['اعتماد الطلبات', 'متابعة الفريق', 'التقييمات'] },
  { role: 'employee', label: 'موظف', scope: 'ذاتي', access: ['الخدمة الذاتية', 'الطلبات', 'قسائم الراتب'] },
  { role: 'candidate', label: 'مرشح', scope: 'التوظيف', access: ['التقديم على الوظائف', 'متابعة الطلب'] },
];

function getSettings() {
  let s = db.prepare('SELECT * FROM org_settings WHERE id = 1').get();
  if (!s) {
    db.prepare('INSERT INTO org_settings (id) VALUES (1)').run();
    s = db.prepare('SELECT * FROM org_settings WHERE id = 1').get();
  }
  return s;
}

// Get settings + roles reference
router.get('/', (req, res, next) => {
  try {
    res.json({ settings: getSettings(), roles: ROLES });
  } catch (err) {
    next(err);
  }
});

// Update settings (managers & HR)
router.put('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    getSettings(); // ensure row exists
    const updates = [];
    const params = [];
    for (const f of TEXT_FIELDS) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
    }
    for (const f of INT_FIELDS) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(parseInt(req.body[f], 10) || 0); }
    }
    for (const f of BOOL_FIELDS) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f] ? 1 : 0); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    db.prepare(`UPDATE org_settings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run(...params);
    res.json({ message: 'Updated', settings: getSettings() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
