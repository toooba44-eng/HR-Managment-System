const db = require('../config/database');

// Inserts a notification for a login account directly.
function notifyUser(userId, { title, message, type = 'info', link = null }) {
  if (!userId) return;
  db.prepare('INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)')
    .run(userId, title, message, type, link || null);
}

// Resolves an employee to their active login account and notifies them.
// No-op if the employee has no account (or it's inactive) — never throws,
// since a missing account shouldn't fail the caller's own transaction.
function notifyEmployee(employeeId, opts) {
  if (!employeeId) return;
  const user = db.prepare('SELECT id FROM users WHERE employee_id = ? AND is_active = 1').get(employeeId);
  if (user) notifyUser(user.id, opts);
}

// Same, but resolved by account email — for candidates, who aren't linked
// to an employees row.
function notifyEmail(email, opts) {
  if (!email) return;
  const user = db.prepare('SELECT id FROM users WHERE email = ? AND is_active = 1').get(email);
  if (user) notifyUser(user.id, opts);
}

module.exports = { notifyUser, notifyEmployee, notifyEmail };
