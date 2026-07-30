const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/database');
const { runMigrations } = require('./config/migrate');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const dashboardRoutes = require('./routes/dashboard');
const documentRoutes = require('./routes/documents');
const announcementRoutes = require('./routes/announcements');
const requestRoutes = require('./routes/requests');
const payslipRoutes = require('./routes/payslips');
const policyRoutes = require('./routes/policies');
const payrollRoutes = require('./routes/payroll');
const taskRoutes = require('./routes/tasks');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const companyRoutes = require('./routes/companies');
const expenseRoutes = require('./routes/expenses');
const assetRoutes = require('./routes/assets');
const goalRoutes = require('./routes/goals');
const trainingRoutes = require('./routes/training');
const reportRoutes = require('./routes/reports');
const offboardingRoutes = require('./routes/offboarding');
const grievanceRoutes = require('./routes/grievances');
const incidentRoutes = require('./routes/incidents');
const shiftRoutes = require('./routes/shifts');
const timesheetRoutes = require('./routes/timesheets');
const compensationRoutes = require('./routes/compensation');
const successionRoutes = require('./routes/succession');
const orgProfileRoutes = require('./routes/company');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/compensation', compensationRoutes);
app.use('/api/succession', successionRoutes);
app.use('/api/company', orgProfileRoutes);
app.use('/api/settings', settingsRoutes);

// Serve the built frontend when present (single-service deployment).
// CLIENT_DIR defaults to ../public relative to this file (where the Docker
// image copies frontend/dist). Falls back to a JSON 404 for API-style paths.
const clientDir = process.env.CLIENT_DIR || path.join(__dirname, '../public');
if (fs.existsSync(path.join(clientDir, 'index.html'))) {
  app.use(express.static(clientDir));
  // SPA fallback for any non-API GET route
  app.get(/^(?!\/api\/).+/, (req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database
runMigrations();

// Seed data in development, or in any environment when SEED_DB=true.
// seed.js is idempotent — it skips when the database already has employees.
if (process.env.NODE_ENV !== 'production' || process.env.SEED_DB === 'true') {
  require('./config/seed');
}

app.listen(PORT, () => {
  console.log(`🚀 Quant HR Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
});

module.exports = app;
