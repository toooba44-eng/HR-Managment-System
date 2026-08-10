const db = require('../config/database');
const { notifyEmployee } = require('./notify');

// Every field a condition can compare against is a plain column (or a join)
// on employees — kept to what's actually on that table so evaluation never
// needs a second lookup path per field.
function employeeFieldValue(employeeId, field) {
  if (field === 'department') {
    const row = db.prepare(`
      SELECT d.name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?
    `).get(employeeId);
    return row ? row.name : null;
  }
  const col = { nationality: 'nationality', contract_type: 'contract_type', salary: 'salary', work_location: 'work_location', status: 'status' }[field];
  if (!col) return null;
  const row = db.prepare(`SELECT ${col} as v FROM employees WHERE id = ?`).get(employeeId);
  return row ? row.v : null;
}

function evaluateCondition(cond, employeeId) {
  const actual = employeeFieldValue(employeeId, cond.field);
  if (actual == null) return false;
  switch (cond.operator) {
    case 'eq': return String(actual) === String(cond.value);
    case 'ne': return String(actual) !== String(cond.value);
    case 'gt': return Number(actual) > Number(cond.value);
    case 'lt': return Number(actual) < Number(cond.value);
    case 'contains': return String(actual).includes(cond.value);
    default: return false;
  }
}

function firstHrManagerId() {
  const row = db.prepare(`SELECT employee_id FROM users WHERE role = 'hr_manager' AND is_active = 1 AND employee_id IS NOT NULL LIMIT 1`).get();
  return row ? row.employee_id : null;
}

// Free-text "assignee" labels (e.g. "المدير المباشر", "الموظف نفسه") resolved
// to a concrete employee to notify/assign — anything unrecognized (including
// role buckets this schema has no owner for, like "تقنية المعلومات") falls
// back to HR rather than silently doing nothing.
function resolveAssignee(label, employeeId) {
  const l = (label || '').trim();
  if (/مدير/.test(l)) {
    const row = db.prepare('SELECT manager_id FROM employees WHERE id = ?').get(employeeId);
    return row?.manager_id || firstHrManagerId();
  }
  if (/نفسه|^الموظف$/.test(l)) return employeeId;
  return firstHrManagerId();
}

function executeStep(step, employeeId) {
  try {
    if (step.action_type === 'إشعار') {
      const recipient = resolveAssignee(step.assignee, employeeId);
      if (!recipient) return { step_id: step.id, action_type: step.action_type, ok: false, note: 'لا يوجد مستلم' };
      notifyEmployee(recipient, { title: step.name, message: step.name, type: 'info', link: null });
      return { step_id: step.id, action_type: step.action_type, ok: true, to: recipient };
    }
    if (step.action_type === 'إسناد مهمة') {
      const assignee = resolveAssignee(step.assignee, employeeId);
      if (!assignee) return { step_id: step.id, action_type: step.action_type, ok: false, note: 'لا يوجد مسؤول' };
      db.prepare(`INSERT INTO tasks (title, employee_id, status, due_date) VALUES (?, ?, 'جديدة', date('now', '+3 days'))`).run(step.name, assignee);
      return { step_id: step.id, action_type: step.action_type, ok: true, to: assignee };
    }
    if (step.action_type === 'موافقة') {
      if (!employeeId) return { step_id: step.id, action_type: step.action_type, ok: false, note: 'لا يوجد موظف مرتبط' };
      db.prepare(`INSERT INTO requests (employee_id, type, subject, details, status) VALUES (?, 'أخرى', ?, ?, 'معلقة')`)
        .run(employeeId, step.name, 'أُنشئ تلقائياً عبر مسار عمل — يظهر في مركز الموافقات.');
      return { step_id: step.id, action_type: step.action_type, ok: true };
    }
    // 'تحديث حالة' has no configured target value on a step yet, so it's
    // logged as skipped rather than guessing what to set.
    return { step_id: step.id, action_type: step.action_type, ok: false, note: 'غير مُنفَّذ تلقائياً بعد' };
  } catch (err) {
    return { step_id: step.id, action_type: step.action_type, ok: false, note: 'خطأ أثناء التنفيذ' };
  }
}

// Runs a single workflow against one employee: evaluates its conditions,
// executes its steps if they pass, bumps the run counter, and logs the
// outcome either way. Returns the logged run row.
function runWorkflow(workflow, employeeId) {
  const conditions = db.prepare('SELECT * FROM workflow_conditions WHERE workflow_id = ?').all(workflow.id);
  const matched = employeeId != null && conditions.every((c) => evaluateCondition(c, employeeId));
  const steps = matched ? db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC, id ASC').all(workflow.id) : [];
  const executed = steps.map((s) => executeStep(s, employeeId));

  db.prepare('UPDATE workflows SET runs_count = runs_count + 1 WHERE id = ?').run(workflow.id);
  const result = db.prepare(`
    INSERT INTO workflow_runs (workflow_id, employee_id, trigger_event, matched, actions_executed, detail)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(workflow.id, employeeId || null, workflow.trigger_event, matched ? 1 : 0, executed.filter((e) => e.ok).length, JSON.stringify(executed));

  return { id: result.lastInsertRowid, workflow_id: workflow.id, employee_id: employeeId || null, matched, detail: executed };
}

// Fires every active workflow whose trigger matches a real system event —
// called from the route that actually creates the record the trigger is
// about (new hire, leave submitted, ...), never on a schedule.
function runWorkflowsFor(triggerEvent, employeeId) {
  const workflows = db.prepare('SELECT * FROM workflows WHERE trigger_event = ? AND is_active = 1').all(triggerEvent);
  for (const wf of workflows) runWorkflow(wf, employeeId);
}

module.exports = { runWorkflow, runWorkflowsFor, evaluateCondition };
