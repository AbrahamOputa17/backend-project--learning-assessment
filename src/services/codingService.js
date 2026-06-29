const vm = require('vm');
const CodingModel = require('../models/CodingAssessment');
const CourseModel = require('../models/Course');
const AppError = require('../utils/AppError');

// Supported languages map (language -> executor)
const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', version: 'Node.js 18' },
  { id: 'python', name: 'Python', version: '3.x (simulated)' },
];

/**
 * Execute user-submitted JavaScript code in a sandboxed Node.js VM context.
 * The context is isolated from the host environment — no access to require,
 * process, or other globals. A 3-second timeout prevents infinite loops.
 *
 * NOTE: Node's built-in vm module provides a basic sandbox. For full
 * untrusted-code isolation in production, use a separate container / process,
 * or a service such as Judge0.
 */
const executeJavaScript = (code, input) => {
  const start = Date.now();
  try {
    const lines = input ? input.split('\n') : [];
    let lineIndex = 0;

    const capturedOutput = [];

    // Sandbox: no access to require, process, fs, etc.
    const context = vm.createContext({
      console: { log: (...args) => capturedOutput.push(args.join(' ')) },
      readline: () => lines[lineIndex++] || '',
    });

    vm.runInContext(code, context, { timeout: 3000 });

    return {
      output: capturedOutput.join('\n'),
      executionTimeMs: Date.now() - start,
      error: null,
    };
  } catch (err) {
    return {
      output: '',
      executionTimeMs: Date.now() - start,
      error: err.message,
    };
  }
};

