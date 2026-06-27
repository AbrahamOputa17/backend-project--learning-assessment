const StudentProgressModel = require('../models/StudentProgress');
const GradeModel = require('../models/Grade');
const { query } = require('../config/database');

class AnalyticsService {
  /**
   * Get student progress
   */
  async getStudentProgress(userId, courseId) {
    return StudentProgressModel.findByUserCourse(userId, courseId);
  }

  /**
   * Get course progress for all students
   */
  async getCourseProgress(courseId) {
    return StudentProgressModel.findByCourse(courseId);
  }

  /**
   * Get at-risk students
   */
  async getAtRiskStudents(courseId) {
    return StudentProgressModel.findAtRiskStudents(courseId);
  }

  /**
   * Calculate engagement score
   */
  async calculateEngagementScore(userId, courseId) {
    const result = await query(
      `SELECT
        COUNT(DISTINCT CASE WHEN event_type = 'forum_post' THEN event_id END) as forum_posts,
        COUNT(DISTINCT CASE WHEN event_type = 'quiz_completed' THEN event_id END) as quizzes_completed,
        COUNT(DISTINCT CASE WHEN event_type = 'material_viewed' THEN event_id END) as materials_viewed
       FROM attendance_records
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    const row = result.rows[0];
    const engagement = (row.forum_posts * 10 + row.quizzes_completed * 20 + row.materials_viewed * 5) / 35 * 100;

    return Math.min(100, Math.round(engagement));
  }

  /**
   * Generate course analytics
   */
  async generateCourseAnalytics(courseId) {
    const students = await StudentProgressModel.findByCourse(courseId);
    const atRiskStudents = await StudentProgressModel.findAtRiskStudents(courseId);

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.last_accessed && new Date(s.last_accessed) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
    const averageGrade = students.reduce((sum, s) => sum + (s.current_grade || 0), 0) / Math.max(totalStudents, 1);
    const completionRate = students.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / Math.max(totalStudents, 1);

    return {
      total_students: totalStudents,
      active_students: activeStudents,
      at_risk_students: atRiskStudents.length,
      average_grade: Math.round(averageGrade * 100) / 100,
      completion_rate: Math.round(completionRate * 100) / 100,
      engagement_score: Math.round(
        students.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / Math.max(totalStudents, 1) / 100 * 100
      )
    };
  }

  /**
   * Get attendance report
   */
  async getAttendanceReport(courseId) {
    const result = await query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.matric_number,
        u.department,
        COUNT(DISTINCT CASE WHEN ar.event_type = 'live_session' THEN ar.event_id END) as sessions_attended,
        COUNT(DISTINCT CASE WHEN ar.event_type = 'material_viewed' THEN ar.recorded_at::date END) as days_active,
        MAX(ar.recorded_at) as last_activity
       FROM users u
       LEFT JOIN attendance_records ar ON ar.user_id = u.id AND ar.course_id = $1
       LEFT JOIN enrollments e ON e.user_id = u.id AND e.course_id = $1
       WHERE e.id IS NOT NULL
       GROUP BY u.id, u.name, u.email, u.matric_number, u.department
       ORDER BY u.name ASC`,
      [courseId]
    );

    return result.rows;
  }

