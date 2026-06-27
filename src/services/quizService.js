const QuizModel = require('../models/Quiz');
const CourseModel = require('../models/Course');
const AppError = require('../utils/AppError');
const config = require('../config');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Resolve pdf-parse regardless of whether it ships as CJS or ESM.
 */
async function getPdfParser() {
  try {
    const mod = require('pdf-parse');
    if (typeof mod === 'function') return mod;
    if (mod && typeof mod.PDFParse === 'function') {
      return async (buffer) => {
        const instance = new mod.PDFParse(new Uint8Array(buffer));
        const res = await instance.getText();
        // Robust extraction: result could be string, or object with .text, or even an array of strings
        let text = '';
        if (typeof res === 'string') {
          text = res;
        } else if (res && typeof res.text === 'string') {
          text = res.text;
        } else if (res && typeof res === 'object') {
          // Fallback: join all string values found in the object
          text = Object.values(res).filter(v => typeof v === 'string').join('\n');
        }
        return { text };
      };
    }
    if (mod && typeof mod.default === 'function') return mod.default;
  } catch { /* fall through */ }
  try {
    const mod = await import('pdf-parse');
    if (typeof mod.default === 'function') return mod.default;
    if (typeof mod.PDFParse === 'function') {
      return async (buffer) => {
        const instance = new mod.PDFParse(new Uint8Array(buffer));
        const res = await instance.getText();
        // Robust extraction: result could be string, or object with .text, or even an array of strings
        let text = '';
        if (typeof res === 'string') {
          text = res;
        } else if (res && typeof res.text === 'string') {
          text = res.text;
        } else if (res && typeof res === 'object') {
          // Fallback: join all string values found in the object
          text = Object.values(res).filter(v => typeof v === 'string').join('\n');
        }
        return { text };
      };
    }
    if (typeof mod === 'function') return mod;
  } catch { /* fall through */ }
  throw new AppError('PDF parsing library failed to load.', 500);
}
const QuizService = {
  async getQuizzesByCourse(courseId, user) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);
    const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
    return QuizModel.findByCourse(courseId, isInstructor);
  },

  async getQuiz(quizId, includeAnswers = false) {
    const quiz = await QuizModel.findByIdWithQuestions(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    // Hide correct answers for students
    if (!includeAnswers) {
      quiz.questions = (quiz.questions || []).map((q) => ({
        ...q,
        options: (q.options || []).map(({ is_correct: _c, ...opt }) => opt),
      }));
    }
    return quiz;
  },

  async createQuiz(instructorId, courseId, data) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to create quizzes for this course', 403);
    }
    return QuizModel.create({ courseId, ...data });
  },

  async updateQuiz(quizId, instructorId, data) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to update this quiz', 403);
    }
    return QuizModel.update(quizId, data);
  },

  async deleteQuiz(quizId, instructorId) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to delete this quiz', 403);
    }
    await QuizModel.delete(quizId);
  },

  async addQuestion(quizId, instructorId, questionData) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized', 403);
    }

    // Validate question text
    const questionText = questionData.questionText?.trim();
    if (!questionText || questionText.length < 5 || questionText.length > 2000) {
      throw new AppError('Question text must be between 5 and 2000 characters', 400);
    }

    const questionType = questionData.questionType || 'multiple_choice';
    const points = Math.min(Math.max(questionData.points || 1, 1), 100);

    // Validate options for non-short-answer questions
    if (questionType !== 'short_answer') {
      const options = questionData.options || [];
      if (options.length < 2) {
        throw new AppError('At least 2 options are required', 400);
      }
      if (!options.some(opt => opt.isCorrect)) {
        throw new AppError('At least one option must be marked as correct', 400);
      }
      if (options.some(opt => !opt.optionText?.trim())) {
        throw new AppError('All option texts must be filled', 400);
      }
    }

    const question = await QuizModel.createQuestion({
      quizId,
      questionText: questionData.questionText,
      questionType: questionData.questionType || 'multiple_choice',
      points: questionData.points || 1,
      orderIndex: questionData.orderIndex || 0,
    });

    if (questionData.options && questionData.options.length > 0) {
      for (let i = 0; i < questionData.options.length; i++) {
        await QuizModel.createOption({
          questionId: question.id,
          optionText: questionData.options[i].optionText,
          isCorrect: questionData.options[i].isCorrect || false,
          orderIndex: i,
        });
      }
    }

    return QuizModel.findByIdWithQuestions(quizId);
  },

  async updateQuestion(questionId, instructorId, data) {
    const question = await QuizModel.findQuestionById(questionId);
    if (!question) throw new AppError('Question not found', 404);

    const quiz = await QuizModel.findById(question.quiz_id);
    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to update this question', 403);
    }

    // Validate question text if provided
    if (data.questionText) {
      const questionText = data.questionText.trim();
      if (questionText.length < 5 || questionText.length > 2000) {
        throw new AppError('Question text must be between 5 and 2000 characters', 400);
      }
    }

    // Validate points if provided
    if (data.points !== undefined) {
      if (data.points < 1 || data.points > 100) {
        throw new AppError('Points must be between 1 and 100', 400);
      }
    }

    const updated = await QuizModel.updateQuestion(questionId, data);
    return updated;
  },

  async deleteQuestion(questionId, instructorId) {
    const question = await QuizModel.findQuestionById(questionId);
    if (!question) throw new AppError('Question not found', 404);

    const quiz = await QuizModel.findById(question.quiz_id);
    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to delete this question', 403);
    }

    await QuizModel.deleteQuestion(questionId);
  },

  async startAttempt(quizId, userId) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);
    if (!quiz.is_published) throw new AppError('Quiz is not available', 400);

    const attempts = await QuizModel.countAttempts(quizId, userId);
    if (quiz.max_attempts && attempts >= quiz.max_attempts) {
      throw new AppError('Maximum attempts reached', 400);
    }

    const attempt = await QuizModel.createAttempt({ quizId, userId });
    const quizData = await this.getQuiz(quizId, false);

    return { attempt, quiz: quizData };
  },

  async submitAttempt(attemptId, userId, submittedAnswers) {
    const attempt = await QuizModel.findAttempt(attemptId);
    if (!attempt) throw new AppError('Attempt not found', 404);
    if (attempt.user_id !== userId) throw new AppError('Not authorized', 403);
    if (attempt.submitted_at) throw new AppError('Attempt already submitted', 400);

    const quiz = await QuizModel.findByIdWithQuestions(attempt.quiz_id);
    let totalPoints = 0;
    let earnedPoints = 0;
    const answers = [];

    for (const question of quiz.questions) {
      totalPoints += question.points;
      const submitted = submittedAnswers.find((a) => a.questionId === question.id);
      let isCorrect = false;
      let pointsEarned = 0;
      let selectedOptionId = null;
      let textAnswer = null;

      if (submitted) {
        if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
          selectedOptionId = submitted.selectedOptionId;
          const correctOption = question.options.find((o) => o.is_correct);
          isCorrect = correctOption && correctOption.id === selectedOptionId;
        } else {
          textAnswer = submitted.textAnswer;
          // Simple text comparison for short answers
          const correctOption = question.options && question.options[0];
          if (correctOption) {
            isCorrect = textAnswer &&
              textAnswer.trim().toLowerCase() === correctOption.option_text.trim().toLowerCase();
          }
        }
        if (isCorrect) pointsEarned = question.points;
      }

      earnedPoints += pointsEarned;
      answers.push({
        questionId: question.id,
        selectedOptionId,
        textAnswer,
        isCorrect,
        pointsEarned,
      });
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.pass_score;

    const savedAttempt = await QuizModel.submitAttempt(attemptId, { score, passed, answers });

    // Build rich per-question review so the frontend can show correct answers
    const questionReview = quiz.questions.map((question) => {
      const ans = answers.find((a) => a.questionId === question.id);
      const correctOption = question.options?.find((o) => o.is_correct);
      const selectedOption = question.options?.find((o) => o.id === ans?.selectedOptionId);
      return {
        questionId: question.id,
        questionText: question.question_text,
        questionType: question.question_type,
        points: question.points,
        pointsEarned: ans?.pointsEarned ?? 0,
        isCorrect: ans?.isCorrect ?? false,
        selectedOptionId: ans?.selectedOptionId ?? null,
        selectedOptionText: selectedOption?.option_text ?? ans?.textAnswer ?? null,
        correctOptionId: correctOption?.id ?? null,
        correctOptionText: correctOption?.option_text ?? null,
        options: (question.options ?? []).map((o) => ({
          id: o.id,
          optionText: o.option_text,
          isCorrect: o.is_correct,
        })),
      };
    });

    return { ...savedAttempt, totalPoints, earnedPoints, questionReview };
  },

  async getAttemptHistory(quizId, userId) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);
    return QuizModel.findUserAttempts(quizId, userId);
  },
  async generateFromPdf(quizId, instructorId, pdfBuffer) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);
    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to generate questions for this quiz', 403);
    }
    if (!config.google.apiKey) {
      throw new AppError('AI question generation is not configured (missing GOOGLE_API_KEY)', 503);
    }
    // Extract text from PDF
    const pdfParse = await getPdfParser();
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text.trim();
    if (!text) throw new AppError('Could not extract text from the uploaded PDF', 422);

    // Increase text budget
    const charLimit = 15000;
    const excerpt = text.length > charLimit ? text.slice(0, charLimit) + '\n...' : text;
    
    const genAI = new GoogleGenerativeAI(config.google.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `You are a quiz-question generator. Given educational content, produce exactly 15 multiple-choice quiz questions. 
Return ONLY a valid JSON object with a single key "questions" whose value is an array. 
Each element must have: "questionText" (string), "options" (array of 4 objects each with "optionText" (string) and "isCorrect" (boolean, exactly one true per question)), "points" (number, default 1).

Generate 15 multiple-choice quiz questions from the following content:

${excerpt}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Extract JSON from response (might be wrapped in markdown code blocks)
    let jsonString = responseText;
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    } else {
      // Try to find JSON object directly
      const objectMatch = responseText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonString = objectMatch[0];
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new AppError('AI returned an unexpected response format', 502);
    }
    if (!Array.isArray(parsed.questions)) {
      throw new AppError('AI returned an unexpected response format', 502);
    }
    return parsed.questions;
  },
};

module.exports = QuizService;
