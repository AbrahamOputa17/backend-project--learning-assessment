const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const courseRoutes = require('./courses');
const contentRoutes = require('./content');
const assignmentRoutes = require('./assignments');
const quizRoutes = require('./quizzes');
const gradeRoutes = require('./grades');
const forumRoutes = require('./forum');
const messageRoutes = require('./messages');
const announcementRoutes = require('./announcements');
const analyticsRoutes = require('./analytics');
const codingRoutes = require('./coding');
const sessionRoutes = require('./sessions');
const pdfMcqRoutes = require('./pdfMcq');
const learningRoutes = require('./learning');

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/content', contentRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/quizzes', quizRoutes);
router.use('/grades', gradeRoutes);
router.use('/forum', forumRoutes);
router.use('/messages', messageRoutes);
router.use('/announcements', announcementRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/coding', codingRoutes);
router.use('/sessions', sessionRoutes);
router.use('/pdf-mcq', pdfMcqRoutes);
router.use('/learning', learningRoutes);

module.exports = router;
