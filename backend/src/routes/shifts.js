const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'department_head', 'super_admin'];

// List shifts (role-scoped). Optional ?from&to date range.
router.get('/', (req, res, next) => {
  try {
    const { from, to } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (from) { where += ' AND s.date >= ?'; params.push(from); }
    if (to) { where += ' AND s.date <= ?'; params.push(to); }

    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND s.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT s.*, e.full_name, e.job_title, e.profile_picture
      FROM shifts s
      JOIN employees e ON s.employee_id = e.id
      ${where}
      ORDER BY s.date DESC, e.full_name
    `).all(...params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { employee_id, date, shift_type, start_time, end_time, location, notes } = req.body;
    if (!employee_id || !date) return res.status(400).json({ error: 'Employee and date are required' });
    const r = db.prepare(`INSERT INTO shifts (employee_id, date, shift_type, start_time, end_time, location, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(employee_id, date, shift_type || 'صباحية', start_time || null, end_time || null, location || 'المقر الرئيسي', notes || null, req.user.employee_id || null);
    res.status(201).json({ message: 'Created', shift: { id: r.lastInsertRowid } });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const s = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    const { date, shift_type, start_time, end_time, location, notes } = req.body;
    db.prepare(`UPDATE shifts SET date = ?, shift_type = ?, start_time = ?, end_time = ?, location = ?, notes = ? WHERE id = ?`)
      .run(date ?? s.date, shift_type ?? s.shift_type, start_time ?? s.start_time, end_time ?? s.end_time, location ?? s.location, notes ?? s.notes, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try { db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { next(err); }
});

// List swap requests: an employee sees ones where they are requester or
// target; HR/managers see all (department heads scoped to their own dept).
router.get('/swap-requests', (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND (r.requester_id = ? OR r.target_id = ?)';
      params.push(req.user.employee_id, req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND (req_emp.department_id = ? OR tgt_emp.department_id = ?)'; params.push(dept.department_id, dept.department_id); }
    }
    const rows = db.prepare(`
      SELECT r.*, req_emp.full_name as requester_name, req_emp.profile_picture as requester_picture,
             tgt_emp.full_name as target_name, tgt_emp.profile_picture as target_picture,
             sa.date as shift_a_date, sa.shift_type as shift_a_type,
             sb.date as shift_b_date, sb.shift_type as shift_b_type
      FROM shift_swap_requests r
      JOIN employees req_emp ON r.requester_id = req_emp.id
      JOIN employees tgt_emp ON r.target_id = tgt_emp.id
      JOIN shifts sa ON r.shift_a_id = sa.id
      JOIN shifts sb ON r.shift_b_id = sb.id
      ${where}
      ORDER BY CASE r.status WHEN 'بانتظار موافقة الزميل' THEN 1 WHEN 'بانتظار اعتماد المدير' THEN 2 ELSE 3 END, r.created_at DESC
    `).all(...params);
    res.json(rows);
  } catch (err) { next(err); }
});

// Request a swap: the requester's own shift for a colleague's shift
router.post('/swap-requests', (req, res, next) => {
  try {
    const requesterId = req.user.employee_id;
    if (!requesterId) return res.status(400).json({ error: 'No employee associated with this account' });
    const { shift_a_id, target_id, shift_b_id, reason } = req.body;
    if (!shift_a_id || !target_id || !shift_b_id) {
      return res.status(400).json({ error: 'shift_a_id, target_id and shift_b_id are required' });
    }
    if (Number(target_id) === requesterId) return res.status(400).json({ error: 'لا يمكن تبديل الوردية مع نفسك' });

    const shiftA = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift_a_id);
    if (!shiftA || shiftA.employee_id !== requesterId) return res.status(400).json({ error: 'الوردية الأولى غير صحيحة' });
    const shiftB = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift_b_id);
    if (!shiftB || shiftB.employee_id !== Number(target_id)) return res.status(400).json({ error: 'وردية الزميل غير صحيحة' });

    const result = db.prepare(`
      INSERT INTO shift_swap_requests (requester_id, shift_a_id, target_id, shift_b_id, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(requesterId, shift_a_id, target_id, shift_b_id, reason || null);
    res.status(201).json({ message: 'Requested', swap: { id: result.lastInsertRowid } });
  } catch (err) { next(err); }
});

// The target colleague accepts or declines
router.put('/swap-requests/:id/respond', (req, res, next) => {
  try {
    const swap = db.prepare('SELECT * FROM shift_swap_requests WHERE id = ?').get(req.params.id);
    if (!swap) return res.status(404).json({ error: 'Not found' });
    if (swap.target_id !== req.user.employee_id) return res.status(403).json({ error: 'Access denied' });
    if (swap.status !== 'بانتظار موافقة الزميل') return res.status(400).json({ error: 'Already processed' });

    const { accept } = req.body;
    const nextStatus = accept ? 'بانتظار اعتماد المدير' : 'مرفوض';
    db.prepare('UPDATE shift_swap_requests SET status = ? WHERE id = ?').run(nextStatus, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

// Manager/HR approves — this is what actually swaps the two shifts
router.put('/swap-requests/:id/approve', requireRole(...MANAGE), (req, res, next) => {
  try {
    const swap = db.prepare('SELECT * FROM shift_swap_requests WHERE id = ?').get(req.params.id);
    if (!swap) return res.status(404).json({ error: 'Not found' });
    if (swap.status !== 'بانتظار اعتماد المدير') return res.status(400).json({ error: 'Swap must be accepted by the colleague first' });

    const swapShifts = db.transaction(() => {
      db.prepare('UPDATE shifts SET employee_id = ? WHERE id = ?').run(swap.target_id, swap.shift_a_id);
      db.prepare('UPDATE shifts SET employee_id = ? WHERE id = ?').run(swap.requester_id, swap.shift_b_id);
      db.prepare('UPDATE shift_swap_requests SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('معتمد', req.user.employee_id || null, req.params.id);
    });
    swapShifts();
    res.json({ message: 'Approved' });
  } catch (err) { next(err); }
});

// Manager/HR rejects (also usable to cancel a pending request)
router.put('/swap-requests/:id/reject', requireRole(...MANAGE), (req, res, next) => {
  try {
    const swap = db.prepare('SELECT * FROM shift_swap_requests WHERE id = ?').get(req.params.id);
    if (!swap) return res.status(404).json({ error: 'Not found' });
    if (swap.status === 'معتمد') return res.status(400).json({ error: 'Already approved' });
    db.prepare(`UPDATE shift_swap_requests SET status = 'مرفوض' WHERE id = ?`).run(req.params.id);
    res.json({ message: 'Rejected' });
  } catch (err) { next(err); }
});

module.exports = router;
