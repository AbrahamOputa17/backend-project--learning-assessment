const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Forum Management
router.post('/courses/:courseId/forums', authorize('instructor', 'admin'), forumController.createForum);
router.get('/courses/:courseId/forums', forumController.getForums);

// Thread Management
router.post('/forums/:forumId/threads', forumController.createThread);
router.get('/forums/:forumId/threads', forumController.getThreads);
router.get('/threads/:threadId', forumController.getThreadWithReplies);
router.post('/threads/:threadId/replies', forumController.addReply);
router.put('/replies/:replyId/best-answer', authorize('instructor', 'admin'), forumController.markBestAnswer);
router.delete('/threads/:threadId', authorize('instructor', 'admin'), forumController.deleteThread);
router.delete('/replies/:replyId', authorize('instructor', 'admin'), forumController.deleteReply);

module.exports = router;
