const liveSessionService = require('../services/liveSessionService');
const AppError = require('../utils/AppError');

exports.createSession = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const session = await liveSessionService.createSession(courseId, req.body, req.user.id);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getSessions = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { includeCompleted } = req.query;
    const sessions = await liveSessionService.getSessions(courseId, includeCompleted === 'true');
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await liveSessionService.getSession(sessionId);
    res.json({ success: true, data: session });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

exports.startSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await liveSessionService.startSession(sessionId);
    res.json({ success: true, data: session });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await liveSessionService.endSession(sessionId);
    res.json({ success: true, data: session });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.joinSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const attendance = await liveSessionService.joinSession(sessionId, req.user.id, req.user.name);
    res.json({ success: true, data: attendance });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.leaveSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const attendance = await liveSessionService.leaveSession(sessionId, req.user.id);
    res.json({ success: true, data: attendance });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getAttendance = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const attendance = await liveSessionService.getAttendance(sessionId);
    res.json({ success: true, data: attendance });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    await liveSessionService.deleteSession(sessionId);
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};
