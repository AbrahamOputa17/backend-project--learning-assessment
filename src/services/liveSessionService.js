const LiveSessionModel = require('../models/LiveSession');
const NotificationModel = require('../models/Notification');
const AnalyticsService = require('./analyticsService');

class LiveSessionService {
  /**
   * Create live session
   */
  async createSession(courseId, data, userId) {
    if (!data.title || !data.scheduledAt) {
      throw new Error('Title and scheduled date are required');
    }

    const session = await LiveSessionModel.create({
      courseId,
      title: data.title,
      description: data.description,
      scheduledAt: data.scheduledAt,
      durationMinutes: data.durationMinutes || 60,
      createdBy: userId,
      meetingUrl: data.meetingUrl
    });

    // Notify students
    await NotificationModel.notifyStudents({
      courseId,
      type: 'live_session',
      title: `Live Session Scheduled: ${data.title}`,
      content: `A live session is scheduled for ${data.scheduledAt}`,
      excludeUserId: userId
    });

    return session;
  }

  /**
   * Get live sessions
   */
  async getSessions(courseId, includeCompleted = false) {
    return LiveSessionModel.findByCourse(courseId, { includeCompleted });
  }

  /**
   * Get session
   */
  async getSession(sessionId) {
    return LiveSessionModel.findById(sessionId);
  }

  /**
   * Start session
   */
  async startSession(sessionId) {
    return LiveSessionModel.updateStatus(sessionId, 'ongoing');
  }

  /**
   * End session
   */
  async endSession(sessionId) {
    return LiveSessionModel.updateStatus(sessionId, 'completed');
  }

  /**
   * Join session
   */
  async joinSession(sessionId, userId, userName) {
    const session = await LiveSessionModel.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Track attendance
    const attendance = await LiveSessionModel.trackAttendance({
      sessionId,
      userId
    });

    // Track event
    await AnalyticsService.trackEvent(userId, session.course_id, 'live_session', sessionId);

    return attendance;
  }

  /**
   * Leave session
   */
  async leaveSession(sessionId, userId) {
    return LiveSessionModel.endAttendance(sessionId, userId);
  }

  /**
   * Get attendance
   */
  async getAttendance(sessionId) {
    return LiveSessionModel.getAttendance(sessionId);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    await LiveSessionModel.delete(sessionId);
  }
}

module.exports = new LiveSessionService();
