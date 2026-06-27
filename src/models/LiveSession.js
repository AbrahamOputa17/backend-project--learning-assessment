const { query } = require('../config/database');

const LiveSessionModel = {
  /**
   * Find all sessions in a course
   */
  async findByCourse(courseId, { includeCompleted = false } = {}) {
    const filter = includeCompleted ? '' : "AND ls.status IN ('scheduled', 'ongoing')";
    const result = await query(
      `SELECT ls.*, u.name AS created_by_name
       FROM live_sessions ls
       JOIN users u ON u.id = ls.created_by
       WHERE ls.course_id = $1 ${filter}
       ORDER BY ls.scheduled_at ASC`,
      [courseId]
    );
    return result.rows;
  },

  /**
   * Find session by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT ls.*, u.name AS created_by_name
       FROM live_sessions ls
       JOIN users u ON u.id = ls.created_by
       WHERE ls.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create session
   */
  async create({
    courseId,
    title,
    description,
    scheduledAt,
    durationMinutes,
    createdBy,
    meetingUrl
  }) {
    const result = await query(
      `INSERT INTO live_sessions (course_id, title, description, scheduled_at, duration_minutes, created_by, meeting_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [courseId, title, description, scheduledAt, durationMinutes, createdBy, meetingUrl]
    );
    return result.rows[0];
  },

  /**
   * Update session status
   */
  async updateStatus(id, status) {
    const result = await query(
      `UPDATE live_sessions SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  },

  /**
   * Track attendance
   */
  async trackAttendance({ sessionId, userId }) {
    const existing = await query(
      `SELECT * FROM live_session_attendance
       WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const result = await query(
      `INSERT INTO live_session_attendance (session_id, user_id, joined_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [sessionId, userId]
    );
    return result.rows[0];
  },

  /**
   * End attendance
   */
  async endAttendance(sessionId, userId) {
    const result = await query(
      `UPDATE live_session_attendance
       SET left_at = NOW(),
           duration_minutes = EXTRACT(EPOCH FROM (NOW() - joined_at))/60
       WHERE session_id = $1 AND user_id = $2
       RETURNING *`,
      [sessionId, userId]
    );
    return result.rows[0];
  },

  /**
   * Get session attendance
   */
  async getAttendance(sessionId) {
    const result = await query(
      `SELECT lsa.*, u.name, u.email
       FROM live_session_attendance lsa
       JOIN users u ON u.id = lsa.user_id
       WHERE lsa.session_id = $1
       ORDER BY lsa.joined_at ASC`,
      [sessionId]
    );
    return result.rows;
  },

  /**
   * Delete session
   */
  async delete(id) {
    await query('DELETE FROM live_sessions WHERE id = $1', [id]);
  }
};

module.exports = LiveSessionModel;
