const { query } = require('../config/database');

const CourseModuleModel = {
  /**
   * Find all modules for a course
   */
  async findByCourse(courseId) {
    const result = await query(
      `SELECT * FROM course_modules 
       WHERE course_id = $1
       ORDER BY order_index ASC`,
      [courseId]
    );
    return result.rows;
  },

  /**
   * Find module by ID
   */
  async findById(id) {
    const result = await query(
      'SELECT * FROM course_modules WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new module
   */
  async create({ courseId, title, description }) {
    const result = await query(
      `INSERT INTO course_modules (course_id, title, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [courseId, title, description]
    );
    return result.rows[0];
  },

  /**
   * Update module
   */
  async update(id, { title, description, orderIndex }) {
    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(description);
    }
    if (orderIndex !== undefined) {
      updates.push(`order_index = $${idx++}`);
      values.push(orderIndex);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE course_modules SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );
    return result.rows[0];
  },

  /**
   * Delete module
   */
  async delete(id) {
    await query('DELETE FROM course_modules WHERE id = $1', [id]);
  }
};

module.exports = CourseModuleModel;
