const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply strict rate limiting to authentication endpoints
router.use(authLimiter);

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('role')
      .optional()
      .isIn(['student', 'instructor', 'hod'])
      .withMessage('Role must be student, instructor, or hod'),
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
router.patch('/profile', authenticate, AuthController.updateProfile);

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
