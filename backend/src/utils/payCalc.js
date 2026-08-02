// Shared pay-calculation helper used by payroll runs, the live payroll
// overview, and HR reports — a single source of truth so every screen that
// shows "what an employee earns" agrees with each other.

// Left-joins each employee against their most recent active compensation
// package, so figures reflect Compensation data instead of the legacy flat
// salary/allowances fields whenever a package exists.
const ACTIVE_COMP_JOIN = `
  LEFT JOIN compensation c ON c.id = (
    SELECT id FROM compensation WHERE employee_id = e.id AND status = 'نشط' ORDER BY effective_date DESC, id DESC LIMIT 1
  )
`;

// Builds one pay item from an employee row that's been left-joined against
// ACTIVE_COMP_JOIN above. Prefers the itemized package when one exists;
// falls back to the flat employee salary/allowances fields otherwise.
function buildPayItem(e) {
  const hasPackage = e.base_salary != null;
  const basic = hasPackage ? e.base_salary : (e.salary || 0);
  const housing_allowance = hasPackage ? e.housing_allowance : 0;
  const transport_allowance = hasPackage ? e.transport_allowance : 0;
  const other_allowances = hasPackage ? e.other_allowances : (e.allowances || 0);
  const bonus = hasPackage ? e.bonus : 0;
  const allowances = housing_allowance + transport_allowance + other_allowances + bonus;
  const deductions = Math.round(basic * 0.1);
  const net = basic + allowances - deductions;
  return { basic, housing_allowance, transport_allowance, other_allowances, bonus, allowances, deductions, net };
}

module.exports = { ACTIVE_COMP_JOIN, buildPayItem };
