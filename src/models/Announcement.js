const { query } = require('../config/database');

const AnnouncementModel = {
  /**
   * Find all announcements in a course
   */
  async findByCourse(courseId, { limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT a.*, u.name AS created_by_name
       FROM announcements a
       JOIN users u ON u.id = a.created_by
       WHERE a.course_id = $1 AND a.is_published = true
       AND (a.scheduled_at IS NULL OR a.scheduled_at <= NOW())
       AND (a.expires_at IS NULL OR a.expires_at > NOW())
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [courseId, limit, offset]
    );
    return result.rows;
  },

  /**
   * Find announcement by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT a.*, u.name AS created_by_name
       FROM announcements a
       JOIN users u ON u.id = a.created_by
       WHERE a.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create announcement
   */
  async create({ courseId, title, content, createdBy, scheduledAt, expiresAt }) {
    const result = await query(
      `INSERT INTO announcements (course_id, title, content, created_by, scheduled_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [courseId, title, content, createdBy, scheduledAt, expiresAt]
    );
    return result.rows[0];
  },

  /**
   * Update announcement
   */
  async update(id, { title, content, scheduledAt, expiresAt }) {
    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(title);
    }
    if (content !== undefined) {
      updates.push(`content = $${idx++}`);
      values.push(content);
    }
    if (scheduledAt !== undefined) {
      updates.push(`scheduled_at = $${idx++}`);
      values.push(scheduledAt);
    }
    if (expiresAt !== undefined) {
      updates.push(`expires_at = $${idx++}`);
      values.push(expiresAt);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE announcements SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );
    return result.rows[0];
  },

  /**
   * Delete announcement
   */
  async delete(id) {
    await query('DELETE FROM announcements WHERE id = $1', [id]);
  }
};

module.exports = AnnouncementModel;
