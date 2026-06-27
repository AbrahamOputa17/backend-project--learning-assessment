const GradeModel = require('../models/Grade');
const StudentProgressModel = require('../models/StudentProgress');

class GradeService {
  /**
   * Get grades for user in course
   */
  async getUserCourseGrades(userId, courseId) {
    const grades = await GradeModel.findByUserCourse(userId, courseId);
    const cumulative = await GradeModel.getCumulativeGrade(userId, courseId);

    return {
      grades,
      cumulative: cumulative.cumulative_grade,
      average_percentage: cumulative.average_percentage
    };
  }

  /**
   * Get grade book for course
   */
  async getCourseGradeBook(courseId) {
    return GradeModel.findByCourse(courseId);
  }

  /**
   * Set grade weights
   */
  async setGradeWeights(courseId, weights) {
    await GradeModel.setWeights(courseId, weights);
  }

  /**
   * Get grade weights
   */
  async getGradeWeights(courseId) {
    const weights = await GradeModel.getWeights(courseId);
    return weights.reduce((acc, w) => {
      acc[w.category] = w.weight;
      return acc;
    }, {});
  }

  /**
   * Calculate cumulative grade
   */
  async calculateCumulativeGrade(userId, courseId) {
    return GradeModel.getCumulativeGrade(userId, courseId);
  }

  /**
   * Get grades by type
   */
  async getGradesByType(userId, courseId, type) {
    return GradeModel.findByType(userId, courseId, type);
  }

  /**
   * Export grades for course
   */
  async exportGrades(courseId) {
    const gradeBook = await this.getCourseGradeBook(courseId);
    const weights = await this.getGradeWeights(courseId);

    // Transform for export
    const exportData = gradeBook.map(grade => ({
      student_name: grade.student_name,
      type: grade.type,
      score: grade.score,
      max_score: grade.max_score,
      percentage: grade.percentage,
      weight: grade.weight,
      weighted_score: (grade.score * grade.weight / 100),
      feedback: grade.feedback,
      graded_at: grade.graded_at
    }));

    return exportData;
  }
}

module.exports = new GradeService();
