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

// GOSI (Saudi social insurance) contribution rates. Saudis subscribe to the
// Annuities + SANED (unemployment) branches on both sides; non-Saudis only
// carry the employer-paid Occupational Hazards branch. Applied to the GOSI
// subscription wage (basic + housing allowance), not the full package.
const GOSI_SAUDI_EMPLOYEE_RATE = 0.0975;
const GOSI_SAUDI_EMPLOYER_RATE = 0.1175;
const GOSI_NON_SAUDI_EMPLOYER_RATE = 0.02;
const isSaudi = (nationality) => nationality === 'سعودي' || nationality === 'سعودية';

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

  const gosiWage = basic + housing_allowance;
  const saudi = isSaudi(e.nationality);
  const deductions = saudi ? Math.round(gosiWage * GOSI_SAUDI_EMPLOYEE_RATE) : 0;
  const employer_gosi = Math.round(gosiWage * (saudi ? GOSI_SAUDI_EMPLOYER_RATE : GOSI_NON_SAUDI_EMPLOYER_RATE));
  const net = basic + allowances - deductions;
  return { basic, housing_allowance, transport_allowance, other_allowances, bonus, allowances, deductions, employer_gosi, net };
}

module.exports = { ACTIVE_COMP_JOIN, buildPayItem };
