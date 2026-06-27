const QuizService = require('../services/quizService');

const QuizController = {
  async getQuizzesByCourse(req, res, next) {
    try {
      const quizzes = await QuizService.getQuizzesByCourse(req.params.courseId, req.user);
      res.json({ status: 'success', data: { quizzes } });
    } catch (err) {
      next(err);
    }
  },

  async getQuiz(req, res, next) {
    try {
      const isInstructor = req.user.role === 'instructor' || req.user.role === 'admin';
      const quiz = await QuizService.getQuiz(req.params.quizId, isInstructor);
      res.json({ status: 'success', data: { quiz } });
    } catch (err) {
      next(err);
    }
  },

  async createQuiz(req, res, next) {
    try {
      const quiz = await QuizService.createQuiz(req.user.id, req.params.courseId, req.body);
      res.status(201).json({ status: 'success', data: { quiz } });
    } catch (err) {
      next(err);
    }
  },

  async updateQuiz(req, res, next) {
    try {
      const quiz = await QuizService.updateQuiz(req.params.quizId, req.user.id, req.body);
      res.json({ status: 'success', data: { quiz } });
    } catch (err) {
      next(err);
    }
  },

  async deleteQuiz(req, res, next) {
    try {
      await QuizService.deleteQuiz(req.params.quizId, req.user.id);
      res.json({ status: 'success', message: 'Quiz deleted' });
    } catch (err) {
      next(err);
    }
  },

  async addQuestion(req, res, next) {
    try {
      const quiz = await QuizService.addQuestion(req.params.quizId, req.user.id, req.body);
      res.status(201).json({ status: 'success', data: { quiz } });
    } catch (err) {
      next(err);
    }
  },

  async updateQuestion(req, res, next) {
    try {
      const question = await QuizService.updateQuestion(req.params.questionId, req.user.id, req.body);
      res.json({ status: 'success', data: { question } });
    } catch (err) {
      next(err);
    }
  },

  async deleteQuestion(req, res, next) {
    try {
      await QuizService.deleteQuestion(req.params.questionId, req.user.id);
      res.json({ status: 'success', message: 'Question deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async startAttempt(req, res, next) {
    try {
      const result = await QuizService.startAttempt(req.params.quizId, req.user.id);
      res.status(201).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },

  async submitAttempt(req, res, next) {
    try {
      const { answers } = req.body;
      const attempt = await QuizService.submitAttempt(req.params.attemptId, req.user.id, answers);
      res.json({ status: 'success', data: { attempt } });
    } catch (err) {
      next(err);
    }
  },

  async getAttemptHistory(req, res, next) {
    try {
      const attempts = await QuizService.getAttemptHistory(req.params.quizId, req.user.id);
      res.json({ status: 'success', data: { attempts } });
    } catch (err) {
      next(err);
    }
  },
  async generateFromPdf(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No PDF file uploaded' });
      }
      const questions = await QuizService.generateFromPdf(
        req.params.quizId,
        req.user.id,
        req.file.buffer
      );
      res.json({ status: 'success', data: { questions } });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = QuizController;
