const { query } = require('../config/database');

const UserModel = {
  /**
   * Find a user by ID (excludes password).
   */
  async findById(id) {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar, u.supervisor_id, 
              u.matric_number, u.department,
              s.name AS supervisor_name, u.created_at, u.updated_at 
       FROM users u
       LEFT JOIN users s ON s.id = u.supervisor_id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a user by email (includes password for auth).
   */
  async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  /**
   * Create a new user.
   */
  async create({ name, email, password, role = 'student', supervisor_id = null, matric_number = null, department = null }) {
    const result = await query(
      `INSERT INTO users (name, email, password, role, supervisor_id, matric_number, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, avatar, supervisor_id, matric_number, department, created_at, updated_at`,
      [name, email, password, role, supervisor_id, matric_number, department]
    );
    return result.rows[0];
  },

  /**
   * Update a user's profile.
   */
  async update(id, fields) {
    const allowed = ['name', 'avatar', 'supervisor_id', 'matric_number', 'department'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, avatar, supervisor_id, matric_number, department, created_at, updated_at`,
      values
    );
    return result.rows[0];
  },

  /**
   * Get all lecturers in the same department as the HOD.
   */
  async findInstructorsByHOD(hodId) {
    const result = await query(
      `SELECT id, name, email, avatar 
       FROM users 
       WHERE role = 'instructor' 
       AND EXISTS (
         SELECT 1 FROM unnest(string_to_array(department, ',')) dep
         WHERE trim(dep) = (SELECT department FROM users WHERE id = $1)
       )`,
      [hodId]
    );
    return result.rows;
  },

  /**
   * Get all users with the HOD role (now filtered by department if needed).
   */
  async findAllHods() {
    const result = await query(
      "SELECT id, name, department FROM users WHERE role = 'hod' ORDER BY name ASC"
    );
    return result.rows;
  },

  /**
   * Update password.
   */
  async updatePassword(id, hashedPassword) {
    await query('UPDATE users SET password = $1 WHERE id = $2', [
      hashedPassword,
      id,
    ]);
  },
};

module.exports = UserModel;
