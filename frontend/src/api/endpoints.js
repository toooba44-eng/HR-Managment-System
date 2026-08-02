import api from './client'
import * as mock from './mock'

// In the static GitHub Pages demo build (VITE_DEMO=true) the whole API is
// served in-browser from mock data — there is no backend.
const DEMO = import.meta.env.VITE_DEMO === 'true'

if (DEMO && typeof console !== 'undefined') {
  console.info('%c🧪 Quant HR — وضع تجريبي (بيانات وهمية داخل المتصفح)', 'color:#2563eb;font-weight:bold')
}

// ---------- Auth ----------
const realAuthApi = {
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  changePassword: (data) => api.put('/auth/change-password', data).then((r) => r.data),
}

// ---------- Dashboard ----------
const realDashboardApi = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data),
  attendanceChart: () => api.get('/dashboard/attendance-chart').then((r) => r.data),
  departmentDistribution: () => api.get('/dashboard/department-distribution').then((r) => r.data),
  upcomingLeaves: () => api.get('/dashboard/upcoming-leaves').then((r) => r.data),
  hrOverview: () => api.get('/dashboard/hr-overview').then((r) => r.data),
}

// ---------- Employees ----------
const realEmployeesApi = {
  list: (params) => api.get('/employees', { params }).then((r) => r.data),
  get: (id) => api.get(`/employees/${id}`).then((r) => r.data),
  stats: (id) => api.get(`/employees/${id}/stats`).then((r) => r.data),
  create: (data) => api.post('/employees', data).then((r) => r.data),
  update: (id, data) => api.put(`/employees/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/employees/${id}`).then((r) => r.data),
  orgChart: () => api.get('/employees/org-chart').then((r) => r.data),
}

// ---------- Departments ----------
const realDepartmentsApi = {
  list: () => api.get('/departments').then((r) => r.data),
  get: (id) => api.get(`/departments/${id}`).then((r) => r.data),
  orgChart: () => api.get('/departments/org-chart/tree').then((r) => r.data),
  create: (data) => api.post('/departments', data).then((r) => r.data),
  update: (id, data) => api.put(`/departments/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/departments/${id}`).then((r) => r.data),
}

// ---------- Attendance ----------
const realAttendanceApi = {
  list: (params) => api.get('/attendance', { params }).then((r) => r.data),
  checkIn: (data) => api.post('/attendance/checkin', data).then((r) => r.data),
  checkOut: (data) => api.post('/attendance/checkout', data).then((r) => r.data),
  mine: (employeeId) => api.get(`/attendance/my/${employeeId}`).then((r) => r.data),
  report: (params) => api.get('/attendance/report/summary', { params }).then((r) => r.data),
  corrections: (params) => api.get('/attendance-corrections', { params }).then((r) => r.data),
  requestCorrection: (data) => api.post('/attendance-corrections', data).then((r) => r.data),
  reviewCorrection: (id, status) => api.put(`/attendance-corrections/${id}/status`, { status }).then((r) => r.data),
  removeCorrection: (id) => api.delete(`/attendance-corrections/${id}`).then((r) => r.data),
}

// ---------- Leaves ----------
const realLeavesApi = {
  list: (params) => api.get('/leaves', { params }).then((r) => r.data),
  create: (data) => api.post('/leaves', data).then((r) => r.data),
  approve: (id, data) => api.put(`/leaves/${id}/approve`, data).then((r) => r.data),
  cancel: (id) => api.put(`/leaves/${id}/cancel`).then((r) => r.data),
  balance: (employeeId) => api.get(`/leaves/balance/${employeeId}`).then((r) => r.data),
  calendar: (month) => api.get('/leaves/calendar', { params: month ? { month } : {} }).then((r) => r.data),
}

// ---------- Announcements ----------
const realAnnouncementsApi = {
  list: () => api.get('/announcements').then((r) => r.data),
  create: (data) => api.post('/announcements', data).then((r) => r.data),
  remove: (id) => api.delete(`/announcements/${id}`).then((r) => r.data),
}

