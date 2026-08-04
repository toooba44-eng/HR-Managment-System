const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { notifyEmployee } = require('../utils/notify');
const router = express.Router();

router.use(authenticateToken);

// مركز الموافقات — a single inbox aggregating every approval-shaped workflow
// already in the system. This file is a facade: each source keeps its own
// table, status enum, and role rules; the functions below only mirror the
// exact same approve/reject logic each source's own route already performs.
// There is no separate state machine here.

function deptOf(employeeId) {
  const row = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(employeeId);
  return row ? row.department_id : null;
}

// A department head's `pending()` list is already scoped to their own
// department, but the actual approve/reject write below is a separate code
// path (this file never calls back into the source route) — without this
// check a department head who knows or guesses a record ID from another
// department could still approve/reject it directly via this endpoint.
function sameDept(user, employeeId) {
  if (user.role !== 'department_head') return true;
  const d = deptOf(user.employee_id);
  return d != null && d === deptOf(employeeId);
}
// Same guard for shift swaps, which involve two employees — either one
// being in the department head's department is enough (matches `pending()`).
function sameDeptEither(user, employeeIdA, employeeIdB) {
  if (user.role !== 'department_head') return true;
  const d = deptOf(user.employee_id);
  if (d == null) return false;
  return deptOf(employeeIdA) === d || deptOf(employeeIdB) === d;
}

const DAY_MS = 86400000;
const daysSince = (dateStr) => Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS);

// Uniform age-based priority/overdue heuristic applied across every source,
// since most sources don't carry their own urgency field. A source-specific
// "urgent" flag (only hiring_requests has one) can bump priority to high
// regardless of age.
const OVERDUE_DAYS = 5;
function priorityOf(days, forceHigh) {
  if (forceHigh || days > 7) return 'مرتفعة';
  if (days > 3) return 'متوسطة';
  return 'عادية';
}

// ---------------------------------------------------------------------
// Source adapters. Each: `eligible(user)` gates whether this role can act
// as a reviewer at all (mirrors the source route's own requireRole list —
// including its quirks, so the inbox never offers an action that would
// then 403 against the real endpoint). `pending(user)` returns raw rows
// already scoped exactly like the source's own list endpoint (department
// heads scoped to their department). `normalize(row)` builds the common
// display shape. `approve`/`reject` perform the same write the source's
// own endpoint would.
// ---------------------------------------------------------------------

