const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Student Progress
router.get('/courses/:courseId/progress', analyticsController.getStudentProgress);
router.get('/courses/:courseId/progress/all', authorize('instructor', 'hod', 'admin'), analyticsController.getCourseProgress);

// Analytics
router.get('/courses/:courseId/analytics', authorize('instructor', 'hod', 'admin'), analyticsController.getCourseAnalytics);
router.get('/courses/:courseId/at-risk-students', authorize('instructor', 'hod', 'admin'), analyticsController.getAtRiskStudents);

// Reports
router.get('/courses/:courseId/attendance-report', authorize('instructor', 'hod', 'admin'), analyticsController.getAttendanceReport);
router.get('/courses/:courseId/participation-report', authorize('instructor', 'hod', 'admin'), analyticsController.getParticipationReport);

// Event Tracking
router.post('/courses/:courseId/track-event', analyticsController.trackEvent);

// Pass/Failure Statistics
router.get('/courses/:courseId/pass-failure-stats', authorize('instructor', 'hod', 'admin'), analyticsController.getPassFailureStats);
router.get('/courses/:courseId/student-pass-failure-stats', analyticsController.getStudentPassFailureStats);

// Report to HOD
router.post('/courses/:courseId/report-to-hod', authorize('instructor'), analyticsController.reportToHOD);

// ── HOD Department-Wide Analytics ────────────────────────────────────────────
router.get('/department/overview', authorize('hod', 'admin'), analyticsController.getDepartmentOverview);
router.get('/department/instructor-performance', authorize('hod', 'admin'), analyticsController.getInstructorPerformance);
router.get('/department/score-trend', authorize('hod', 'admin'), analyticsController.getDepartmentScoreTrend);
router.post('/department/ai-summary', authorize('hod', 'admin'), analyticsController.getDepartmentAISummary);

module.exports = router;
