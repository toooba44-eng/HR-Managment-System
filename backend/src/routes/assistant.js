const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// This assistant only ever reads and reports back the requesting employee's
// own records or public policies — a rule-based FAQ, not a decision-maker.
// It never approves/rejects leave, changes pay, or recommends hiring or
// disciplinary action; those stay with a human in the relevant module.
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const SUGGESTIONS = [
  'كم رصيد إجازتي؟',
  'كم راتبي الصافي هذا الشهر؟',
  'هل سجّلت حضوري اليوم؟',
  'ما هي سياسة الإجازات؟',
  'هل هناك إعلانات جديدة؟',
];

function aiGate() {
  const s = db.prepare('SELECT enabled, chatbot FROM ai_settings WHERE id = 1').get();
  return !!(s && s.enabled && s.chatbot);
}

function logAsk(employeeId, message, intent) {
  db.prepare('INSERT INTO assistant_logs (employee_id, message, intent) VALUES (?, ?, ?)').run(employeeId || null, message, intent);
}

function answerLeaveBalance(empId) {
  const e = db.prepare('SELECT annual_leave_balance, sick_leave_balance, emergency_leave_balance FROM employees WHERE id = ?').get(empId);
  if (!e) return 'لم أجد بياناتك الوظيفية. تواصل مع الموارد البشرية.';
  return `رصيدك الحالي: ${e.annual_leave_balance ?? 0} يوم إجازة سنوية، ${e.sick_leave_balance ?? 0} يوم مرضية، ${e.emergency_leave_balance ?? 0} يوم طارئة.`;
}

// Reads the same source of truth as the Payslips page: the latest payroll
// run line item that has at least been approved (never a draft or a run
// still under review), so the assistant never quotes a number that
// disagrees with the employee's actual payslip.
function answerPayslip(empId) {
  const row = db.prepare(`
    SELECT i.*, r.month, r.year, r.status as run_status
    FROM payroll_run_items i
    JOIN payroll_runs r ON i.run_id = r.id
    WHERE i.employee_id = ? AND r.status IN ('معتمد', 'مصروف')
    ORDER BY r.year DESC, r.month DESC
    LIMIT 1
  `).get(empId);
  if (!row) return 'لا توجد قسيمة راتب معتمدة بعد لعرضها. راجع قسم قسائم الرواتب لاحقاً.';
  const label = row.run_status === 'مصروف' ? 'الصافي المصروف' : 'الصافي المعتمد (بانتظار الصرف)';
  return `راتب ${AR_MONTHS[row.month - 1]} ${row.year} — ${label}: ${row.net.toLocaleString('ar-SA')} ر.س (أساسي ${row.basic.toLocaleString('ar-SA')} + بدلات ${row.allowances.toLocaleString('ar-SA')} − تأمينات ${row.deductions.toLocaleString('ar-SA')}). للتفاصيل الكاملة راجع قسائم الراتب.`;
}

// Highlights any recent announcement the employee hasn't acknowledged yet
// when it requires acknowledgment — mirrors the read/reads tracking added
// to the Announcements module.
function answerAnnouncements(empId) {
  const rows = db.prepare(`
    SELECT a.id, a.title, a.requires_acknowledgment,
           (SELECT COUNT(*) FROM announcement_reads r WHERE r.announcement_id = a.id AND r.employee_id = ?) as read_by_me
    FROM announcements a
    ORDER BY a.is_pinned DESC, a.created_at DESC
    LIMIT 5
  `).all(empId || 0);
  if (!rows.length) return 'لا توجد إعلانات حالياً.';
  const pendingAck = rows.filter((a) => a.requires_acknowledgment && !a.read_by_me);
  const list = rows.map((a) => `- ${a.title}${a.requires_acknowledgment && !a.read_by_me ? ' (يتطلب إقرارك)' : ''}`).join('\n');
  const note = pendingAck.length ? `\n\nلديك ${pendingAck.length} إعلان يتطلب إقرارك بالاطلاع — راجع قسم الإعلانات.` : '';
  return `أحدث الإعلانات:\n${list}${note}`;
}

