const { query } = require('../config/database');

const MessageModel = {
  /**
   * Find inbox messages for a user
   */
  async findInbox(userId, { limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.recipient_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  /**
   * Find sent messages by user
   */
  async findSent(userId, { limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT m.*, u.name AS recipient_name, u.avatar AS recipient_avatar
       FROM messages m
       JOIN users u ON u.id = m.recipient_id
       WHERE m.sender_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  /**
   * Find message by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT m.*, u.name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get message with attachments
   */
  async findByIdWithAttachments(id) {
    const msgResult = await query(
      `SELECT m.*, u.name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = $1`,
      [id]
    );

    if (!msgResult.rows[0]) return null;

    const attachmentsResult = await query(
      `SELECT * FROM message_attachments WHERE message_id = $1`,
      [id]
    );

    return {
      ...msgResult.rows[0],
      attachments: attachmentsResult.rows
    };
  },

  /**
   * Create message
   */
  async create({ senderId, recipientId, subject, content }) {
    const result = await query(
      `INSERT INTO messages (sender_id, recipient_id, subject, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [senderId, recipientId, subject, content]
    );
    return result.rows[0];
  },

  /**
   * Mark message as read
   */
  async markAsRead(id) {
    const result = await query(
      `UPDATE messages SET is_read = true, read_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    const result = await query(
      `SELECT COUNT(*) as count FROM messages
       WHERE recipient_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  },

  /**
   * Delete message
   */
  async delete(id) {
    await query('DELETE FROM messages WHERE id = $1', [id]);
  }
};

module.exports = MessageModel;
