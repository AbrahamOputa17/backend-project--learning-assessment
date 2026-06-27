const LearningService = require('../services/LearningService');

const LearningController = {
  async getStatus(req, res, next) {
    try {
      const { courseId } = req.params;
      const status = await LearningService.getStudentProgress(req.user.id, courseId);
      res.json({ status: 'success', data: { status } });
    } catch (err) {
      next(err);
    }
  },

  async startModule(req, res, next) {
    try {
      const { courseId } = req.params;
      const { moduleIndex } = req.body;
      const enrollment = await LearningService.startModule(req.user.id, courseId, moduleIndex);
      res.json({ status: 'success', data: { enrollment } });
    } catch (err) {
      next(err);
    }
  },

  async getLesson(req, res, next) {
    try {
      const { courseId, moduleIndex } = req.params;
      const content = await LearningService.getLessonContent(req.user, courseId, parseInt(moduleIndex));
      res.json({ status: 'success', data: { content } });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = LearningController;