function answerAttendance(empId) {
  const today = new Date().toISOString().split('T')[0];
  const a = db.prepare('SELECT check_in, check_out, status FROM attendance WHERE employee_id = ? AND date = ?').get(empId, today);
  if (!a) return 'لم يُسجَّل حضورك اليوم بعد.';
  if (a.check_in && !a.check_out) return `تم تسجيل حضورك اليوم الساعة ${a.check_in.split(' ')[1] || a.check_in}. لم تسجّل الانصراف بعد.`;
  if (a.check_in && a.check_out) return `حضورك اليوم: من ${a.check_in.split(' ')[1] || a.check_in} إلى ${a.check_out.split(' ')[1] || a.check_out} (${a.status}).`;
  return `حالتك اليوم: ${a.status}.`;
}

function answerPolicies(message) {
  // Strip the generic policy-intent keywords to search on whatever remains
  const stripped = message.replace(/سياسة|سياسات|لائحة|لوائح/g, '').trim();
  let rows;
  if (stripped) {
    rows = db.prepare(`SELECT title, body FROM policies WHERE title LIKE ? OR body LIKE ? LIMIT 3`)
      .all(`%${stripped}%`, `%${stripped}%`);
  }
  if (rows && rows.length) {
    return rows.map((p) => `**${p.title}**: ${p.body.slice(0, 160)}${p.body.length > 160 ? '…' : ''}`).join('\n\n');
  }
  const titles = db.prepare('SELECT title FROM policies ORDER BY category, title LIMIT 8').all().map((p) => p.title);
  if (!titles.length) return 'لا توجد سياسات مضافة بعد.';
  return `أقرب السياسات المتاحة: ${titles.join('، ')}. اسأل عن أحدها بالاسم لمزيد من التفاصيل.`;
}

// Very small, transparent keyword router — every branch only reads data
// that already exists; nothing here writes, approves, or decides anything.
function detectIntent(message) {
  const m = message.toLowerCase();
  if (/سياس|لائح/.test(m)) return 'policies';
  if (/راتب|مرتب/.test(m)) return 'payslip';
  if (/رصيد|إجاز/.test(m)) return 'leave_balance';
  if (/حضور|دوام|بصمة|انصراف/.test(m)) return 'attendance';
  if (/إعلان|تعميم/.test(m)) return 'announcements';
  return 'fallback';
}

router.post('/ask', (req, res, next) => {
  try {
    if (!aiGate()) return res.status(403).json({ error: 'المساعد الذكي غير مفعّل حالياً' });
    const message = (req.body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'الرسالة مطلوبة' });

    const empId = req.user.employee_id;
    const intent = detectIntent(message);
    let answer;
    switch (intent) {
      case 'leave_balance':
        answer = empId ? answerLeaveBalance(empId) : 'هذا السؤال يخص بيانات موظف — سجّل دخولك بحساب موظف لعرض رصيدك.';
        break;
      case 'payslip':
        answer = empId ? answerPayslip(empId) : 'هذا السؤال يخص بيانات موظف — سجّل دخولك بحساب موظف لعرض راتبك.';
        break;
      case 'attendance':
        answer = empId ? answerAttendance(empId) : 'هذا السؤال يخص بيانات موظف — سجّل دخولك بحساب موظف لعرض حضورك.';
        break;
      case 'policies':
        answer = answerPolicies(message);
        break;
      case 'announcements':
        answer = answerAnnouncements(empId);
        break;
      default:
        answer = `يمكنني الإجابة عن استفساراتك حول رصيد إجازتك، راتبك، حضورك، أو سياسات الشركة. جرّب أحد هذه الأسئلة:\n${SUGGESTIONS.join('\n')}`;
    }

    logAsk(empId, message, intent);
    res.json({ answer, intent, suggestions: SUGGESTIONS });
  } catch (err) { next(err); }
});

// HR/admin: recent questions + intent breakdown, so common needs surface
// without exposing raw sensitive data beyond what was already asked.
router.get('/logs', requireRole('admin', 'hr_manager', 'super_admin'), (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT l.*, e.full_name
      FROM assistant_logs l
      LEFT JOIN employees e ON l.employee_id = e.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `).all();
    const breakdown = rows.reduce((acc, r) => { acc[r.intent] = (acc[r.intent] || 0) + 1; return acc; }, {});
    res.json({ logs: rows, breakdown, total: rows.length });
  } catch (err) { next(err); }
});

module.exports = router;
