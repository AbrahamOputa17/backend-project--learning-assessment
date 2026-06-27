const CodingService = require('../services/codingService');

const CodingController = {
  getProgrammingLanguages(req, res, next) {
    try {
      const languages = CodingService.getSupportedLanguages();
      res.json({ status: 'success', data: { languages } });
    } catch (err) {
      next(err);
    }
  },

  async getCodingQuizzes(req, res, next) {
    try {
      const quizzes = await CodingService.getCodingQuizzesByCourse(req.params.courseId);
      res.json({ status: 'success', data: { quizzes } });
    } catch (err) {
      next(err);
    }
  },

  async getCodingQuiz(req, res, next) {
    try {
      const isInstructor = req.user.role === 'instructor' || req.user.role === 'admin';
      const quiz = await CodingService.getCodingQuiz(req.params.quizId, isInstructor);
      res.json({ status: 'success', data: { quiz } });
    } catch (err) {
      next(err);
    }
  },

  async getCodingQuestion(req, res, next) {
    try {
      const isInstructor = req.user.role === 'instructor' || req.user.role === 'admin';
      const question = await CodingService.getCodingQuestion(req.params.questionId, isInstructor);
      res.json({ status: 'success', data: { question } });
    } catch (err) {
      next(err);
    }
  },

  async createCodingQuiz(req, res, next) {
    try {
      const quiz = await CodingService.createCodingQuiz(
        req.user.id,
        req.params.courseId,
        req.body
      );
      res.status(201).json({ status: 'success', data: { quiz } });
    } catch (err) {
      next(err);
    }
  },

  async updateCodingQuiz(req, res, next) {
    try {
      const quiz = await CodingService.updateCodingQuiz(req.params.quizId, req.user.id, req.body);
      res.json({ status: 'success', data: { quiz } });
    } catch (err) {
      next(err);
    }
  },

  async deleteCodingQuiz(req, res, next) {
    try {
      await CodingService.deleteCodingQuiz(req.params.quizId, req.user.id);
      res.json({ status: 'success', message: 'Coding quiz deleted' });
    } catch (err) {
      next(err);
    }
  },

  async addCodingQuestion(req, res, next) {
    try {
      const question = await CodingService.addCodingQuestion(
        req.params.quizId,
        req.user.id,
        req.body
      );
      res.status(201).json({ status: 'success', data: { question } });
    } catch (err) {
      next(err);
    }
  },

  async updateCodingQuestion(req, res, next) {
    try {
      const question = await CodingService.updateCodingQuestion(
        req.params.questionId,
        req.user.id,
        req.body
      );
      res.json({ status: 'success', data: { question } });
    } catch (err) {
      next(err);
    }
  },

  async submitCode(req, res, next) {
    try {
      const submission = await CodingService.submitCode(req.user.id, req.body);
      res.status(201).json({ status: 'success', data: { submission } });
    } catch (err) {
      next(err);
    }
  },

  async getSubmissionResults(req, res, next) {
    try {
      const submission = await CodingService.getSubmissionResults(
        req.params.submissionId,
        req.user.id
      );
      res.json({ status: 'success', data: { submission } });
    } catch (err) {
      next(err);
    }
  },

  async getSubmissionHistory(req, res, next) {
    try {
      const submissions = await CodingService.getSubmissionHistory(
        req.user.id,
        req.params.questionId
      );
      res.json({ status: 'success', data: { submissions } });
    } catch (err) {
      next(err);
    }
  },

  async getMyScores(req, res, next) {
    try {
      const scores = await CodingService.getMyScores(req.params.courseId, req.user.id);
      res.json({ status: 'success', data: { scores } });
    } catch (err) {
      next(err);
    }
  },
  async getCourseGradebook(req, res, next) {
  try {
    const gradebook = await CodingService.getCourseGradebook(
      req.params.courseId,
      req.user.id
    );
    res.json({ status: 'success', data: { gradebook } });
  } catch (err) {
    next(err);
  }
},

async getStudentGradebook(req, res, next) {
  try {
    const gradebook = await CodingService.getStudentGradebook(
      req.params.courseId,
      req.params.userId,
      req.user.id
    );
    res.json({ status: 'success', data: { gradebook } });
  } catch (err) {
    next(err);
  }
},

async aiGenerateCodingQuestion(req, res, next) {
  try {
    const { prompt } = req.body;
    const PdfMcqService = require('../services/pdfMcqService');
    const question = await PdfMcqService.generateCodingQuestionFromPrompt(prompt);
    res.json({ status: 'success', data: { question } });
  } catch (err) {
    next(err);
  }
},

};

module.exports = CodingController;
