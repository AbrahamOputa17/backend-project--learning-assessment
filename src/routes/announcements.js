const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Announcements
router.post('/courses/:courseId/announcements', authorize('instructor', 'admin'), announcementController.createAnnouncement);
router.get('/courses/:courseId/announcements', announcementController.getAnnouncements);
router.get('/announcements/:announcementId', announcementController.getAnnouncement);
router.put('/announcements/:announcementId', authorize('instructor', 'admin'), announcementController.updateAnnouncement);
router.delete('/announcements/:announcementId', authorize('instructor', 'admin'), announcementController.deleteAnnouncement);

module.exports = router;