const SOURCES = {
  leave: {
    label: 'إجازة',
    table: 'leaves',
    eligible: (u) => ['admin', 'hr_manager', 'department_head'].includes(u.role),
    pending(user) {
      let where = "WHERE l.status = 'معلقة'";
      const params = [];
      if (user.role === 'department_head') { where += ' AND e.department_id = ?'; params.push(deptOf(user.employee_id)); }
      return db.prepare(`
        SELECT l.*, e.full_name, e.job_title, e.profile_picture
        FROM leaves l JOIN employees e ON l.employee_id = e.id
        ${where} ORDER BY l.created_at ASC
      `).all(...params);
    },
    normalize: (r) => ({ title: `طلب إجازة ${r.type}`, subtitle: `${r.days_count} يوم · ${r.start_date} إلى ${r.end_date}`, amount: null }),
    approve(id, user) {
      const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
      if (!leave || leave.status !== 'معلقة') return false;
      if (!sameDept(user, leave.employee_id)) return false;
      db.prepare(`UPDATE leaves SET status = 'موافقة', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`).run(user.employee_id || null, id);
      const balanceField = { سنوية: 'annual_leave_balance', مرضية: 'sick_leave_balance', طارئة: 'emergency_leave_balance' }[leave.type];
      if (balanceField) db.prepare(`UPDATE employees SET ${balanceField} = ${balanceField} - ? WHERE id = ?`).run(leave.days_count, leave.employee_id);
      return true;
    },
    reject(id, user) {
      const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(id);
      if (!leave || leave.status !== 'معلقة') return false;
      if (!sameDept(user, leave.employee_id)) return false;
      db.prepare(`UPDATE leaves SET status = 'مرفوضة', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`).run(user.employee_id || null, id);
      return true;
    },
  },
  attendance: {
    label: 'تصحيح حضور',
    table: 'attendance_corrections',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending(user) {
      let where = "WHERE c.status = 'معلق'";
      const params = [];
      if (user.role === 'department_head') { where += ' AND e.department_id = ?'; params.push(deptOf(user.employee_id)); }
      return db.prepare(`
        SELECT c.*, e.full_name, e.job_title, e.profile_picture
        FROM attendance_corrections c JOIN employees e ON c.employee_id = e.id
        ${where} ORDER BY c.created_at ASC
      `).all(...params);
    },
    normalize: (r) => ({ title: 'تصحيح حضور', subtitle: `${r.date} · ${r.requested_check_in || '—'} إلى ${r.requested_check_out || '—'}`, amount: null }),
    approve(id, user) {
      const c = db.prepare('SELECT * FROM attendance_corrections WHERE id = ?').get(id);
      if (!c || c.status !== 'معلق') return false;
      if (!sameDept(user, c.employee_id)) return false;
      db.prepare(`UPDATE attendance_corrections SET status = 'موافق عليه', reviewed_by = ? WHERE id = ?`).run(user.employee_id || null, id);
      const checkIn = c.requested_check_in ? `${c.date} ${c.requested_check_in}` : null;
      const checkOut = c.requested_check_out ? `${c.date} ${c.requested_check_out}` : null;
      const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(c.employee_id, c.date);
      const finalIn = checkIn || (existing ? existing.check_in : null);
      const finalOut = checkOut || (existing ? existing.check_out : null);
      let hours = existing ? (existing.work_hours || 0) : 0;
      if (finalIn && finalOut) hours = Math.max(0, Math.round(((new Date(finalOut) - new Date(finalIn)) / 3600000) * 10) / 10);
      if (existing) {
        db.prepare('UPDATE attendance SET check_in = ?, check_out = ?, work_hours = ?, status = ? WHERE id = ?').run(finalIn, finalOut, hours, 'حاضر', existing.id);
      } else {
        db.prepare('INSERT INTO attendance (employee_id, date, check_in, check_out, work_hours, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(c.employee_id, c.date, finalIn, finalOut, hours, 'حاضر', 'تصحيح معتمد');
      }
      return true;
    },
    reject(id, user) {
      const c = db.prepare('SELECT * FROM attendance_corrections WHERE id = ?').get(id);
      if (!c || c.status !== 'معلق') return false;
      if (!sameDept(user, c.employee_id)) return false;
      db.prepare(`UPDATE attendance_corrections SET status = 'مرفوض', reviewed_by = ? WHERE id = ?`).run(user.employee_id || null, id);
      return true;
    },
  },
  overtime: {
    label: 'عمل إضافي',
    table: 'requests',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending: (user) => pendingRequestsByType(user, 'عمل إضافي'),
    normalize: (r) => ({ title: 'طلب عمل إضافي', subtitle: r.subject, amount: null }),
    approve: (id, user) => resolveRequest(id, 'مقبولة', user),
    reject: (id, user) => resolveRequest(id, 'مرفوضة', user),
  },
  remote: {
    label: 'عمل عن بُعد',
    table: 'requests',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending: (user) => pendingRequestsByType(user, 'عمل عن بعد'),
    normalize: (r) => ({ title: 'طلب عمل عن بُعد', subtitle: r.subject, amount: null }),
    approve: (id, user) => resolveRequest(id, 'مقبولة', user),
    reject: (id, user) => resolveRequest(id, 'مرفوضة', user),
  },
  hiring: {
    label: 'طلب توظيف',
    table: 'hiring_requests',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => db.prepare(`
      SELECT h.*, d.name as department_name FROM hiring_requests h
      LEFT JOIN departments d ON h.department_id = d.id
      WHERE h.status = 'معلق' ORDER BY h.created_at ASC
    `).all(),
    normalize: (r) => ({ title: `طلب توظيف: ${r.job_title}`, subtitle: `${r.department_name || ''} · ${r.headcount} شاغر`, amount: null, forceHigh: r.urgency === 'عاجل' }),
    approve: (id, user) => setStatus('hiring_requests', id, 'موافق عليه', user, 'معلق'),
    reject: (id, user) => setStatus('hiring_requests', id, 'مرفوض', user, 'معلق'),
  },
  expense: {
    label: 'مصروف',
    table: 'expenses',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending: (user) => pendingExpensesByType(user, 'مصروف'),
    normalize: (r) => ({ title: r.category || 'مصروف', subtitle: r.description || '', amount: r.amount }),
    approve: (id, user) => expenseInDept(id, user) && setStatus('expenses', id, 'معتمدة', user, 'معلقة', 'approved_by'),
    reject: (id, user) => expenseInDept(id, user) && setStatus('expenses', id, 'مرفوضة', user, 'معلقة', 'approved_by'),
  },
  advance: {
    label: 'سلفة',
    table: 'expenses',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending: (user) => pendingExpensesByType(user, 'سلفة'),
    normalize: (r) => ({ title: 'طلب سلفة', subtitle: r.description || '', amount: r.amount }),
    approve: (id, user) => expenseInDept(id, user) && setStatus('expenses', id, 'معتمدة', user, 'معلقة', 'approved_by'),
    reject: (id, user) => expenseInDept(id, user) && setStatus('expenses', id, 'مرفوضة', user, 'معلقة', 'approved_by'),
  },
  payroll: {
    label: 'مسير رواتب',
    table: 'payroll_runs',
    eligible: (u) => ['super_admin', 'admin', 'hr_manager'].includes(u.role),
    pending: () => db.prepare(`SELECT * FROM payroll_runs WHERE status = 'قيد المراجعة' ORDER BY created_at ASC`).all(),
    normalize: (r) => ({ title: `مسير رواتب ${r.month}/${r.year}`, subtitle: `${r.employee_count} موظف`, amount: r.total_net, noReject: true }),
    approve(id, user) {
      const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(id);
      if (!run || run.status !== 'قيد المراجعة') return false;
      db.prepare(`UPDATE payroll_runs SET status = 'معتمد', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`).run(user.employee_id || null, id);
      return true;
    },
    reject: () => false, // payroll has no rejection concept — forward-only lifecycle
  },
  promotion: {
    label: 'ترقية',
    table: 'promotions',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => pendingPromotionsByType('ترقية'),
    normalize: (r) => ({ title: `ترقية: ${r.current_title || ''} ← ${r.new_title || ''}`, subtitle: r.justification || '', amount: null }),
    approve: (id, user) => approvePromotion(id, user),
    reject: (id, user) => setStatus('promotions', id, 'مرفوض', user, 'معلق'),
  },
  transfer: {
    label: 'نقل',
    table: 'promotions',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => pendingPromotionsByType('نقل'),
    normalize: (r) => ({ title: `نقل${r.new_department_name ? ' إلى ' + r.new_department_name : ''}`, subtitle: r.justification || '', amount: null }),
    approve: (id, user) => approvePromotion(id, user),
    reject: (id, user) => setStatus('promotions', id, 'مرفوض', user, 'معلق'),
  },
  document: {
    label: 'مستند للتوقيع',
    table: 'signatures',
    eligible: () => true, // scoped by countersigner_id, not role
    pending: (user) => db.prepare(`
      SELECT sg.*, e.full_name, e.job_title, e.profile_picture
      FROM signatures sg JOIN employees e ON sg.employee_id = e.id
      WHERE sg.countersigner_id = ? AND sg.countersigner_status = 'بانتظار التوقيع'
      ORDER BY sg.created_at ASC
    `).all(user.employee_id || 0),
    normalize: (r) => ({ title: r.title, subtitle: `${r.doc_type} · بعد توقيع الموظف`, amount: null }),
    approve(id, user) {
      const sig = db.prepare('SELECT * FROM signatures WHERE id = ?').get(id);
      if (!sig || sig.countersigner_id !== user.employee_id || sig.countersigner_status !== 'بانتظار التوقيع') return false;
      const now = new Date().toISOString();
      db.prepare(`UPDATE signatures SET countersigner_status = 'موقّع', countersigned_at = ?, status = 'موقّع', signed_at = ? WHERE id = ?`).run(now, now, id);
      return true;
    },
    reject(id, user) {
      const sig = db.prepare('SELECT * FROM signatures WHERE id = ?').get(id);
      if (!sig || sig.countersigner_id !== user.employee_id || sig.countersigner_status !== 'بانتظار التوقيع') return false;
      db.prepare(`UPDATE signatures SET status = 'مرفوض', countersigner_status = 'مرفوض' WHERE id = ?`).run(id);
      return true;
    },
  },
  raise: {
    label: 'زيادة راتب',
    table: 'compensation_requests',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => db.prepare(`
      SELECT r.*, e.full_name, e.job_title, e.profile_picture FROM compensation_requests r
      JOIN employees e ON r.employee_id = e.id WHERE r.status = 'معلق' ORDER BY r.created_at ASC
    `).all(),
    normalize: (r) => ({ title: `طلب زيادة راتب`, subtitle: `${r.current_base_salary} ← ${r.requested_base_salary}`, amount: r.requested_base_salary - r.current_base_salary }),
    approve: (id, user) => approveRaise(id, user),
    reject: (id, user) => setStatus('compensation_requests', id, 'مرفوض', user, 'معلق', 'reviewed_by', 'reviewed_at'),
  },
  asset: {
    label: 'شراء أصل',
    table: 'asset_requests',
    eligible: (u) => ['admin', 'hr_manager', 'super_admin'].includes(u.role),
    pending: () => db.prepare(`
      SELECT r.*, e.full_name, e.job_title, e.profile_picture FROM asset_requests r
      JOIN employees e ON r.employee_id = e.id WHERE r.status = 'معلق' ORDER BY r.created_at ASC
    `).all(),
    normalize: (r) => ({ title: r.item_name, subtitle: r.justification || '', amount: r.estimated_cost }),
    approve: (id, user) => setStatus('asset_requests', id, 'معتمد', user, 'معلق', 'reviewed_by', 'reviewed_at'),
    reject: (id, user) => setStatus('asset_requests', id, 'مرفوض', user, 'معلق', 'reviewed_by', 'reviewed_at'),
  },
  shift_swap: {
    label: 'تبديل وردية',
    table: 'shift_swap_requests',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending(user) {
      let where = "WHERE r.status = 'بانتظار اعتماد المدير'";
      const params = [];
      if (user.role === 'department_head') {
        where += ' AND (req_emp.department_id = ? OR tgt_emp.department_id = ?)';
        const d = deptOf(user.employee_id);
        params.push(d, d);
      }
      return db.prepare(`
        SELECT r.*, req_emp.full_name as requester_name, req_emp.job_title as requester_job_title, req_emp.profile_picture as requester_picture,
               tgt_emp.full_name as target_name,
               sa.date as shift_a_date, sa.shift_type as shift_a_type,
               sb.date as shift_b_date, sb.shift_type as shift_b_type
        FROM shift_swap_requests r
        JOIN employees req_emp ON r.requester_id = req_emp.id
        JOIN employees tgt_emp ON r.target_id = tgt_emp.id
        JOIN shifts sa ON r.shift_a_id = sa.id
        JOIN shifts sb ON r.shift_b_id = sb.id
        ${where} ORDER BY r.created_at ASC
      `).all(...params);
    },
    normalize: (r) => ({
      title: 'طلب تبديل وردية',
      subtitle: r.requester_name && r.target_name ? `${r.requester_name} ↔ ${r.target_name} · ${r.shift_a_date || ''} إلى ${r.shift_b_date || ''}` : '',
      amount: null,
    }),
    approve(id, user) {
      const swap = db.prepare('SELECT * FROM shift_swap_requests WHERE id = ?').get(id);
      if (!swap || swap.status !== 'بانتظار اعتماد المدير') return false;
      if (!sameDeptEither(user, swap.requester_id, swap.target_id)) return false;
      const run = db.transaction(() => {
        db.prepare('UPDATE shifts SET employee_id = ? WHERE id = ?').run(swap.target_id, swap.shift_a_id);
        db.prepare('UPDATE shifts SET employee_id = ? WHERE id = ?').run(swap.requester_id, swap.shift_b_id);
        db.prepare(`UPDATE shift_swap_requests SET status = 'معتمد', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`).run(user.employee_id || null, id);
      });
      run();
      return true;
    },
    reject(id, user) {
      const swap = db.prepare('SELECT * FROM shift_swap_requests WHERE id = ?').get(id);
      if (!swap || swap.status !== 'بانتظار اعتماد المدير') return false;
      if (!sameDeptEither(user, swap.requester_id, swap.target_id)) return false;
      db.prepare(`UPDATE shift_swap_requests SET status = 'مرفوض' WHERE id = ?`).run(id);
      return true;
    },
  },
  timesheet: {
    label: 'جدول ساعات',
    table: 'timesheets',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending(user) {
      let where = "WHERE t.status = 'مقدّم'";
      const params = [];
      if (user.role === 'department_head') { where += ' AND e.department_id = ?'; params.push(deptOf(user.employee_id)); }
      return db.prepare(`
        SELECT t.*, e.full_name, e.job_title, e.profile_picture
        FROM timesheets t JOIN employees e ON t.employee_id = e.id
        ${where} ORDER BY t.created_at ASC
      `).all(...params);
    },
    normalize: (r) => ({ title: `جدول ساعات: ${r.project}`, subtitle: `${r.date} · ${r.hours} ساعة${r.task ? ' · ' + r.task : ''}`, amount: null }),
    approve: (id, user) => timesheetInDept(id, user) && setStatus('timesheets', id, 'معتمد', user, 'مقدّم', 'approved_by'),
    reject: (id, user) => timesheetInDept(id, user) && setStatus('timesheets', id, 'مرفوض', user, 'مقدّم', 'approved_by'),
  },
  // Every other type in the generic `requests` table (شهادة، خطاب، تحديث
  // بيانات، شكوى/استفسار، أخرى...) — everything that isn't already claimed
  // by the dedicated overtime/remote sources above, so no pending request
  // type is ever silently excluded from the inbox as new types get added.
  service_request: {
    label: 'طلب موظف',
    table: 'requests',
    eligible: (u) => ['admin', 'hr_manager', 'department_head', 'super_admin'].includes(u.role),
    pending(user) {
      let where = "WHERE r.status = 'معلقة' AND r.type NOT IN ('عمل إضافي', 'عمل عن بعد')";
      const params = [];
      if (user.role === 'department_head') { where += ' AND e.department_id = ?'; params.push(deptOf(user.employee_id)); }
      return db.prepare(`
        SELECT r.*, e.full_name, e.job_title, e.profile_picture
        FROM requests r JOIN employees e ON r.employee_id = e.id
        ${where} ORDER BY r.created_at ASC
      `).all(...params);
    },
    normalize: (r) => ({ title: `${r.type}: ${r.subject}`, subtitle: r.details || '', amount: null }),
    approve: (id, user) => resolveRequest(id, 'مقبولة', user),
    reject: (id, user) => resolveRequest(id, 'مرفوضة', user),
  },
};

function pendingRequestsByType(user, type) {
  let where = "WHERE r.status = 'معلقة' AND r.type = ?";
  const params = [type];
  if (user.role === 'department_head') { where += ' AND e.department_id = ?'; params.push(deptOf(user.employee_id)); }
  return db.prepare(`
    SELECT r.*, e.full_name, e.job_title, e.profile_picture
    FROM requests r JOIN employees e ON r.employee_id = e.id
    ${where} ORDER BY r.created_at ASC
  `).all(...params);
}
function resolveRequest(id, status, user) {
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!r || r.status !== 'معلقة') return false;
  if (!sameDept(user, r.employee_id)) return false;
  db.prepare('UPDATE requests SET status = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, user.employee_id || null, id);
  return true;
}

function expenseInDept(id, user) {
  const row = db.prepare('SELECT employee_id FROM expenses WHERE id = ?').get(id);
  return !row || sameDept(user, row.employee_id);
}

function timesheetInDept(id, user) {
  const row = db.prepare('SELECT employee_id FROM timesheets WHERE id = ?').get(id);
  return !row || sameDept(user, row.employee_id);
}

function pendingExpensesByType(user, type) {
  let where = "WHERE x.status = 'معلقة' AND x.type = ?";
  const params = [type];
  if (user.role === 'department_head') { where += ' AND e.department_id = ?'; params.push(deptOf(user.employee_id)); }
  return db.prepare(`
    SELECT x.*, e.full_name, e.job_title, e.profile_picture
    FROM expenses x JOIN employees e ON x.employee_id = e.id
    ${where} ORDER BY x.created_at ASC
  `).all(...params);
}

function pendingPromotionsByType(type) {
  return db.prepare(`
    SELECT p.*, e.full_name, e.job_title, e.profile_picture, nd.name as new_department_name
    FROM promotions p JOIN employees e ON p.employee_id = e.id
    LEFT JOIN departments nd ON p.new_department_id = nd.id
    WHERE p.status = 'معلق' AND p.type = ?
    ORDER BY p.created_at ASC
  `).all(type);
}
function approvePromotion(id, user) {
  const promo = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
  if (!promo || promo.status !== 'معلق') return false;
  db.prepare('UPDATE promotions SET status = ?, reviewed_by = ? WHERE id = ?').run('موافق عليه', user.employee_id || null, id);
  const updates = []; const params = [];
  if (promo.new_title) { updates.push('job_title = ?'); params.push(promo.new_title); }
  if (promo.new_department_id) { updates.push('department_id = ?'); params.push(promo.new_department_id); }
  if (updates.length) { params.push(promo.employee_id); db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...params); }
  return true;
}