// ---------- Requests (employee self-service) ----------
const realRequestsApi = {
  list: (params) => api.get('/requests', { params }).then((r) => r.data),
  create: (data) => api.post('/requests', data).then((r) => r.data),
  resolve: (id, data) => api.put(`/requests/${id}/resolve`, data).then((r) => r.data),
}

// ---------- Payslips ----------
const realPayslipsApi = {
  forEmployee: (employeeId) => api.get(`/payslips/${employeeId}`).then((r) => r.data),
}

// ---------- Policies ----------
const realPoliciesApi = {
  list: () => api.get('/policies').then((r) => r.data),
  create: (data) => api.post('/policies', data).then((r) => r.data),
  update: (id, data) => api.put(`/policies/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/policies/${id}`).then((r) => r.data),
}

// ---------- Payroll ----------
const realPayrollApi = {
  overview: (params) => api.get('/payroll', { params }).then((r) => r.data),
}

// ---------- Tasks ----------
const realTasksApi = {
  list: (params) => api.get('/tasks', { params }).then((r) => r.data),
  create: (data) => api.post('/tasks', data).then((r) => r.data),
  setStatus: (id, status) => api.put(`/tasks/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
}

// ---------- Recruitment: jobs ----------
const realJobsApi = {
  list: () => api.get('/jobs').then((r) => r.data),
  create: (data) => api.post('/jobs', data).then((r) => r.data),
  update: (id, data) => api.put(`/jobs/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/jobs/${id}`).then((r) => r.data),
}

// ---------- Recruitment: applications ----------
const realApplicationsApi = {
  all: (params) => api.get('/applications', { params }).then((r) => r.data),
  mine: () => api.get('/applications/mine').then((r) => r.data),
  apply: (data) => api.post('/applications', data).then((r) => r.data),
  setStatus: (id, status) => api.put(`/applications/${id}/status`, { status }).then((r) => r.data),
  pipeline: (params) => api.get('/applications/pipeline', { params }).then((r) => r.data),
  moveStage: (id, stage) => api.put(`/applications/${id}/stage`, { stage }).then((r) => r.data),
  rate: (id, rating) => api.put(`/applications/${id}/rating`, { rating }).then((r) => r.data),
}

// ---------- Platform companies (Super Admin) ----------
const realCompaniesApi = {
  list: () => api.get('/companies').then((r) => r.data),
  create: (data) => api.post('/companies', data).then((r) => r.data),
  update: (id, data) => api.put(`/companies/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/companies/${id}`).then((r) => r.data),
}

// ---------- Platform control (super admin) ----------
const realPlatformApi = {
  requests: () => api.get('/platform/requests').then((r) => r.data),
  setRequestStatus: (id, status) => api.put(`/platform/requests/${id}/status`, { status }).then((r) => r.data),
  removeRequest: (id) => api.delete(`/platform/requests/${id}`).then((r) => r.data),
  modules: (companyId) => api.get('/platform/modules', { params: { company_id: companyId } }).then((r) => r.data),
  setModule: (company_id, module_key, enabled) => api.put('/platform/modules', { company_id, module_key, enabled }).then((r) => r.data),
  setLimits: (companyId, data) => api.put(`/platform/limits/${companyId}`, data).then((r) => r.data),
  usage: () => api.get('/platform/usage').then((r) => r.data),
  performance: () => api.get('/platform/performance').then((r) => r.data),
  apiMonitor: () => api.get('/platform/api-monitor').then((r) => r.data),
  backups: () => api.get('/platform/backups').then((r) => r.data),
  createBackup: (note) => api.post('/platform/backups', { note }).then((r) => r.data),
  restoreBackup: (id) => api.post(`/platform/backups/${id}/restore`).then((r) => r.data),
  removeBackup: (id) => api.delete(`/platform/backups/${id}`).then((r) => r.data),
  audit: (params) => api.get('/platform/audit', { params }).then((r) => r.data),
}

// ---------- Platform config (super admin) ----------
const realSaConfigApi = {
  support: (params) => api.get('/sa/support', { params }).then((r) => r.data),
  createTicket: (data) => api.post('/sa/support', data).then((r) => r.data),
  updateTicket: (id, data) => api.put(`/sa/support/${id}`, data).then((r) => r.data),
  removeTicket: (id) => api.delete(`/sa/support/${id}`).then((r) => r.data),
  settings: () => api.get('/sa/settings').then((r) => r.data),
  updateSettings: (data) => api.put('/sa/settings', data).then((r) => r.data),
  locales: () => api.get('/sa/locales').then((r) => r.data),
  createLocale: (data) => api.post('/sa/locales', data).then((r) => r.data),
  updateLocale: (id, data) => api.put(`/sa/locales/${id}`, data).then((r) => r.data),
  removeLocale: (id) => api.delete(`/sa/locales/${id}`).then((r) => r.data),
  templates: (params) => api.get('/sa/templates', { params }).then((r) => r.data),
  createTemplate: (data) => api.post('/sa/templates', data).then((r) => r.data),
  updateTemplate: (id, data) => api.put(`/sa/templates/${id}`, data).then((r) => r.data),
  removeTemplate: (id) => api.delete(`/sa/templates/${id}`).then((r) => r.data),
  ai: () => api.get('/sa/ai').then((r) => r.data),
  updateAi: (data) => api.put('/sa/ai', data).then((r) => r.data),
}

// ---------- Billing (super admin) ----------
const realBillingApi = {
  list: (params) => api.get('/billing', { params }).then((r) => r.data),
  create: (data) => api.post('/billing', data).then((r) => r.data),
  setStatus: (id, status) => api.put(`/billing/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/billing/${id}`).then((r) => r.data),
}

// ---------- Expenses & advances ----------
const realExpensesApi = {
  list: (params) => api.get('/expenses', { params }).then((r) => r.data),
  create: (data) => api.post('/expenses', data).then((r) => r.data),
  setStatus: (id, status) => api.put(`/expenses/${id}/status`, { status }).then((r) => r.data),
}

// ---------- Assets & custody ----------
const realAssetsApi = {
  list: (params) => api.get('/assets', { params }).then((r) => r.data),
  create: (data) => api.post('/assets', data).then((r) => r.data),
  update: (id, data) => api.put(`/assets/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/assets/${id}`).then((r) => r.data),
}

// ---------- Performance goals ----------
const realGoalsApi = {
  list: (params) => api.get('/goals', { params }).then((r) => r.data),
  create: (data) => api.post('/goals', data).then((r) => r.data),
  update: (id, data) => api.put(`/goals/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/goals/${id}`).then((r) => r.data),
}

// ---------- Reports & analytics ----------
const realReportsApi = {
  overview: () => api.get('/reports/overview').then((r) => r.data),
  datasets: () => api.get('/reports/datasets').then((r) => r.data),
  run: (def) => api.post('/reports/run', def).then((r) => r.data),
}

// ---------- Offboarding ----------
const realOffboardingApi = {
  list: () => api.get('/offboarding').then((r) => r.data),
  create: (data) => api.post('/offboarding', data).then((r) => r.data),
  update: (id, data) => api.put(`/offboarding/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/offboarding/${id}`).then((r) => r.data),
}

// ---------- Grievances ----------
const realGrievancesApi = {
  list: () => api.get('/grievances').then((r) => r.data),
  create: (data) => api.post('/grievances', data).then((r) => r.data),
  update: (id, data) => api.put(`/grievances/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/grievances/${id}`).then((r) => r.data),
}

// ---------- Health & safety incidents ----------
const realIncidentsApi = {
  list: () => api.get('/incidents').then((r) => r.data),
  create: (data) => api.post('/incidents', data).then((r) => r.data),
  update: (id, data) => api.put(`/incidents/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/incidents/${id}`).then((r) => r.data),
}

// ---------- Shifts & schedules ----------
const realShiftsApi = {
  list: (params) => api.get('/shifts', { params }).then((r) => r.data),
  create: (data) => api.post('/shifts', data).then((r) => r.data),
  update: (id, data) => api.put(`/shifts/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/shifts/${id}`).then((r) => r.data),
}

// ---------- Timesheets ----------
const realTimesheetsApi = {
  list: (params) => api.get('/timesheets', { params }).then((r) => r.data),
  create: (data) => api.post('/timesheets', data).then((r) => r.data),
  submit: (id) => api.put(`/timesheets/${id}/submit`).then((r) => r.data),
  review: (id, status) => api.put(`/timesheets/${id}/review`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/timesheets/${id}`).then((r) => r.data),
}

