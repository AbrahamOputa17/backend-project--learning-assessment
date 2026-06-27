const { query } = require('../config/database');

const GradeModel = {
  /**
   * Get grades for a user in a course
   */
  async findByUserCourse(userId, courseId) {
    const result = await query(
      `SELECT g.*, c.title AS course_title, u.name AS graded_by_name
       FROM grades g
       JOIN courses c ON c.id = g.course_id
       LEFT JOIN users u ON u.id = g.graded_by
       WHERE g.user_id = $1 AND g.course_id = $2
       ORDER BY g.created_at DESC`,
      [userId, courseId]
    );
    return result.rows;
  },

  /**
   * Get all grades for a course
   */
  async findByCourse(courseId) {
    const result = await query(
      `SELECT g.*, u.name AS student_name
       FROM grades g
       JOIN users u ON u.id = g.user_id
       WHERE g.course_id = $1
       ORDER BY u.name ASC, g.created_at DESC`,
      [courseId]
    );
    return result.rows;
  },

  /**
   * Get grade for a specific item
   */
  async findByItemId(itemId, userId) {
    const result = await query(
      `SELECT * FROM grades
       WHERE item_id = $1 AND user_id = $2`,
      [itemId, userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create grade
   */
  async create({
    submissionId,
    userId,
    courseId,
    type,
    itemId,
    score,
    maxScore,
    weight,
    feedback,
    gradedBy
  }) {
    const percentage = (score / maxScore) * 100;
    const result = await query(
      `INSERT INTO grades (submission_id, user_id, course_id, type, item_id, score, max_score, percentage, weight, feedback, graded_by, graded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
      [submissionId, userId, courseId, type, itemId, score, maxScore, percentage, weight, feedback, gradedBy]
    );
    return result.rows[0];
  },

  /**
   * Update grade
   */
  async update(id, { score, maxScore, feedback, gradedBy }) {
    const percentage = maxScore ? (score / maxScore) * 100 : null;
    const result = await query(
      `UPDATE grades SET score = $1, max_score = $2, percentage = $3, feedback = $4, graded_by = $5, graded_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [score, maxScore, percentage, feedback, gradedBy, id]
    );
    return result.rows[0];
  },

  /**
   * Get cumulative grade for user in course
   */
  async getCumulativeGrade(userId, courseId) {
    const result = await query(
      `SELECT
         SUM(g.score * g.weight / 100) / NULLIF(SUM(g.weight), 0) AS cumulative_grade,
         COUNT(*) AS grade_count,
         AVG(g.percentage) AS average_percentage
       FROM grades g
       WHERE g.user_id = $1 AND g.course_id = $2`,
      [userId, courseId]
    );
    return result.rows[0];
  },

  /**
   * Get grade by type
   */
  async findByType(userId, courseId, type) {
    const result = await query(
      `SELECT * FROM grades
       WHERE user_id = $1 AND course_id = $2 AND type = $3
       ORDER BY created_at DESC`,
      [userId, courseId, type]
    );
    return result.rows;
  },

  /**
   * Set grade weights for course
   */
  async setWeights(courseId, weights) {
    for (const [category, weight] of Object.entries(weights)) {
      await query(
        `INSERT INTO grade_weights (course_id, category, weight)
         VALUES ($1, $2, $3)
         ON CONFLICT (course_id, category) DO UPDATE SET weight = $3`,
        [courseId, category, weight]
      );
    }
  },

  /**
   * Get grade weights for course
   */
  async getWeights(courseId) {
    const result = await query(
      `SELECT category, weight FROM grade_weights WHERE course_id = $1`,
      [courseId]
    );
    return result.rows;
  }
};

module.exports = GradeModel;
