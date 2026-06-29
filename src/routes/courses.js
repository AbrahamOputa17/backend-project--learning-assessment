const express = require('express');
const { body } = require('express-validator');
const CourseController = require('../controllers/courseController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/courses
router.get('/', authenticate, CourseController.getAllCourses);

// GET /api/courses/enrolled  — student's enrolled courses
router.get('/enrolled', authenticate, CourseController.getEnrolledCourses);

// GET /api/courses/mine  — instructor's own / HOD's supervised courses
router.get('/mine', authenticate, authorize('instructor', 'hod', 'admin'), CourseController.getMyCourses);

// GET /api/courses/:id
router.get('/:id', authenticate, CourseController.getCourseById);

// POST /api/courses  — instructor/admin only
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('difficulty')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Invalid difficulty level'),
  ],
  validate,
  CourseController.createCourse
);

// PATCH /api/courses/:id
router.patch(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  CourseController.updateCourse
);

// DELETE /api/courses/:id
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  CourseController.deleteCourse
);

// POST /api/courses/:id/enroll  — student enrollment
router.post('/:id/enroll', authenticate, CourseController.enrollInCourse);

module.exports = router;
