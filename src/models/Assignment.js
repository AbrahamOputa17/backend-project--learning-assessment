const { query } = require('../config/database');

const AssignmentModel = {
  /**
   * Find all assignments in a course
   */
  async findByCourse(courseId, { includeUnpublished = false } = {}) {
    const published = includeUnpublished ? '' : 'AND a.is_published = true';
    const result = await query(
      `SELECT a.*, u.name AS created_by_name,
              COUNT(DISTINCT asub.id) AS submission_count
       FROM assignments a
       JOIN users u ON u.id = a.created_by
       LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id
       WHERE a.course_id = $1 ${published}
       GROUP BY a.id, u.name
       ORDER BY a.due_date ASC`,
      [courseId]
    );
    return result.rows;
  },

  /**
   * Find assignment by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT a.*, u.name AS created_by_name
       FROM assignments a
       JOIN users u ON u.id = a.created_by
       WHERE a.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create assignment
   */
  async create({
    courseId,
    moduleId,
    title,
    description,
    instructions,
    createdBy,
    dueDate,
    lateSubmissionAllowed,
    lateSubmissionDays,
    maxScore
  }) {
    const result = await query(
      `INSERT INTO assignments (course_id, module_id, title, description, instructions, created_by, due_date, late_submission_allowed, late_submission_days, max_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        courseId,
        moduleId,
        title,
        description,
        instructions,
        createdBy,
        dueDate,
        lateSubmissionAllowed,
        lateSubmissionDays,
        maxScore
      ]
    );
    return result.rows[0];
  },

  /**
   * Submit assignment
   */
  async createSubmission({ assignmentId, userId }) {
    // Check if submission already exists
    const existing = await query(
      `SELECT * FROM assignment_submissions
       WHERE assignment_id = $1 AND user_id = $2`,
      [assignmentId, userId]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    // Check if late
    const assignment = await this.findById(assignmentId);
    const isLate = new Date() > new Date(assignment.due_date) && !assignment.late_submission_allowed;

    const result = await query(
      `INSERT INTO assignment_submissions (assignment_id, user_id, is_late)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [assignmentId, userId, isLate]
    );
    return result.rows[0];
  },

  /**
   * Get submissions for assignment
   */
  async getSubmissions(assignmentId) {
    const result = await query(
      `SELECT asub.*, u.name AS student_name
       FROM assignment_submissions asub
       JOIN users u ON u.id = asub.user_id
       WHERE asub.assignment_id = $1
       ORDER BY asub.submitted_at DESC`,
      [assignmentId]
    );
    return result.rows;
  },

  /**
   * Get submission with files
   */
  async getSubmissionWithFiles(submissionId) {
    const submissionResult = await query(
      `SELECT asub.*, u.name AS student_name
       FROM assignment_submissions asub
       JOIN users u ON u.id = asub.user_id
       WHERE asub.id = $1`,
      [submissionId]
    );

    if (!submissionResult.rows[0]) return null;

    const filesResult = await query(
      `SELECT * FROM submission_files
       WHERE submission_id = $1
       ORDER BY uploaded_at ASC`,
      [submissionId]
    );

    return {
      ...submissionResult.rows[0],
      files: filesResult.rows
    };
  },

  /**
   * Add file to submission
   */
  async addSubmissionFile({ submissionId, fileUrl, fileName, fileSize, fileType }) {
    const result = await query(
      `INSERT INTO submission_files (submission_id, file_url, file_name, file_size, file_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [submissionId, fileUrl, fileName, fileSize, fileType]
    );
    return result.rows[0];
  },

  /**
   * Update submission status
   */
  async updateSubmissionStatus(submissionId, status) {
    const result = await query(
      `UPDATE assignment_submissions SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, submissionId]
    );
    return result.rows[0];
  },

  /**
   * Delete assignment
   */
  async delete(id) {
    await query('DELETE FROM assignments WHERE id = $1', [id]);
  }
};

module.exports = AssignmentModel;