  /**
   * Get participation report
   */
  async getParticipationReport(courseId) {
    const result = await query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.matric_number,
        u.department,
        COUNT(DISTINCT CASE WHEN ar.event_type = 'forum_post' THEN ar.event_id END) as forum_posts,
        COUNT(DISTINCT CASE WHEN ar.event_type = 'quiz_completed' THEN ar.event_id END) as quizzes_completed,
        COUNT(DISTINCT CASE WHEN ar.event_type = 'material_viewed' THEN ar.event_id END) as materials_accessed
       FROM users u
       LEFT JOIN attendance_records ar ON ar.user_id = u.id AND ar.course_id = $1
       LEFT JOIN enrollments e ON e.user_id = u.id AND e.course_id = $1
       WHERE e.id IS NOT NULL
       GROUP BY u.id, u.name, u.email, u.matric_number, u.department
       ORDER BY forum_posts DESC`,
      [courseId]
    );

    return result.rows;
  }

  /**
   * Track event
   */
  async trackEvent(userId, courseId, eventType, eventId) {
    await query(
      `INSERT INTO attendance_records (user_id, course_id, event_type, event_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, courseId, eventType, eventId]
    );
  }

  /**
   * Get pass/failure statistics for a course
   */
  async getPassFailureStats(courseId) {
    const result = await query(
      `SELECT
        COUNT(DISTINCT qa.attempt_id) FILTER (WHERE qa.passed = true) as total_passed,
        COUNT(DISTINCT qa.attempt_id) FILTER (WHERE qa.passed = false) as total_failed,
        COUNT(DISTINCT qa.attempt_id) as total_attempts,
        AVG(qa.score) FILTER (WHERE qa.passed = true) as avg_passed_score,
        AVG(qa.score) FILTER (WHERE qa.passed = false) as avg_failed_score,
        q.id as quiz_id,
        q.title as quiz_title,
        COUNT(DISTINCT CASE WHEN qa.passed = true THEN qa.attempt_id END) as quiz_passed,
        COUNT(DISTINCT CASE WHEN qa.passed = false THEN qa.attempt_id END) as quiz_failed
       FROM quiz_attempts qa
       JOIN questions q ON q.quiz_id = qa.quiz_id
       JOIN quizzes qz ON qz.id = q.quiz_id
       WHERE qz.course_id = $1 AND qa.submitted_at IS NOT NULL
       GROUP BY q.quiz_id, q.id, q.title
       ORDER BY q.quiz_id`,
      [courseId]
    );

    const quizStats = result.rows || [];
    
    // Aggregate overall stats
    const totalPassedAttempts = quizStats.reduce((sum, q) => sum + parseInt(q.quiz_passed || 0), 0);
    const totalFailedAttempts = quizStats.reduce((sum, q) => sum + parseInt(q.quiz_failed || 0), 0);
    const totalAttempts = totalPassedAttempts + totalFailedAttempts;
    const passPercentage = totalAttempts > 0 ? Math.round((totalPassedAttempts / totalAttempts) * 100) : 0;
    const failPercentage = totalAttempts > 0 ? Math.round((totalFailedAttempts / totalAttempts) * 100) : 0;

    return {
      overall: {
        total_passed: totalPassedAttempts,
        total_failed: totalFailedAttempts,
        total_attempts: totalAttempts,
        pass_percentage: passPercentage,
        fail_percentage: failPercentage
      },
      by_quiz: quizStats.map(q => ({
        quiz_id: q.quiz_id,
        quiz_title: q.quiz_title,
        passed: parseInt(q.quiz_passed || 0),
        failed: parseInt(q.quiz_failed || 0),
        pass_rate: q.quiz_passed + q.quiz_failed > 0 
          ? Math.round((parseInt(q.quiz_passed) / (parseInt(q.quiz_passed) + parseInt(q.quiz_failed))) * 100) 
          : 0,
        avg_passed_score: Math.round((q.avg_passed_score || 0) * 100) / 100,
        avg_failed_score: Math.round((q.avg_failed_score || 0) * 100) / 100
      }))
    };
  }

  /**
   * Get student pass/failure stats for a course
   */
  async getStudentPassFailureStats(courseId, userId) {
    const result = await query(
      `SELECT
        COUNT(DISTINCT qa.id) FILTER (WHERE qa.passed = true) as total_passed,
        COUNT(DISTINCT qa.id) FILTER (WHERE qa.passed = false) as total_failed,
        AVG(qa.score) as avg_score,
        MAX(qa.score) as best_score,
        MIN(qa.score) as worst_score
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       WHERE q.course_id = $1 AND qa.user_id = $2 AND qa.submitted_at IS NOT NULL`,
      [courseId, userId]
    );

    const row = result.rows[0];
    const totalPassed = parseInt(row.total_passed || 0);
    const totalFailed = parseInt(row.total_failed || 0);
    const totalAttempts = totalPassed + totalFailed;

    return {
      total_passed: totalPassed,
      total_failed: totalFailed,
      total_attempts: totalAttempts,
      pass_rate: totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0,
      average_score: Math.round((row.avg_score || 0) * 100) / 100,
      best_score: Math.round((row.best_score || 0) * 100) / 100,
      worst_score: Math.round((row.worst_score || 0) * 100) / 100
    };
  }
}

module.exports = new AnalyticsService();
