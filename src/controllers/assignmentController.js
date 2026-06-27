const assignmentService = require('../services/assignmentService');
const AppError = require('../utils/AppError');

exports.createAssignment = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const assignment = await assignmentService.createAssignment(courseId, req.body, req.user.id);
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getAssignments = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { includeUnpublished } = req.query;
    const assignments = await assignmentService.getAssignments(courseId, includeUnpublished === 'true');
    res.json({ success: true, data: assignments });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.submitAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const submission = await assignmentService.submitAssignment(assignmentId, req.user.id);
    res.status(201).json({ success: true, data: submission });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.uploadSubmissionFile = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const file = await assignmentService.uploadSubmissionFile(submissionId, req.body);
    res.status(201).json({ success: true, data: file });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getSubmissions = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const submissions = await assignmentService.getSubmissions(assignmentId);
    res.json({ success: true, data: submissions });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getSubmissionWithFiles = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const submission = await assignmentService.getSubmissionWithFiles(submissionId);
    res.json({ success: true, data: submission });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

exports.gradeSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const grade = await assignmentService.gradeSubmission(submissionId, req.body, req.user.id);
    res.json({ success: true, data: grade });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    await assignmentService.deleteAssignment(assignmentId);
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};
