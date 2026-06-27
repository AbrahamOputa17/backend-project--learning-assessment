const { query } = require('../config/database');

const CourseMaterialModel = {
  /**
   * Find all materials in a module
   */
  async findByModule(moduleId) {
    const result = await query(
      `SELECT cm.*, u.name AS uploaded_by
       FROM course_materials cm
       JOIN users u ON u.id = cm.created_by
       WHERE cm.module_id = $1 AND cm.is_published = true
       ORDER BY cm.order_index ASC`,
      [moduleId]
    );
    return result.rows;
  },

  /**
   * Find material by ID
   */
  async findById(id) {
    const result = await query(
      `SELECT cm.*, u.name AS uploaded_by
       FROM course_materials cm
       JOIN users u ON u.id = cm.created_by
       WHERE cm.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create new material
   */
  async create({ moduleId, title, description, fileUrl, fileName, fileType, fileSize, createdBy }) {
    const result = await query(
      `INSERT INTO course_materials (module_id, title, description, file_url, file_name, file_type, file_size, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [moduleId, title, description, fileUrl, fileName, fileType, fileSize, createdBy]
    );
    return result.rows[0];
  },

  /**
   * Update material (creates new version)
   */
  async update(id, { title, description, fileUrl, fileName, fileType, fileSize, createdBy, changeReason }) {
    // Get current material
    const current = await this.findById(id);
    if (!current) return null;

    // Store old version
    await query(
      `INSERT INTO content_versions (material_id, version, file_url, file_name, changed_by, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, current.version, current.file_url, current.file_name, createdBy, changeReason]
    );

    // Update material
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
    if (fileUrl !== undefined) {
      updates.push(`file_url = $${idx++}`);
      values.push(fileUrl);
      updates.push(`file_name = $${idx++}`);
      values.push(fileName);
      updates.push(`file_type = $${idx++}`);
      values.push(fileType);
      updates.push(`file_size = $${idx++}`);
      values.push(fileSize);
      updates.push(`version = version + 1`);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE course_materials SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );
    return result.rows[0];
  },

  /**
   * Get version history
   */
  async getVersionHistory(materialId) {
    const result = await query(
      `SELECT cv.*, u.name AS changed_by_name
       FROM content_versions cv
       JOIN users u ON u.id = cv.changed_by
       WHERE cv.material_id = $1
       ORDER BY cv.version DESC`,
      [materialId]
    );
    return result.rows;
  },

  /**
   * Delete material
   */
  async delete(id) {
    await query('DELETE FROM course_materials WHERE id = $1', [id]);
  }
};

module.exports = CourseMaterialModel;