const CodingService = {
  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  },

  async getCodingQuizzesByCourse(courseId) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);
    return CodingModel.findQuizzesByCourse(courseId);
  },

  async getCodingQuiz(quizId, showSolutions = false) {
    const quiz = await CodingModel.findQuizWithQuestions(quizId);
    if (!quiz) throw new AppError('Coding quiz not found', 404);

    if (!showSolutions) {
      quiz.questions = (quiz.questions || []).map(({ solution_code: _s, ...q }) => ({
        ...q,
        test_cases: (q.test_cases || []).filter((tc) => !tc.is_hidden),
      }));
    }

    return quiz;
  },

  async getCodingQuestion(questionId, showSolution = false) {
    const question = await CodingModel.findQuestionById(questionId);
    if (!question) throw new AppError('Coding question not found', 404);

    if (!showSolution) {
      delete question.solution_code;
      question.test_cases = (question.test_cases || []).filter((tc) => !tc.is_hidden);
    }

    return question;
  },

  async createCodingQuiz(instructorId, courseId, data) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to create quizzes for this course', 403);
    }
    return CodingModel.createQuiz({ courseId, ...data });
  },

  async updateCodingQuiz(quizId, instructorId, data) {
    const quiz = await CodingModel.findQuizById(quizId);
    if (!quiz) throw new AppError('Coding quiz not found', 404);

    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to update this quiz', 403);
    }
    return CodingModel.updateQuiz(quizId, data);
  },

  async deleteCodingQuiz(quizId, instructorId) {
    const quiz = await CodingModel.findQuizById(quizId);
    if (!quiz) throw new AppError('Coding quiz not found', 404);

    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to delete this quiz', 403);
    }
    await CodingModel.deleteQuiz(quizId);
  },

  async addCodingQuestion(quizId, instructorId, questionData) {
    const quiz = await CodingModel.findQuizById(quizId);
    if (!quiz) throw new AppError('Coding quiz not found', 404);

    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized', 403);
    }

    const question = await CodingModel.createQuestion({
      codingQuizId: quizId,
      title: questionData.title,
      description: questionData.description,
      starterCode: questionData.starterCode || '',
      solutionCode: questionData.solutionCode || '',
      language: questionData.language || 'javascript',
      difficulty: questionData.difficulty || 'medium',
      points: questionData.points || 10,
      orderIndex: questionData.orderIndex || 0,
      deadline: questionData.deadline || null,
      caWeight: questionData.caWeight ?? 0,
    });

    if (questionData.testCases && questionData.testCases.length > 0) {
      for (let i = 0; i < questionData.testCases.length; i++) {
        await CodingModel.createTestCase({
          codingQuestionId: question.id,
          input: questionData.testCases[i].input || '',
          expectedOutput: questionData.testCases[i].expectedOutput,
          isHidden: questionData.testCases[i].isHidden || false,
          orderIndex: i,
        });
      }
    }

    return CodingModel.findQuestionById(question.id);
  },

  async updateCodingQuestion(questionId, instructorId, data) {
    const question = await CodingModel.findQuestionById(questionId);
    if (!question) throw new AppError('Coding question not found', 404);
    const quiz = await CodingModel.findQuizById(question.coding_quiz_id);
    const course = await CourseModel.findById(quiz.course_id);
    if (course.instructor_id !== instructorId) {
      throw new AppError('Not authorized to update this question', 403);
    }
    return CodingModel.updateQuestion(questionId, {
      title: data.title,
      description: data.description,
      starterCode: data.starterCode,
      solutionCode: data.solutionCode,
      language: data.language,
      difficulty: data.difficulty,
      points: data.points,
      orderIndex: data.orderIndex,
      deadline: data.deadline,
      caWeight: data.caWeight,
    });
  },

  async submitCode(userId, { codingQuestionId, code, language }) {
    const question = await CodingModel.findQuestionById(codingQuestionId);
    if (!question) throw new AppError('Coding question not found', 404);

    const submission = await CodingModel.createSubmission({
      codingQuestionId,
      userId,
      code,
      language,
    });

    // Execute code against test cases (JavaScript only for now)
    let status = 'error';
    let score = 0;
    let errorMessage = null;
    let executionTimeMs = 0;
    const testResults = [];

    const allTestCases = question.test_cases || [];

    if (language !== 'javascript') {
      // Non-JS languages: mark as pending for external evaluation
      status = 'pending';
      errorMessage = `Language '${language}' requires external execution.`;
    } else {
      let passedCount = 0;

      for (const tc of allTestCases) {
        const result = executeJavaScript(code, tc.input);
        executionTimeMs += result.executionTimeMs;

        const passed = result.error
          ? false
          : result.output.trim() === (tc.expected_output || '').trim();

        if (result.error && !errorMessage) {
          errorMessage = result.error;
        }

        if (passed) passedCount++;

        testResults.push({
          testCaseId: tc.id,
          input: tc.is_hidden ? '[hidden]' : tc.input,
          expectedOutput: tc.is_hidden ? '[hidden]' : tc.expected_output,
          actualOutput: tc.is_hidden ? '[hidden]' : result.output,
          passed,
          error: result.error,
        });
      }

      if (allTestCases.length > 0) {
        score = (passedCount / allTestCases.length) * question.points;
        status = passedCount === allTestCases.length ? 'accepted' : 'wrong_answer';
        if (errorMessage) status = 'error';
      } else {
        status = 'accepted';
        score = question.points;
      }
    }

    const rawScore = score;
    const isLate = question.deadline ? new Date() > new Date(question.deadline) : false;
    const LATE_PENALTY_RATE = 0.2; // 20% deduction for late submissions
    const latePenalty = isLate ? rawScore * LATE_PENALTY_RATE : 0;
    const finalScore = rawScore - latePenalty;

    // AI Marking/Feedback Integration
    let aiFeedback = null;
    try {
      if (finalScore > 0 || status === 'wrong_answer' || status === 'error') {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const config = require('../config');
        if (config.google.apiKey) {
           const genAI = new GoogleGenerativeAI(config.google.apiKey);
           const model = genAI.getGenerativeModel({ 
             model: 'gemini-3.5-flash',
             safetySettings: [
               { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
               { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
               { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
               { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
             ]
           });
           const aiPrompt = `Act as an expert computer science grader. A student submitted code for: "${question.title}".
           Problem: ${question.description}
           Correct Solution Example: ${question.solution_code || 'Not provided'}
           Student Code: ${code}
           Test Case Results: ${status} (Score: ${finalScore}/${question.points})
           
           Provide a detailed but concise (2-3 sentences) academic critique. If they failed, explain exactly what logic they missed. If they passed, comment on their code efficiency or style.`;
           const aiRes = await model.generateContent(aiPrompt);
           aiFeedback = aiRes.response.text().trim();
        }
      }
    } catch (err) {
      console.error('AI marking error:', err);
    }

    const updatedSubmission = await CodingModel.updateSubmission(submission.id, {
      status,
      score: finalScore,
      testResults,
      errorMessage,
      executionTimeMs,
      isLate,
      latePenalty,
      aiFeedback, // Store AI feedback
    });

    const caContribution = finalScore * ((question.ca_weight || 0) / 100);
    await CodingModel.upsertScore({
      userId,
      codingQuestionId,
      rawScore,
      finalScore,
      caContribution,
    });
    return updatedSubmission;

  },

  async getSubmissionResults(submissionId, userId) {
    const submission = await CodingModel.findSubmissionById(submissionId);
    if (!submission) throw new AppError('Submission not found', 404);
    if (submission.user_id !== userId) throw new AppError('Not authorized', 403);
    return submission;
  },

  async getSubmissionHistory(userId, codingQuestionId) {
    return CodingModel.findSubmissionHistory(userId, codingQuestionId);
  },

async getCourseGradebook(courseId, user) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);
    
    const isOwner = course.instructor_id === user.id;
    const isSupervisor = user.role === 'hod' && await CourseModel.isSupervisedBy(courseId, user.id);
    
    if (user.role !== 'admin' && !isOwner && !isSupervisor) {
      throw new AppError('Not authorized to view gradebook for this course', 403);
    }
    return CodingModel.findScoresByCourse(courseId);
  },
  async getStudentGradebook(courseId, studentId, user) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);

    const isOwner = course.instructor_id === user.id;
    const isSupervisor = user.role === 'hod' && await CourseModel.isSupervisedBy(courseId, user.id);

    if (user.role !== 'admin' && !isOwner && !isSupervisor) {
      throw new AppError('Not authorized to view gradebook for this course', 403);
    }
    return CodingModel.findScoresByStudentAndCourse(studentId, courseId);
  },

async getMyScores(courseId, userId) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);
    return CodingModel.findScoresByStudentAndCourse(userId, courseId);
  },
};



module.exports = CodingService;
