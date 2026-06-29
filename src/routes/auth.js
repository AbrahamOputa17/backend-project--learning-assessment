const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply strict rate limiting to authentication endpoints
router.use(authLimiter);

const ALLOWED_DEPARTMENTS_LOWER = [
  'biochemistry',
  'computer science/ ict',
  'microbiology',
  'geology',
  'physics with electronics',
  'cybersecurity',
  'cybersecuity'
];

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
      .custom((value) => {
        const email = value.toLowerCase();
        if (!email.endsWith('@crawforduniversity.edu.ng') && !email.endsWith('@crawford.edu.ng')) {
          throw new Error('Only Crawford University school email accounts are allowed (@crawforduniversity.edu.ng or @crawford.edu.ng)');
        }
        return true;
      }),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('role')
      .optional()
      .isIn(['student', 'instructor', 'hod'])
      .withMessage('Role must be student, instructor, or hod'),
    body('matric_number')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value, { req }) => {
        if (req.body.role === 'student') {
          if (!value) {
            throw new Error('Matric number is required for students');
          }
          if (!/^\d{9}$/.test(value)) {
            throw new Error('Matric number must be exactly 9 digits (e.g. 220502071)');
          }
        }
        return true;
      }),
    body('department')
      .trim()
      .notEmpty()
      .withMessage('Department is required')
      .custom((value, { req }) => {
        const depts = value.split(',').map(d => d.trim());
        const allValid = depts.every(d => ALLOWED_DEPARTMENTS_LOWER.includes(d.toLowerCase()));
        if (!allValid) {
          throw new Error('Department must be selected from the approved school department list');
        }

        if ((req.body.role === 'student' || req.body.role === 'hod') && depts.length !== 1) {
          throw new Error('Students and HODs must select exactly one department');
        }

        if (req.body.role === 'instructor' && (depts.length < 1 || depts.length > 2)) {
          throw new Error('Lecturers must select either 1 or 2 departments');
        }

        return true;
      }),
  ],
  validate,
  AuthController.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  AuthController.login
);

// GET /api/auth/profile  (protected)
router.get('/profile', authenticate, AuthController.getProfile);

// PATCH /api/auth/profile  (protected)
router.patch(
  '/profile',
  authenticate,
  [
    body('matric_number')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value, { req }) => {
        if (req.user.role === 'student') {
          if (!value) {
            throw new Error('Matric number is required');
          }
          if (!/^\d{9}$/.test(value)) {
            throw new Error('Matric number must be exactly 9 digits (e.g. 220502071)');
          }
        }
        return true;
      }),
    body('department')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Department cannot be empty')
      .custom((value, { req }) => {
        const depts = value.split(',').map(d => d.trim());
        const allValid = depts.every(d => ALLOWED_DEPARTMENTS_LOWER.includes(d.toLowerCase()));
        if (!allValid) {
          throw new Error('Department must be selected from the approved school department list');
        }

        if ((req.user.role === 'student' || req.user.role === 'hod') && depts.length !== 1) {
          throw new Error('Students and HODs must select exactly one department');
        }

        if (req.user.role === 'instructor' && (depts.length < 1 || depts.length > 2)) {
          throw new Error('Lecturers must select either 1 or 2 departments');
        }

        return true;
      }),
  ],
  validate,
  AuthController.updateProfile
);

// PATCH /api/auth/change-password  (protected)
router.patch(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  validate,
  AuthController.changePassword
);

// GET /api/auth/hods (for selection in profiles)
router.get('/hods', authenticate, AuthController.getHods);

module.exports = router;
