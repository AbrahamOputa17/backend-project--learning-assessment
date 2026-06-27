const gradeService = require('../services/gradeService');
const AppError = require('../utils/AppError');

exports.getUserCourseGrades = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const grades = await gradeService.getUserCourseGrades(req.user.id, courseId);
    res.json({ success: true, data: grades });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getCourseGradeBook = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const gradeBook = await gradeService.getCourseGradeBook(courseId);
    res.json({ success: true, data: gradeBook });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.setGradeWeights = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await gradeService.setGradeWeights(courseId, req.body);
    res.json({ success: true, message: 'Grade weights updated' });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getGradeWeights = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const weights = await gradeService.getGradeWeights(courseId);
    res.json({ success: true, data: weights });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getCumulativeGrade = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const grade = await gradeService.calculateCumulativeGrade(req.user.id, courseId);
    res.json({ success: true, data: grade });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.exportGrades = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const grades = await gradeService.exportGrades(courseId);
    res.json({ success: true, data: grades });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};