function approveRaise(id, user) {
  const reqRow = db.prepare('SELECT * FROM compensation_requests WHERE id = ?').get(id);
  if (!reqRow || reqRow.status !== 'معلق') return false;
  db.prepare('UPDATE compensation_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?').run('معتمد', user.employee_id || null, id);
  const total = (r) => r.base_salary + r.housing_allowance + r.transport_allowance + r.other_allowances + r.bonus;
  const pkg = reqRow.compensation_id ? db.prepare('SELECT * FROM compensation WHERE id = ?').get(reqRow.compensation_id) : null;
  if (pkg) {
    const oldTotal = total(pkg);
    const newTotal = oldTotal - pkg.base_salary + reqRow.requested_base_salary;
    db.prepare('UPDATE compensation SET base_salary = ? WHERE id = ?').run(reqRow.requested_base_salary, pkg.id);
    if (newTotal !== oldTotal) {
      db.prepare(`INSERT INTO compensation_history (compensation_id, employee_id, old_total, new_total, old_base_salary, new_base_salary, reason, changed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(pkg.id, reqRow.employee_id, oldTotal, newTotal, pkg.base_salary, reqRow.requested_base_salary, reqRow.reason, user.employee_id || null);
    }
  } else {
    db.prepare(`INSERT INTO compensation (employee_id, base_salary, notes, created_by) VALUES (?, ?, ?, ?)`)
      .run(reqRow.employee_id, reqRow.requested_base_salary, reqRow.reason, user.employee_id || null);
  }
  return true;
}

// Generic single-column status flip, guarded by the row's current status —
// used by the several sources whose approve/reject is nothing more than that.
function setStatus(table, id, newStatus, user, expectedStatus, reviewerCol = 'reviewed_by', reviewedAtCol = null) {
  const row = db.prepare(`SELECT status FROM ${table} WHERE id = ?`).get(id);
  if (!row || row.status !== expectedStatus) return false;
  if (reviewedAtCol) {
    db.prepare(`UPDATE ${table} SET status = ?, ${reviewerCol} = ?, ${reviewedAtCol} = CURRENT_TIMESTAMP WHERE id = ?`).run(newStatus, user.employee_id || null, id);
  } else {
    db.prepare(`UPDATE ${table} SET status = ?, ${reviewerCol} = ? WHERE id = ?`).run(newStatus, user.employee_id || null, id);
  }
  return true;
}

function buildItem(source, row) {
  const cfg = SOURCES[source];
  const extra = cfg.normalize(row);
  const days = daysSince(row.created_at);
  return {
    key: `${source}:${row.id}`,
    source,
    source_label: cfg.label,
    id: row.id,
    title: extra.title,
    subtitle: extra.subtitle,
    amount: extra.amount ?? null,
    employee_name: row.full_name || row.requester_name || null,
    employee_job_title: row.job_title || row.requester_job_title || null,
    employee_picture: row.profile_picture || row.requester_picture || null,
    created_at: row.created_at,
    days_pending: days,
    priority: priorityOf(days, extra.forceHigh),
    overdue: days > OVERDUE_DAYS,
    can_reject: !extra.noReject,
  };
}

// My approvals: every pending item across every source this user is
// eligible to review.
router.get('/mine', (req, res, next) => {
  try {
    const items = [];
    for (const [source, cfg] of Object.entries(SOURCES)) {
      if (!cfg.eligible(req.user)) continue;
      for (const row of cfg.pending(req.user)) items.push(buildItem(source, row));
    }
    items.sort((a, b) => (b.priority === 'مرتفعة') - (a.priority === 'مرتفعة') || b.days_pending - a.days_pending);
    const summary = items.reduce((s, i) => {
      s.total += 1;
      if (i.overdue) s.overdue += 1;
      if (i.priority === 'مرتفعة') s.highPriority += 1;
      s.bySource[i.source] = (s.bySource[i.source] || 0) + 1;
      return s;
    }, { total: 0, overdue: 0, highPriority: 0, bySource: {} });
    res.json({ items, summary });
  } catch (err) { next(err); }
});

// Every decision — approve or reject, from any source — is logged here so
// "reject with reason" always has somewhere to persist the reason (several
// source tables have no note column of their own) and so approval history
// works uniformly.
function logDecision(source, id, decision, reason, user) {
  const cfg = SOURCES[source];
  const raw = db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(id);
  if (!raw) return;
  const title = cfg.normalize(raw).title;
  db.prepare(`
    INSERT INTO approval_actions_log (source, record_id, action, reason, title, employee_id, actor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(source, id, decision, reason || null, title, raw.employee_id || null, user.employee_id || null);
}

// Notifies whoever the record concerns once a decision has been applied.
// Most sources key off `employee_id`; shift swaps involve two parties
// instead (`requester_id`/`target_id`) — notify every one present.
function notifyDecision(source, id, decision, user) {
  const cfg = SOURCES[source];
  const raw = db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(id);
  if (!raw) return;
  const title = cfg.normalize(raw).title;
  const employeeIds = [...new Set([raw.employee_id, raw.requester_id, raw.target_id, raw.requested_by].filter(Boolean))];
  for (const empId of employeeIds) {
    if (empId === user.employee_id) continue; // don't notify the approver about their own action
    notifyEmployee(empId, {
      title: decision === 'approve' ? `تمت الموافقة: ${title}` : `تم الرفض: ${title}`,
      message: cfg.normalize(raw).subtitle || '',
      type: decision === 'approve' ? 'success' : 'error',
      link: '/approvals',
    });
  }
}

router.post('/:source/:id/:decision', (req, res, next) => {
  try {
    const { source, id, decision } = req.params;
    const cfg = SOURCES[source];
    if (!cfg) return res.status(404).json({ error: 'Unknown approval source' });
    if (!cfg.eligible(req.user)) return res.status(403).json({ error: 'Access denied' });
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });
    const reason = (req.body.reason || '').trim();
    if (decision === 'reject' && !reason) return res.status(400).json({ error: 'سبب الرفض مطلوب' });

    const ok = decision === 'approve' ? cfg.approve(id, req.user) : cfg.reject(id, req.user);
    if (!ok) return res.status(400).json({ error: 'لا يمكن تنفيذ هذا الإجراء — قد يكون الطلب غير موجود أو تم البت فيه بالفعل، أو لا يدعم هذا النوع الرفض' });

    logDecision(source, id, decision, reason, req.user);
    notifyDecision(source, id, decision, req.user);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

// Recent approval decisions across every source (last 100)
router.get('/history', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT h.*, e.full_name as employee_name, a.full_name as actor_name
      FROM approval_actions_log h
      LEFT JOIN employees e ON h.employee_id = e.id
      LEFT JOIN employees a ON h.actor_id = a.id
      ORDER BY h.created_at DESC
      LIMIT 100
    `).all();
    res.json(rows.map((r) => ({ ...r, source_label: SOURCES[r.source]?.label || r.source })));
  } catch (err) { next(err); }
});

// Bulk approve a mixed batch — best-effort: each item is applied
// independently so one failure doesn't roll back the rest.
router.post('/bulk-approve', (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const results = items.map(({ source, id }) => {
      const cfg = SOURCES[source];
      if (!cfg || !cfg.eligible(req.user)) return { source, id, ok: false };
      const ok = cfg.approve(id, req.user);
      if (ok) logDecision(source, id, 'approve', '', req.user);
      return { source, id, ok };
    });
    res.json({ succeeded: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok), results });
  } catch (err) { next(err); }
});

module.exports = router;
