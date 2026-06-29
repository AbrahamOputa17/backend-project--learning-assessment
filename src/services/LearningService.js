const { query } = require('../config/database');
const PdfMcqService = require('./pdfMcqService');
const AppError = require('../utils/AppError');
const fs = require('fs');
const path = require('path');

class LearningService {
  /**
   * Get current progress and check for deadlines
   */
  async getStudentProgress(userId, courseId) {
    const res = await query(
      `SELECT e.*, c.outline, c.title as course_title, c.pdf_url
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = $1 AND e.course_id = $2`,
      [userId, courseId]
    );

    if (res.rows.length === 0) throw new AppError('Not enrolled in this course', 403);
    
    let enrollment = res.rows[0];
    const now = new Date();

    // Check if current module is overdue
    if (enrollment.module_started_at) {
      const deadline = new Date(enrollment.module_started_at);
      deadline.setDate(deadline.getDate() + 7);

      if (now > deadline && !enrollment.completed_modules.includes(enrollment.current_module_index)) {
        // Module Expired!
        await this.handleExpiredModule(userId, courseId, enrollment.current_module_index);
        // Refresh enrollment data
        const refresh = await query('SELECT * FROM enrollments WHERE id = $1', [enrollment.id]);
        enrollment = { ...enrollment, ...refresh.rows[0] };
      }
    }

    return enrollment;
  }

  /**
   * Start a specific module
   */
  async startModule(userId, courseId, moduleIndex) {
    // When starting a new module, mark the previous one as completed and reset the 7-day timer
    const res = await query(
      `UPDATE enrollments
       SET module_started_at = NOW(),
           current_module_index = $3,
           completed_modules = CASE 
             WHEN $3 > 0 AND NOT ($3 - 1 = ANY(completed_modules)) THEN array_append(completed_modules, $3 - 1)
             ELSE completed_modules
           END
       WHERE user_id = $1 AND course_id = $2
       RETURNING *`,
      [userId, courseId, moduleIndex]
    );

    // Record presence for this module
    await query(
      `INSERT INTO attendance (user_id, course_id, module_index, status)
       VALUES ($1, $2, $3, 'present')
       ON CONFLICT (user_id, course_id, module_index) DO UPDATE SET status = 'present'`,
      [userId, courseId, moduleIndex]
    );

    return res.rows[0];
  }

  /**
   * Handle expired module logic (Blocking and recording 0)
   */
  async handleExpiredModule(userId, courseId, moduleIndex) {
    console.log(`Module ${moduleIndex} expired for user ${userId} in course ${courseId}`);
    
    // 1. Move to next module, DO NOT add to completed_modules (they missed it)
    await query(
      `UPDATE enrollments
       SET current_module_index = current_module_index + 1,
           module_started_at = NULL
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    // 2. Record ABSENT in attendance (giving them zero for the week)
    await query(
      `INSERT INTO attendance (user_id, course_id, module_index, status)
       VALUES ($1, $2, $3, 'absent')
       ON CONFLICT (user_id, course_id, module_index) DO NOTHING`,
      [userId, courseId, moduleIndex]
    );
  }

  /**
   * Get or generate lesson content
   */
  async getLessonContent(user, courseId, moduleIndex) {
    // 1. Check if user is a lecturer/hod or enrolled student
    const isPowerUser = user.role === 'instructor' || user.role === 'hod' || user.role === 'admin';
    
    if (!isPowerUser) {
      // Students must be enrolled and within deadline for current module.
      // If trying to access a past module, it must be in completed_modules.
      const progress = await this.getStudentProgress(user.id, courseId);
      
      if (moduleIndex < progress.current_module_index) {
         if (!progress.completed_modules.includes(moduleIndex)) {
            throw new AppError('This module has expired because you missed the deadline. You can no longer access it.', 403);
         }
      } else if (moduleIndex > progress.current_module_index) {
         throw new AppError('You have not unlocked this module yet.', 403);
      }
    }

    // 2. Get course data
    const courseRes = await query('SELECT outline, pdf_url FROM courses WHERE id = $1', [courseId]);
    const course = courseRes.rows[0];

    if (!course) throw new AppError('Course not found', 404);

    // 2a. Check if content already cached in DB
    const existing = await query(
      'SELECT content FROM generated_lessons WHERE course_id = $1 AND module_index = $2',
      [courseId, moduleIndex]
    );

    if (existing.rows.length > 0) return existing.rows[0].content;

    // 2b. Need to generate - check PDF and outline exist
    if (!course.pdf_url) {
      throw new AppError(
        'The instructor has not uploaded course materials yet. Please check back later.',
        503
      );
    }

    if (!course.outline || !Array.isArray(course.outline) || course.outline.length === 0) {
      throw new AppError(
        'The course outline has not been set up yet. The instructor needs to publish the AI-generated syllabus first.',
        503
      );
    }

    const module = course.outline[moduleIndex];
    if (!module) throw new AppError('Module not found in course outline', 404);

    // 3. Generate via AI
    let buffer;
    if (course.pdf_url.startsWith('data:application/pdf;base64,')) {
      const base64Data = course.pdf_url.substring('data:application/pdf;base64,'.length);
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      const pdfPath = path.join(__dirname, '../../public', course.pdf_url);
      if (!fs.existsSync(pdfPath)) throw new AppError('Course PDF file is missing on the server. Please contact your instructor.', 404);
      buffer = fs.readFileSync(pdfPath);
    }
    
    const content = await PdfMcqService.generateFullLecture(buffer, module.moduleTitle, JSON.stringify(module.lessons));

    // 4. Save to DB cache
    await query(
      'INSERT INTO generated_lessons (course_id, module_index, content) VALUES ($1, $2, $3)',
      [courseId, moduleIndex, content]
    );

    return content;
  }
}

module.exports = new LearningService();
