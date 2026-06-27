const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Grades
router.get('/courses/:courseId/grades', gradeController.getUserCourseGrades);
router.get('/courses/:courseId/gradebook', authorize('instructor', 'admin'), gradeController.getCourseGradeBook);

// Grade Weights
router.post('/courses/:courseId/grade-weights', authorize('instructor', 'admin'), gradeController.setGradeWeights);
router.get('/courses/:courseId/grade-weights', gradeController.getGradeWeights);

// Cumulative Grades
router.get('/courses/:courseId/cumulative-grade', gradeController.getCumulativeGrade);

// Export
router.get('/courses/:courseId/grades/export', authorize('instructor', 'admin'), gradeController.exportGrades);

module.exports = router;
