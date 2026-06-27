const messageService = require('../services/messageService');
const AppError = require('../utils/AppError');

exports.sendMessage = async (req, res, next) => {
  try {
    const message = await messageService.sendMessage(req.user.id, req.body);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getInbox = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const messages = await messageService.getInbox(req.user.id, { limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ success: true, data: messages });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getSent = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const messages = await messageService.getSent(req.user.id, { limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ success: true, data: messages });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const message = await messageService.getMessage(messageId);
    res.json({ success: true, data: message });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await messageService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { unread_count: count } });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    await messageService.deleteMessage(messageId);
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};
