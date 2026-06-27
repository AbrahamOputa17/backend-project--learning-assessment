const analyticsService = require('../services/analyticsService');
const CourseModel = require('../models/Course');
const NotificationModel = require('../models/Notification');
const AppError = require('../utils/AppError');

// Helper to check if user has access to course analytics
const checkCourseAccess = async (user, courseId) => {
  if (user.role === 'admin') return true;
  const course = await CourseModel.findById(courseId);
  if (!course) throw new AppError('Course not found', 404);
  
  const isOwner = course.instructor_id === user.id;
  const isSupervisor = user.role === 'hod' && await CourseModel.isSupervisedBy(courseId, user.id);
  
  if (!isOwner && !isSupervisor) {
    throw new AppError('Not authorized to view analytics for this course', 403);
  }
  return true;
};

exports.getStudentProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const progress = await analyticsService.getStudentProgress(req.user.id, courseId);
    res.json({ success: true, data: progress });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await checkCourseAccess(req.user, courseId);
    const progress = await analyticsService.getCourseProgress(courseId);
    res.json({ success: true, data: progress });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
};

exports.getAtRiskStudents = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await checkCourseAccess(req.user, courseId);
    const students = await analyticsService.getAtRiskStudents(courseId);
    res.json({ success: true, data: students });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
};

exports.getCourseAnalytics = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await checkCourseAccess(req.user, courseId);
    const analytics = await analyticsService.generateCourseAnalytics(courseId);
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.json({ success: true, data: { total_students: 0, active_students: 0, at_risk_students: 0, average_grade: 0, completion_rate: 0, engagement_score: 0 } });
  }
};

exports.getAttendanceReport = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await checkCourseAccess(req.user, courseId);
    const report = await analyticsService.getAttendanceReport(courseId);
    res.json({ success: true, data: report });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
};

exports.getParticipationReport = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await checkCourseAccess(req.user, courseId);
    const report = await analyticsService.getParticipationReport(courseId);
    res.json({ success: true, data: report });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
};

exports.trackEvent = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { eventType, eventId } = req.body;
    await analyticsService.trackEvent(req.user.id, courseId, eventType, eventId);
    res.json({ success: true, message: 'Event tracked' });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getPassFailureStats = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await checkCourseAccess(req.user, courseId);
    const stats = await analyticsService.getPassFailureStats(courseId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.json({ success: true, data: { overall: { total_attempts: 0, total_passed: 0, total_failed: 0, pass_percentage: 0, fail_percentage: 0 }, by_quiz: [] } });
  }
};

exports.getStudentPassFailureStats = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const stats = await analyticsService.getStudentPassFailureStats(courseId, req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.reportToHOD = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);

    if (!req.user.supervisor_id) {
       throw new AppError('No supervisor (HOD) linked to your account.', 400);
    }

    const stats = await analyticsService.getPassFailureStats(courseId);
    const analytics = await analyticsService.generateCourseAnalytics(courseId);

    const reportContent = `
       Performance report for "${course.title}". 
       Pass Rate: ${stats.overall.pass_percentage}%. 
       Engagement: ${analytics.engagement_score.toFixed(1)}%. 
       At Risk Students: ${analytics.at_risk_students}.
    `;

    await NotificationModel.create({
      userId: req.user.supervisor_id,
      type: 'report',
      title: `Course Performance: ${course.title}`,
      content: reportContent,
      relatedId: courseId
    });

    res.json({ success: true, message: 'Intelligence report sent to your HOD successfully.' });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};
