const express = require('express');
const router = express.Router();
const liveSessionController = require('../controllers/liveSessionController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Live Sessions
router.post('/courses/:courseId/sessions', authorize('instructor', 'admin'), liveSessionController.createSession);
router.get('/courses/:courseId/sessions', liveSessionController.getSessions);
router.get('/sessions/:sessionId', liveSessionController.getSession);

// Session Management
router.put('/sessions/:sessionId/start', authorize('instructor', 'admin'), liveSessionController.startSession);
router.put('/sessions/:sessionId/end', authorize('instructor', 'admin'), liveSessionController.endSession);

// Attendance
router.post('/sessions/:sessionId/join', liveSessionController.joinSession);
router.post('/sessions/:sessionId/leave', liveSessionController.leaveSession);
router.get('/sessions/:sessionId/attendance', authorize('instructor', 'admin'), liveSessionController.getAttendance);

// Delete
router.delete('/sessions/:sessionId', authorize('instructor', 'admin'), liveSessionController.deleteSession);

module.exports = router;