// ---------- Compensation & benefits ----------
const realCompensationApi = {
  list: (params) => api.get('/compensation', { params }).then((r) => r.data),
  create: (data) => api.post('/compensation', data).then((r) => r.data),
  update: (id, data) => api.put(`/compensation/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/compensation/${id}`).then((r) => r.data),
}

// ---------- Talent 9-box grid ----------
const realTalentGridApi = {
  get: () => api.get('/talent-grid').then((r) => r.data),
  set: (employeeId, data) => api.put(`/talent-grid/${employeeId}`, data).then((r) => r.data),
  clear: (employeeId) => api.delete(`/talent-grid/${employeeId}`).then((r) => r.data),
}

// ---------- Talent & succession ----------
const realSuccessionApi = {
  list: (params) => api.get('/succession', { params }).then((r) => r.data),
  create: (data) => api.post('/succession', data).then((r) => r.data),
  update: (id, data) => api.put(`/succession/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/succession/${id}`).then((r) => r.data),
}

// ---------- Company profile & branches ----------
const realCompanyApi = {
  get: () => api.get('/company').then((r) => r.data),
  updateProfile: (data) => api.put('/company/profile', data).then((r) => r.data),
  createBranch: (data) => api.post('/company/branches', data).then((r) => r.data),
  updateBranch: (id, data) => api.put(`/company/branches/${id}`, data).then((r) => r.data),
  removeBranch: (id) => api.delete(`/company/branches/${id}`).then((r) => r.data),
}

