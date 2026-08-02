const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager', 'super_admin'];

// List signature requests (role-scoped) with summary. An employee sees
// envelopes where they are either the primary signer or the countersigner.
router.get('/', (req, res, next) => {
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (req.query.status) { where += ' AND sg.status = ?'; params.push(req.query.status); }
    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND (sg.employee_id = ? OR sg.countersigner_id = ?)';
      params.push(req.user.employee_id, req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }
    const rows = db.prepare(`
      SELECT sg.*, e.full_name, e.job_title, e.profile_picture, req.full_name as requested_by_name,
             cs.full_name as countersigner_name
      FROM signatures sg
      JOIN employees e ON sg.employee_id = e.id
      LEFT JOIN employees req ON sg.requested_by = req.id
      LEFT JOIN employees cs ON sg.countersigner_id = cs.id
      ${where}
      ORDER BY
        CASE sg.status WHEN 'بانتظار التوقيع' THEN 1 WHEN 'موقّع' THEN 2 ELSE 3 END,
        sg.created_at DESC
    `).all(...params);

    const summary = rows.reduce((s, r) => {
      s.total += 1;
      if (r.status === 'بانتظار التوقيع') s.pending += 1;
      if (r.status === 'موقّع') s.signed += 1;
      return s;
    }, { total: 0, pending: 0, signed: 0 });

    res.json({ signatures: rows, summary });
  } catch (err) {
    next(err);
  }
});

// Request a signature (managers & HR); an optional countersigner (e.g. the
// employee's manager) signs only after the employee has.
router.post('/', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { employee_id, title, doc_type, countersigner_id } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'Employee is required' });
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (countersigner_id) {
      if (Number(countersigner_id) === Number(employee_id)) {
        return res.status(400).json({ error: 'يجب أن يكون الموقّع المساعد مختلفاً عن الموظف' });
      }
      const cs = db.prepare('SELECT id FROM employees WHERE id = ?').get(countersigner_id);
      if (!cs) return res.status(404).json({ error: 'Countersigner not found' });
    }
    const result = db.prepare(`
      INSERT INTO signatures (employee_id, title, doc_type, requested_by, countersigner_id, countersigner_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employee_id, title, doc_type || 'عقد', req.user.employee_id || null,
      countersigner_id || null, countersigner_id ? 'بانتظار الموظف' : 'غير مطلوب');
    res.status(201).json({ message: 'Requested', signature: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Primary employee signs first
router.put('/:id/sign', (req, res, next) => {
  try {
    const sig = db.prepare('SELECT * FROM signatures WHERE id = ?').get(req.params.id);
    if (!sig) return res.status(404).json({ error: 'Not found' });
    if (sig.employee_id !== req.user.employee_id) return res.status(403).json({ error: 'Access denied' });
    if (sig.status !== 'بانتظار التوقيع' || sig.employee_signed_at) return res.status(400).json({ error: 'Already processed' });

    const now = new Date().toISOString();
    if (sig.countersigner_id) {
      db.prepare(`UPDATE signatures SET employee_signed_at = ?, countersigner_status = 'بانتظار التوقيع' WHERE id = ?`)
        .run(now, req.params.id);
    } else {
      db.prepare(`UPDATE signatures SET employee_signed_at = ?, status = 'موقّع', signed_at = ? WHERE id = ?`)
        .run(now, now, req.params.id);
    }
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Countersigner signs only once the primary employee has
router.put('/:id/countersign', (req, res, next) => {
  try {
    const sig = db.prepare('SELECT * FROM signatures WHERE id = ?').get(req.params.id);
    if (!sig) return res.status(404).json({ error: 'Not found' });
    if (sig.countersigner_id !== req.user.employee_id) return res.status(403).json({ error: 'Access denied' });
    if (sig.countersigner_status !== 'بانتظار التوقيع') {
      return res.status(400).json({ error: sig.countersigner_status === 'بانتظار الموظف' ? 'بانتظار توقيع الموظف أولاً' : 'Already processed' });
    }
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE signatures SET countersigner_status = 'موقّع', countersigned_at = ?, status = 'موقّع', signed_at = ?
      WHERE id = ?
    `).run(now, now, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Decline — either party can decline while it's their turn
router.put('/:id/decline', (req, res, next) => {
  try {
    const sig = db.prepare('SELECT * FROM signatures WHERE id = ?').get(req.params.id);
    if (!sig) return res.status(404).json({ error: 'Not found' });

    if (sig.employee_id === req.user.employee_id && sig.status === 'بانتظار التوقيع' && !sig.employee_signed_at) {
      db.prepare(`UPDATE signatures SET status = 'مرفوض' WHERE id = ?`).run(req.params.id);
      return res.json({ message: 'Updated' });
    }
    if (sig.countersigner_id === req.user.employee_id && sig.countersigner_status === 'بانتظار التوقيع') {
      db.prepare(`UPDATE signatures SET status = 'مرفوض', countersigner_status = 'مرفوض' WHERE id = ?`).run(req.params.id);
      return res.json({ message: 'Updated' });
    }
    if (sig.employee_id !== req.user.employee_id && sig.countersigner_id !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    return res.status(400).json({ error: 'Already processed' });
  } catch (err) {
    next(err);
  }
});

// Delete a request (managers & HR)
router.delete('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM signatures WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
