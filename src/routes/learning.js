const express = require('express');
const router = express.Router();
const LearningController = require('../controllers/learningController');
const { authenticate } = require('../middleware/auth');

router.get('/:courseId/status', authenticate, LearningController.getStatus);
router.post('/:courseId/start', authenticate, LearningController.startModule);
router.get('/:courseId/lesson/:moduleIndex', authenticate, LearningController.getLesson);

module.exports = router;
