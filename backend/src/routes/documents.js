const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { notifyEmployee } = require('../utils/notify');
const router = express.Router();

const UPLOAD_DIR = 'uploads/documents/';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
  }
});

router.use(authenticateToken);

const MANAGE = ['admin', 'hr_manager'];

// Org-wide document register (role-scoped) with expiry tracking + summary
router.get('/', (req, res, next) => {
  try {
    const { type, employee_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (type) { where += ' AND d.type = ?'; params.push(type); }
    if (employee_id) { where += ' AND d.employee_id = ?'; params.push(employee_id); }

    if (['employee', 'candidate'].includes(req.user.role)) {
      where += ' AND d.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.user.role === 'department_head') {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      if (dept) { where += ' AND e.department_id = ?'; params.push(dept.department_id); }
    }

    const rows = db.prepare(`
      SELECT d.*, e.full_name, e.job_title, e.profile_picture, dep.name as department_name,
             uploader.full_name as uploaded_by_name
      FROM documents d
      JOIN employees e ON d.employee_id = e.id
      LEFT JOIN departments dep ON e.department_id = dep.id
      LEFT JOIN employees uploader ON d.uploaded_by = uploader.id
      ${where}
      ORDER BY (d.expiry_date IS NULL), d.expiry_date ASC, d.uploaded_at DESC
    `).all(...params);

    const today = new Date();
    const daysLeft = (d) => (d ? Math.ceil((new Date(d) - today) / 86400000) : null);
    const items = rows.map((r) => {
      const dl = daysLeft(r.expiry_date);
      let doc_status = 'سارية';
      if (dl != null && dl < 0) doc_status = 'منتهية';
      else if (dl != null && dl <= 30) doc_status = 'تنتهي قريباً';
      else if (!r.expiry_date) doc_status = 'بدون انتهاء';
      return { ...r, days_left: dl, doc_status };
    });

    const summary = items.reduce((s, r) => {
      s.total += 1;
      if (r.doc_status === 'منتهية') s.expired += 1;
      if (r.doc_status === 'تنتهي قريباً') s.expiringSoon += 1;
      return s;
    }, { total: 0, expired: 0, expiringSoon: 0 });

    res.json({ documents: items, summary });
  } catch (err) {
    next(err);
  }
});

// Register a document record (metadata only, no file upload)
router.post('/register', requireRole(...MANAGE), (req, res, next) => {
  try {
    const { employee_id, type, title, expiry_date, file_name } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'Employee is required' });
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const result = db.prepare(`
      INSERT INTO documents (employee_id, type, title, file_name, expiry_date, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employee_id, type || 'أخرى', title, file_name || null, expiry_date || null, req.user.employee_id || null);

    res.status(201).json({ message: 'Registered', document: { id: result.lastInsertRowid } });
  } catch (err) {
    next(err);
  }
});

// Update a document's metadata / expiry
router.put('/:id', requireRole(...MANAGE), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const b = req.body;
    db.prepare('UPDATE documents SET type = ?, title = ?, expiry_date = ? WHERE id = ?')
      .run(b.type ?? existing.type, b.title ?? existing.title,
        b.expiry_date !== undefined ? b.expiry_date : existing.expiry_date, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Notify the document's employee that it's expiring/expired, and record
// when so HR can see it's already been nudged rather than re-sending blindly.
router.put('/:id/remind', requireRole(...MANAGE), (req, res, next) => {
  try {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (!doc.expiry_date) return res.status(400).json({ error: 'لا يوجد تاريخ انتهاء لهذا المستند' });

    const daysLeft = Math.ceil((new Date(doc.expiry_date) - new Date()) / 86400000);
    if (daysLeft > 30) return res.status(400).json({ error: 'المستند لا يزال سارياً — لا حاجة للتذكير بعد' });

    db.prepare('UPDATE documents SET reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);

    notifyEmployee(doc.employee_id, {
      title: daysLeft < 0 ? 'مستند منتهي الصلاحية' : 'مستند على وشك الانتهاء',
      message: daysLeft < 0
        ? `${doc.title} منتهي الصلاحية منذ ${Math.abs(daysLeft)} يوم. يرجى تحديثه في أقرب وقت.`
        : `${doc.title} ينتهي خلال ${daysLeft} يوم. يرجى تجديده قبل الموعد.`,
      type: daysLeft < 0 ? 'error' : 'warning',
    });

    res.json({ message: 'تم إرسال التذكير' });
  } catch (err) {
    next(err);
  }
});

// Get documents for an employee
router.get('/employee/:employee_id', (req, res, next) => {
  try {
    const { employee_id } = req.params;

    if (['employee', 'candidate'].includes(req.user.role) && parseInt(employee_id) !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'department_head' && parseInt(employee_id) !== req.user.employee_id) {
      const dept = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(req.user.employee_id);
      const target = db.prepare('SELECT department_id FROM employees WHERE id = ?').get(employee_id);
      if (!dept || !target || dept.department_id !== target.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const documents = db.prepare(`
      SELECT d.*, uploader.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN employees uploader ON d.uploaded_by = uploader.id
      WHERE d.employee_id = ?
      ORDER BY d.uploaded_at DESC
    `).all(employee_id);

    res.json(documents);
  } catch (err) {
    next(err);
  }
});

// Upload document
router.post('/', requireRole('admin', 'hr_manager'), upload.single('file'), (req, res, next) => {
  try {
    const { employee_id, type, title } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = db.prepare(`
      INSERT INTO documents (employee_id, type, title, file_path, file_name, file_size, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      employee_id,
      type,
      title,
      req.file.path,
      req.file.originalname,
      req.file.size,
      req.user.employee_id
    );

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: result.lastInsertRowid,
        employee_id,
        type,
        title,
        file_name: req.file.originalname,
        file_size: req.file.size
      }
    });
  } catch (err) {
    next(err);
  }
});

// Delete document
router.delete('/:id', requireRole('admin', 'hr_manager'), (req, res, next) => {
  try {
    const { id } = req.params;

    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
