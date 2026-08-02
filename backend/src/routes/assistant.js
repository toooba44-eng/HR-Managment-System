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

function answerPayslip(empId) {
  const e = db.prepare('SELECT salary, allowances FROM employees WHERE id = ?').get(empId);
  if (!e) return 'لم أجد بياناتك الوظيفية. تواصل مع الموارد البشرية.';
  const basic = e.salary || 0;
  const allowances = e.allowances || 0;
  const gosi = Math.round(basic * 0.1);
  const net = basic + allowances - gosi;
  const now = new Date();
  return `راتب ${AR_MONTHS[now.getMonth()]} ${now.getFullYear()} الصافي التقديري: ${net.toLocaleString('ar-SA')} ر.س (أساسي ${basic.toLocaleString('ar-SA')} + بدلات ${allowances.toLocaleString('ar-SA')} − تأمينات ${gosi.toLocaleString('ar-SA')}). للتفاصيل الكاملة راجع قسائم الراتب.`;
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
