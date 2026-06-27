const AssignmentModel = require('../models/Assignment');
const StudentProgressModel = require('../models/StudentProgress');
const GradeModel = require('../models/Grade');
const NotificationModel = require('../models/Notification');

class AssignmentService {
  /**
   * Create assignment
   */
  async createAssignment(courseId, data, userId) {
    if (!data.title || !data.description || !data.dueDate) {
      throw new Error('Title, description, and due date are required');
    }

    return AssignmentModel.create({
      courseId,
      moduleId: data.moduleId,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      createdBy: userId,
      dueDate: data.dueDate,
      lateSubmissionAllowed: data.lateSubmissionAllowed || false,
      lateSubmissionDays: data.lateSubmissionDays || 0,
      maxScore: data.maxScore || 100
    });
  }

  /**
   * Get course assignments
   */
  async getAssignments(courseId, includeUnpublished = false) {
    return AssignmentModel.findByCourse(courseId, { includeUnpublished });
  }

  /**
   * Submit assignment
   */
  async submitAssignment(assignmentId, userId) {
    const submission = await AssignmentModel.createSubmission({
      assignmentId,
      userId
    });

    // Track submission in progress
    await StudentProgressModel.trackAssignmentSubmission(userId, (await AssignmentModel.findById(assignmentId)).course_id);

    return submission;
  }

  /**
   * Upload submission file
   */
  async uploadSubmissionFile(submissionId, data) {
    if (!data.fileUrl || !data.fileName) {
      throw new Error('File URL and file name are required');
    }

    return AssignmentModel.addSubmissionFile({
      submissionId,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType
    });
  }

  /**
   * Get submissions for assignment
   */
  async getSubmissions(assignmentId) {
    return AssignmentModel.getSubmissions(assignmentId);
  }

  /**
   * Get submission with files
   */
  async getSubmissionWithFiles(submissionId) {
    return AssignmentModel.getSubmissionWithFiles(submissionId);
  }

  /**
   * Grade submission
   */
  async gradeSubmission(submissionId, data, gradedBy) {
    if (data.score === undefined) {
      throw new Error('Score is required');
    }

    // Update submission status
    await AssignmentModel.updateSubmissionStatus(submissionId, 'graded');

    // Create grade record
    const submission = await AssignmentModel.getSubmissionWithFiles(submissionId);
    const assignment = await AssignmentModel.findById(submission.assignment_id);

    const grade = await GradeModel.create({
      submissionId,
      userId: submission.user_id,
      courseId: assignment.course_id,
      type: 'assignment',
      itemId: assignment.id,
      score: data.score,
      maxScore: assignment.max_score,
      feedback: data.feedback,
      gradedBy
    });

    // Update student progress
    const cumulativeGrade = await GradeModel.getCumulativeGrade(submission.user_id, assignment.course_id);
    await StudentProgressModel.updateCurrentGrade(submission.user_id, assignment.course_id, cumulativeGrade.cumulative_grade);
    await StudentProgressModel.updateRiskStatus(submission.user_id, assignment.course_id);

    // Notify student
    await NotificationModel.create({
      userId: submission.user_id,
      type: 'grade',
      title: `${assignment.title} has been graded`,
      content: `You received ${data.score}/${assignment.max_score}`,
      relatedId: assignment.course_id
    });

    return grade;
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(assignmentId) {
    await AssignmentModel.delete(assignmentId);
  }
}

module.exports = new AssignmentService();
