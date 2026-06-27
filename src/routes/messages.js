const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Messaging
router.post('/messages', messageController.sendMessage);
router.get('/messages/inbox', messageController.getInbox);
router.get('/messages/sent', messageController.getSent);
router.get('/messages/:messageId', messageController.getMessage);
router.get('/messages/unread/count', messageController.getUnreadCount);
router.delete('/messages/:messageId', messageController.deleteMessage);

module.exports = router;
