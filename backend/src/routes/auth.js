const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');
const totp = require('../utils/totp');
const router = express.Router();

function userFromToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function issueSession(res, user) {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, employee_id: user.employee_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
      full_name: user.full_name,
      job_title: user.job_title,
      department_id: user.department_id,
      profile_picture: user.profile_picture,
      two_factor_enabled: !!user.two_factor_enabled,
    },
  });
}

// Login
router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare(`
      SELECT u.*, e.full_name, e.job_title, e.department_id, e.profile_picture
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.email = ? AND u.is_active = 1
    `).get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.two_factor_enabled) {
      const pending_token = jwt.sign({ id: user.id, pending2fa: true }, JWT_SECRET, { expiresIn: '5m' });
      return res.json({ requires_2fa: true, pending_token });
    }

    issueSession(res, user);
  } catch (err) {
    next(err);
  }
});

// Second login step when two-factor is enabled: exchanges the short-lived
// pending token from /login plus a current authenticator code for a normal
// session, the same shape /login returns when 2FA isn't required.
router.post('/2fa/verify', (req, res, next) => {
  try {
    const { pending_token, code } = req.body;
    if (!pending_token || !code) {
      return res.status(400).json({ error: 'Pending token and code are required' });
    }
    let decoded;
    try {
      decoded = jwt.verify(pending_token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Pending session expired, please log in again' });
    }
    if (!decoded.pending2fa) return res.status(401).json({ error: 'Invalid pending session' });

    const user = db.prepare(`
      SELECT u.*, e.full_name, e.job_title, e.department_id, e.profile_picture
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.id = ? AND u.is_active = 1
    `).get(decoded.id);
    if (!user || !user.two_factor_enabled) return res.status(401).json({ error: 'Invalid pending session' });

    if (!totp.verifyToken(user.two_factor_secret, code)) {
      return res.status(400).json({ error: 'رمز التحقق غير صحيح' });
    }

    issueSession(res, user);
  } catch (err) {
    next(err);
  }
});

// Begin 2FA enrollment: generates a new secret (not yet active) and returns
// it plus an otpauth:// URL for an authenticator app. Re-calling this before
// /2fa/enable simply replaces the pending secret.
router.post('/2fa/setup', (req, res, next) => {
  try {
    const decoded = userFromToken(req);
    if (!decoded) return res.status(401).json({ error: 'No token provided' });
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = totp.generateSecret();
    db.prepare('UPDATE users SET two_factor_secret = ?, two_factor_enabled = 0 WHERE id = ?').run(secret, user.id);
    res.json({ secret, otpauth_url: totp.otpauthUrl(secret, user.email) });
  } catch (err) {
    next(err);
  }
});

// Confirm enrollment: proves the user's authenticator app is actually
// producing valid codes for the pending secret before turning 2FA on.
router.post('/2fa/enable', (req, res, next) => {
  try {
    const decoded = userFromToken(req);
    if (!decoded) return res.status(401).json({ error: 'No token provided' });
    const { code } = req.body;
    const user = db.prepare('SELECT id, two_factor_secret FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.two_factor_secret) return res.status(400).json({ error: 'ابدأ الإعداد أولاً' });
    if (!totp.verifyToken(user.two_factor_secret, code)) {
      return res.status(400).json({ error: 'رمز التحقق غير صحيح' });
    }
    db.prepare('UPDATE users SET two_factor_enabled = 1 WHERE id = ?').run(user.id);
    res.json({ message: 'تم تفعيل التحقق بخطوتين' });
  } catch (err) {
    next(err);
  }
});

// Disable 2FA — requires the current password so a hijacked-but-unlocked
// session can't silently strip the second factor.
router.post('/2fa/disable', (req, res, next) => {
  try {
    const decoded = userFromToken(req);
    if (!decoded) return res.status(401).json({ error: 'No token provided' });
    const { password } = req.body;
    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!password || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(400).json({ error: 'كلمة المرور غير صحيحة' });
    }
    db.prepare('UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0 WHERE id = ?').run(user.id);
    res.json({ message: 'تم تعطيل التحقق بخطوتين' });
  } catch (err) {
    next(err);
  }
});

// Get current user
router.get('/me', (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare(`
      SELECT u.id, u.email, u.role, u.employee_id, u.two_factor_enabled,
             e.full_name, e.job_title, e.department_id, e.profile_picture,
             d.name as department_name
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE u.id = ?
    `).get(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// Change password
router.put('/change-password', (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);

    const { currentPassword, newPassword } = req.body;
    // Enforced server-side too — a client-side check alone can be bypassed
    // by calling the API directly.
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, decoded.id);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