// ---------- Organization settings ----------
const realSettingsApi = {
  get: () => api.get('/settings').then((r) => r.data),
  update: (data) => api.put('/settings', data).then((r) => r.data),
}

// ---------- Automation & workflows ----------
const realAutomationApi = {
  list: () => api.get('/automation').then((r) => r.data),
  get: (id) => api.get(`/automation/${id}`).then((r) => r.data),
  create: (data) => api.post('/automation', data).then((r) => r.data),
  update: (id, data) => api.put(`/automation/${id}`, data).then((r) => r.data),
  run: (id) => api.post(`/automation/${id}/run`).then((r) => r.data),
  remove: (id) => api.delete(`/automation/${id}`).then((r) => r.data),
  addStep: (id, data) => api.post(`/automation/${id}/steps`, data).then((r) => r.data),
  removeStep: (stepId) => api.delete(`/automation/steps/${stepId}`).then((r) => r.data),
}

// ---------- Integrations ----------
const realIntegrationsApi = {
  list: (params) => api.get('/integrations', { params }).then((r) => r.data),
  create: (data) => api.post('/integrations', data).then((r) => r.data),
  setConnection: (id, connect) => api.put(`/integrations/${id}/connection`, { connect }).then((r) => r.data),
  sync: (id) => api.post(`/integrations/${id}/sync`).then((r) => r.data),
  remove: (id) => api.delete(`/integrations/${id}`).then((r) => r.data),
}

// ---------- Surveys ----------
const realSurveysApi = {
  list: () => api.get('/surveys').then((r) => r.data),
  results: (id) => api.get(`/surveys/${id}/results`).then((r) => r.data),
  create: (data) => api.post('/surveys', data).then((r) => r.data),
  update: (id, data) => api.put(`/surveys/${id}`, data).then((r) => r.data),
  respond: (id, data) => api.post(`/surveys/${id}/respond`, data).then((r) => r.data),
  remove: (id) => api.delete(`/surveys/${id}`).then((r) => r.data),
}

// ---------- Document e-signatures ----------
const realSignaturesApi = {
  list: (params) => api.get('/signatures', { params }).then((r) => r.data),
  create: (data) => api.post('/signatures', data).then((r) => r.data),
  sign: (id) => api.put(`/signatures/${id}/sign`).then((r) => r.data),
  decline: (id) => api.put(`/signatures/${id}/decline`).then((r) => r.data),
  remove: (id) => api.delete(`/signatures/${id}`).then((r) => r.data),
}

