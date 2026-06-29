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

// ── HOD Department-Wide Analytics ───────────────────────────────────────────

const { query } = require('../config/database');

exports.getDepartmentOverview = async (req, res, next) => {
  try {
    const department = req.user.department;
    const result = await query(
      `SELECT
         COUNT(DISTINCT c.id) AS total_courses,
         COUNT(DISTINCT e.user_id) AS total_students,
         COUNT(DISTINCT u.id) AS total_instructors,
         ROUND(AVG(CASE WHEN qa.submitted_at IS NOT NULL THEN qa.score END)::numeric, 1) AS avg_score,
         COUNT(DISTINCT CASE WHEN qa.passed = true THEN qa.attempt_id END) AS total_passed,
         COUNT(DISTINCT CASE WHEN qa.passed = false THEN qa.attempt_id END) AS total_failed
       FROM users u
       JOIN courses c ON c.instructor_id = u.id
       LEFT JOIN enrollments e ON e.course_id = c.id
       LEFT JOIN quizzes qz ON qz.course_id = c.id
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.id
       WHERE u.role = 'instructor'
         AND EXISTS (
           SELECT 1 FROM unnest(string_to_array(u.department, ',')) dep
           WHERE trim(dep) = $1
         )`,
      [department]
    );

    const row = result.rows[0] || {};
    const totalPassed = parseInt(row.total_passed || 0);
    const totalFailed = parseInt(row.total_failed || 0);
    const totalAttempts = totalPassed + totalFailed;

    res.json({
      success: true,
      data: {
        department,
        total_courses: parseInt(row.total_courses || 0),
        total_students: parseInt(row.total_students || 0),
        total_instructors: parseInt(row.total_instructors || 0),
        avg_score: parseFloat(row.avg_score || 0),
        pass_rate: totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0,
        total_attempts: totalAttempts,
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getInstructorPerformance = async (req, res, next) => {
  try {
    const department = req.user.department;
    const result = await query(
      `SELECT
         u.id,
         u.name,
         u.avatar,
         COUNT(DISTINCT c.id) AS course_count,
         COUNT(DISTINCT e.user_id) AS student_count,
         ROUND(AVG(CASE WHEN qa.submitted_at IS NOT NULL THEN qa.score END)::numeric, 1) AS avg_score,
         COUNT(DISTINCT CASE WHEN qa.passed = true THEN qa.attempt_id END) AS passed,
         COUNT(DISTINCT CASE WHEN qa.passed = false THEN qa.attempt_id END) AS failed
       FROM users u
       JOIN courses c ON c.instructor_id = u.id
       LEFT JOIN enrollments e ON e.course_id = c.id
       LEFT JOIN quizzes qz ON qz.course_id = c.id
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.id
       WHERE u.role = 'instructor'
         AND EXISTS (
           SELECT 1 FROM unnest(string_to_array(u.department, ',')) dep
           WHERE trim(dep) = $1
         )
       GROUP BY u.id, u.name, u.avatar
       ORDER BY student_count DESC`,
      [department]
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        course_count: parseInt(r.course_count || 0),
        student_count: parseInt(r.student_count || 0),
        avg_score: parseFloat(r.avg_score || 0),
        passed: parseInt(r.passed || 0),
        failed: parseInt(r.failed || 0),
        pass_rate: (parseInt(r.passed || 0) + parseInt(r.failed || 0)) > 0
          ? Math.round((parseInt(r.passed) / (parseInt(r.passed) + parseInt(r.failed))) * 100)
          : 0
      }))
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getDepartmentScoreTrend = async (req, res, next) => {
  try {
    const department = req.user.department;
    const result = await query(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', qa.submitted_at), 'Mon DD') AS week,
         ROUND(AVG(qa.score)::numeric, 1) AS avg_score,
         COUNT(DISTINCT qa.attempt_id) AS attempt_count
       FROM quiz_attempts qa
       JOIN quizzes qz ON qz.id = qa.quiz_id
       JOIN courses c ON c.id = qz.course_id
       JOIN users u ON u.id = c.instructor_id
       WHERE qa.submitted_at IS NOT NULL
         AND qa.submitted_at >= NOW() - INTERVAL '12 weeks'
         AND EXISTS (
           SELECT 1 FROM unnest(string_to_array(u.department, ',')) dep
           WHERE trim(dep) = $1
         )
       GROUP BY DATE_TRUNC('week', qa.submitted_at)
       ORDER BY DATE_TRUNC('week', qa.submitted_at) ASC`,
      [department]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getDepartmentAISummary = async (req, res, next) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const config = require('../config');
    const department = req.user.department;

    // Gather stats to pass to Gemini
    const [overviewRes, perfRes] = await Promise.all([
      query(
        `SELECT
           COUNT(DISTINCT c.id) AS total_courses,
           COUNT(DISTINCT e.user_id) AS total_students,
           ROUND(AVG(CASE WHEN qa.submitted_at IS NOT NULL THEN qa.score END)::numeric, 1) AS avg_score,
           COUNT(DISTINCT CASE WHEN qa.passed = true THEN qa.attempt_id END) AS total_passed,
           COUNT(DISTINCT CASE WHEN qa.passed = false THEN qa.attempt_id END) AS total_failed
         FROM users u
         JOIN courses c ON c.instructor_id = u.id
         LEFT JOIN enrollments e ON e.course_id = c.id
         LEFT JOIN quizzes qz ON qz.course_id = c.id
         LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.id
         WHERE u.role = 'instructor'
           AND EXISTS (SELECT 1 FROM unnest(string_to_array(u.department, ',')) dep WHERE trim(dep) = $1)`,
        [department]
      ),
      query(
        `SELECT u.name, COUNT(DISTINCT c.id) as courses,
           ROUND(AVG(qa.score)::numeric, 1) as avg_score
         FROM users u
         JOIN courses c ON c.instructor_id = u.id
         LEFT JOIN quizzes qz ON qz.course_id = c.id
         LEFT JOIN quiz_attempts qa ON qa.quiz_id = qz.id AND qa.submitted_at IS NOT NULL
         WHERE u.role = 'instructor'
           AND EXISTS (SELECT 1 FROM unnest(string_to_array(u.department, ',')) dep WHERE trim(dep) = $1)
         GROUP BY u.id, u.name LIMIT 5`,
        [department]
      )
    ]);

    const overview = overviewRes.rows[0] || {};
    const instructors = perfRes.rows || [];
    const totalPassed = parseInt(overview.total_passed || 0);
    const totalFailed = parseInt(overview.total_failed || 0);
    const total = totalPassed + totalFailed;
    const passRate = total > 0 ? Math.round((totalPassed / total) * 100) : 0;

    const prompt = `
You are an academic analytics assistant for Crawford University.

Department: ${department}
Total Courses: ${overview.total_courses || 0}
Total Students Enrolled: ${overview.total_students || 0}
Average Quiz Score: ${overview.avg_score || 0}%
Overall Pass Rate: ${passRate}%
Top Instructors: ${instructors.map(i => `${i.name} (${i.courses} courses, avg score: ${i.avg_score}%)`).join(', ') || 'N/A'}

Write a short, professional 3–4 sentence academic performance summary for the HOD. 
Highlight strengths, flag any concerns, and end with one actionable recommendation.
Be concise, data-driven, and encouraging but honest.`;

    const genAI = new GoogleGenerativeAI(config.google.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({ success: true, data: { summary, generated_at: new Date().toISOString() } });
  } catch (error) {
    next(new AppError(`AI summary failed: ${error.message}`, 500));
  }
};
