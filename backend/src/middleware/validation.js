const { body, param, validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

const employeeValidation = {
  create: [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('job_title').trim().notEmpty().withMessage('Job title is required'),
    body('department_id').isInt({ min: 1 }).withMessage('Valid department is required'),
    body('hire_date').isDate().withMessage('Valid hire date is required'),
    body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
    validate
  ],
  update: [
    param('id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
    body('full_name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('salary').optional().isFloat({ min: 0 }),
    validate
  ]
};

const attendanceValidation = {
  checkIn: [
    body('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
    body('location').optional().trim(),
    validate
  ],
  checkOut: [
    body('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
    validate
  ]
};

const leaveValidation = {
  create: [
    body('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
    body('type').isIn(['سنوية', 'مرضية', 'طارئة', 'بدون راتب', 'أمومة', 'حج', 'عمرة']).withMessage('Invalid leave type'),
    body('start_date').isDate().withMessage('Valid start date is required'),
    body('end_date').isDate().withMessage('Valid end date is required'),
    body('reason').optional().trim(),
    validate
  ],
  approve: [
    param('id').isInt({ min: 1 }).withMessage('Valid leave ID is required'),
    body('status').isIn(['موافقة', 'مرفوضة']).withMessage('Status must be approved or rejected'),
    validate
  ]
};

module.exports = {
  validate,
  employeeValidation,
  attendanceValidation,
  leaveValidation
};
