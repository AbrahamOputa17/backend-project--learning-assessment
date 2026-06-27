const { query } = require('../config/database');

const StudentProgressModel = {
  /**
   * Get progress for a user in a course
   */
  async findByUserCourse(userId, courseId) {
    const result = await query(
      `SELECT * FROM student_progress
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create progress record
   */
  async create({ userId, courseId }) {
    const result = await query(
      `INSERT INTO student_progress (user_id, course_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [userId, courseId]
    );
    return result.rows[0];
  },

  /**
   * Update material view
   */
  async trackMaterialView(userId, courseId) {
    await query(
      `UPDATE student_progress
       SET materials_viewed = materials_viewed + 1,
           last_accessed = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );
  },

  /**
   * Track assignment submission
   */
  async trackAssignmentSubmission(userId, courseId) {
    await query(
      `UPDATE student_progress
       SET assignments_submitted = assignments_submitted + 1,
           updated_at = NOW()
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );
  },

  /**
   * Track quiz completion
   */
  async trackQuizCompletion(userId, courseId) {
    await query(
      `UPDATE student_progress
       SET quizzes_completed = quizzes_completed + 1,
           updated_at = NOW()
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );
  },

  /**
   * Update course totals
   */
  async updateCourseTotals(courseId) {
    const materials = await query(
      `SELECT COUNT(*) as count FROM course_materials
       WHERE module_id IN (SELECT id FROM course_modules WHERE course_id = $1)`,
      [courseId]
    );

    const assignments = await query(
      `SELECT COUNT(*) as count FROM assignments
       WHERE course_id = $1 AND is_published = true`,
      [courseId]
    );

    const quizzes = await query(
      `SELECT COUNT(*) as count FROM quizzes
       WHERE course_id = $1 AND is_published = true`,
      [courseId]
    );

    await query(
      `UPDATE student_progress
       SET total_materials = $1,
           total_assignments = $2,
           total_quizzes = $3
       WHERE course_id = $4`,
      [
        parseInt(materials.rows[0]?.count || 0),
        parseInt(assignments.rows[0]?.count || 0),
        parseInt(quizzes.rows[0]?.count || 0),
        courseId
      ]
    );
  },

  /**
   * Calculate completion percentage
   */
  async calculateCompletion(userId, courseId) {
    const progress = await this.findByUserCourse(userId, courseId);
    if (!progress) return 0;

    const total = (progress.total_materials || 0) + (progress.total_assignments || 0) + (progress.total_quizzes || 0);
    if (total === 0) return 0;

    const completed = (progress.materials_viewed || 0) + (progress.assignments_submitted || 0) + (progress.quizzes_completed || 0);
    const percentage = (completed / total) * 100;

    await query(
      `UPDATE student_progress
       SET completion_percentage = $1
       WHERE user_id = $2 AND course_id = $3`,
      [percentage, userId, courseId]
    );

    return percentage;
  },

  /**
   * Update current grade
   */
  async updateCurrentGrade(userId, courseId, grade) {
    await query(
      `UPDATE student_progress
       SET current_grade = $1
       WHERE user_id = $2 AND course_id = $3`,
      [grade, userId, courseId]
    );
  },

  /**
   * Update at-risk status based on grade
   */
  async updateRiskStatus(userId, courseId, gradeThreshold = 70) {
    const result = await query(
      `SELECT current_grade FROM student_progress
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    if (result.rows[0]) {
      const status = result.rows[0].current_grade < gradeThreshold ? 'at_risk' : 'in_progress';
      await query(
        `UPDATE student_progress SET status = $1 WHERE user_id = $2 AND course_id = $3`,
        [status, userId, courseId]
      );
    }
  },

  /**
   * Get all students progress in a course
   */
  async findByCourse(courseId) {
    const result = await query(
      `SELECT sp.*, u.name, u.email
       FROM student_progress sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.course_id = $1
       ORDER BY sp.completion_percentage DESC`,
      [courseId]
    );
    return result.rows;
  },

  /**
   * Identify at-risk students
   */
  async findAtRiskStudents(courseId) {
    const result = await query(
      `SELECT sp.*, u.name, u.email
       FROM student_progress sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.course_id = $1 AND sp.status = 'at_risk'
       ORDER BY sp.current_grade ASC`,
      [courseId]
    );
    return result.rows;
  }
};

module.exports = StudentProgressModel;
