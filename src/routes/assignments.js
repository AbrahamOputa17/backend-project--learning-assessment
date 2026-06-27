const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Assignments
router.post('/courses/:courseId/assignments', authorize('instructor', 'admin'), assignmentController.createAssignment);
router.get('/courses/:courseId/assignments', assignmentController.getAssignments);

// Submissions
router.post('/assignments/:assignmentId/submit', assignmentController.submitAssignment);
router.post('/submissions/:submissionId/files', assignmentController.uploadSubmissionFile);
router.get('/assignments/:assignmentId/submissions', authorize('instructor', 'admin'), assignmentController.getSubmissions);
router.get('/submissions/:submissionId', assignmentController.getSubmissionWithFiles);

// Grading
router.post('/submissions/:submissionId/grade', authorize('instructor', 'admin'), assignmentController.gradeSubmission);

// Delete
router.delete('/assignments/:assignmentId', authorize('instructor', 'admin'), assignmentController.deleteAssignment);

module.exports = router;
