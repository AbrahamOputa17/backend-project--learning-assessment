const express = require('express');
const { body } = require('express-validator');
const CodingController = require('../controllers/codingController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { codeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// GET /api/coding/languages
router.get('/languages', authenticate, CodingController.getProgrammingLanguages);

// GET /api/coding/quizzes/course/:courseId
router.get('/quizzes/course/:courseId', authenticate, CodingController.getCodingQuizzes);

// POST /api/coding/generate
router.post('/generate', authenticate, authorize('instructor', 'admin'), CodingController.aiGenerateCodingQuestion);

// GET /api/coding/quizzes/:quizId
router.get('/quizzes/:quizId', authenticate, CodingController.getCodingQuiz);

// GET /api/coding/questions/:questionId
router.get('/questions/:questionId', authenticate, CodingController.getCodingQuestion);

// POST /api/coding/quizzes/course/:courseId  — create coding quiz
router.post(
  '/quizzes/course/:courseId',
  authenticate,
  authorize('instructor', 'admin'),
  [body('title').trim().notEmpty().withMessage('Quiz title is required')],
  validate,
  CodingController.createCodingQuiz
);

// PATCH /api/coding/quizzes/:quizId
router.patch(
  '/quizzes/:quizId',
  authenticate,
  authorize('instructor', 'admin'),
  CodingController.updateCodingQuiz
);

// DELETE /api/coding/quizzes/:quizId
router.delete(
  '/quizzes/:quizId',
  authenticate,
  authorize('instructor', 'admin'),
  CodingController.deleteCodingQuiz
);

// POST /api/coding/quizzes/:quizId/questions  — add coding question
router.post(
  '/quizzes/:quizId/questions',
  authenticate,
  authorize('instructor', 'admin'),
  [
    body('title').trim().notEmpty().withMessage('Question title is required'),
    body('description').trim().notEmpty().withMessage('Question description is required'),
    body('language')
      .optional()
      .isIn(['javascript', 'python'])
      .withMessage('Unsupported language'),
       body('deadline')
      .optional()
      .isISO8601()
      .withMessage('deadline must be a valid ISO 8601 date'),
    body('caWeight')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('caWeight must be a number between 0 and 100'),
  ],

  validate,
  CodingController.addCodingQuestion);
// PATCH /api/coding/quizzes/:quizId/questions/:questionId  — update coding question
router.patch(
  '/quizzes/:quizId/questions/:questionId',
  authenticate,
  authorize('instructor', 'admin'),
  [
    body('language')
      .optional()
      .isIn(['javascript', 'python'])
      .withMessage('Unsupported language'),
    body('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('difficulty must be easy, medium, or hard'),
    body('deadline')
      .optional()
      .isISO8601()
      .withMessage('deadline must be a valid ISO 8601 date'),
    body('caWeight')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('caWeight must be a number between 0 and 100'),
  ],
  validate,
  CodingController.updateCodingQuestion
);

// POST /api/coding/submissions  — submit code (rate-limited)
router.post(
  '/submissions',
  authenticate,
  codeLimiter,
  [
    body('codingQuestionId').notEmpty().withMessage('codingQuestionId is required'),
    body('code').notEmpty().withMessage('code is required'),
    body('language').notEmpty().withMessage('language is required'),
  ],
  validate,
  CodingController.submitCode
);

// GET /api/coding/submissions/:submissionId/results
router.get(
  '/submissions/:submissionId/results',
  authenticate,
  CodingController.getSubmissionResults
);

// GET /api/coding/submissions/history/:questionId
router.get(
  '/submissions/history/:questionId',
  authenticate,
  CodingController.getSubmissionHistory
);

// GET /api/coding/scores/me/course/:courseId  — student's own scores
router.get(
  '/scores/me/course/:courseId',
  authenticate,
  CodingController.getMyScores
);

// GET /api/coding/scores/course/:courseId  — full gradebook (instructor/admin only)
router.get(
  '/scores/course/:courseId',
  authenticate,
  authorize('instructor', 'admin'),
  CodingController.getCourseGradebook
);
// GET /api/coding/scores/student/:userId/course/:courseId  — per-student gradebook (instructor/admin only)
router.get(
  '/scores/student/:userId/course/:courseId',
  authenticate,
  authorize('instructor', 'admin'),
  CodingController.getStudentGradebook
);


module.exports = router;
