const forumService = require('../services/forumService');
const AppError = require('../utils/AppError');

exports.createForum = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const forum = await forumService.createForum(courseId, req.body, req.user.id);
    res.status(201).json({ success: true, data: forum });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getForums = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const forums = await forumService.getForums(courseId);
    res.json({ success: true, data: forums });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.createThread = async (req, res, next) => {
  try {
    const { forumId } = req.params;
    const thread = await forumService.createThread(forumId, req.body, req.user.id);
    res.status(201).json({ success: true, data: thread });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getThreads = async (req, res, next) => {
  try {
    const { forumId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const threads = await forumService.getForums(forumId);
    res.json({ success: true, data: threads });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getThreadWithReplies = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const thread = await forumService.getThreadWithReplies(threadId);
    res.json({ success: true, data: thread });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

exports.addReply = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const reply = await forumService.addReply(threadId, req.body, req.user.id, req.user.name);
    res.status(201).json({ success: true, data: reply });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.markBestAnswer = async (req, res, next) => {
  try {
    const { replyId } = req.params;
    const reply = await forumService.markBestAnswer(replyId);
    res.json({ success: true, data: reply });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.deleteThread = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    await forumService.deleteThread(threadId);
    res.json({ success: true, message: 'Thread deleted' });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

exports.deleteReply = async (req, res, next) => {
  try {
    const { replyId } = req.params;
    await forumService.deleteReply(replyId);
    res.json({ success: true, message: 'Reply deleted' });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};