// ---------- Manager: hiring / interviews / promotions ----------
const realHiringApi = {
  list: (params) => api.get('/manager/hiring', { params }).then((r) => r.data),
  create: (data) => api.post('/manager/hiring', data).then((r) => r.data),
  setStatus: (id, status) => api.put(`/manager/hiring/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/manager/hiring/${id}`).then((r) => r.data),
}
const realInterviewsApi = {
  list: (params) => api.get('/manager/interviews', { params }).then((r) => r.data),
  create: (data) => api.post('/manager/interviews', data).then((r) => r.data),
  update: (id, data) => api.put(`/manager/interviews/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/manager/interviews/${id}`).then((r) => r.data),
}
const realPromotionsApi = {
  list: (params) => api.get('/manager/promotions', { params }).then((r) => r.data),
  create: (data) => api.post('/manager/promotions', data).then((r) => r.data),
  setStatus: (id, status) => api.put(`/manager/promotions/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/manager/promotions/${id}`).then((r) => r.data),
}

// ---------- Candidate profile & journey ----------
const realCandidateApi = {
  getProfile: () => api.get('/candidate/profile').then((r) => r.data),
  updateProfile: (data) => api.put('/candidate/profile', data).then((r) => r.data),
  setTalentPool: (join) => api.put('/candidate/talent-pool', { join }).then((r) => r.data),
  interviews: (params) => api.get('/candidate/interviews', { params }).then((r) => r.data),
  documents: () => api.get('/candidate/documents').then((r) => r.data),
  updateDocument: (id, data) => api.put(`/candidate/documents/${id}`, data).then((r) => r.data),
  forms: () => api.get('/candidate/forms').then((r) => r.data),
  submitForm: (id, data) => api.put(`/candidate/forms/${id}/submit`, data).then((r) => r.data),
  offer: () => api.get('/candidate/offer').then((r) => r.data),
  respondOffer: (id, status) => api.put(`/candidate/offer/${id}`, { status }).then((r) => r.data),
  messages: () => api.get('/candidate/messages').then((r) => r.data),
  sendMessage: (body) => api.post('/candidate/messages', { body }).then((r) => r.data),
}

// ---------- Onboarding ----------
const realOnboardingApi = {
  list: (params) => api.get('/onboarding', { params }).then((r) => r.data),
  get: (id) => api.get(`/onboarding/${id}`).then((r) => r.data),
  create: (data) => api.post('/onboarding', data).then((r) => r.data),
  update: (id, data) => api.put(`/onboarding/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/onboarding/${id}`).then((r) => r.data),
  addTask: (id, data) => api.post(`/onboarding/${id}/tasks`, data).then((r) => r.data),
  updateTask: (taskId, data) => api.put(`/onboarding/tasks/${taskId}`, data).then((r) => r.data),
  removeTask: (taskId) => api.delete(`/onboarding/tasks/${taskId}`).then((r) => r.data),
}

// ---------- Training & development ----------
const realTrainingApi = {
  courses: () => api.get('/training/courses').then((r) => r.data),
  createCourse: (data) => api.post('/training/courses', data).then((r) => r.data),
  updateCourse: (id, data) => api.put(`/training/courses/${id}`, data).then((r) => r.data),
  removeCourse: (id) => api.delete(`/training/courses/${id}`).then((r) => r.data),
  enroll: (courseId) => api.post(`/training/courses/${courseId}/enroll`).then((r) => r.data),
  enrollments: () => api.get('/training/enrollments').then((r) => r.data),
  setProgress: (enrollmentId, progress) => api.put(`/training/enrollments/${enrollmentId}`, { progress }).then((r) => r.data),
}

// ---------- Documents ----------
const realDocumentsApi = {
  forEmployee: (employeeId) => api.get(`/documents/employee/${employeeId}`).then((r) => r.data),
  list: (params) => api.get('/documents', { params }).then((r) => r.data),
  register: (data) => api.post('/documents/register', data).then((r) => r.data),
  update: (id, data) => api.put(`/documents/${id}`, data).then((r) => r.data),
  upload: (formData) =>
    api
      .post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
  remove: (id) => api.delete(`/documents/${id}`).then((r) => r.data),
}

