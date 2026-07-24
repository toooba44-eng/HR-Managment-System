const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
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

// Get documents for an employee
router.get('/employee/:employee_id', (req, res, next) => {
  try {
    const { employee_id } = req.params;

    if (req.user.role === 'employee' && parseInt(employee_id) !== req.user.employee_id) {
      return res.status(403).json({ error: 'Access denied' });
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
