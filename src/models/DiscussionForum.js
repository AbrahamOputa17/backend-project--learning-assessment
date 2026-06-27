const { query } = require('../config/database');

const DiscussionForumModel = {
  /**
   * Find all forums in a course
   */
  async findByCourse(courseId) {
    const result = await query(
      `SELECT df.*, u.name AS created_by_name,
              COUNT(DISTINCT ft.id) AS thread_count
       FROM discussion_forums df
       LEFT JOIN users u ON u.id = df.created_by
       LEFT JOIN forum_threads ft ON ft.forum_id = df.id
       WHERE df.course_id = $1 AND df.is_active = true
       GROUP BY df.id, u.name
       ORDER BY df.created_at DESC`,
      [courseId]
    );
    return result.rows;
  },

  /**
   * Find forum by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT df.*, u.name AS created_by_name
       FROM discussion_forums df
       LEFT JOIN users u ON u.id = df.created_by
       WHERE df.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create forum
   */
  async create({ courseId, title, description, createdBy }) {
    const result = await query(
      `INSERT INTO discussion_forums (course_id, title, description, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [courseId, title, description, createdBy]
    );
    return result.rows[0];
  },

  /**
   * Create forum thread
   */
  async createThread({ forumId, title, content, createdBy }) {
    const result = await query(
      `INSERT INTO forum_threads (forum_id, title, content, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [forumId, title, content, createdBy]
    );
    return result.rows[0];
  },

  /**
   * Find all threads in a forum
   */
  async findThreads(forumId, { limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT ft.*, u.name AS created_by_name,
              COUNT(DISTINCT fr.id) AS reply_count
       FROM forum_threads ft
       JOIN users u ON u.id = ft.created_by
       LEFT JOIN forum_replies fr ON fr.thread_id = ft.id
       WHERE ft.forum_id = $1
       GROUP BY ft.id, u.name
       ORDER BY ft.pinned DESC, ft.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [forumId, limit, offset]
    );
    return result.rows;
  },

  /**
   * Find thread by ID with replies
   */
  async findThreadWithReplies(threadId) {
    const threadResult = await query(
      `SELECT ft.*, u.name AS created_by_name
       FROM forum_threads ft
       JOIN users u ON u.id = ft.created_by
       WHERE ft.id = $1`,
      [threadId]
    );

    if (!threadResult.rows[0]) return null;

    const repliesResult = await query(
      `SELECT fr.*, u.name AS created_by_name, u.role
       FROM forum_replies fr
       JOIN users u ON u.id = fr.created_by
       WHERE fr.thread_id = $1
       ORDER BY fr.created_at ASC`,
      [threadId]
    );

    // Increment view count
    await query(
      `UPDATE forum_threads SET view_count = view_count + 1 WHERE id = $1`,
      [threadId]
    );

    return {
      ...threadResult.rows[0],
      replies: repliesResult.rows
    };
  },

  /**
   * Add reply to thread
   */
  async addReply({ threadId, content, createdBy }) {
    const result = await query(
      `INSERT INTO forum_replies (thread_id, content, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [threadId, content, createdBy]
    );

    // Update reply count
    await query(
      `UPDATE forum_threads SET reply_count = reply_count + 1 WHERE id = $1`,
      [threadId]
    );

    return result.rows[0];
  },

  /**
   * Mark reply as best answer
   */
  async markBestAnswer(replyId) {
    const result = await query(
      `UPDATE forum_replies SET is_best_answer = true
       WHERE id = $1
       RETURNING *`,
      [replyId]
    );
    return result.rows[0];
  },

  /**
   * Delete thread
   */
  async deleteThread(id) {
    await query('DELETE FROM forum_threads WHERE id = $1', [id]);
  },

  /**
   * Delete reply
   */
  async deleteReply(replyId) {
    const result = await query(
      `SELECT thread_id FROM forum_replies WHERE id = $1`,
      [replyId]
    );
    await query('DELETE FROM forum_replies WHERE id = $1', [replyId]);
    if (result.rows[0]) {
      await query(
        `UPDATE forum_threads SET reply_count = reply_count - 1 WHERE id = $1`,
        [result.rows[0].thread_id]
      );
    }
  }
};

module.exports = DiscussionForumModel;
