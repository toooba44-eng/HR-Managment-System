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
}

// ---------- Employees ----------
const realEmployeesApi = {
  list: (params) => api.get('/employees', { params }).then((r) => r.data),
  get: (id) => api.get(`/employees/${id}`).then((r) => r.data),
  stats: (id) => api.get(`/employees/${id}/stats`).then((r) => r.data),
  create: (data) => api.post('/employees', data).then((r) => r.data),
  update: (id, data) => api.put(`/employees/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/employees/${id}`).then((r) => r.data),
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
}

// ---------- Leaves ----------
const realLeavesApi = {
  list: (params) => api.get('/leaves', { params }).then((r) => r.data),
  create: (data) => api.post('/leaves', data).then((r) => r.data),
  approve: (id, data) => api.put(`/leaves/${id}/approve`, data).then((r) => r.data),
  cancel: (id) => api.put(`/leaves/${id}/cancel`).then((r) => r.data),
  balance: (employeeId) => api.get(`/leaves/balance/${employeeId}`).then((r) => r.data),
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

// ---------- Documents ----------
const realDocumentsApi = {
  forEmployee: (employeeId) => api.get(`/documents/employee/${employeeId}`).then((r) => r.data),
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
