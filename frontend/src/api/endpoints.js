import api from './client'

// ---------- Auth ----------
export const authApi = {
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  changePassword: (data) => api.put('/auth/change-password', data).then((r) => r.data),
}

// ---------- Dashboard ----------
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data),
  attendanceChart: () => api.get('/dashboard/attendance-chart').then((r) => r.data),
  departmentDistribution: () => api.get('/dashboard/department-distribution').then((r) => r.data),
  upcomingLeaves: () => api.get('/dashboard/upcoming-leaves').then((r) => r.data),
}

// ---------- Employees ----------
export const employeesApi = {
  list: (params) => api.get('/employees', { params }).then((r) => r.data),
  get: (id) => api.get(`/employees/${id}`).then((r) => r.data),
  stats: (id) => api.get(`/employees/${id}/stats`).then((r) => r.data),
  create: (data) => api.post('/employees', data).then((r) => r.data),
  update: (id, data) => api.put(`/employees/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/employees/${id}`).then((r) => r.data),
}

// ---------- Departments ----------
export const departmentsApi = {
  list: () => api.get('/departments').then((r) => r.data),
  get: (id) => api.get(`/departments/${id}`).then((r) => r.data),
  orgChart: () => api.get('/departments/org-chart/tree').then((r) => r.data),
  create: (data) => api.post('/departments', data).then((r) => r.data),
  update: (id, data) => api.put(`/departments/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/departments/${id}`).then((r) => r.data),
}

// ---------- Attendance ----------
export const attendanceApi = {
  list: (params) => api.get('/attendance', { params }).then((r) => r.data),
  checkIn: (data) => api.post('/attendance/checkin', data).then((r) => r.data),
  checkOut: (data) => api.post('/attendance/checkout', data).then((r) => r.data),
  mine: (employeeId) => api.get(`/attendance/my/${employeeId}`).then((r) => r.data),
  report: (params) => api.get('/attendance/report/summary', { params }).then((r) => r.data),
}

// ---------- Leaves ----------
export const leavesApi = {
  list: (params) => api.get('/leaves', { params }).then((r) => r.data),
  create: (data) => api.post('/leaves', data).then((r) => r.data),
  approve: (id, data) => api.put(`/leaves/${id}/approve`, data).then((r) => r.data),
  cancel: (id) => api.put(`/leaves/${id}/cancel`).then((r) => r.data),
  balance: (employeeId) => api.get(`/leaves/balance/${employeeId}`).then((r) => r.data),
}

// ---------- Documents ----------
export const documentsApi = {
  forEmployee: (employeeId) => api.get(`/documents/employee/${employeeId}`).then((r) => r.data),
  upload: (formData) =>
    api
      .post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
  remove: (id) => api.delete(`/documents/${id}`).then((r) => r.data),
}