// ---------- Exports (real backend, or in-browser mock for the demo) ----------
export const authApi = DEMO ? mock.mockAuthApi : realAuthApi
export const dashboardApi = DEMO ? mock.mockDashboardApi : realDashboardApi
export const employeesApi = DEMO ? mock.mockEmployeesApi : realEmployeesApi
export const departmentsApi = DEMO ? mock.mockDepartmentsApi : realDepartmentsApi
export const attendanceApi = DEMO ? mock.mockAttendanceApi : realAttendanceApi
export const leavesApi = DEMO ? mock.mockLeavesApi : realLeavesApi
export const documentsApi = DEMO ? mock.mockDocumentsApi : realDocumentsApi
export const announcementsApi = DEMO ? mock.mockAnnouncementsApi : realAnnouncementsApi
export const requestsApi = DEMO ? mock.mockRequestsApi : realRequestsApi
export const payslipsApi = DEMO ? mock.mockPayslipsApi : realPayslipsApi
export const policiesApi = DEMO ? mock.mockPoliciesApi : realPoliciesApi
export const payrollApi = DEMO ? mock.mockPayrollApi : realPayrollApi
export const tasksApi = DEMO ? mock.mockTasksApi : realTasksApi
export const jobsApi = DEMO ? mock.mockJobsApi : realJobsApi
export const applicationsApi = DEMO ? mock.mockApplicationsApi : realApplicationsApi
export const companiesApi = DEMO ? mock.mockCompaniesApi : realCompaniesApi
export const billingApi = DEMO ? mock.mockBillingApi : realBillingApi
export const platformApi = DEMO ? mock.mockPlatformApi : realPlatformApi
export const saConfigApi = DEMO ? mock.mockSaConfigApi : realSaConfigApi
export const expensesApi = DEMO ? mock.mockExpensesApi : realExpensesApi
export const assetsApi = DEMO ? mock.mockAssetsApi : realAssetsApi
export const goalsApi = DEMO ? mock.mockGoalsApi : realGoalsApi
export const trainingApi = DEMO ? mock.mockTrainingApi : realTrainingApi
export const reportsApi = DEMO ? mock.mockReportsApi : realReportsApi
export const offboardingApi = DEMO ? mock.mockOffboardingApi : realOffboardingApi
export const grievancesApi = DEMO ? mock.mockGrievancesApi : realGrievancesApi
export const incidentsApi = DEMO ? mock.mockIncidentsApi : realIncidentsApi
export const shiftsApi = DEMO ? mock.mockShiftsApi : realShiftsApi
export const timesheetsApi = DEMO ? mock.mockTimesheetsApi : realTimesheetsApi
export const compensationApi = DEMO ? mock.mockCompensationApi : realCompensationApi
export const successionApi = DEMO ? mock.mockSuccessionApi : realSuccessionApi
export const talentGridApi = DEMO ? mock.mockTalentGridApi : realTalentGridApi
export const companyApi = DEMO ? mock.mockCompanyApi : realCompanyApi
export const settingsApi = DEMO ? mock.mockSettingsApi : realSettingsApi
export const onboardingApi = DEMO ? mock.mockOnboardingApi : realOnboardingApi
export const automationApi = DEMO ? mock.mockAutomationApi : realAutomationApi
export const integrationsApi = DEMO ? mock.mockIntegrationsApi : realIntegrationsApi
export const surveysApi = DEMO ? mock.mockSurveysApi : realSurveysApi
export const signaturesApi = DEMO ? mock.mockSignaturesApi : realSignaturesApi
export const hiringApi = DEMO ? mock.mockHiringApi : realHiringApi
export const interviewsApi = DEMO ? mock.mockInterviewsApi : realInterviewsApi
export const promotionsApi = DEMO ? mock.mockPromotionsApi : realPromotionsApi
export const candidateApi = DEMO ? mock.mockCandidateApi : realCandidateApi
