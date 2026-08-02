const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// Billing is platform-level — super admins only
router.use(requireRole('super_admin'));

// List invoices with company info + revenue summary
router.get('/', (req, res, next) => {
  try {
    // Auto-promote any unpaid invoice past its due date to "متأخرة" — the
    // status reflects reality without anyone having to notice and flag it.
    db.prepare(`
      UPDATE invoices SET status = 'متأخرة'
      WHERE status = 'غير مدفوعة' AND due_date IS NOT NULL AND due_date < date('now')
    `).run();

    const { status, company_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND i.status = ?'; params.push(status); }
    if (company_id) { where += ' AND i.company_id = ?'; params.push(company_id); }

    const rows = db.prepare(`
      SELECT i.*, c.name as company_name, c.plan as company_plan
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      ${where}
      ORDER BY
        CASE i.status WHEN 'متأخرة' THEN 1 WHEN 'غير مدفوعة' THEN 2 WHEN 'مدفوعة' THEN 3 ELSE 4 END,
        i.issue_date DESC
    `).all(...params);

    const summary = rows.reduce((s, r) => {
      s.count += 1;
      if (r.status === 'مدفوعة') s.paid += r.amount;
      if (r.status === 'غير مدفوعة' || r.status === 'متأخرة') s.outstanding += r.amount;
      if (r.status === 'متأخرة') s.overdue += 1;
      return s;
    }, { count: 0, paid: 0, outstanding: 0, overdue: 0 });

    res.json({ invoices: rows, summary });
  } catch (err) {
    next(err);
  }
});

// Create an invoice
router.post('/', (req, res, next) => {
  try {
    const { company_id, amount, plan, period, issue_date, due_date } = req.body;
    if (!company_id) return res.status(400).json({ error: 'Company is required' });
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });
    const company = db.prepare('SELECT id, plan FROM companies WHERE id = ?').get(company_id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const seq = (db.prepare('SELECT COUNT(*) AS n FROM invoices').get().n || 0) + 1;
    const invoice_number = req.body.invoice_number || `INV-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    const result = db.prepare(`
      INSERT INTO invoices (company_id, invoice_number, plan, period, amount, issue_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(company_id, invoice_number, plan || company.plan, period || null, amount,
      issue_date || new Date().toISOString().slice(0, 10), due_date || null);

    res.status(201).json({ message: 'Created', invoice: { id: result.lastInsertRowid, invoice_number } });
  } catch (err) {
    next(err);
  }
});

// Update invoice status (mark paid / overdue / cancelled)
router.put('/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['مدفوعة', 'غير مدفوعة', 'متأخرة', 'ملغاة'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const invoice = db.prepare('SELECT id FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });

    const paid_at = status === 'مدفوعة' ? new Date().toISOString() : null;
    db.prepare('UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?').run(status, paid_at, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete an invoice
router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
