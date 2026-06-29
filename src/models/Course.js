const { query } = require('../config/database');

const CourseModel = {
  /**
   * Get all published courses with instructor info.
   */
  async findAll({ limit = 20, offset = 0, category, difficulty } = {}) {
    const conditions = ['c.is_published = TRUE'];
    const values = [];
    let idx = 1;

    if (category) {
      conditions.push(`c.category = $${idx++}`);
      values.push(category);
    }
    if (difficulty) {
      conditions.push(`c.difficulty = $${idx++}`);
      values.push(difficulty);
    }

    values.push(limit, offset);

    const result = await query(
      `SELECT c.*, u.name AS instructor_name, u.avatar AS instructor_avatar
       FROM courses c
       JOIN users u ON u.id = c.instructor_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      values
    );
    return result.rows;
  },

  /**
   * Get all courses for an instructor.
   */
  async findByInstructor(instructorId) {
    const result = await query(
      `SELECT c.*, u.name AS instructor_name
       FROM courses c
       JOIN users u ON u.id = c.instructor_id
       WHERE c.instructor_id = $1
       ORDER BY c.created_at DESC`,
      [instructorId]
    );
    return result.rows;
  },

  /**
   * Get all courses supervised by an HOD by department matching.
   */
  async findBySupervisor(hodId) {
    const result = await query(
      `SELECT c.*, u.name AS instructor_name
       FROM courses c
       JOIN users u ON u.id = c.instructor_id
       WHERE EXISTS (
         SELECT 1 FROM unnest(string_to_array(u.department, ',')) dep
         WHERE trim(dep) = (SELECT department FROM users WHERE id = $1)
       )
       ORDER BY c.created_at DESC`,
      [hodId]
    );
    return result.rows;
  },

  /**
   * Check if a course is supervised by a specific HOD (matches department).
   */
  async isSupervisedBy(courseId, hodId) {
    const result = await query(
      `SELECT c.id 
       FROM courses c
       JOIN users u ON u.id = c.instructor_id
       WHERE c.id = $1 AND EXISTS (
         SELECT 1 FROM unnest(string_to_array(u.department, ',')) dep
         WHERE trim(dep) = (SELECT department FROM users WHERE id = $2)
       )`,
      [courseId, hodId]
    );
    return result.rows.length > 0;
  },

  /**
   * Find a course by ID.
   */
  async findById(id) {
    const result = await query(
      `SELECT c.*, u.name AS instructor_name, u.avatar AS instructor_avatar
       FROM courses c
       JOIN users u ON u.id = c.instructor_id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new course.
   */
  async create({ title, description, instructorId, category, difficulty, outline = null, pdf_url = null }) {
    const result = await query(
      `INSERT INTO courses (title, description, instructor_id, category, difficulty, outline, pdf_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, instructorId, category || null, difficulty || 'beginner', outline ? JSON.stringify(outline) : null, pdf_url]
    );
    return result.rows[0];
  },

  /**
   * Update a course.
   */
  async update(id, fields) {
    const allowed = ['title', 'description', 'category', 'difficulty', 'is_published', 'outline', 'pdf_url'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(key === 'outline' ? JSON.stringify(fields[key]) : fields[key]);
      }
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE courses SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  /**
   * Delete a course.
   */
  async delete(id) {
    await query('DELETE FROM courses WHERE id = $1', [id]);
  },

  /**
   * Enroll a student in a course.
   */
  async enroll(userId, courseId) {
    const result = await query(
      `INSERT INTO enrollments (user_id, course_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO NOTHING
       RETURNING *`,
      [userId, courseId]
    );
    return result.rows[0];
  },

  /**
   * Check if a user is enrolled in a course.
   */
  async isEnrolled(userId, courseId) {
    const result = await query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    return result.rows.length > 0;
  },

  /**
   * Get courses a student is enrolled in.
   */
  async findEnrolled(userId) {
    const result = await query(
      `SELECT c.*, u.name AS instructor_name, e.enrolled_at
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN users u ON u.id = c.instructor_id
       WHERE e.user_id = $1
       ORDER BY e.enrolled_at DESC`,
      [userId]
    );
    return result.rows;
  },
};

module.exports = CourseModel;
