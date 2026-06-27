const { query } = require('../config/database');

const NotificationModel = {
  /**
   * Get user notifications
   */
  async findByUser(userId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
    const filter = unreadOnly ? 'AND n.is_read = false' : '';
    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1 ${filter}
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  /**
   * Create notification
   */
  async create({ userId, type, title, content, relatedId }) {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, content, related_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, content, relatedId]
    );
    return result.rows[0];
  },

  /**
   * Mark as read
   */
  async markAsRead(id) {
    const result = await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  /**
   * Mark all as read
   */
  async markAllAsRead(userId) {
    await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  },

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    const result = await query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(result.rows[0]?.count || 0);
  },

  /**
   * Notify students in course
   */
  async notifyStudents({ courseId, type, title, content, excludeUserId }) {
    // Get all enrolled students
    const enrolledResult = await query(
      `SELECT DISTINCT e.user_id FROM enrollments e
       WHERE e.course_id = $1 ${excludeUserId ? 'AND e.user_id != $2' : ''}`,
      excludeUserId ? [courseId, excludeUserId] : [courseId]
    );

    const notifications = [];
    for (const row of enrolledResult.rows) {
      const result = await this.create({
        userId: row.user_id,
        type,
        title,
        content,
        relatedId: courseId
      });
      notifications.push(result);
    }

    return notifications;
  },

  /**
   * Delete notification
   */
  async delete(id) {
    await query('DELETE FROM notifications WHERE id = $1', [id]);
  }
};

module.exports = NotificationModel;
