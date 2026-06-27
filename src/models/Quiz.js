const { query } = require('../config/database');

const QuizModel = {
  /**
   * Find all quizzes for a course.
  * @param {string} courseId
   * @param {boolean} includeUnpublished - when true (instructors/admins), draft quizzes are included
   */
  async findByCourse(courseId, includeUnpublished = false) {
    const publishedFilter = includeUnpublished ? '' : 'AND q.is_published = true';
    const result = await query(
      `SELECT q.*,
              COUNT(DISTINCT qs.id) AS question_count
       FROM quizzes q
       LEFT JOIN questions qs ON qs.quiz_id = q.id
       WHERE q.course_id = $1
       ${publishedFilter}
       GROUP BY q.id
       ORDER BY q.created_at DESC`,
      [courseId]
    );
    return result.rows;
  },

  /**
   * Find a quiz by ID.
   */
  async findById(id) {
    const result = await query('SELECT * FROM quizzes WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  /**
   * Get full quiz with questions and options.
   */
  async findByIdWithQuestions(id) {
    const quizResult = await query('SELECT * FROM quizzes WHERE id = $1', [id]);
    const quiz = quizResult.rows[0];
    if (!quiz) return null;

    const questionsResult = await query(
      `SELECT q.*, json_agg(
         json_build_object(
           'id', o.id,
           'option_text', o.option_text,
           'is_correct', o.is_correct,
           'order_index', o.order_index
         ) ORDER BY o.order_index
       ) FILTER (WHERE o.id IS NOT NULL) AS options
       FROM questions q
       LEFT JOIN question_options o ON o.question_id = q.id
       WHERE q.quiz_id = $1
       GROUP BY q.id
       ORDER BY q.order_index`,
      [id]
    );

    quiz.questions = questionsResult.rows;
    return quiz;
  },

  /**
   * Create a quiz.
   */
  async create({ courseId, title, description, timeLimit, maxAttempts, passScore }) {
    const result = await query(
      `INSERT INTO quizzes (course_id, title, description, time_limit, max_attempts, pass_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [courseId, title, description, timeLimit, maxAttempts, passScore]
    );
    return result.rows[0];
  },

  /**
   * Update a quiz.
   */
  async update(id, fields) {
    const allowed = ['title', 'description', 'time_limit', 'max_attempts', 'pass_score', 'is_published'];
    const map = {
      title: 'title', description: 'description', timeLimit: 'time_limit',
      maxAttempts: 'max_attempts', passScore: 'pass_score', is_published: 'is_published',
    };
    const updates = [];
    const values = [];
    let idx = 1;

    for (const [jsKey, dbKey] of Object.entries(map)) {
      if (fields[jsKey] !== undefined) {
        updates.push(`${dbKey} = $${idx++}`);
        values.push(fields[jsKey]);
      }
    }
    // also allow direct snake_case keys
    for (const key of allowed) {
      if (fields[key] !== undefined && !updates.find(u => u.startsWith(key))) {
        updates.push(`${key} = $${idx++}`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE quizzes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  /**
   * Delete a quiz.
   */
  async delete(id) {
    await query('DELETE FROM quizzes WHERE id = $1', [id]);
  },

  // ---- Questions ----

  async createQuestion({ quizId, questionText, questionType, points, orderIndex }) {
    const result = await query(
      `INSERT INTO questions (quiz_id, question_text, question_type, points, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [quizId, questionText, questionType, points, orderIndex]
    );
    return result.rows[0];
  },

  async createOption({ questionId, optionText, isCorrect, orderIndex }) {
    const result = await query(
      `INSERT INTO question_options (question_id, option_text, is_correct, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [questionId, optionText, isCorrect, orderIndex]
    );
    return result.rows[0];
  },

  async findQuestionById(id) {
    const result = await query(
      `SELECT q.*, json_agg(
         json_build_object(
           'id', o.id,
           'option_text', o.option_text,
           'is_correct', o.is_correct,
           'order_index', o.order_index
         ) ORDER BY o.order_index
       ) FILTER (WHERE o.id IS NOT NULL) AS options
       FROM questions q
       LEFT JOIN question_options o ON o.question_id = q.id
       WHERE q.id = $1
       GROUP BY q.id`,
      [id]
    );
    return result.rows[0] || null;
  },

  async updateQuestion(id, fields) {
    const allowed = ['question_text', 'question_type', 'points', 'order_index'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return this.findQuestionById(id);

    values.push(id);
    const result = await query(
      `UPDATE questions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async deleteQuestion(id) {
    await query('DELETE FROM question_options WHERE question_id = $1', [id]);
    await query('DELETE FROM questions WHERE id = $1', [id]);
  },

  async createAttempt({ quizId, userId }) {
    const result = await query(
      `INSERT INTO quiz_attempts (quiz_id, user_id) VALUES ($1, $2) RETURNING *`,
      [quizId, userId]
    );
    return result.rows[0];
  },

  async countAttempts(quizId, userId) {
    const result = await query(
      'SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2',
      [quizId, userId]
    );
    return parseInt(result.rows[0].count, 10);
  },

  async submitAttempt(attemptId, { score, passed, answers }) {
    // Save answers
    for (const ans of answers) {
      await query(
        `INSERT INTO quiz_answers
           (attempt_id, question_id, selected_option_id, text_answer, is_correct, points_earned)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          attemptId,
          ans.questionId,
          ans.selectedOptionId || null,
          ans.textAnswer || null,
          ans.isCorrect,
          ans.pointsEarned,
        ]
      );
    }

    // Update attempt
    const result = await query(
      `UPDATE quiz_attempts
       SET score = $1, passed = $2, submitted_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [score, passed, attemptId]
    );
    return result.rows[0];
  },

  async findAttempt(attemptId) {
    const result = await query(
      'SELECT * FROM quiz_attempts WHERE id = $1',
      [attemptId]
    );
    return result.rows[0] || null;
  },

  async findUserAttempts(quizId, userId) {
    const result = await query(
      `SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2 ORDER BY started_at DESC`,
      [quizId, userId]
    );
    return result.rows;
  },
};

module.exports = QuizModel;
